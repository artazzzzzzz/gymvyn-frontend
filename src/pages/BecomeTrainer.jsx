import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';
import { CitySearchInput } from '../components/CitySearchInput';

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

const PRICING_MODELS = [
  { key: 'hourly', label: 'Hourly', unit: 'per hour', unitShort: 'hr', step: 100, defaultRate: 800 },
  { key: 'monthly', label: 'Monthly', unit: 'per month', unitShort: 'mo', step: 500, defaultRate: 6000 },
  { key: 'session', label: 'Per session', unit: 'per session', unitShort: 'session', step: 100, defaultRate: 500 },
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
function FloatingInput({ label, value, onChange, type = 'text', maxLength }) {
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
        maxLength={maxLength}
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
function StepHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 32 }}>
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

  // Full name is collected at signup and stored on the users table — read-only
  // here, never re-collected.
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    apiFetch(`/api/users/${user.id}`)
      .then(data => setFullName(data?.full_name || ''))
      .catch(err => console.error('Load user failed:', err));
  }, [user?.id]);

  // Step 1
  const [step1, setStep1] = useState({ phone: '', city: '', experience: '' });
  const step1Valid = step1.phone.trim().length === 10 && step1.city.trim() && step1.experience;

  // Step 2
  const [specializations, setSpecializations] = useState([]);
  const [pricingModels, setPricingModels] = useState([]);
  const [pricingSkipped, setPricingSkipped] = useState(false);
  const [rates, setRates] = useState(
    Object.fromEntries(PRICING_MODELS.map(m => [m.key, m.defaultRate]))
  );
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

  const togglePricingModel = (key) => {
    setPricingSkipped(false);
    setPricingModels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const adjustRate = (key, delta) =>
    setRates(r => ({ ...r, [key]: Math.min(50000, Math.max(0, r[key] + delta)) }));

  const skipPricing = () => {
    setPricingModels([]);
    setPricingSkipped(true);
  };

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
        full_name: fullName,
        phone: step1.phone,
        city: step1.city,
        experience_years: parseExperience(step1.experience),
        specializations,
        pricing_models: pricingModels,
        hourly_rate: pricingModels.includes('hourly') ? rates.hourly : null,
        monthly_rate: pricingModels.includes('monthly') ? rates.monthly : null,
        session_rate: pricingModels.includes('session') ? rates.session : null,
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
    { label: 'Basic info complete', done: !!(step1.phone && step1.city && step1.experience) },
    { label: 'Specializations selected', done: specializations.length > 0 },
    { label: 'Pricing set', done: pricingModels.some(m => rates[m] > 0), optional: true },
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
            <StepHeader              title="Let's set up your profile"
              subtitle="Tell us the basics — clients will see this when they find you."
            />

            {/* Full name — collected at signup, shown here read-only for context */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Full name</div>
              <div style={{ fontSize: 16, color: "var(--text-primary)", padding: '4px 0' }}>{fullName || '—'}</div>
            </div>

            <FloatingInput
              label="Phone number"
              value={step1.phone}
              onChange={v => setStep1(f => ({ ...f, phone: v.replace(/\D/g, '').slice(0, 10) }))}
              type="tel"
              maxLength={10}
            />

            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>City</div>
              <CitySearchInput
                value={step1.city}
                onChange={v => setStep1(f => ({ ...f, city: v }))}
                placeholder="Search city…"
              />
            </div>

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
            <StepHeader              title="Your expertise"
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

            {/* Pricing models + rates */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Pricing</div>
              <div style={{ fontSize: 13, color: "var(--text-tertiary)", marginBottom: 16, lineHeight: 1.5 }}>
                Choose how you charge — pick as many as apply, or skip and set this later.
              </div>

              {pricingSkipped ? (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, padding: '14px 16px', borderRadius: 10,
                  background: 'var(--bg-pill)', border: '1px solid var(--border)'
                }}>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                    Pricing skipped — you can add rates anytime from Trainer Settings.
                  </span>
                  <button
                    onClick={() => setPricingSkipped(false)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600, color: 'var(--text-cta)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Add now
                  </button>
                </div>
              ) : (
                <>
                  {/* Model checkboxes */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: pricingModels.length ? 20 : 12 }}>
                    {PRICING_MODELS.map(model => {
                      const active = pricingModels.includes(model.key);
                      return (
                        <button
                          key={model.key}
                          onClick={() => togglePricingModel(model.key)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            height: 40, padding: '0 14px',
                            borderRadius: 8, fontSize: 13, fontWeight: 500,
                            border: active ? '1.5px solid var(--text-cta)' : '1px solid var(--border)',
                            background: 'var(--bg-card)',
                            color: active ? 'var(--text-cta)' : "var(--text-secondary)",
                            cursor: 'pointer', transition: 'all 0.15s'
                          }}
                        >
                          <span style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0,
                            border: active ? 'none' : '1.5px solid var(--border-strong)',
                            background: active ? 'var(--text-cta)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {active && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--bg-card)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                          {model.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Rate stepper per selected model */}
                  {PRICING_MODELS.filter(m => pricingModels.includes(m.key)).map(model => (
                    <div key={model.key} style={{ marginBottom: 20 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                        <button
                          onClick={() => adjustRate(model.key, -model.step)}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: '1px solid var(--border)',
                            background: 'transparent', fontSize: 20,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}
                        >−</button>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                          <span style={{ fontSize: 32, fontWeight: 500 }}>₹{rates[model.key]}</span>
                          <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginTop: 2 }}>{model.unit}</div>
                        </div>
                        <button
                          onClick={() => adjustRate(model.key, model.step)}
                          style={{
                            width: 40, height: 40, borderRadius: '50%',
                            border: '1px solid var(--border)',
                            background: 'transparent', fontSize: 20,
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center'
                          }}
                        >+</button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={skipPricing}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 500, color: "var(--text-tertiary)",
                      textDecoration: 'underline', padding: 0
                    }}
                  >
                    Skip for now
                  </button>
                </>
              )}
            </div>

            {/* Trainer type */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Trainer type</div>
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'Independent', desc: 'Freelance / online', value: true },
                  { label: 'Gym-based', desc: 'Affiliated with gym', value: false }
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
            <StepHeader              title="Make your profile shine"
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
                      <div style={{ marginBottom: 4, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      </div>
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
            <StepHeader              title="Ready to launch"
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
                { label: 'Name', value: fullName || '—' },
                { label: 'City', value: step1.city || '—' },
                { label: 'Experience', value: step1.experience || '—' },
                {
                  label: 'Pricing',
                  value: pricingModels.length
                    ? pricingModels
                        .map(m => `₹${rates[m]}/${PRICING_MODELS.find(p => p.key === m).unitShort}`)
                        .join(', ')
                    : 'Not set — add later in Settings'
                },
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
            {loading ? 'Setting up…' : 'Launch Trainer Profile'}
          </button>
        )}
      </div>
    </div>
  );
}
