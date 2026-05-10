import { useEffect, useRef, useState } from 'react'
import {
  Building2, Camera, Check, Copy, Loader2, Sparkles, X,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../utils/supabase'
import { getGymSettings, updateGymSettings, uploadGymLogo } from '../utils/api'
import GymOwnerNav from '../components/GymOwnerNav'

// ── Helpers ──────────────────────────────────────────────────────────────────

const PLAN_STYLES = {
  free:       { bg: 'bg-zinc-500/10',    border: 'border-zinc-500/30',    text: 'text-zinc-400',    label: 'Free'       },
  basic:      { bg: 'bg-sky-500/10',     border: 'border-sky-500/30',     text: 'text-sky-400',     label: 'Basic'      },
  pro:        { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', label: 'Pro'        },
  enterprise: { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  text: 'text-violet-400',  label: 'Enterprise' },
}

function PlanBadge({ tier }) {
  const s = PLAN_STYLES[tier] ?? PLAN_STYLES.free
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <Sparkles size={13} />
      {s.label}
    </span>
  )
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-white">{title}</h2>
      {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-zinc-400 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls = 'w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors'

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymSettings() {
  const { user } = useAuth()
  const fileRef = useRef(null)

  const [gymId, setGymId]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  // Form state
  const [form, setForm] = useState({
    name: '', address: '', city: '', state: '', pincode: '', phone: '', email: '',
  })
  const [saving, setSaving]     = useState(false)
  const [saveMsg, setSaveMsg]   = useState('')   // 'saved' | 'error' | ''

  // Logo state
  const [logoUrl, setLogoUrl]   = useState(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError]         = useState('')

  // Join code
  const [joinCode, setJoinCode] = useState('')
  const [copied, setCopied]     = useState(false)

  // Plan
  const [planTier, setPlanTier] = useState('free')
  const [showTooltip, setShowTooltip] = useState(false)

  function setField(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }))
  }

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setLoading(true); setError('')
      try {
        const { data: gym, error: gymErr } = await supabase
          .from('gyms')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle()
        if (gymErr) throw gymErr
        if (!gym) throw new Error('No gym found for this account.')
        if (cancelled) return
        setGymId(gym.id)

        const settings = await getGymSettings(gym.id)
        if (cancelled) return
        setForm({
          name:    settings.name    || '',
          address: settings.address || '',
          city:    settings.city    || '',
          state:   settings.state   || '',
          pincode: settings.pincode || '',
          phone:   settings.phone   || '',
          email:   settings.email   || '',
        })
        setLogoUrl(settings.logo_url || null)
        setJoinCode(settings.join_code || '')
        setPlanTier(settings.plan_tier || 'free')
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load settings.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // ── Save gym info ─────────────────────────────────────────────────────────

  async function handleSave(e) {
    e.preventDefault()
    if (!gymId) return
    setSaving(true); setSaveMsg('')
    try {
      await updateGymSettings(gymId, {
        name:    form.name.trim(),
        address: form.address.trim() || null,
        city:    form.city.trim()    || null,
        state:   form.state.trim()   || null,
        pincode: form.pincode.trim() || null,
        phone:   form.phone.trim()   || null,
        email:   form.email.trim()   || null,
      })
      setSaveMsg('saved')
      setTimeout(() => setSaveMsg(''), 3000)
    } catch (err) {
      setSaveMsg('error:' + (err.message || 'Failed to save'))
    } finally {
      setSaving(false)
    }
  }

  // ── Logo upload ───────────────────────────────────────────────────────────

  async function handleLogoChange(e) {
    const file = e.target.files?.[0]
    if (!file || !gymId) return
    setLogoUploading(true); setLogoError('')
    try {
      const { logo_url } = await uploadGymLogo(gymId, file)
      setLogoUrl(logo_url)
    } catch (err) {
      setLogoError(err.message || 'Failed to upload logo.')
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  // ── Copy join code ────────────────────────────────────────────────────────

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(joinCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select the text
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0c0c0e] flex items-center justify-center pb-24">
        <Loader2 size={22} className="text-zinc-500 animate-spin" />
        <GymOwnerNav />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0c0c0e] pb-28 overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-emerald-500/[0.07] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-2xl mx-auto px-5 py-10 sm:py-12">
        <header className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Gym Settings</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage your gym profile and preferences.</p>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* ── Logo ── */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-4">
          <SectionHeader title="Gym Logo" description="Shown on your members' My Gym page." />

          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt="Gym logo"
                     className="w-20 h-20 rounded-2xl object-cover border border-white/[0.08]" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-emerald-500/10 border border-white/[0.08] flex items-center justify-center">
                  <Building2 size={28} className="text-emerald-400" />
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
                  <Loader2 size={16} className="text-white animate-spin" />
                </div>
              )}
            </div>

            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={logoUploading}
                className="inline-flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-zinc-300 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Camera size={14} />
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
              </button>
              {logoError && <p className="text-xs text-red-400 mt-2">{logoError}</p>}
              <p className="text-xs text-zinc-600 mt-1.5">JPG, PNG or WebP · max 10 MB</p>
            </div>
          </div>
        </section>

        {/* ── Gym Info ── */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-4">
          <SectionHeader title="Gym Info" description="Basic details visible to your members." />

          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Gym name *">
              <input value={form.name} onChange={setField('name')} placeholder="FitZone Gym"
                     required className={inputCls} />
            </Field>

            <Field label="Address">
              <input value={form.address} onChange={setField('address')} placeholder="123, MG Road"
                     className={inputCls} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input value={form.city} onChange={setField('city')} placeholder="Mumbai"
                       className={inputCls} />
              </Field>
              <Field label="State">
                <input value={form.state} onChange={setField('state')} placeholder="Maharashtra"
                       className={inputCls} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Pincode">
                <input value={form.pincode} onChange={setField('pincode')} placeholder="400001"
                       maxLength={6} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={form.phone} onChange={setField('phone')} placeholder="9876543210"
                       type="tel" className={inputCls} />
              </Field>
            </div>

            <Field label="Email">
              <input value={form.email} onChange={setField('email')} placeholder="gym@example.com"
                     type="email" className={inputCls} />
            </Field>

            <div className="flex items-center justify-between pt-1">
              {saveMsg === 'saved' ? (
                <span className="text-xs text-emerald-400 flex items-center gap-1">
                  <Check size={13} /> Saved successfully
                </span>
              ) : saveMsg.startsWith('error:') ? (
                <span className="text-xs text-red-400 flex items-center gap-1">
                  <X size={13} /> {saveMsg.slice(6)}
                </span>
              ) : (
                <span />
              )}
              <button
                type="submit"
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </section>

        {/* ── Join Code ── */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5 mb-4">
          <SectionHeader title="Member Join Code" />

          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-4 py-3 text-center">
              <span className="text-2xl font-mono font-bold tracking-[0.35em] text-white">
                {joinCode || '——'}
              </span>
            </div>
            <button
              onClick={copyCode}
              disabled={!joinCode}
              className="inline-flex flex-col items-center gap-1 bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] text-zinc-300 px-4 py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span className="text-[10px] font-medium">{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Share this code with members to let them link to your gym from the FitForge app.
          </p>
        </section>

        {/* ── Plan ── */}
        <section className="bg-[#141416] border border-white/[0.06] rounded-2xl p-5">
          <SectionHeader title="Plan" description="Your current subscription tier." />

          <div className="flex items-center justify-between">
            <PlanBadge tier={planTier} />

            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                disabled
                className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] text-zinc-500 font-semibold text-sm px-4 py-2.5 rounded-xl cursor-not-allowed opacity-60"
              >
                <Sparkles size={13} />
                Upgrade Plan
              </button>
              {showTooltip && (
                <div className="absolute bottom-full right-0 mb-2 px-3 py-1.5 bg-[#1a1a1d] border border-white/[0.08] rounded-lg text-xs text-zinc-300 whitespace-nowrap shadow-xl">
                  Coming soon
                  <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-[#1a1a1d]" />
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <GymOwnerNav />
    </div>
  )
}
