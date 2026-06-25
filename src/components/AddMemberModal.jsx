import { useEffect, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  X, Loader2, Check, AlertCircle, Info, UserPlus, Share2,
  Copy, MessageCircle, Calendar, Phone, IndianRupee,
} from 'lucide-react'
import { addGymMember, getGymTrainers } from '../utils/api'

// ── Constants ───────────────────────────────────────────────────────────────

const MEMBERSHIP_TYPES = [
  { value: 'monthly',     label: 'Monthly',     suggestedFee: 1500  },
  { value: 'quarterly',   label: 'Quarterly',   suggestedFee: 4000  },
  { value: 'half_yearly', label: 'Half-yearly', suggestedFee: 7000  },
  { value: 'annual',      label: 'Annual',      suggestedFee: 12000 },
]

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatPhoneDisplay(digits) {
  // 9876543210 → "98765 43210"
  if (!digits) return ''
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)} ${digits.slice(5)}`
}

function todayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString().slice(0, 10)
}

const inputCls = 'w-full bg-[#1c1c1f] border border-white/[0.08] rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-all'
const labelCls = 'block text-xs font-medium text-zinc-300 mb-1.5'

// ── Modal shell ─────────────────────────────────────────────────────────────

export default function AddMemberModal({
  open, onClose, gymId, gymName, joinCode, onAdded,
}) {
  const [tab, setTab] = useState('manual') // 'manual' | 'invite'
  const [mounted, setMounted] = useState(false)

  // Manual tab state
  const [fullName, setFullName]                 = useState('')
  const [phone, setPhone]                       = useState('')
  const [membershipType, setMembershipType]     = useState('monthly')
  const [feeManuallyEdited, setFeeEdited]       = useState(false)
  const [monthlyFee, setMonthlyFee]             = useState('1500')
  const [startDate, setStartDate]               = useState(todayISO())
  const [assignedTrainerId, setTrainerId]       = useState('')
  const [notes, setNotes]                       = useState('')

  const [trainers, setTrainers]               = useState([])
  const [trainersLoading, setTrainersLoading] = useState(false)
  const [submitting, setSubmitting]           = useState(false)
  const [errorMsg, setErrorMsg]               = useState('')
  const [success, setSuccess]                 = useState(false)

  // Invite tab state
  const [copied, setCopied]   = useState('') // 'code' | 'msg' | ''

  const cardRef = useRef(null)

  // ── Animation: fade/slide in/out ─────────────────────────────────────────
  useEffect(() => {
    if (open) {
      // next tick to allow CSS transition
      const id = requestAnimationFrame(() => setMounted(true))
      return () => cancelAnimationFrame(id)
    }
    setMounted(false)
  }, [open])

  // ── Esc to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape' && !submitting) handleClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, submitting])

  // ── Load trainers when opened ────────────────────────────────────────────
  useEffect(() => {
    if (!open || !gymId) return
    let cancelled = false
    ;(async () => {
      setTrainersLoading(true)
      try {
        const data = await getGymTrainers(gymId)
        if (!cancelled) setTrainers(data || [])
      } catch (err) {
        console.error('getGymTrainers error:', err)
        if (!cancelled) setTrainers([])
      } finally {
        if (!cancelled) setTrainersLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, gymId])

  // ── Reset when modal closes ──────────────────────────────────────────────
  function fullReset() {
    setTab('manual')
    setFullName(''); setPhone(''); setMembershipType('monthly')
    setFeeEdited(false); setMonthlyFee('1500')
    setStartDate(todayISO()); setTrainerId(''); setNotes('')
    setSubmitting(false); setErrorMsg(''); setSuccess(false)
    setCopied('')
  }

  function handleClose() {
    if (submitting) return
    onClose?.()
    setTimeout(fullReset, 250) // after fade-out
  }

  // ── Auto-suggest fee on type change (unless owner edited) ────────────────
  useEffect(() => {
    if (feeManuallyEdited) return
    const t = MEMBERSHIP_TYPES.find(x => x.value === membershipType)
    if (t) setMonthlyFee(String(t.suggestedFee))
  }, [membershipType, feeManuallyEdited])

  // ── Validation ───────────────────────────────────────────────────────────
  const phoneOk = /^\d{10}$/.test(phone)
  const feeOk   = Number(monthlyFee) > 0
  const nameOk  = fullName.trim().length > 1
  const dateOk  = !!startDate
  const valid   = nameOk && phoneOk && feeOk && dateOk

  // ── Submit ───────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (!valid || submitting) return
    setErrorMsg(''); setSubmitting(true)
    try {
      await addGymMember({
        gymId,
        fullName: fullName.trim(),
        phone,
        membershipType,
        monthlyFee: Number(monthlyFee),
        startDate,
        assignedTrainerId: assignedTrainerId || null,
        notes: notes.trim() || null,
      })
      setSuccess(true)
      // Trigger refresh of members list immediately
      try { onAdded?.(fullName.trim()) } catch {}
      // Auto-close after success splash
      setTimeout(() => {
        onClose?.()
        setTimeout(fullReset, 250)
      }, 1500)
    } catch (err) {
      console.error('addGymMember error:', err)
      setErrorMsg(err.message || 'Failed to add member. Please try again.')
      setSubmitting(false)
    }
  }

  // ── Copy / share ─────────────────────────────────────────────────────────
  const inviteMessage = useMemo(
    () => `Hey! Join my gym ${gymName ?? 'on Gymvyn'} on Gymvyn. Download the app and enter join code: ${(joinCode || '').toUpperCase()}`,
    [gymName, joinCode]
  )

  async function copyToClipboard(text, kind) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(''), 2000)
    } catch (err) {
      console.error('Clipboard error:', err)
    }
  }

  function shareViaWhatsApp() {
    const url = `https://wa.me/?text=${encodeURIComponent(inviteMessage)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className={`fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 transition-opacity duration-300 ${mounted ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
      style={{ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
    >
      <div
        ref={cardRef}
        className={`bg-[#141416] border border-white/[0.08] w-full sm:max-w-[540px] sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] transition-all duration-300 ease-out ${
          mounted ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header / tabs */}
        <div className="flex-shrink-0 border-b border-white/[0.06]">
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <h2 className="text-base font-semibold text-white">Add Member</h2>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="w-8 h-8 rounded-lg hover:bg-[var(--bg-card)]/[0.06] text-zinc-500 hover:text-white flex items-center justify-center disabled:opacity-50 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-1 px-3 pb-1">
            <TabButton
              icon={UserPlus}
              label="Add Manually"
              active={tab === 'manual'}
              onClick={() => setTab('manual')}
            />
            <TabButton
              icon={Share2}
              label="Invite via App"
              active={tab === 'invite'}
              onClick={() => setTab('invite')}
            />
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto">
          {tab === 'manual' ? (
            success ? (
              <SuccessSplash name={fullName.trim()} />
            ) : (
              <ManualForm
                fullName={fullName} setFullName={setFullName}
                phone={phone} setPhone={setPhone}
                membershipType={membershipType} setMembershipType={setMembershipType}
                monthlyFee={monthlyFee}
                onFeeChange={(v) => { setFeeEdited(true); setMonthlyFee(v) }}
                startDate={startDate} setStartDate={setStartDate}
                assignedTrainerId={assignedTrainerId} setTrainerId={setTrainerId}
                notes={notes} setNotes={setNotes}
                trainers={trainers} trainersLoading={trainersLoading}
                phoneOk={phoneOk}
                feeOk={feeOk}
                errorMsg={errorMsg}
                submitting={submitting}
                onSubmit={handleSubmit}
              />
            )
          ) : (
            <InviteTab
              gymName={gymName}
              joinCode={joinCode}
              inviteMessage={inviteMessage}
              copied={copied}
              copyToClipboard={copyToClipboard}
              shareViaWhatsApp={shareViaWhatsApp}
            />
          )}
        </div>

        {/* Footer (only on manual tab when not in success state) */}
        {tab === 'manual' && !success && (
          <div className="flex-shrink-0 border-t border-white/[0.06] px-5 py-3.5 flex items-center justify-end gap-2.5">
            <button
              onClick={handleClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white hover:bg-[var(--bg-card)]/[0.04] disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!valid || submitting}
              className="inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:bg-[var(--bg-card)]/[0.06] disabled:text-zinc-600 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-xl transition-all duration-150 shadow-lg shadow-emerald-500/20"
            >
              {submitting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              {submitting ? 'Adding…' : 'Add Member'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────────

function TabButton({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
        active
          ? 'bg-[var(--bg-card)]/[0.06] text-white'
          : 'text-zinc-500 hover:text-zinc-300'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}

function ManualForm({
  fullName, setFullName, phone, setPhone, membershipType, setMembershipType,
  monthlyFee, onFeeChange, startDate, setStartDate,
  assignedTrainerId, setTrainerId, notes, setNotes,
  trainers, trainersLoading, phoneOk, feeOk, errorMsg, submitting, onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="px-5 py-5 space-y-4">
      {errorMsg && (
        <div className="px-3.5 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Full name */}
      <div>
        <label className={labelCls}>Full name <span className="text-emerald-400">*</span></label>
        <input
          type="text"
          value={fullName}
          onChange={e => setFullName(e.target.value)}
          placeholder="e.g. Aman Sharma"
          className={inputCls}
          autoFocus
          disabled={submitting}
        />
      </div>

      {/* Phone */}
      <div>
        <label className={labelCls}>Phone <span className="text-emerald-400">*</span></label>
        <div className="relative">
          <Phone size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          <input
            type="tel"
            value={formatPhoneDisplay(phone)}
            onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
            onPaste={e => {
              e.preventDefault()
              const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10)
              setPhone(text)
            }}
            placeholder="98765 43210"
            className={`${inputCls} pl-9 pr-9 tabular-nums`}
            inputMode="numeric"
            disabled={submitting}
          />
          {phone.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              {phoneOk
                ? <Check size={14} className="text-emerald-400" />
                : <span className="text-[10px] text-zinc-500 tabular-nums">{phone.length}/10</span>}
            </span>
          )}
        </div>
        {phone.length > 0 && !phoneOk && (
          <p className="text-[11px] text-amber-400 mt-1">Phone must be 10 digits</p>
        )}
      </div>

      {/* Membership type — segmented */}
      <div>
        <label className={labelCls}>Membership type <span className="text-emerald-400">*</span></label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#1c1c1f] border border-white/[0.08] rounded-xl p-1">
          {MEMBERSHIP_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              disabled={submitting}
              onClick={() => setMembershipType(t.value)}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-150 ${
                membershipType === t.value
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Monthly fee + start date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Monthly fee <span className="text-emerald-400">*</span></label>
          <div className="relative">
            <IndianRupee size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="number"
              value={monthlyFee}
              onChange={e => onFeeChange(e.target.value)}
              placeholder="0"
              min="0"
              className={`${inputCls} pl-8 tabular-nums`}
              disabled={submitting}
            />
          </div>
          {!feeOk && monthlyFee !== '' && (
            <p className="text-[11px] text-amber-400 mt-1">Fee must be greater than 0</p>
          )}
        </div>
        <div>
          <label className={labelCls}>Start date</label>
          <div className="relative">
            <Calendar size={12} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className={`${inputCls} pl-8 tabular-nums`}
              disabled={submitting}
            />
          </div>
        </div>
      </div>

      {/* Assigned trainer */}
      <div>
        <label className={labelCls}>Assigned trainer <span className="text-zinc-600">(optional)</span></label>
        {trainersLoading ? (
          <div className={`${inputCls} flex items-center gap-2 text-zinc-500`}>
            <Loader2 size={13} className="animate-spin" />
            Loading trainers…
          </div>
        ) : trainers.length === 0 ? (
          <div className={`${inputCls} text-zinc-500 text-sm cursor-not-allowed`}>
            No trainers added yet
          </div>
        ) : (
          <select
            value={assignedTrainerId}
            onChange={e => setTrainerId(e.target.value)}
            className={inputCls}
            disabled={submitting}
          >
            <option value="">None</option>
            {trainers.map(t => (
              <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className={labelCls}>Notes <span className="text-zinc-600">(optional)</span></label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value.slice(0, 500))}
          placeholder="Any internal notes about this member…"
          rows={2}
          className={`${inputCls} resize-none`}
          disabled={submitting}
        />
        <p className="text-[10px] text-zinc-600 mt-1 tabular-nums text-right">{notes.length}/500</p>
      </div>

      {/* Info card */}
      <div className="bg-emerald-500/[0.05] border border-emerald-500/20 rounded-xl p-3 flex items-start gap-2.5">
        <Info size={13} className="text-emerald-400 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-zinc-300 leading-relaxed">
          This member won’t have an app account. To give them app access, share the gym join code (in the <span className="font-semibold">Invite via App</span> tab).
        </p>
      </div>
    </form>
  )
}

function SuccessSplash({ name }) {
  return (
    <div className="px-5 py-12 flex flex-col items-center text-center animate-[fadeIn_220ms_ease-out]">
      <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mb-4">
        <Check size={28} className="text-emerald-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-1">Added!</h3>
      <p className="text-sm text-zinc-400">{name || 'Member'} is now part of your gym.</p>
    </div>
  )
}

function InviteTab({ gymName, joinCode, inviteMessage, copied, copyToClipboard, shareViaWhatsApp }) {
  const code = (joinCode || '').toUpperCase()
  return (
    <div className="px-5 py-5 space-y-5">
      <div>
        <h3 className="text-lg font-bold text-white tracking-tight">Let members join themselves</h3>
        <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
          Share this code with your gym members. They download Gymvyn, enter the code, and join your gym.
        </p>
      </div>

      {/* Code card */}
      <div className="bg-[var(--bg-card)]/[0.03] border border-emerald-500/20 rounded-2xl p-6 flex flex-col items-center text-center">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Your gym join code</p>
        <p className="text-[44px] sm:text-[52px] leading-none font-bold text-emerald-400 font-mono tracking-[0.25em] mb-4">
          {code || '—'}
        </p>
        <button
          onClick={() => copyToClipboard(code, 'code')}
          className="inline-flex items-center gap-1.5 bg-[var(--bg-card)]/[0.06] hover:bg-[var(--bg-card)]/[0.12] text-white text-xs font-medium px-3.5 py-2 rounded-lg transition-colors"
        >
          {copied === 'code'
            ? <><Check size={12} className="text-emerald-400" /> Copied!</>
            : <><Copy size={12} /> Copy code</>}
        </button>
      </div>

      {/* Share buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <ShareButton
          icon={Copy}
          label={copied === 'code' ? 'Copied!' : 'Copy Code'}
          onClick={() => copyToClipboard(code, 'code')}
        />
        <ShareButton
          icon={MessageCircle}
          label={copied === 'msg' ? 'Copied!' : 'Copy Message'}
          onClick={() => copyToClipboard(inviteMessage, 'msg')}
        />
        <ShareButton
          icon={Share2}
          label="WhatsApp"
          highlight
          onClick={shareViaWhatsApp}
        />
      </div>

      {/* QR code */}
      <div className="bg-[var(--bg-card)]/[0.03] border border-white/[0.06] rounded-2xl p-5 flex flex-col items-center">
        <div className="bg-[var(--bg-card)] p-2.5 rounded-xl">
          <QRCodeSVG
            value={code || 'fitforge'}
            size={148}
            level="M"
            includeMargin={false}
          />
        </div>
        <p className="text-xs text-zinc-500 mt-3">Or scan to join</p>
      </div>

      <p className="text-[11px] text-zinc-500 leading-relaxed">
        Members who join via app will appear here automatically. They’ll need to set up payment manually if needed.
      </p>
    </div>
  )
}

function ShareButton({ icon: Icon, label, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 text-xs font-medium px-3 py-2.5 rounded-xl transition-colors ${
        highlight
          ? 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/20'
          : 'bg-[var(--bg-card)]/[0.04] hover:bg-[var(--bg-card)]/[0.08] border border-white/[0.08] text-white'
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )
}
