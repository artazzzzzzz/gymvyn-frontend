import { useState, useEffect, useCallback } from 'react'
import { useStaffPermissions } from '../../hooks/useStaffPermissions'
import NoAccessState from '../../components/staff/NoAccessState'
import { supabase } from '../../utils/supabase'

const API = import.meta.env.VITE_API_URL || ''

function LoadingSpinner() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        border: '2px solid var(--border-strong)', borderTopColor: 'var(--text-primary)',
        animation: 'spin 0.7s linear infinite',
      }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const STATUS_META = {
  pending:          { label: 'Pending',          bg: 'var(--warning-bg)',  color: 'var(--warning)' },
  ready_for_pickup: { label: 'Ready for Pickup',  bg: 'var(--accent-bg)',   color: 'var(--accent)' },
  completed:        { label: 'Completed',         bg: 'var(--success-bg)', color: 'var(--success)' },
  cancelled:        { label: 'Cancelled',         bg: 'var(--error-bg)',   color: 'var(--error)' },
}

const NEXT_ACTIONS = {
  pending:          [{ status: 'ready_for_pickup', label: 'Mark Ready' }, { status: 'cancelled', label: 'Cancel' }],
  ready_for_pickup: [{ status: 'completed', label: 'Mark Delivered' }, { status: 'cancelled', label: 'Cancel' }],
}

const STATUS_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'ready_for_pickup', label: 'Ready' },
  { key: 'completed', label: 'Done' },
]

async function staffApiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  return res
}

function OrderCard({ order, onStatusUpdate }) {
  const [updating, setUpdating] = useState(null)
  const meta = STATUS_META[order.status] || { label: order.status, bg: 'var(--bg-pill)', color: 'var(--text-secondary)' }
  const actions = NEXT_ACTIONS[order.status] || []

  const handleUpdate = async (newStatus) => {
    setUpdating(newStatus)
    try {
      const res = await staffApiFetch(`/api/staff/supplements/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) {
        const err = await res.json()
        alert(err.error || 'Update failed')
        return
      }
      onStatusUpdate(order.id, newStatus)
    } catch {
      alert('Network error')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--bg-card)', borderRadius: 16,
      border: '0.5px solid var(--border)', padding: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
            {order.member_name || 'Customer'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
            {order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
        <span style={{
          backgroundColor: meta.bg, color: meta.color,
          fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 20,
        }}>{meta.label}</span>
      </div>

      {(order.supplement_order_items || []).length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', marginBottom: 12,
        }}>
          {order.supplement_order_items.map((item, i) => (
            <div key={item.id || i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: i > 0 ? '6px 0 0' : 0,
              borderTop: i > 0 ? '0.5px solid var(--divider)' : 'none',
              marginTop: i > 0 ? 6 : 0,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
                {item.product_name_snapshot} × {item.quantity}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                ₹{(item.unit_price_snapshot * item.quantity).toFixed(0)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: actions.length > 0 ? 12 : 0 }}>
        <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Total</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
          ₹{Number(order.total_amount || 0).toFixed(0)}
        </span>
      </div>

      {actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8 }}>
          {actions.map(action => (
            <button
              key={action.status}
              onClick={() => handleUpdate(action.status)}
              disabled={!!updating}
              style={{
                flex: 1, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer',
                fontSize: 13, fontWeight: 600,
                backgroundColor: action.status === 'cancelled' ? 'var(--error-bg)' : 'var(--text-primary)',
                color: action.status === 'cancelled' ? 'var(--error)' : 'var(--bg-card)',
                opacity: updating ? 0.5 : 1,
              }}
            >{updating === action.status ? '...' : action.label}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StaffSupplements() {
  const { permissions, gymId, loading: permsLoading } = useStaffPermissions()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState(null)

  const showToast = (type, message) => {
    setToast({ type, message })
    setTimeout(() => setToast(null), 3000)
  }

  const fetchOrders = useCallback(async () => {
    if (!gymId) return
    setLoading(true)
    setFetchError(null)
    try {
      const statusParam = filter !== 'all' ? `?status=${filter}` : ''
      const res = await staffApiFetch(`/api/staff/supplements/orders${statusParam}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setOrders(Array.isArray(data) ? data : [])
    } catch {
      showToast('error', 'Failed to load orders')
      setFetchError('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [gymId, filter])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  const handleStatusUpdate = (orderId, newStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    showToast('success', 'Order updated')
  }

  if (permsLoading) return <LoadingSpinner />
  if (!permissions.view_supplements) return (
    <NoAccessState
      message="Supplements Access Required"
      subtitle="Ask your gym owner to grant you supplement view permission."
    />
  )

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: 'var(--bg-primary)', paddingBottom: 80,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        backgroundColor: 'var(--bg-card)', borderBottom: '0.5px solid var(--border)',
        padding: '16px 20px 12px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Orders</span>
          <button
            onClick={fetchOrders}
            style={{
              height: 32, padding: '0 14px', backgroundColor: 'var(--bg-pill)',
              border: 'none', borderRadius: 20, fontSize: 13, color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >↻ Refresh</button>
        </div>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {STATUS_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)} style={{
              flexShrink: 0, height: 32, padding: '0 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              backgroundColor: filter === f.key ? 'var(--text-primary)' : 'var(--bg-pill)',
              color: filter === f.key ? 'var(--bg-card)' : 'var(--text-secondary)',
              fontSize: 13, fontWeight: 500,
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        {loading ? (
          <LoadingSpinner />
        ) : fetchError ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 14, color: 'var(--error)', marginBottom: 16, fontWeight: 500 }}>{fetchError}</div>
            <button
              onClick={fetchOrders}
              style={{
                height: 40, padding: '0 20px', backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 20,
                fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer',
              }}
            >Try again</button>
          </div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center', color: 'var(--text-tertiary)' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>No orders</div>
            <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No supplement orders found</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orders.map(order => (
              <OrderCard key={order.id} order={order} onStatusUpdate={handleStatusUpdate} />
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div style={{
          position: 'fixed', top: 16, left: 16, right: 16, zIndex: 100,
          backgroundColor: toast.type === 'error' ? 'var(--error-bg)' : 'var(--success-bg)',
          borderRadius: 16, padding: '14px 16px',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: toast.type === 'error' ? 'var(--error)' : 'var(--success)' }}>
            {toast.message}
          </div>
        </div>
      )}
    </div>
  )
}
