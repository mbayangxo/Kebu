import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AudioSession, LiveKitRoom, VideoTrack, useRemoteParticipants, useTracks } from '@livekit/react-native';
import { Track } from 'livekit-client';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { createClient, processLock } from '@supabase/supabase-js';

const apiUrl = process.env.EXPO_PUBLIC_KEBU_LIVE_API;
const authUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const sandbox = __DEV__ && process.env.EXPO_PUBLIC_KEBU_GIFT_SANDBOX === 'true';
const configured = Boolean(authUrl?.startsWith('https://') && publishableKey
  && (apiUrl?.startsWith('https://') || (__DEV__ && /^http:\/\/(127\.0\.0\.1|localhost|10\.0\.2\.2):\d+$/.test(apiUrl))));
const supabase = configured ? createClient(authUrl, publishableKey, {
  auth: {
    storage: {
      getItem: SecureStore.getItemAsync,
      setItem: SecureStore.setItemAsync,
      removeItem: SecureStore.deleteItemAsync,
    },
    autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, lock: processLock,
  },
}) : null;

async function api(body) {
  const token = body ? (await supabase.auth.getSession()).data.session?.access_token : null;
  const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/public-live`, body ? {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
    body: JSON.stringify(body),
  } : undefined);
  const data = await response.json();
  if (!response.ok && !data.status) throw new Error(data.error || 'Could not reach KEBU Live.');
  return data;
}

function Button({ label, onPress, quiet = false, disabled = false }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={[s.button, quiet && s.quiet, disabled && s.disabled]}>
    <Text style={[s.buttonText, quiet && s.quietText]}>{label}</Text>
  </Pressable>;
}

function Stage({ audioOnly }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const remote = useRemoteParticipants();
  const camera = remote[0]?.getTrackPublication(Track.Source.Camera);
  useEffect(() => {
    if (!camera) return;
    camera.setSubscribed(!audioOnly);
  }, [camera, audioOnly]);
  if (audioOnly || tracks.length === 0) {
    return <View style={s.stage}><Text style={s.muted}>{audioOnly ? 'Audio only' : 'Waiting for the host’s camera'}</Text></View>;
  }
  return <VideoTrack trackRef={tracks[0]} style={s.stage} />;
}

function Live() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [rooms, setRooms] = useState([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [title, setTitle] = useState('');
  const [current, setCurrent] = useState(null);
  const [connection, setConnection] = useState(null);
  const [audioOnly, setAudioOnly] = useState(false);
  const [pending, setPending] = useState(null);
  const [giftReady, setGiftReady] = useState(false);

  const refresh = async () => setRooms((await api()).rooms);
  useEffect(() => {
    if (!supabase) return;
    const sub = supabase.auth.onAuthStateChange((_event, value) => { setSession(value); setLoading(false); });
    const app = AppState.addEventListener('change', state => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
    refresh().catch(e => setMessage(e.message));
    return () => { sub.data.subscription.unsubscribe(); app.remove(); supabase.auth.stopAutoRefresh(); };
  }, []);
  useEffect(() => {
    setGiftReady(false);
    setPending(null);
    if (!sandbox || !session?.user.id) return;
    let live = true;
    const key = `kebu-gift-${session.user.id}`;
    SecureStore.getItemAsync(key).then(value => { if (live) { if (value) setPending(JSON.parse(value)); setGiftReady(true); } })
      .catch(() => { if (live) setMessage('Could not restore the pending sandbox gift.'); });
    return () => { live = false; };
  }, [session?.user.id]);
  useEffect(() => {
    if (!connection) return;
    const timeout = setTimeout(() => {
      setConnection(null);
      setMessage('This room has reached its time limit.');
    }, Math.max(0, Date.parse(current.expires_at) - Date.now()));
    return () => clearTimeout(timeout);
  }, [connection, current]);

  async function run(fn) {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setMessage('');
    try { await fn(); } catch (e) { setMessage(e.message || 'Something went wrong.'); }
    finally { inFlight.current = false; setBusy(false); }
  }

  async function enter(room) {
    await AudioSession.startAudioSession();
    try {
      const grant = await api({ action: 'join', id: room.id });
      setCurrent(room); setConnection(grant);
    } catch (error) {
      await AudioSession.stopAudioSession();
      throw error;
    }
  }
  useEffect(() => {
    if (!connection) return;
    return () => { AudioSession.stopAudioSession().catch(() => {}); };
  }, [connection]);

  const clearRoom = () => { setConnection(null); setCurrent(null); setAudioOnly(false); };
  async function sendGift(order) {
    const key = `kebu-gift-${session.user.id}`;
    await SecureStore.setItemAsync(key, JSON.stringify(order));
    setPending(order);
    const result = await api(order);
    if (result.status === 'pending') { setMessage('Waiting for JOKKO confirmation. Check the same gift again.'); return; }
    await SecureStore.deleteItemAsync(key);
    setPending(null);
    const errors = {
      insufficient: 'Your sandbox wallet does not have enough CAURIS.',
      wallet_not_linked: 'A sandbox wallet has not been linked for you or the host.',
      closed: 'The room ended before this gift could be sent.',
      disabled: 'The JOKKO sandbox is not enabled on this server.',
    };
    setMessage(result.status === 'completed' ? `Gift sent · ${result.amount} test CAURIS`
      : errors[result.status] || 'JOKKO declined this sandbox gift.');
  }

  const report = reason => run(async () => {
    await api({ action: 'report', id: current.id, reason }); setMessage('Report submitted.');
  });
  const giftRetry = sandbox && session && pending && <Button quiet label="Check pending gift"
    disabled={busy} onPress={() => run(() => sendGift(pending))} />;

  return <SafeAreaView style={s.safe}>
    <View style={s.shell}>
      <Text style={s.brand}>KEBU <Text style={s.accent}>LIVE</Text></Text>
      {message ? <Text accessibilityLiveRegion="polite" style={s.notice}>{message}</Text> : null}
      {busy || loading ? <ActivityIndicator color="#dafa72" /> : null}
      {!configured ? <Text style={s.muted}>This build needs a KEBU Live server before it can connect.</Text>
      : current && connection ? <ScrollView contentContainerStyle={s.roomContent}>
        <Text style={s.heading}>{current.title}</Text>
        <LiveKitRoom serverUrl={connection.url} token={connection.token} connect
          options={{ adaptiveStream: { pixelDensity: 'screen' } }}
          video={connection.host} audio={connection.host}
          onError={e => setMessage(e.message || 'Live connection failed.')}
          onDisconnected={() => { setConnection(null); setMessage('Disconnected from the broadcast.'); }}>
          <Stage audioOnly={audioOnly} />
        </LiveKitRoom>
        {!connection.host ? <>
          <Button quiet label={audioOnly ? 'Turn video on' : 'Listen without video'} onPress={() => setAudioOnly(v => !v)} />
          <Button quiet label="Report broadcast" disabled={busy} onPress={() => Alert.alert('Why are you reporting this room?', undefined, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Harassment', onPress: () => report('harassment') },
            { text: 'Other violation', onPress: () => report('other') },
          ])} />
          {sandbox && giftReady && !pending ? <Button quiet label="Send a test gift" disabled={busy} onPress={() => Alert.alert(
            'Send a Spark to the host?',
            `100 test CAURIS to the host of “${current.title}”. No real money will move.`,
            [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: () => run(() => sendGift({
              action: 'gift', id: current.id, gift: 'spark', requestId: Crypto.randomUUID(),
            })) }])} /> : null}
          <Button label="Leave room" onPress={clearRoom} />
        </> : <Button label="End broadcast" disabled={busy} onPress={() => run(async () => {
          await api({ action: 'end', id: current.id }); clearRoom(); await refresh();
        })} />}
        {giftRetry}
      </ScrollView> : <>
        <Text style={s.heading}>Find a live room</Text>
        <Text style={s.muted}>Watch a broadcast or start your own.</Text>
        {!session && !loading ? <>
          <TextInput accessibilityLabel="Email" placeholder="KEBU email" placeholderTextColor="#a6ada6" style={s.input}
            autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextInput accessibilityLabel="Password" placeholder="Password" placeholderTextColor="#a6ada6" style={s.input}
            secureTextEntry value={password} onChangeText={setPassword} />
          <Button label="Sign in with KEBU" disabled={busy || !email.trim() || !password}
            onPress={() => run(async () => {
              const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
              if (result.error) throw result.error;
              setPassword('');
            })} />
        </> : session ? <>
          <TextInput accessibilityLabel="Broadcast title" placeholder="Name your broadcast" placeholderTextColor="#a6ada6" style={s.input}
            value={title} maxLength={80} onChangeText={setTitle} />
          <Button label="Start public broadcast" disabled={busy || title.trim().length < 3}
            onPress={() => run(async () => {
              const { room } = await api({ action: 'start', title: title.trim() }); await enter(room); await refresh();
            })} />
          <Button label="Sign out" quiet disabled={busy} onPress={() => run(async () => {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            setPending(null);
          })} />
        </> : null}
        {giftRetry}
        <FlatList data={rooms} keyExtractor={item => item.id}
          onRefresh={() => run(refresh)} refreshing={busy}
          ListEmptyComponent={!busy && !loading ? <Text style={s.muted}>No broadcasts are listed right now. Pull to refresh.</Text> : null}
          renderItem={({ item }) => <Pressable accessibilityRole="button" style={s.card} disabled={busy} onPress={() => {
            if (!session) { setMessage('Sign in with KEBU to enter the room.'); return; }
            run(() => enter(item));
          }}><Text style={s.tag}>PUBLIC ROOM</Text><Text style={s.title}>{item.title}</Text><Text style={s.accent}>Enter room →</Text></Pressable>} />
      </>}
    </View>
  </SafeAreaView>;
}

export default function App() {
  return <SafeAreaProvider><Live /></SafeAreaProvider>;
}

const s = StyleSheet.create({
  roomContent: { gap: 12, paddingBottom: 24 },
  safe: { flex: 1, backgroundColor: '#101510' },
  shell: { flex: 1, padding: 20, gap: 12, width: '100%', maxWidth: 650, alignSelf: 'center' },
  brand: { fontSize: 20, fontWeight: '900', letterSpacing: 3, color: '#fbfcf4' },
  accent: { color: '#dafa72' },
  heading: { fontSize: 34, lineHeight: 39, fontWeight: '800', color: '#fbfcf4' },
  muted: { fontSize: 16, color: '#b5c0b3' },
  notice: { color: '#fbfcf4', backgroundColor: '#303e2c', padding: 12, borderRadius: 12, fontSize: 15 },
  input: { color: '#fbfcf4', backgroundColor: '#222b22', borderRadius: 13, minHeight: 48, paddingHorizontal: 14, fontSize: 16 },
  button: { minHeight: 46, borderRadius: 24, padding: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: '#dafa72' },
  quiet: { backgroundColor: '#222b22' }, disabled: { opacity: 0.48 },
  buttonText: { color: '#152210', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  quietText: { color: '#fbfcf4' },
  stage: { height: 230, width: '100%', borderRadius: 18, backgroundColor: '#222b22', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, backgroundColor: '#222b22', borderRadius: 18, padding: 16, gap: 8 },
  tag: { color: '#b5c0b3', fontSize: 11, letterSpacing: 2, fontWeight: '700' },
  title: { color: '#fbfcf4', fontSize: 21, fontWeight: '800' },
});
