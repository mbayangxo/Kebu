-- RECT music/social objects were accidentally created in the Kebu database.
-- Keep them recoverable for transfer to RECT, but remove them from the public
-- schema exposed by Supabase's Data API.

create schema if not exists rect_quarantine;
comment on schema rect_quarantine is
  'Recoverable quarantine for RECT music/social objects accidentally created in Kebu.';

revoke all on schema rect_quarantine from public, anon, authenticated;

-- Move the complete function surface first. Triggers retain their function OIDs,
-- and no Kebu application code calls these routines.
do $$
declare
  signature text;
begin
  foreach signature in array array[
    'approve_playlist_collab_request(uuid,uuid)',
    'cancel_playlist_collab_ask(uuid)',
    'consume_play_credit()',
    'decline_playlist_collab_request(uuid,uuid)',
    'ensure_play_balance(integer)',
    'friends_who_saved_playlist(uuid,integer)',
    'has_playlist_collab_ask_pending(uuid)',
    'invite_playlist_collaborator(uuid,uuid)',
    'is_accepted_playlist_collaborator(uuid,uuid)',
    'list_playlist_collab_asks(uuid)',
    'mark_artist_notifications_read(bigint[])',
    'notify_artist(uuid,text,integer,text,text,bigint)',
    'notify_comment_reply(bigint,text,bigint)',
    'notify_friend_mix_published(uuid)',
    'notify_people_follow(uuid)',
    'notify_playlist_collab_add(uuid,text)',
    'notify_playlist_collab_request(uuid)',
    'notify_playlist_comment(uuid,text,bigint)',
    'notify_playlist_comment_reply(bigint,text,bigint)',
    'notify_playlist_copy(uuid,uuid)',
    'notify_playlist_follow(uuid)',
    'notify_playlist_followers_track_add(uuid,text)',
    'notify_playlist_share(uuid,uuid,text)',
    'notify_track_comment(text,text,bigint)',
    'notify_track_like(text)',
    'notify_track_listen(text,text)',
    'notify_track_release(text)',
    'notify_track_share(uuid,text,text)',
    'person_followed_artists(uuid,integer)',
    'person_people_follow_counts(uuid)',
    'person_people_followers(uuid,integer)',
    'person_people_following(uuid,integer)',
    'person_saved_public_playlists(uuid,integer)',
    'playlist_save_count(uuid)',
    'playlist_tracks_set_added_by()',
    'remove_playlist_collaborator(uuid,uuid)',
    'respond_playlist_collab(uuid,boolean)',
    'send_artist_tip(uuid,integer,text,text)',
    'send_comment_like_thanks(bigint,text)',
    'send_comment_thanks(bigint,text)',
    'send_follow_thanks(bigint,text)',
    'send_like_thanks(uuid,text,text)',
    'send_mix_thanks(uuid,text)',
    'send_people_follow_thanks(bigint,text)',
    'send_play_thanks(text,text)',
    'send_playlist_comment_thanks(bigint,text)',
    'send_playlist_copy_thanks(bigint,text)',
    'send_playlist_follow_thanks(bigint,text)',
    'send_share_thanks(bigint,text)',
    'send_tip_thanks(bigint,text)',
    'set_track_writer_splits(uuid,jsonb)',
    'toggle_artist_follow(uuid)',
    'toggle_comment_like(bigint)',
    'toggle_people_follow(uuid)',
    'toggle_playlist_comment_like(bigint)',
    'toggle_playlist_follow(uuid)',
    'toggle_track_like(text)',
    'toggle_user_block(uuid)',
    'touch_playlist_updated_at()',
    'users_are_blocked(uuid,uuid)'
  ]
  loop
    if to_regprocedure('public.' || signature) is not null then
      execute 'alter function public.' || signature || ' set schema rect_quarantine';
    end if;
  end loop;
end
$$;

alter view if exists public.track_like_counts set schema rect_quarantine;
alter view if exists public.track_play_counts set schema rect_quarantine;

do $$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'artist_follows',
    'artist_notifications',
    'artist_tips',
    'comment_likes',
    'comment_thanks',
    'like_thanks',
    'mix_thanks',
    'people_follows',
    'play_pack_purchases',
    'play_packs',
    'play_thanks',
    'playlist_collab_asks',
    'playlist_collaborators',
    'playlist_comment_likes',
    'playlist_comment_thanks',
    'playlist_comments',
    'playlist_follows',
    'playlist_tracks',
    'playlists',
    'plays',
    'track_comments',
    'track_likes',
    'track_writer_splits',
    'tracks',
    'user_blocks',
    'user_play_balances',
    'users'
  ]
  loop
    if to_regclass('public.' || relation_name) is not null then
      execute format('alter table public.%I set schema rect_quarantine', relation_name);
    end if;
  end loop;
end
$$;

revoke all on all tables in schema rect_quarantine from public, anon, authenticated;
revoke all on all sequences in schema rect_quarantine from public, anon, authenticated;
revoke all on all functions in schema rect_quarantine from public, anon, authenticated;

alter default privileges in schema rect_quarantine
  revoke all on tables from public, anon, authenticated;
alter default privileges in schema rect_quarantine
  revoke all on sequences from public, anon, authenticated;
alter default privileges in schema rect_quarantine
  revoke execute on functions from public, anon, authenticated;
