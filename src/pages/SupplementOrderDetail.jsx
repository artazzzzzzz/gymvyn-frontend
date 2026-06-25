import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

async function authFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          bg: 'var(--warning-bg)', color: 'var(--warning)', description: 'Your order has been placed. The gym will prepare it soon.' },
  ready_for_pickup: { label: 'Ready for Pickup', bg: 'var(--accent-bg)', color: 'var(--text-cta)', description: 'Your order is ready! Head to the counter to pick it up.' },
  completed:        { label: 'Completed',        bg: 'var(--success-bg)', color: 'var(--success)', description: 'This order has been completed.' },
  cancelled:        { label: 'Cancelled',        bg: 'var(--error-bg)', color: 'var(--error)', description: 'This order was cancelled.' },
}

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export default function SupplementOrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const intervalRef = useRef(null)
  const lastKnownStatusRef = useRef(null)

  function showStatusToast(newStatus) {
    const messages = {
      ready_for_pickup: 'Your order is ready for pickup!',
      completed:        'Your order has been completed.',
      cancelled:        'Your order has been cancelled.',
    }
    const msg = messages[newStatus]
    if (msg) { setToast(msg); setTimeout(() => setToast(''), 3500) }
  }

  function loadOrder() {
    authFetch('/api/supplements/orders/mine')
      .then(orders => {
        const found = orders.find(o => o.id === orderId)
        if (found) {
          if (lastKnownStatusRef.current !== null && lastKnownStatusRef.current !== found.status) {
            showStatusToast(found.status)
          }
          lastKnownStatusRef.current = found.status
          setOrder(found)
        } else {
          setError('Order not found')
        }
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrder()
    intervalRef.current = setInterval(loadOrder, 30000)
    return () => clearInterval(intervalRef.current)
  }, [orderId])

  async function cancelOrder() {
    setCancelling(true)
    setError('')
    try {
      await authFetch(`/api/supplements/orders/${orderId}/cancel`, { method: 'PATCH' })
      setToast('Order cancelled')
      setTimeout(() => setToast(''), 2000)
      loadOrder()
    } catch (err) {
      setError(err.message)
    } finally {
      setCancelling(false)
    }
  }

  const cfg = order ? (STATUS_CONFIG[order.status] || { label: order.status, bg: 'var(--bg-pill)', color: "var(--text-secondary)", description: '' }) : null

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--bg-card)", borderBottom: '1px solid rgba(0,0,0,0.06)',
        height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        <button onClick={() => navigate('/my-gym/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Order Details</span>
      </div>

      <div style={{ paddingTop: 72, paddingInline: 16 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={24} color="var(--text-tertiary)" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : error && !order ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--error)', fontSize: 14 }}>{error}</div>
        ) : order && (
          <>
            {/* Status banner */}
            <div style={{
              background: cfg.bg, borderRadius: 16, padding: 20, marginBottom: 16,
              border: `0.5px solid ${cfg.color}22`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{
                  padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: `${cfg.color}18`, color: cfg.color,
                }}>
                  {cfg.label}
                </span>
              </div>
              <p style={{ fontSize: 14, color: cfg.color, lineHeight: 1.4 }}>{cfg.description}</p>
            </div>

            {/* Order info */}
            <div style={{
              background: "var(--bg-card)", borderRadius: 16, padding: 16,
              border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: 12,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Order placed</span>
                <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>{formatDateTime(order.created_at)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Payment</span>
                <span style={{
                  fontSize: 12, fontWeight: 600,
                  color: order.payment_status === 'paid' ? 'var(--success)' : 'var(--warning)',
                }}>
                  {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  {order.payment_method && ` · ${order.payment_method.toUpperCase()}`}
                </span>
              </div>
              {order.notes && (
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.04)', paddingTop: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Notes: </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{order.notes}</span>
                </div>
              )}
            </div>

            {/* Items */}
            <div style={{
              background: "var(--bg-card)", borderRadius: 16, padding: 16,
              border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: 12,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Items ({order.supplement_order_items?.length || 0})
              </span>

              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {order.supplement_order_items?.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 500 }}>{item.product_name_snapshot}</p>
                      <p style={{ fontSize: 12, color: "var(--text-tertiary)" }}>₹{item.unit_price_snapshot} × {item.quantity}</p>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                      ₹{item.unit_price_snapshot * item.quantity}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Total</span>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>₹{order.total_amount}</span>
              </div>
            </div>

            {/* Actions */}
            {order.status === 'pending' && (
              <button
                onClick={cancelOrder}
                disabled={cancelling}
                style={{
                  width: '100%', height: 48, borderRadius: 14,
                  background: "var(--bg-card)", color: 'var(--error)', fontSize: 14, fontWeight: 600,
                  border: '1px solid var(--error)', cursor: cancelling ? 'not-allowed' : 'pointer',
                  opacity: cancelling ? 0.6 : 1, marginTop: 8,
                }}
              >
                {cancelling ? 'Cancelling…' : 'Cancel Order'}
              </button>
            )}

            {error && order && (
              <div style={{
                marginTop: 12, padding: '12px 16px', borderRadius: 12,
                background: 'var(--error-bg)', fontSize: 13, color: 'var(--error)',
              }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: "var(--text-primary)", color: "var(--bg-card)", padding: '10px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 600, zIndex: 300,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
