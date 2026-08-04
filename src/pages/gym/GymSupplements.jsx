import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useActiveGym } from '../../contexts/ActiveGymContext'
import { supabase } from '../../utils/supabase'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import PrimaryButton from '../../components/PrimaryButton'
import {
  Package, Edit2, MoreVertical, X, ChevronLeft,
  ShoppingBag, Clock, CheckCircle, XCircle, AlertTriangle,
  Plus, RefreshCw, Trash2, Eye, EyeOff, Upload, Image as ImageIcon,
} from 'lucide-react'

const BASE = import.meta.env.VITE_API_URL

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

async function apiFetch(path, opts = {}) {
  const token = await getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`)
  return data
}

async function apiUpload(path, file) {
  const token = await getToken()
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || data.message || 'Upload failed')
  return data
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const ms = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatPrice(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`
}

const CATEGORIES = ['protein', 'pre-workout', 'vitamins', 'recovery', 'other']

// ── Design tokens (light-mode, hardcoded to match Diet / Payments) ──────────

const COLOR = {
  pageBg:        'var(--bg-primary)',
  cardBg:        'var(--bg-card)',
  inputBg:       'var(--bg-primary)',
  border:        'var(--border)',
  divider:       'var(--border)',
  textPrimary:   'var(--text-primary)',
  textSecondary: 'var(--text-secondary)',
  textTertiary:  'var(--text-tertiary)',
  accent:        'var(--text-cta)',
  destructive:   'var(--error)',
  success:       'var(--success)',
}

const card = {
  background: COLOR.cardBg,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 16,
}

const STATUS_BADGE = {
  pending:          { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'Pending' },
  ready_for_pickup: { bg: 'var(--accent-bg)', color: 'var(--text-cta)', label: 'Ready' },
  completed:        { bg: 'var(--border)', color: 'var(--text-secondary)',    label: 'Completed' },
  cancelled:        { bg: 'var(--error-bg)', color: 'var(--error)', label: 'Cancelled' },
}

const PAYMENT_BADGE = {
  unpaid: { color: 'var(--error)', label: 'Unpaid' },
  paid:   { color: 'var(--success)', label: 'Paid' },
}

const ORDER_FILTERS = [
  { key: 'all',              label: 'All' },
  { key: 'pending',          label: 'Pending' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'completed',        label: 'Completed' },
  { key: 'cancelled',        label: 'Cancelled' },
]

// ── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 200, background: type === 'error' ? 'var(--error)' : 'var(--text-primary)',
      color: 'var(--bg-card)', padding: '10px 20px', borderRadius: 12,
      fontSize: 14, fontWeight: 500, boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'fade-in 0.2s ease-out', maxWidth: '90vw',
    }}>
      {message}
    </div>
  )
}

// ── Bottom Sheet wrapper ─────────────────────────────────────────────────────

function BottomSheet({ open, onClose, title, children }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 60,
          background: 'rgba(0,0,0,0.4)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.25s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 70,
        background: 'var(--bg-card)', borderRadius: '24px 24px 0 0',
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease-out',
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0', flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, background: 'var(--border)', borderRadius: 2 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px 8px', flexShrink: 0 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 20px 32px' }}>
          {children}
        </div>
      </div>
    </>
  )
}

// ── Product Form Sheet ───────────────────────────────────────────────────────

function ProductFormSheet({ open, onClose, product, onSaved, onToast, gymId }) {
  const isEdit = !!product
  const [name, setName]                     = useState('')
  const [description, setDescription]       = useState('')
  const [category, setCategory]             = useState('protein')
  const [price, setPrice]                   = useState('')
  const [stockCount, setStockCount]         = useState('')
  const [lowThreshold, setLowThreshold]     = useState('5')
  const [imageFile, setImageFile]           = useState(null)
  const [imagePreview, setImagePreview]     = useState(null)
  const [saving, setSaving]                 = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (open && product) {
      setName(product.name || '')
      setDescription(product.description || '')
      setCategory(product.category || 'protein')
      setPrice(String(product.price ?? ''))
      setStockCount(String(product.stock_count ?? ''))
      setLowThreshold(String(product.low_stock_threshold ?? 5))
      setImagePreview(product.image_url || null)
      setImageFile(null)
    } else if (open) {
      setName(''); setDescription(''); setCategory('protein')
      setPrice(''); setStockCount(''); setLowThreshold('5')
      setImageFile(null); setImagePreview(null)
    }
  }, [open, product])

  function handleFileChange(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
  }

  async function handleSubmit() {
    if (!name.trim()) return onToast('Product name is required', 'error')
    const p = Number(price)
    if (!Number.isFinite(p) || p < 0) return onToast('Valid price is required', 'error')

    setSaving(true)
    try {
      let saved
      if (isEdit) {
        saved = await apiFetch(`/api/supplements/products/${product.id}?gym_id=${gymId}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
            category,
            price: p,
            stock_count: Number(stockCount) || 0,
            low_stock_threshold: Number(lowThreshold) || 5,
          }),
        })
      } else {
        saved = await apiFetch('/api/supplements/products', {
          method: 'POST',
          body: JSON.stringify({
            gym_id: gymId,
            name: name.trim(),
            description: description.trim() || null,
            category,
            price: p,
            stock_count: Number(stockCount) || 0,
            low_stock_threshold: Number(lowThreshold) || 5,
          }),
        })
      }

      if (imageFile && saved?.id) {
        try {
          const imgRes = await apiUpload(`/api/supplements/products/${saved.id}/upload-image?gym_id=${gymId}`, imageFile)
          saved.image_url = imgRes.image_url
        } catch (imgErr) {
          onToast('Product saved but image upload failed: ' + imgErr.message, 'error')
        }
      }

      onSaved(saved)
      onToast(isEdit ? 'Product updated' : 'Product added', 'success')
      onClose()
    } catch (err) {
      onToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    width: '100%', height: 44, background: 'var(--bg-primary)', border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 12, padding: '0 12px', fontSize: 15, color: 'var(--text-primary)',
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={isEdit ? 'Edit Product' : 'Add Product'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Image upload */}
        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Product Image</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: '100%', height: 100, ...card, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              gap: 6, cursor: 'pointer', overflow: 'hidden', position: 'relative',
            }}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
            ) : (
              <>
                <Upload size={20} color="var(--text-tertiary)" />
                <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Tap to upload</span>
              </>
            )}
          </button>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Name *</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Whey Protein 1kg" style={inputStyle} />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Description</label>
          <textarea
            value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Optional product description..."
            rows={2}
            style={{ ...inputStyle, height: 'auto', padding: '10px 12px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle, appearance: 'auto' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Price (₹) *</label>
            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Stock Count</label>
            <input type="number" min="0" value={stockCount} onChange={e => setStockCount(e.target.value)} placeholder="0" style={inputStyle} />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>Low Stock Threshold</label>
          <input type="number" min="0" value={lowThreshold} onChange={e => setLowThreshold(e.target.value)} placeholder="5" style={inputStyle} />
        </div>

        <div style={{ paddingTop: 8 }}>
          <PrimaryButton onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Add Product')}
          </PrimaryButton>
        </div>
      </div>
    </BottomSheet>
  )
}

// ── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product, onEdit, onToggleActive, onDelete, onToast }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)
  const inactive = !product.is_active
  const stock = product.stock_count ?? 0
  const threshold = product.low_stock_threshold ?? 5
  const isLow = stock > 0 && stock <= threshold
  const isOut = stock === 0

  useEffect(() => {
    if (!menuOpen) return
    function close(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('click', close, true)
    return () => document.removeEventListener('click', close, true)
  }, [menuOpen])

  return (
    <div style={{ ...card, padding: 14, marginBottom: 12, opacity: inactive ? 0.5 : 1, position: 'relative' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {/* Image */}
        <div style={{
          width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
          background: 'var(--bg-primary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {product.image_url ? (
            <img src={product.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <Package size={24} color="var(--text-tertiary)" />
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </p>
            {inactive && (
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', background: 'var(--border)', padding: '2px 6px', borderRadius: 6 }}>Inactive</span>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0', textTransform: 'capitalize' }}>
            {product.category || 'Uncategorized'}
          </p>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: '4px 0 0' }}>
            {formatPrice(product.price)}
          </p>
          {isOut ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)' }}>Out of stock</span>
          ) : isLow ? (
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--error)' }}>Low stock: {stock}</span>
          ) : (
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>In stock: {stock}</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
          <button onClick={() => onEdit(product)} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
            <Edit2 size={18} color="var(--text-tertiary)" />
          </button>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }} style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer', display: 'flex' }}>
              <MoreVertical size={18} color="var(--text-tertiary)" />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: 28, zIndex: 20,
                background: 'var(--bg-card)', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                overflow: 'hidden', minWidth: 160,
              }}>
                <button
                  onClick={() => { setMenuOpen(false); onToggleActive(product) }}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {inactive ? <Eye size={16} /> : <EyeOff size={16} />}
                  {inactive ? 'Mark active' : 'Mark inactive'}
                </button>
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }} />
                <button
                  onClick={() => { setMenuOpen(false); onDelete(product) }}
                  style={{ width: '100%', padding: '10px 14px', fontSize: 14, color: 'var(--error)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Trash2 size={16} color="var(--error)" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onStatusChange, onPaymentChange, onToast }) {
  const st = STATUS_BADGE[order.status] || STATUS_BADGE.pending
  const pt = PAYMENT_BADGE[order.payment_status] || PAYMENT_BADGE.unpaid

  return (
    <div style={{ ...card, padding: 16, marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            {order.member_name || 'Unknown member'}
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
            {timeAgo(order.created_at)}
          </p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '4px 10px',
          borderRadius: 12, background: st.bg, color: st.color,
        }}>
          {st.label}
        </span>
      </div>

      {/* Items */}
      <div style={{ marginBottom: 10 }}>
        {(order.supplement_order_items || []).map((item, i) => (
          <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '3px 0' }}>
            {item.quantity}× {item.product_name_snapshot} — {formatPrice(item.unit_price_snapshot * item.quantity)}
          </p>
        ))}
      </div>

      {/* Notes */}
      {order.notes && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', fontStyle: 'italic', margin: '0 0 8px' }}>
          "{order.notes}"
        </p>
      )}

      {/* Bottom row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
          Total: {formatPrice(order.total_amount)}
        </span>
        <div>
          <span style={{ fontSize: 12, fontWeight: 600, color: pt.color }}>
            {order.payment_status === 'paid'
              ? `Paid${order.payment_method ? ` · ${order.payment_method.toUpperCase()}` : ''}`
              : 'Unpaid'}
          </span>
          {order.payment_status !== 'paid' && order.payment_method && (
            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>
              Member says: will pay {order.payment_method}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <OrderActions order={order} onStatusChange={onStatusChange} onPaymentChange={onPaymentChange} onToast={onToast} />
    </div>
  )
}

function OrderActions({ order, onStatusChange, onPaymentChange, onToast }) {
  const [showComplete, setShowComplete] = useState(false)
  const [showCancel, setShowCancel]     = useState(false)
  const [showPay, setShowPay]           = useState(false)
  const [paymentReceived, setPaymentReceived] = useState(true)
  const [payMethod, setPayMethod]       = useState(order.payment_method || 'cash')
  const [busy, setBusy]                 = useState(false)

  const btnBase = {
    height: 40, borderRadius: 12, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 6, flex: 1, border: '1px solid var(--text-primary)',
    background: 'var(--bg-card)', color: 'var(--text-primary)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  }

  async function handleMarkReady() {
    setBusy(true)
    try {
      await onStatusChange(order.id, 'ready_for_pickup')
      onToast('Order marked ready for pickup')
    } catch (e) { onToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  async function handleCancel() {
    setBusy(true)
    try {
      await onStatusChange(order.id, 'cancelled')
      onToast('Order cancelled, stock restored')
      setShowCancel(false)
    } catch (e) { onToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  async function handleComplete() {
    setBusy(true)
    try {
      await onStatusChange(order.id, 'completed')
      if (paymentReceived) {
        await onPaymentChange(order.id, payMethod)
      }
      onToast('Order completed')
      setShowComplete(false)
    } catch (e) { onToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  async function handleMarkPaid() {
    setBusy(true)
    try {
      await onPaymentChange(order.id, payMethod)
      onToast('Payment recorded')
      setShowPay(false)
    } catch (e) { onToast(e.message, 'error') }
    finally { setBusy(false) }
  }

  if (order.status === 'pending') {
    return (
      <>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleMarkReady} disabled={busy} style={btnBase}>
            <CheckCircle size={14} /> Mark Ready
          </button>
          <button onClick={() => setShowCancel(true)} disabled={busy} style={{ ...btnBase, color: 'var(--error)', borderColor: 'var(--error)' }}>
            <XCircle size={14} color="var(--error)" /> Cancel
          </button>
        </div>
        <BottomSheet open={showCancel} onClose={() => setShowCancel(false)} title="Cancel Order?">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 12px' }}>
            Stock will be restored to inventory for all items in this order.
          </p>
          <PrimaryButton onClick={handleCancel} disabled={busy} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
            {busy ? 'Cancelling…' : 'Yes, Cancel Order'}
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (order.status === 'ready_for_pickup') {
    return (
      <>
        <button onClick={() => setShowComplete(true)} disabled={busy} style={btnBase}>
          <CheckCircle size={14} /> Mark Completed
        </button>
        <BottomSheet open={showComplete} onClose={() => setShowComplete(false)} title="Mark this order as completed?">
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, color: 'var(--text-primary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={paymentReceived} onChange={e => setPaymentReceived(e.target.checked)}
                style={{ width: 20, height: 20, accentColor: 'var(--text-cta)' }} />
              Payment received
            </label>
          </div>
          {paymentReceived && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['cash', 'upi'].map(m => (
                <button key={m} onClick={() => setPayMethod(m)} style={{
                  flex: 1, height: 40, borderRadius: 10, fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', border: payMethod === m ? '2px solid var(--text-cta)' : '1px solid rgba(0,0,0,0.08)',
                  background: payMethod === m ? 'var(--accent-bg)' : 'var(--bg-card)',
                  color: payMethod === m ? 'var(--text-cta)' : 'var(--text-primary)',
                }}>
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          )}
          <PrimaryButton onClick={handleComplete} disabled={busy}>
            {busy ? 'Processing…' : 'Confirm'}
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  if (order.status === 'completed' && order.payment_status === 'unpaid') {
    return (
      <>
        <button onClick={() => setShowPay(true)} style={{ ...btnBase, color: 'var(--success)', borderColor: 'var(--success)' }}>
          Mark Paid
        </button>
        <BottomSheet open={showPay} onClose={() => setShowPay(false)} title="Record Payment">
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            {['cash', 'upi'].map(m => (
              <button key={m} onClick={() => setPayMethod(m)} style={{
                flex: 1, height: 40, borderRadius: 10, fontSize: 14, fontWeight: 500,
                cursor: 'pointer', border: payMethod === m ? '2px solid var(--text-cta)' : '1px solid rgba(0,0,0,0.08)',
                background: payMethod === m ? 'var(--accent-bg)' : 'var(--bg-card)',
                color: payMethod === m ? 'var(--text-cta)' : 'var(--text-primary)',
              }}>
                {m.toUpperCase()}
              </button>
            ))}
          </div>
          <PrimaryButton onClick={handleMarkPaid} disabled={busy}>
            {busy ? 'Processing…' : `Mark Paid · ${payMethod.toUpperCase()}`}
          </PrimaryButton>
        </BottomSheet>
      </>
    )
  }

  return null
}

// ── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{ ...card, padding: 14, marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ width: 64, height: 64, borderRadius: 12, background: 'var(--bg-pill)', animation: 'skel 1.2s ease infinite alternate' }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 14, width: '60%', background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease infinite alternate' }} />
          <div style={{ height: 12, width: '40%', background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease 0.2s infinite alternate' }} />
          <div style={{ height: 14, width: '30%', background: 'var(--bg-pill)', borderRadius: 4, animation: 'skel 1.2s ease 0.4s infinite alternate' }} />
        </div>
      </div>
    </div>
  )
}

// ── Delete confirmation sheet ────────────────────────────────────────────────

function DeleteConfirmSheet({ open, onClose, product, onConfirm }) {
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    setBusy(true)
    try {
      await onConfirm(product)
      onClose()
    } catch {
      // error handled in parent
    } finally {
      setBusy(false)
    }
  }

  if (!product) return null

  return (
    <BottomSheet open={open} onClose={onClose} title="Delete Product?">
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '0 0 16px' }}>
        Delete "{product.name}"? This cannot be undone.
      </p>
      <PrimaryButton onClick={handleDelete} disabled={busy} style={{ borderColor: 'var(--error)', color: 'var(--error)' }}>
        {busy ? 'Deleting…' : 'Delete Product'}
      </PrimaryButton>
    </BottomSheet>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function GymSupplements() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { activeGymId } = useActiveGym()

  const [moreOpen, setMoreOpen]         = useState(false)
  const [tab, setTab]                   = useState('products')
  const [toast, setToast]               = useState(null)

  // Products state
  const [products, setProducts]         = useState([])
  const [lowStockCount, setLowStockCount] = useState(0)
  const [pendingOrderCount, setPendingOrderCount] = useState(0)
  const [productsLoading, setProductsLoading] = useState(true)
  const [showProductForm, setShowProductForm] = useState(false)
  const [editProduct, setEditProduct]   = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  // Orders state
  const [orders, setOrders]             = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [orderFilter, setOrderFilter]   = useState('pending')
  const pollRef = useRef(null)

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  // ── Load products ────────────────────────────────────────────────────────
  const loadProducts = useCallback(async () => {
    if (!activeGymId) return
    setProductsLoading(true)
    try {
      const qs = `?gym_id=${activeGymId}`
      const [allProducts, lowStock, pendingOrders] = await Promise.all([
        apiFetch(`/api/supplements/products${qs}`),
        apiFetch(`/api/supplements/products/low-stock${qs}`),
        apiFetch(`/api/supplements/orders?status=pending&gym_id=${activeGymId}`),
      ])
      setProducts(Array.isArray(allProducts) ? allProducts : [])
      setLowStockCount(Array.isArray(lowStock) ? lowStock.length : 0)
      setPendingOrderCount(Array.isArray(pendingOrders) ? pendingOrders.length : 0)
    } catch (err) {
      console.error('Load products error:', err)
    } finally {
      setProductsLoading(false)
    }
  }, [activeGymId])

  // ── Load orders ──────────────────────────────────────────────────────────
  const loadOrders = useCallback(async (filter) => {
    if (!activeGymId) return
    setOrdersLoading(true)
    try {
      const params = new URLSearchParams({ gym_id: activeGymId })
      if (filter && filter !== 'all') params.set('status', filter)
      const data = await apiFetch(`/api/supplements/orders?${params.toString()}`)
      setOrders(Array.isArray(data) ? data : [])
      if (filter === 'pending') setPendingOrderCount(Array.isArray(data) ? data.length : 0)
    } catch (err) {
      console.error('Load orders error:', err)
    } finally {
      setOrdersLoading(false)
    }
  }, [activeGymId])

  // Initial load
  useEffect(() => {
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      if (!activeGymId) {
        setProducts([]); setLowStockCount(0); setPendingOrderCount(0); setProductsLoading(false)
        return
      }
      loadProducts()
    })
    return () => { cancelled = true }
  }, [activeGymId, loadProducts])

  useEffect(() => {
    if (tab !== 'orders') return
    let cancelled = false
    Promise.resolve().then(() => {
      if (cancelled) return
      if (!activeGymId) { setOrders([]); setOrdersLoading(false); return }
      loadOrders(orderFilter)
    })
    return () => { cancelled = true }
  }, [tab, orderFilter, activeGymId, loadOrders])

  // Poll orders every 30s while on Orders tab
  useEffect(() => {
    if (tab !== 'orders') return
    pollRef.current = setInterval(() => {
      loadOrders(orderFilter)
    }, 30000)
    return () => clearInterval(pollRef.current)
  }, [tab, orderFilter, loadOrders])

  // ── Product actions ──────────────────────────────────────────────────────
  function handleProductSaved(saved) {
    loadProducts()
  }

  async function handleToggleActive(product) {
    try {
      await apiFetch(`/api/supplements/products/${product.id}?gym_id=${activeGymId}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      showToast(product.is_active ? 'Product deactivated' : 'Product activated')
      loadProducts()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  async function handleDeleteProduct(product) {
    try {
      await apiFetch(`/api/supplements/products/${product.id}?gym_id=${activeGymId}`, { method: 'DELETE' })
      showToast('Product deleted')
      loadProducts()
    } catch (err) {
      showToast(err.message, 'error')
      throw err
    }
  }

  // ── Order actions ────────────────────────────────────────────────────────
  async function handleStatusChange(orderId, newStatus) {
    await apiFetch(`/api/supplements/orders/${orderId}/status?gym_id=${activeGymId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
    loadOrders(orderFilter)
    loadProducts()
  }

  async function handlePaymentChange(orderId, method) {
    await apiFetch(`/api/supplements/orders/${orderId}/payment?gym_id=${activeGymId}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_method: method }),
    })
    loadOrders(orderFilter)
  }

  // ── Tab chip styles ──────────────────────────────────────────────────────
  // Segmented control: light grey container + white pill for active state.
  const tabStyle = (active) => ({
    flex: 1, height: 32, borderRadius: 8, fontSize: 14, fontWeight: 600,
    cursor: 'pointer', border: 'none',
    background: active ? 'var(--bg-card)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
    transition: 'all 0.15s',
  })

  const filterChip = (active) => ({
    borderRadius: 999, padding: '6px 14px', fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
    border: active ? '1px solid var(--text-primary)' : '1px solid rgba(0,0,0,0.08)',
    background: 'var(--bg-card)',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    transition: 'all 0.15s',
  })

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes skel { from { opacity: 0.4; } to { opacity: 1; } }`}</style>

      {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}

      <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>
        {/* Top bar */}
        <div style={{
          background: 'var(--bg-card)', borderBottom: '1px solid rgba(0,0,0,0.08)',
          padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 4,
          position: 'sticky', top: 0, zIndex: 30,
        }}>
          <button onClick={() => navigate('/gym/dashboard')} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex' }}>
            <ChevronLeft size={22} color="var(--text-primary)" />
          </button>
          <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Supplement Store</span>
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'var(--bg-pill)', borderRadius: 10, padding: 3 }}>
            <button onClick={() => setTab('products')} style={tabStyle(tab === 'products')}>Products</button>
            <button onClick={() => setTab('orders')} style={{ ...tabStyle(tab === 'orders'), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              Orders
              {pendingOrderCount > 0 && (
                <span style={{
                  background: 'var(--error)', color: 'var(--bg-card)', fontSize: 10, fontWeight: 700,
                  minWidth: 16, height: 16, borderRadius: 8,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  padding: '0 3px',
                }}>
                  {pendingOrderCount > 9 ? '9+' : pendingOrderCount}
                </span>
              )}
            </button>
          </div>

          {/* ── Products Tab ──────────────────────────────────────────────── */}
          {tab === 'products' && (
            <>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: 0 }}>
                    {products.length} product{products.length !== 1 ? 's' : ''}
                    {lowStockCount > 0 && (
                      <> · <span style={{ color: 'var(--error)', fontWeight: 600 }}>{lowStockCount} low stock</span></>
                    )}
                  </p>
                </div>
                <button onClick={() => { setEditProduct(null); setShowProductForm(true) }}
                  style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 600, color: 'var(--text-cta)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Plus size={16} color="var(--text-cta)" /> New Product
                </button>
              </div>

              {/* Product list */}
              {productsLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              ) : products.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <Package size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    No products yet
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 20px', lineHeight: 1.4 }}>
                    Add your first supplement product to start selling to members
                  </p>
                  <PrimaryButton onClick={() => { setEditProduct(null); setShowProductForm(true) }}>
                    <Plus size={18} /> Add Product
                  </PrimaryButton>
                </div>
              ) : (
                products.map(p => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    onEdit={(prod) => { setEditProduct(prod); setShowProductForm(true) }}
                    onToggleActive={handleToggleActive}
                    onDelete={(prod) => setDeleteTarget(prod)}
                    onToast={showToast}
                  />
                ))
              )}
            </>
          )}

          {/* ── Orders Tab ────────────────────────────────────────────────── */}
          {tab === 'orders' && (
            <>
              {/* Filter row */}
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 14, scrollbarWidth: 'none' }}>
                {ORDER_FILTERS.map(f => (
                  <button key={f.key} onClick={() => setOrderFilter(f.key)} style={filterChip(orderFilter === f.key)}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Order list */}
              {ordersLoading ? (
                Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
              ) : orders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                  <ShoppingBag size={48} color="var(--text-tertiary)" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <p style={{ fontSize: 17, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 6px' }}>
                    No {orderFilter !== 'all' ? orderFilter.replace(/_/g, ' ') : ''} orders
                  </p>
                  <p style={{ fontSize: 14, color: 'var(--text-tertiary)', margin: 0 }}>
                    Orders from members will appear here
                  </p>
                </div>
              ) : (
                orders.map(order => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    onStatusChange={handleStatusChange}
                    onPaymentChange={handlePaymentChange}
                    onToast={showToast}
                  />
                ))
              )}
            </>
          )}
        </div>

        <GymBottomNav onMorePress={() => setMoreOpen(true)} />
        <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
      </div>

      {/* Product form sheet */}
      <ProductFormSheet
        open={showProductForm}
        onClose={() => { setShowProductForm(false); setEditProduct(null) }}
        product={editProduct}
        onSaved={handleProductSaved}
        onToast={showToast}
        gymId={activeGymId}
      />

      {/* Delete confirmation */}
      <DeleteConfirmSheet
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        product={deleteTarget}
        onConfirm={handleDeleteProduct}
      />
    </>
  )
}
