import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Package } from 'lucide-react'
import { supabase } from '../utils/supabase'

const BASE = import.meta.env.VITE_API_URL

async function authFetch(path) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session?.access_token}`,
    },
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `Request failed (${res.status})`)
  }
  return res.json()
}

const STATUS_CONFIG = {
  pending:          { label: 'Pending',          bg: 'var(--warning-bg)', color: 'var(--warning)' },
  ready_for_pickup: { label: 'Ready for Pickup', bg: 'var(--accent-bg)', color: 'var(--text-cta)' },
  completed:        { label: 'Completed',        bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelled:        { label: 'Cancelled',        bg: 'var(--error-bg)', color: 'var(--error)' },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, bg: 'var(--bg-pill)', color: "var(--text-secondary)" }
  return (
    <span style={{
      padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700,
      background: cfg.bg, color: cfg.color, textTransform: 'capitalize',
    }}>
      {cfg.label}
    </span>
  )
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

function Skeleton({ width = '100%', height = 16, radius = 8, style = {} }) {
  return (
    <div style={{
      width, height, borderRadius: radius,
      background: 'linear-gradient(90deg, var(--bg-pill) 25%, var(--border) 50%, var(--bg-pill) 75%)',
      backgroundSize: '200% 100%',
      animation: 'gv-pulse 1.4s ease-in-out infinite',
      ...style,
    }} />
  )
}

export default function SupplementOrders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [toast, setToast] = useState('')
  const intervalRef = useRef(null)
  const lastKnownStatusesRef = useRef({})

  function loadOrders() {
    setLoading(true)
    setFetchError(null)
    authFetch('/api/supplements/orders/mine')
      .then(newOrders => {
        const prev = lastKnownStatusesRef.current
        if (Object.keys(prev).length > 0) {
          for (const order of newOrders) {
            if (prev[order.id] && prev[order.id] !== order.status) {
              if (order.status === 'ready_for_pickup') {
                setToast('Your order is ready for pickup!')
                setTimeout(() => setToast(''), 3500)
                break
              }
            }
          }
        }
        const map = {}
        for (const o of newOrders) map[o.id] = o.status
        lastKnownStatusesRef.current = map
        setOrders(newOrders)
      })
      .catch(err => { console.error('Orders load error:', err); setFetchError('Failed to load orders') })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadOrders()
    intervalRef.current = setInterval(loadOrders, 30000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const filters = ['all', 'pending', 'ready_for_pickup', 'completed', 'cancelled']
  const filterLabels = { all: 'All', pending: 'Pending', ready_for_pickup: 'Ready', completed: 'Completed', cancelled: 'Cancelled' }

  const filtered = activeFilter === 'all' ? orders : orders.filter(o => o.status === activeFilter)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100, position: 'relative' }}>
      <style>{`@keyframes gv-pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>

      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--bg-card)", borderBottom: '1px solid rgba(0,0,0,0.06)',
        height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', paddingTop: 'env(safe-area-inset-top)', gap: 12,
      }}>
        <button onClick={() => navigate('/my-gym')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>My Orders</span>
      </div>

      <div style={{ paddingTop: 72, paddingInline: 16 }}>
        {/* Filter pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 16, WebkitOverflowScrolling: 'touch' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                whiteSpace: 'nowrap', padding: '7px 16px', borderRadius: 20,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                border: activeFilter === f ? 'none' : '0.5px solid rgba(0,0,0,0.12)',
                background: activeFilter === f ? "var(--text-primary)" : "var(--bg-card)",
                color: activeFilter === f ? "var(--bg-card)" : "var(--text-secondary)",
              }}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>

        {/* Orders list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3].map(i => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: 16, padding: 16, border: '0.5px solid rgba(0,0,0,0.06)' }}>
                <Skeleton height={14} width="50%" style={{ marginBottom: 10 }} />
                <Skeleton height={12} width="70%" style={{ marginBottom: 6 }} />
                <Skeleton height={12} width="40%" />
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}><p style={{ fontSize: 14, color: 'var(--error)', fontWeight: 500, marginBottom: 16 }}>{fetchError}</p><button onClick={loadOrders} style={{ height: 40, padding: '0 20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer' }}>Try again</button></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <Package size={40} color="var(--text-tertiary)" style={{ marginBottom: 12 }} />
            <p style={{ fontSize: 14, color: "var(--text-tertiary)" }}>
              {activeFilter === 'all' ? 'No orders yet' : `No ${filterLabels[activeFilter].toLowerCase()} orders`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(order => {
              const itemCount = order.supplement_order_items?.length || 0
              const itemSummary = order.supplement_order_items
                ?.slice(0, 2)
                .map(i => i.product_name_snapshot)
                .join(', ') || '—'
              const hasMore = itemCount > 2

              return (
                <button
                  key={order.id}
                  onClick={() => navigate(`/my-gym/orders/${order.id}`)}
                  style={{
                    background: "var(--bg-card)", borderRadius: 16, padding: 16,
                    border: '0.5px solid rgba(0,0,0,0.06)',
                    textAlign: 'left', cursor: 'pointer', width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <StatusBadge status={order.status} />
                    <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{formatDate(order.created_at)}</span>
                  </div>

                  <p style={{ fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>
                    {itemSummary}{hasMore ? ` +${itemCount - 2} more` : ''}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>₹{order.total_amount}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                        {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                      </span>
                      <ChevronRight size={14} color="var(--text-tertiary)" />
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: "var(--text-primary)", color: "var(--bg-card)", padding: '10px 20px', borderRadius: 12,
          fontSize: 13, fontWeight: 600, zIndex: 300, whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
