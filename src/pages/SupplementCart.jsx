import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Trash2, Plus, Minus, Package } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useCart } from '../contexts/CartContext'

const BASE = import.meta.env.VITE_API_URL

export default function SupplementCart() {
  const navigate = useNavigate()
  const { items, updateQty, removeItem, clearCart, totalAmount } = useCart()
  const [notes, setNotes] = useState('')
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  async function placeOrder() {
    if (items.length === 0) return
    setPlacing(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${BASE}/api/supplements/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          items: items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
          payment_method: paymentMethod,
          notes: notes.trim() || null,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (res.status === 409 && data.insufficient_items) {
          const lines = data.insufficient_items.map(
            i => `${i.name}: only ${i.available} left`
          )
          setError(`Stock issue: ${lines.join(', ')}`)
        } else {
          setError(data.error || 'Failed to place order')
        }
        return
      }

      clearCart()
      setToast('Order placed!')
      setTimeout(() => navigate(`/my-gym/orders/${data.order_id}`, { replace: true }), 1000)
    } catch (err) {
      setError(err.message || 'Something went wrong')
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 200 }}>
      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--bg-card)", borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
      }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Cart</span>
        <span style={{ fontSize: 13, color: "var(--text-tertiary)", marginLeft: 4 }}>({items.length} items)</span>
      </div>

      <div style={{ paddingTop: 72, paddingInline: 16 }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 14, color: "var(--text-tertiary)", marginBottom: 16 }}>Your cart is empty</p>
            <button
              onClick={() => navigate('/my-gym/supplements')}
              style={{
                padding: '12px 24px', borderRadius: 14, background: "var(--bg-card)",
                border: '1px solid var(--text-primary)', color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Browse Supplements
            </button>
          </div>
        ) : (
          <>
            {/* Cart items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {items.map(item => (
                <div key={item.product_id} style={{
                  background: "var(--bg-card)", borderRadius: 16, padding: 14,
                  border: '0.5px solid var(--border)',
                  display: 'flex', gap: 12,
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 12, background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Package size={20} color="var(--text-tertiary)" />
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>{item.name}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>₹{item.price * item.quantity}</p>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-pill)', borderRadius: 10, overflow: 'hidden' }}>
                        <button
                          onClick={() => updateQty(item.product_id, item.quantity - 1)}
                          style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Minus size={14} color="var(--text-primary)" />
                        </button>
                        <span style={{ width: 28, textAlign: 'center', fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{item.quantity}</span>
                        <button
                          onClick={() => updateQty(item.product_id, item.quantity + 1)}
                          style={{ width: 36, height: 36, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Plus size={14} color="var(--text-primary)" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.product_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 6 }}
                      >
                        <Trash2 size={16} color="var(--error)" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any special instructions..."
                rows={2}
                style={{
                  width: '100%', padding: 14, borderRadius: 14,
                  border: '0.5px solid var(--border)', background: "var(--bg-card)",
                  fontSize: 14, color: "var(--text-primary)", resize: 'none', outline: 'none',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Payment method */}
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                Payment Method
              </label>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                {[
                  { value: 'cash', label: 'Cash' },
                  { value: 'upi', label: 'UPI' },
                ].map(opt => {
                  const selected = paymentMethod === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setPaymentMethod(opt.value)}
                      style={{
                        flex: 1, padding: '14px 0', borderRadius: 14, fontSize: 14,
                        cursor: 'pointer', background: "var(--bg-card)",
                        color: selected ? "var(--text-primary)" : "var(--text-secondary)",
                        fontWeight: selected ? 700 : 500,
                        border: selected ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setPaymentMethod(null)}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 14, fontSize: 14,
                  cursor: 'pointer', background: "var(--bg-card)",
                  color: paymentMethod === null ? "var(--text-primary)" : "var(--text-secondary)",
                  fontWeight: paymentMethod === null ? 700 : 500,
                  border: paymentMethod === null ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                }}
              >
                I'll decide later
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                marginTop: 16, padding: '12px 16px', borderRadius: 12,
                background: 'var(--error-bg)', border: '0.5px solid rgba(163,45,45,0.2)',
                fontSize: 13, color: 'var(--error)', lineHeight: 1.4,
              }}>
                {error}
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom CTA — sits above BottomNav (h-16 = 64px) */}
      {items.length > 0 && (
        <div style={{
          position: 'fixed', bottom: 64, left: 0, right: 0, zIndex: 49,
          background: "var(--bg-card)", borderTop: '1px solid var(--border)',
          padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", fontWeight: 500 }}>Total</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>₹{totalAmount}</div>
            </div>
            <button
              onClick={placeOrder}
              disabled={placing}
              style={{
                height: 48, paddingInline: 28, borderRadius: 14,
                background: placing ? 'var(--bg-primary)' : "var(--bg-card)",
                color: placing ? "var(--text-tertiary)" : "var(--text-primary)",
                border: placing ? '1px solid var(--border)' : '1px solid var(--text-primary)',
                fontSize: 15, fontWeight: 600, cursor: placing ? 'not-allowed' : 'pointer',
                boxShadow: placing ? 'none' : '0 1px 3px var(--border)',
                whiteSpace: 'nowrap',
              }}
            >
              {placing ? 'Placing…' : 'Place Order'}
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 148, left: '50%', transform: 'translateX(-50%)',
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
