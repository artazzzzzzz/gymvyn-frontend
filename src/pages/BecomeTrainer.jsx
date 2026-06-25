import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const API = import.meta.env.VITE_API_URL || '';

const TOTAL_STEPS = 4;

const EXPERIENCE_OPTIONS = [
  'Less than 1 year', '1–2 years',
  '3–5 years', '5–10 years', '10+ years'
];

const SPECS = [
  'Fat loss', 'Muscle gain', 'Strength', 'Powerlifting',
  'Rehabilitation', 'Sports performance', 'Flexibility',
  'Senior fitness', 'Nutrition', 'HIIT',
  'Yoga / mobility', 'Pre / postnatal'
];

const parseExperience = (str) => {
  if (!str) return 0;
  if (str.includes('Less')) return 0;
  if (str.includes('1–2')) return 1;
  if (str.includes('3–5')) return 3;
  if (str.includes('5–10')) return 5;
  if (str.includes('10+')) return 10;
  return 0;
};

// ── Floating label input ──────────────────────────────────────
function FloatingInput({ label, value, onChange, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  const raised = focused || value;
  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <label style={{
        position: 'absolute',
        top: raised ? 0 : 14,
        left: 0,
        fontSize: raised ? 11 : 16,
        color: focused ? "var(--text-primary)" : "var(--text-tertiary)",
        transition: 'all 0.15s ease',
        pointerEvents: 'none',
        fontWeight: raised ? 500 : 400,
        zIndex: 1
      }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: '100%',
          border: 'none',
          borderBottom: focused ? '1px solid var(--text-primary)' : '1px solid var(--border)',
          padding: '18px 0 10px',
          fontSize: 16,
          background: 'transparent',
          outline: 'none',
          transition: 'border 0.15s',
          boxSizing: 'border-box'
        }}
      />
    </div>
  );
}

// ── Step icon header ──────────────────────────────────────────
function StepHeader({ emoji, title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--accent-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16, fontSize: 32
      }}>
        {emoji}
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 6 }}>{title}</h1>
      {subtitle && <p style={{ fontSize: 14, color: "var(--text-tertiary)", lineHeight: 1.5 }}>{subtitle}</p>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function BecomeTrainer() {
  const { user, setRole, markOnboardingComplete } = useAuth();
  const navigate = useNavigate();
  const photoRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [step1, setStep1] = useState({ full_name: '', phone: '', city: '', experience: '' });
  const step1Valid = step1.full_name.trim() && step1.phone.trim() && step1.city.trim() && step1.experience;

  // Step 2
  const [specializations, setSpecializations] = useState([]);
  const [hourlyRate, setHourlyRate] = useState(800);
  const [isIndependent, setIsIndependent] = useState(true);
  const step2Valid = specializations.length > 0;

  // Step 3
  const [bio, setBio] = useState('');
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [certifications, setCertifications] = useState([]);
  const [certInput, setCertInput] = useState('');
  const [instagram, setInstagram] = useState('');

  const toggleSpec = (spec) =>
    setSpecializations(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    );

  const adjustRate = (delta) =>
    setHourlyRate(r => Math.min(5000, Math.max(0, r + delta)));

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const addCert = (e) => {
    if (e.key === 'Enter' && certInput.trim()) {
      setCertifications(c => [...c, certInput.trim()]);
      setCertInput('');
    }
  };

  const nextStep = () => {
    if (step < TOTAL_STEPS) setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const prevStep = () => {
    if (step > 1) setStep(s => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const canNext = step === 1 ? step1Valid : step === 2 ? step2Valid : true;

  const handleSubmit = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const payload = {
        userId: user.id,
        user_id: user.id,
        full_name: step1.full_name,
        phone: step1.phone,
        city: step1.city,
        experience_years: parseExperience(step1.experience),
        specializations,
        hourly_rate: hourlyRate,
        is_independent: isIndependent,
        bio,
        instagram_handle: instagram,
        certifications
      };

      const res = await apiFetch('/api/trainer/onboard', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (photo) {
        const fd = new FormData();
        fd.append('photo', photo);
        fd.append('userId', user.id);
        await fetch(`${API}/api/trainer/profile/${user.id}/photo`, {
          method: 'POST',
          body: fd
        });
      }

      if (res.success) {
        // Safety net: ensure role + completion state are set in context
        // regardless of whether role-select was used.
        setRole('trainer')
        markOnboardingComplete()
        navigate('/trainer/dashboard');
      }
    } catch (err) {
      console.error('Onboard error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Review checklist
  const checks = [
    { label: 'Basic info complete', done: !!step1.full_name },
    { label: 'Specializations selected', done: specializations.length > 0 },
    { label: 'Rate set', done: hourlyRate > 0 },
    { label: 'Profile photo added', done: !!photo, optional: true },
    { label: 'Bio written', done: bio.length > 20, optional: true },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Sticky progress bar */}
      <div style={{ height: 3, background: 'var(--bg-pill)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{
          height: '100%',
          width: `${(step / TOTAL_STEPS) * 100}%`,
          background: "var(--text-primary)",
          transition: 'width 0.3s ease'
        }} />
      </div>

      {/* Content */}
      <div style={{ padding: '32px 24px 120px' }}>

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div>
            <StepHeader
              emoji="👋"
              title="Let's set up your profile"
              subtitle="Tell us the basics — clients will see this when they find you."
            />

            <FloatingInput
              label="Full name"
              value={step1.full_name}
              onChange={v => setStep1(f => ({ ...f, full_name: v }))}
            />
            <FloatingInput
              label="Phone number"
              value={step1.phone}
              onChange={v => setStep1(f => ({ ...f, phone: v }))}
              type="tel"
            />
            <FloatingInput
              label="City"
              value={step1.city}
              onChange={v => setStep1(f => ({ ...f, city: v }))}
            />

            {/* Experience dropdown */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <label style={{
                display: 'block',
                fontSize: step1.experience ? 11 : 16,
                color: step1.experience ? "var(--text-primary)" : "var(--text-tertiary)",
                marginBottom: step1.experience ? 4 : 0,
                paddingTop: step1.experience ? 0 : 14,
                transition: 'all 0.15s ease',
                fontWeight: step1.experience ? 500 : 400
              }}>
                Experience level
              </label>
              <select
                value={step1.experience}
                onChange={e => setStep1(f => ({ ...f, experience: e.target.value }))}
                style={{
                  width: '100%', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: step1.experience ? '4px 0 10px' : '18px 0 10px',
                  fontSize: 16,
                  background: 'transparent', outline: 'none',
                  color: step1.experience ? "var(--text-primary)" : "var(--text-tertiary)",
                  appearance: 'none', boxSizing: 'border-box'
                }}
              >
                <option value="" disabled>Select experience</option>
                {EXPERIENCE_OPTIONS.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Step 2: Specializations + Rate ── */}
        {step === 2 && (
          <div>
            <StepHeader
              emoji="🎯"
              title="Your expertise"
              subtitle="Select the areas you specialise in. Pick at least one."
            />

            {/* Specialization chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 32 }}>
              {SPECS.map(spec => {
                const active = specializations.includes(spec);
                return (
                  <button
                    key={spec}
                    onClick={() => toggleSpec(spec)}
                    style={{
                      height: 38, padding: '0 14px',
                      borderRadius: 8, fontSize: 12, fontWeight: 500,
                      border: active ? '1.5px solid var(--text-cta)' : '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      color: active ? 'var(--text-cta)' : "var(--text-secondary)",
                      cursor: 'pointer', transition: 'all 0.15s'
                    }}
                  >
                    {spec}
                  </button>
                );
              })}
            </div>

            {/* Hourly rate stepper */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 16 }}>Hourly rate</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                <button
                  onClick={() => adjustRate(-100)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: 'transparent', fontSize: 20,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >−</button>
                <div style={{ textAlign: 'center', flex: 1 }}>
                  <span style={{ fontSize: 32, fontWeight: 500 }}>₹{hourlyRate}</span>
                  <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>per hour</div>
                </div>
                <button
                  onClick={() => adjustRate(100)}
                  style={{
                    width: 40, height: 40, borderRadius: '50%',
                    border: '1px solid var(--border)',
                    background: 'transparent', fontSize: 20,
                    cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                >+</button>
              </div>
              {/* Fine-tune buttons */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                {[-500, -100, +100, +500].map(d => (
                  <button
                    key={d}
                    onClick={() => adjustRate(d)}
                    style={{
                      padding: '4px 10px', borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'transparent', fontSize: 12,
                      color: "var(--text-secondary)", cursor: 'pointer'
                    }}
                  >
                    {d > 0 ? `+${d}` : d}
                  </button>
                ))}
              </div>
            </div>

            {/* Trainer type */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Trainer type</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Independent', desc: 'Freelance / online', value: true, emoji: '🌐' },
                  { label: 'Gym-based', desc: 'Affiliated with gym', value: false, emoji: '🏋️' }
                ].map(opt => (
                  <div
                    key={opt.label}
                    onClick={() => setIsIndependent(opt.value)}
                    style={{
                      flex: 1, padding: 16, borderRadius: 10, cursor: 'pointer',
                      border: isIndependent === opt.value ? '1.5px solid var(--text-cta)' : '1px solid var(--border)',
                      background: 'var(--bg-card)',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{opt.emoji}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{opt.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Profile Details ── */}
        {step === 3 && (
          <div>
            <StepHeader
              emoji="✨"
              title="Make your profile shine"
              subtitle="These are optional but help clients trust you faster."
            />

            {/* Photo upload */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Profile photo</div>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                ref={photoRef}
                onChange={handlePhoto}
              />
              <div
                onClick={() => photoRef.current?.click()}
                style={{
                  width: 96, height: 96, borderRadius: '50%',
                  border: photoPreview ? 'none' : '2px dashed var(--border-strong)',
                  cursor: 'pointer', overflow: 'hidden',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: photoPreview ? 'transparent' : 'var(--bg-pill)',
                  position: 'relative'
                }}
              >
                {photoPreview
                  ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>📷</div>
                      <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Add photo</div>
                    </div>
                }
              </div>
            </div>

            {/* Bio */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Bio</div>
              <textarea
                rows={4}
                placeholder="Tell clients about your training philosophy, achievements, and approach…"
                value={bio}
                onChange={e => setBio(e.target.value)}
                style={{
                  width: '100%', background: 'var(--bg-elevated)',
                  borderRadius: 10, padding: 14, fontSize: 14,
                  border: '1px solid var(--border)', outline: 'none', resize: 'none',
                  minHeight: 100, boxSizing: 'border-box',
                  fontFamily: 'inherit', color: "var(--text-secondary)", lineHeight: 1.5
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4, textAlign: 'right' }}>
                {bio.length} chars
              </div>
            </div>

            {/* Certifications */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Certifications</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {certifications.map((c, i) => (
                  <span key={i} style={{
                    background: 'var(--bg-pill)', color: "var(--text-secondary)",
                    borderRadius: 6, padding: '4px 10px', fontSize: 12,
                    display: 'flex', alignItems: 'center', gap: 4
                  }}>
                    {c}
                    <button
                      onClick={() => setCertifications(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: "var(--text-tertiary)", fontSize: 13, padding: 0, lineHeight: 1 }}
                    >×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                placeholder="Type a certification and press Enter…"
                value={certInput}
                onChange={e => setCertInput(e.target.value)}
                onKeyDown={addCert}
                style={{
                  width: '100%', border: 'none',
                  borderBottom: '1px solid var(--border)',
                  padding: '10px 0', fontSize: 14,
                  background: 'transparent', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Instagram */}
            <div style={{ position: 'relative', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Instagram handle (optional)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 16, color: "var(--text-tertiary)" }}>@</span>
                <input
                  type="text"
                  placeholder="yourhandle"
                  value={instagram}
                  onChange={e => setInstagram(e.target.value)}
                  style={{
                    flex: 1, border: 'none',
                    borderBottom: '1px solid var(--border)',
                    padding: '10px 0', fontSize: 16,
                    background: 'transparent', outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Review + Submit ── */}
        {step === 4 && (
          <div>
            <StepHeader
              emoji="🚀"
              title="Ready to launch"
              subtitle="Review your profile before going live."
            />

            {/* Checklist */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 20 }}>
              {checks.map((c, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    height: 40,
                    borderBottom: i < checks.length - 1 ? '1px solid var(--border)' : 'none'
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: c.done ? 'var(--success-bg)' : 'transparent',
                    border: c.done ? 'none' : '1.5px solid var(--border-strong)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {c.done && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span style={{ fontSize: 14, color: c.done ? "var(--text-primary)" : "var(--text-tertiary)", flex: 1 }}>{c.label}</span>
                  {c.optional && !c.done && (
                    <span style={{ fontSize: 11, color: 'var(--text-disabled)' }}>optional</span>
                  )}
                </div>
              ))}
            </div>

            {/* Summary card */}
            <div style={{ background: 'var(--bg-primary)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Summary</div>
              {[
                { label: 'Name', value: step1.full_name || '—' },
                { label: 'City', value: step1.city || '—' },
                { label: 'Experience', value: step1.experience || '—' },
                { label: 'Rate', value: `₹${hourlyRate}/hr` },
                { label: 'Type', value: isIndependent ? 'Independent' : 'Gym-based' },
                { label: 'Specializations', value: specializations.length ? specializations.slice(0, 3).join(', ') + (specializations.length > 3 ? ` +${specializations.length - 3}` : '') : '—' },
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none'
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-tertiary)" }}>{row.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, maxWidth: '55%', textAlign: 'right' }}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--accent-bg)', borderRadius: 10, padding: 14, fontSize: 13, color: 'var(--text-cta)', lineHeight: 1.5 }}>
              After setup you'll get a unique invite code to share with clients. They can join using the code in the app.
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--bg-elevated)', borderTop: '1px solid var(--border)',
        padding: '12px 24px 28px', display: 'flex', gap: 10
      }}>
        {step > 1 && (
          <button
            onClick={prevStep}
            style={{
              flex: 1, height: 52, borderRadius: 12,
              border: '1px solid var(--border)',
              background: 'transparent', fontSize: 15,
              fontWeight: 500, cursor: 'pointer', color: "var(--text-secondary)"
            }}
          >
            Back
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button
            onClick={nextStep}
            disabled={!canNext}
            style={{
              flex: 1, height: 52, borderRadius: 12,
              background: canNext ? 'var(--cta-bg)' : 'var(--border)',
              color: canNext ? 'var(--cta-text)' : "var(--text-tertiary)",
              border: canNext ? '1px solid var(--cta-border)' : 'none',
              fontSize: 15, fontWeight: 500,
              cursor: canNext ? 'pointer' : 'not-allowed',
              transition: 'background 0.15s'
            }}
          >
            Continue
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, height: 56, borderRadius: 12,
              background: loading ? 'var(--border)' : 'var(--cta-bg)',
              color: loading ? "var(--text-tertiary)" : 'var(--cta-text)',
              border: loading ? 'none' : '1px solid var(--cta-border)',
              fontSize: 15, fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Setting up…' : 'Launch Trainer Profile 🚀'}
          </button>
        )}
      </div>
    </div>
  );
}
