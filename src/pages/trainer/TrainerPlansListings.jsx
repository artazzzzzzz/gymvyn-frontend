import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  apiFetch,
  createPlansListing,
  getTrainerPlansListings,
  publishPlansListing,
  unpublishPlansListing,
  updatePlansListing,
} from '../../utils/api'

const EMPTY_FORM = {
  templateType: 'workout', templateId: '', title: '', description: '', inr: '20', usd: '1',
}

const STATUS_STYLE = {
  draft: 'var(--text-secondary)', published: 'var(--success)', unpublished: 'var(--text-tertiary)',
  suspended: 'var(--error)', removed: 'var(--error)',
}

function priceToMinor(value, minimum, label) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount < minimum) return { error: `${label} final price must be at least ${minimum}.` }
  if (!/^\d+(?:\.\d{1,2})?$/.test(String(value).trim())) return { error: `${label} price can have up to two decimal places.` }
  return { value: Math.round(amount * 100) }
}

function minorToPrice(value) {
  return value == null ? '' : (Number(value) / 100).toFixed(2)
}

function ListingForm({ templates, initialValue, onCancel, onSave, saving }) {
  const [form, setForm] = useState(initialValue || EMPTY_FORM)
  const [error, setError] = useState('')
  const availableTemplates = templates[form.templateType] || []

  useEffect(() => {
    setForm(initialValue || EMPTY_FORM)
    setError('')
  }, [initialValue])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const changeType = (templateType) => setForm((current) => ({ ...current, templateType, templateId: '' }))

  const submit = async (event) => {
    event.preventDefault()
    const inr = priceToMinor(form.inr, 20, 'INR')
    const usd = priceToMinor(form.usd, 1, 'USD')
    if (!form.templateId || !form.title.trim()) {
      setError('Select a template and enter a listing title.')
      return
    }
    if (inr.error || usd.error) {
      setError(inr.error || usd.error)
      return
    }
    setError('')
    await onSave({
      templateType: form.templateType, templateId: form.templateId, title: form.title.trim(),
      description: form.description.trim(), priceInrPaise: inr.value, priceUsdCents: usd.value,
    })
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        {['workout', 'diet'].map((type) => (
          <button key={type} type="button" onClick={() => changeType(type)} style={{ flex: 1, height: 38, borderRadius: 9, border: '1px solid var(--border)', background: form.templateType === type ? 'var(--text-primary)' : 'var(--bg-card)', color: form.templateType === type ? 'var(--bg-primary)' : 'var(--text-primary)', cursor: 'pointer', textTransform: 'capitalize' }}>
            {type}
          </button>
        ))}
      </div>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        Template
        <select value={form.templateId} onChange={(event) => update('templateId', event.target.value)} required style={fieldStyle}>
          <option value="">Select a {form.templateType} template</option>
          {availableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
        </select>
      </label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        Listing title
        <input value={form.title} onChange={(event) => update('title', event.target.value)} maxLength={160} required style={fieldStyle} />
      </label>
      <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
        Description
        <textarea value={form.description} onChange={(event) => update('description', event.target.value)} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          INR final price
          <input value={form.inr} onChange={(event) => update('inr', event.target.value)} inputMode="decimal" required style={fieldStyle} />
        </label>
        <label style={{ display: 'grid', gap: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
          USD final price
          <input value={form.usd} onChange={(event) => update('usd', event.target.value)} inputMode="decimal" required style={fieldStyle} />
        </label>
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Minimums: ₹20 INR and $1 USD. Gymvyn’s 5% commission is included in your final price.</p>
      {error && <p role="alert" style={{ margin: 0, fontSize: 13, color: 'var(--error)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && <button type="button" onClick={onCancel} disabled={saving} style={secondaryButtonStyle}>Cancel</button>}
        <button type="submit" disabled={saving || availableTemplates.length === 0} style={{ ...primaryButtonStyle, flex: 1 }}>{saving ? 'Saving…' : initialValue ? 'Save listing' : 'Create listing'}</button>
      </div>
      {!availableTemplates.length && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)' }}>Create a {form.templateType} template before creating a listing.</p>}
    </form>
  )
}

const fieldStyle = { width: '100%', boxSizing: 'border-box', minHeight: 40, padding: '9px 10px', borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)', font: 'inherit' }
const primaryButtonStyle = { minHeight: 40, padding: '0 14px', border: 'none', borderRadius: 9, background: 'var(--text-primary)', color: 'var(--bg-primary)', cursor: 'pointer', fontWeight: 600 }
const secondaryButtonStyle = { ...primaryButtonStyle, background: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }

export default function TrainerPlansListings() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [listings, setListings] = useState([])
  const [templates, setTemplates] = useState({ workout: [], diet: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError('')
    try {
      const [nextListings, workoutTemplates, dietTemplates] = await Promise.all([
        getTrainerPlansListings(),
        apiFetch(`/api/trainer/templates/${user.id}?type=workout`),
        apiFetch('/api/diet-plans/templates'),
      ])
      setListings(nextListings || [])
      setTemplates({ workout: workoutTemplates || [], diet: dietTemplates || [] })
    } catch (err) {
      setError(err.message || 'Could not load Gymvyn Plans listings.')
    } finally { setLoading(false) }
  }, [user?.id])

  useEffect(() => { load() }, [load])

  const editValue = useMemo(() => editing && ({
    templateType: editing.template_type, templateId: editing.template_id, title: editing.title,
    description: editing.description || '', inr: minorToPrice(editing.price_inr_paise), usd: minorToPrice(editing.price_usd_cents),
  }), [editing])

  const save = async (payload) => {
    setSaving(true)
    setError('')
    try {
      if (editing) {
        await updatePlansListing(editing.id, payload)
        setNotice('Listing updated.')
      } else {
        await createPlansListing(payload)
        setNotice('Listing created.')
      }
      setEditing(null)
      setShowCreate(false)
      await load()
    } catch (err) { setError(err.message || 'Could not save the listing.') }
    finally { setSaving(false) }
  }

  const changeStatus = async (listing, action) => {
    setActionId(listing.id)
    setError('')
    try {
      if (action === 'publish') await publishPlansListing(listing.id)
      else await unpublishPlansListing(listing.id)
      setNotice(action === 'publish' ? 'Listing published.' : 'Listing unpublished.')
      await load()
    } catch (err) { setError(err.message || `Could not ${action} listing.`) }
    finally { setActionId(null) }
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '52px 16px 96px' }}>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 20 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Gymvyn Plans</p>
          <h1 style={{ margin: 0, fontSize: 24, color: 'var(--text-primary)' }}>Your listings</h1>
        </div>
        <button onClick={() => { setEditing(null); setShowCreate(true); setNotice('') }} style={primaryButtonStyle}>Create listing</button>
      </header>
      <p style={{ margin: '0 0 18px', fontSize: 13, color: 'var(--text-secondary)' }}>Create and manage the plans you publish through Gymvyn Plans.</p>
      {notice && <p role="status" style={{ padding: 10, borderRadius: 9, background: 'var(--bg-card)', color: 'var(--success)', fontSize: 13 }}>{notice}</p>}
      {error && <div role="alert" style={{ padding: 12, borderRadius: 9, background: 'var(--bg-card)', color: 'var(--error)', fontSize: 13, marginBottom: 14 }}>{error}</div>}

      {(showCreate || editing) && <section style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 14px', fontSize: 17, color: 'var(--text-primary)' }}>{editing ? 'Edit listing' : 'Create listing'}</h2>
        <ListingForm templates={templates} initialValue={editValue} saving={saving} onSave={save} onCancel={() => { setShowCreate(false); setEditing(null) }} />
      </section>}

      {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading listings…</p> : listings.length === 0 ? (
        <section style={{ padding: '36px 18px', textAlign: 'center', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)' }}>
          <p style={{ margin: 0, fontSize: 15, color: 'var(--text-primary)' }}>No Gymvyn Plans listings yet.</p>
          <button onClick={() => setShowCreate(true)} style={{ ...primaryButtonStyle, marginTop: 14 }}>Create listing</button>
        </section>
      ) : <div style={{ display: 'grid', gap: 12 }}>
        {listings.map((listing) => {
          const locked = ['suspended', 'removed'].includes(listing.status)
          const busy = actionId === listing.id
          return <article key={listing.id} style={{ padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-card)' }}>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div><h2 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>{listing.title}</h2><p style={{ margin: '5px 0 0', fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'capitalize' }}>{listing.template_type} template</p></div>
              <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_STYLE[listing.status] || 'var(--text-secondary)', textTransform: 'capitalize' }}>{listing.status}</span>
            </div>
            {listing.description && <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>{listing.description}</p>}
            <p style={{ margin: '12px 0', fontSize: 12, color: 'var(--text-tertiary)' }}>INR final price ₹{minorToPrice(listing.price_inr_paise)} · USD final price ${minorToPrice(listing.price_usd_cents)}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={locked || busy} onClick={() => { setShowCreate(false); setEditing(listing); setNotice('') }} style={{ ...secondaryButtonStyle, flex: 1, opacity: locked ? 0.5 : 1 }}>Edit listing</button>
              {listing.status === 'published' ? <button disabled={locked || busy} onClick={() => changeStatus(listing, 'unpublish')} style={{ ...secondaryButtonStyle, flex: 1 }}>Unpublish listing</button> : <button disabled={locked || busy} onClick={() => changeStatus(listing, 'publish')} style={{ ...primaryButtonStyle, flex: 1, opacity: locked ? 0.5 : 1 }}>{busy ? 'Saving…' : 'Publish listing'}</button>}
            </div>
          </article>
        })}
      </div>}
      <button onClick={() => navigate('/trainer/templates')} style={{ marginTop: 18, background: 'none', border: 'none', color: 'var(--text-cta)', cursor: 'pointer', fontSize: 13 }}>Manage templates</button>
    </main>
  )
}
