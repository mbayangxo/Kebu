"use client";

import Link from "next/link";
import { useState, useEffect, createContext, useContext } from "react";

export interface UserProfile {
  gender: "woman" | "man" | "non-binary" | "prefer_not_to_say" | "";
  age: string;
  country_of_residence: string;
  country_of_origin: string;
  sectors: string[];
  business_stage: "idea" | "early" | "growing" | "established" | "";
  is_diaspora: boolean;
  setup_complete: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  gender: "",
  age: "",
  country_of_residence: "",
  country_of_origin: "",
  sectors: [],
  business_stage: "",
  is_diaspora: false,
  setup_complete: false,
};

const STORAGE_KEY = "alkebulan_profile";

const AFRICAN_COUNTRIES = [
  "Nigeria", "Ghana", "Senegal", "Côte d'Ivoire", "Cameroon", "Kenya", "Ethiopia",
  "Tanzania", "Uganda", "Rwanda", "Morocco", "Egypt", "Tunisia", "Algeria",
  "South Africa", "Zimbabwe", "Zambia", "Angola", "Mozambique", "Namibia",
  "Botswana", "Mali", "Burkina Faso", "Guinea", "Benin", "Togo", "Sierra Leone",
  "Liberia", "Guinea-Bissau", "Gambia", "Cabo Verde", "Congo DRC", "Gabon",
  "Congo-Brazzaville", "Chad", "CAR", "Equatorial Guinea", "Burundi", "Comoros",
  "Djibouti", "Somalia", "South Sudan", "Sudan", "Eritrea", "Madagascar",
  "Malawi", "Mauritania", "Niger", "Seychelles", "Mauritius", "Libya",
  "São Tomé & Príncipe", "Lesotho", "Eswatini",
];

const WORLD_REGIONS = [
  "United States", "United Kingdom", "Canada", "France", "Belgium", "Netherlands",
  "Germany", "Italy", "Spain", "Portugal", "Switzerland", "Sweden", "Norway",
  "Australia", "New Zealand", "Brazil", "China", "India", "UAE", "Saudi Arabia",
  "Other",
];

const ALL_RESIDENCE = [...AFRICAN_COUNTRIES, ...WORLD_REGIONS];

const SECTORS = [
  "Agriculture", "Construction", "Energy / Solar", "Tech / Software", "Healthcare",
  "Logistics / Transport", "Education", "Fashion / Beauty", "Food processing",
  "Mining / Resources", "Finance / Fintech", "Media / Creative", "Tourism",
  "Manufacturing", "Water / Sanitation", "Retail / Trade",
];

const STAGES = [
  { id: "idea", label: "Just an idea", desc: "I haven't started yet" },
  { id: "early", label: "Early stage", desc: "Started but under 2 years old" },
  { id: "growing", label: "Growing", desc: "2+ years, generating revenue" },
  { id: "established", label: "Established", desc: "5+ years, scaling" },
];

interface ProfileContextValue {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showSetup: boolean;
  setShowSetup: (v: boolean) => void;
}

const ProfileContext = createContext<ProfileContextValue>({
  profile: DEFAULT_PROFILE,
  updateProfile: () => {},
  showSetup: false,
  setShowSetup: () => {},
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setProfile(JSON.parse(stored));
    } catch {}
  }, []);

  function updateProfile(updates: Partial<UserProfile>) {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, showSetup, setShowSetup }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  return useContext(ProfileContext);
}

export function ProfileSetupModal() {
  const { profile, updateProfile, showSetup, setShowSetup } = useProfile();
  const [step, setStep] = useState(0);

  if (!showSetup) return null;

  const STEPS = [
    {
      title: "Who are you?",
      subtitle: "We use this to show you the most relevant programs for your situation.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-2">I am</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "woman", label: "A woman" },
                { id: "man", label: "A man" },
                { id: "non-binary", label: "Non-binary" },
                { id: "prefer_not_to_say", label: "Prefer not to say" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => updateProfile({ gender: id as UserProfile["gender"] })}
                  className={`py-3 px-4 rounded-xl border text-sm font-semibold transition-colors ${
                    profile.gender === id
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white border-border text-ink hover:border-deep-green"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink mb-2">Age</label>
            <input
              type="number"
              min="16"
              max="80"
              value={profile.age}
              onChange={(e) => updateProfile({ age: e.target.value })}
              placeholder="e.g. 26"
              className="w-full border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      ),
    },
    {
      title: "Where are you?",
      subtitle: "This helps us show programs available in your country.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-2">Where do you live now?</label>
            <select
              value={profile.country_of_residence}
              onChange={(e) => {
                const val = e.target.value;
                updateProfile({
                  country_of_residence: val,
                  is_diaspora: !AFRICAN_COUNTRIES.includes(val),
                });
              }}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-gold"
            >
              <option value="">Select country of residence</option>
              <optgroup label="African countries">
                {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Rest of the world">
                {WORLD_REGIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink mb-2">Country of origin / home country</label>
            <select
              value={profile.country_of_origin}
              onChange={(e) => updateProfile({ country_of_origin: e.target.value })}
              className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-gold"
            >
              <option value="">Select your home country</option>
              {AFRICAN_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {profile.is_diaspora && (
            <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-gold-dark">
                Diaspora mode will be on — we'll show you programs open to diaspora investors and entrepreneurs too.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      title: "What do you build?",
      subtitle: "Pick your sectors. You can always change this.",
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-ink mb-2">Sectors I work in (pick all that apply)</label>
            <div className="flex flex-wrap gap-2">
              {SECTORS.map(s => (
                <button
                  key={s}
                  onClick={() => {
                    const current = profile.sectors;
                    updateProfile({
                      sectors: current.includes(s)
                        ? current.filter(x => x !== s)
                        : [...current, s],
                    });
                  }}
                  className={`text-xs px-3 py-2 rounded-xl border font-semibold transition-colors ${
                    profile.sectors.includes(s)
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white border-border text-ink hover:border-deep-green"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-ink mb-2">Business stage</label>
            <div className="grid grid-cols-2 gap-2">
              {STAGES.map(({ id, label, desc }) => (
                <button
                  key={id}
                  onClick={() => updateProfile({ business_stage: id as UserProfile["business_stage"] })}
                  className={`text-left px-3 py-3 rounded-xl border transition-colors ${
                    profile.business_stage === id
                      ? "bg-deep-green text-ivory border-deep-green"
                      : "bg-white border-border hover:border-deep-green"
                  }`}
                >
                  <p className={`text-xs font-bold ${profile.business_stage === id ? "text-ivory" : "text-ink"}`}>{label}</p>
                  <p className={`text-[10px] ${profile.business_stage === id ? "text-ivory/70" : "text-muted"}`}>{desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  ];

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;

  function finish() {
    updateProfile({ setup_complete: true });
    setShowSetup(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-deep-green px-6 py-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-gold uppercase tracking-widest">
              Step {step + 1} of {STEPS.length}
            </span>
            <button onClick={() => setShowSetup(false)} className="text-ivory/60 hover:text-ivory text-lg leading-none">×</button>
          </div>
          <h2 className="font-display text-xl font-bold text-ivory">{currentStep.title}</h2>
          <p className="text-ivory/70 text-xs mt-1">{currentStep.subtitle}</p>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-ivory/20">
          <div
            className="h-1 bg-gold transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6">{currentStep.content}</div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 border border-border text-ink text-sm font-semibold py-3 rounded-xl hover:bg-warm-ivory transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={isLast ? finish : () => setStep(step + 1)}
            className="flex-1 bg-deep-green text-ivory text-sm font-bold py-3 rounded-xl hover:bg-mid-green transition-colors"
          >
            {isLast ? "Show my opportunities →" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProfileBadge() {
  return (
    <Link
      href="/welcome"
      className="bg-gold text-deep-green text-xs font-bold px-4 py-2.5 rounded-full shadow-lg hover:bg-gold-light transition-colors flex items-center gap-1.5 whitespace-nowrap"
    >
      <span>✨</span> Personalize
    </Link>
  );
}
