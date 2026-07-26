import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShoppingCart, Search, ChevronLeft, Plus, Minus, X, Package } from 'lucide-react'
import { supabase } from '../utils/supabase'
import { useCart } from '../contexts/CartContext'

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

function ProductDetailSheet({ product, onClose, onAdd }) {
  const [qty, setQty] = useState(1)
  if (!product) return null

  const outOfStock = product.stock_count < 1

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          zIndex: 200, transition: 'opacity 0.2s',
        }}
      />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
        background: "var(--bg-card)", borderRadius: '20px 20px 0 0',
        maxHeight: '85vh', overflowY: 'auto',
        animation: 'gv-sheet-up 0.25s ease-out',
      }}>
        <style>{`@keyframes gv-sheet-up { from { transform: translateY(100%) } to { transform: translateY(0) } }`}</style>

        <div style={{ padding: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Product Details</span>
          <button onClick={onClose} style={{ background: 'var(--bg-pill)', border: 'none', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text-primary)" />
          </button>
        </div>

        <div style={{ margin: '16px 20px 0', borderRadius: 16, overflow: 'hidden', background: 'var(--bg-primary)', border: '1px solid var(--border)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {product.image_url
            ? <img src={product.image_url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <Package size={48} color="var(--text-tertiary)" />
          }
        </div>

        <div style={{ padding: '16px 20px 0' }}>
          {product.category && (
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {product.category}
            </span>
          )}
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", margin: '4px 0 8px' }}>{product.name}</h3>
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>₹{product.price}</span>
        </div>

        {product.description && (
          <p style={{ padding: '12px 20px 0', fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            {product.description}
          </p>
        )}

        <div style={{ padding: '16px 20px 0' }}>
          {outOfStock ? (
            <span style={{ fontSize: 13, color: 'var(--error)', fontWeight: 600 }}>Out of stock</span>
          ) : (
            <span style={{ fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
              {product.stock_count} in stock
            </span>
          )}
        </div>

        {!outOfStock && (
          <div style={{ padding: '20px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, background: 'var(--bg-pill)', borderRadius: 12, overflow: 'hidden' }}>
              <button
                onClick={() => setQty(q => Math.max(1, q - 1))}
                style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Minus size={16} color="var(--text-primary)" />
              </button>
              <span style={{ width: 36, textAlign: 'center', fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{qty}</span>
              <button
                onClick={() => setQty(q => Math.min(product.stock_count, q + 1))}
                style={{ width: 44, height: 44, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Plus size={16} color="var(--text-primary)" />
              </button>
            </div>

            <button
              onClick={() => { onAdd(product, qty); onClose() }}
              style={{
                flex: 1, height: 48, borderRadius: 14,
                background: "var(--bg-card)", color: "var(--text-primary)", border: '1px solid var(--text-primary)',
                fontSize: 15, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 1px 3px var(--border)',
              }}
            >
              Add to Cart · ₹{product.price * qty}
            </button>
          </div>
        )}

        <div style={{ height: 'env(safe-area-inset-bottom, 16px)' }} />
      </div>
    </>
  )
}

export default function SupplementCatalog() {
  const navigate = useNavigate()
  const { addItem, totalItems } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    authFetch('/api/supplements/catalog')
      .then(setProducts)
      .catch(err => console.error('Catalog load error:', err))
      .finally(() => setLoading(false))
  }, [])

  const categories = ['All', ...new Set(products.map(p => p.category).filter(Boolean))]

  const filtered = products.filter(p => {
    if (activeCategory !== 'All' && p.category !== activeCategory) return false
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function handleAdd(product, qty) {
    addItem(product, qty)
    setToast(`${product.name} added to cart`)
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 100 }}>
      <style>{`@keyframes gv-pulse { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }`}</style>

      {/* Header */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--bg-card)", borderBottom: '1px solid var(--border)',
        height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', paddingTop: 'env(safe-area-inset-top)',
      }}>
        <button onClick={() => navigate('/my-gym')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>Supplement Store</span>
        <button
          onClick={() => navigate('/my-gym/supplements/cart')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative' }}
        >
          <ShoppingCart size={22} color="var(--text-primary)" />
          {totalItems > 0 && (
            <span style={{
              position: 'absolute', top: -6, right: -8,
              background: "var(--text-primary)", color: "var(--bg-card)", fontSize: 10, fontWeight: 700,
              width: 18, height: 18, borderRadius: 9,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {totalItems}
            </span>
          )}
        </button>
      </div>

      <div style={{ paddingTop: 72, paddingInline: 16 }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: "var(--bg-card)", borderRadius: 14, padding: '0 14px',
          border: '0.5px solid var(--border)', marginBottom: 12,
        }}>
          <Search size={16} color="var(--text-tertiary)" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search supplements..."
            style={{
              flex: 1, height: 44, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 14, color: "var(--text-primary)",
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                whiteSpace: 'nowrap', padding: '7px 16px', borderRadius: 20,
                fontSize: 13, fontWeight: 600, cursor: 'pointer',
                border: activeCategory === cat ? 'none' : '0.5px solid var(--border)',
                background: activeCategory === cat ? "var(--text-primary)" : "var(--bg-card)",
                color: activeCategory === cat ? "var(--bg-card)" : "var(--text-secondary)",
                flexShrink: 0,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: "var(--bg-card)", borderRadius: 16, padding: 12, border: '0.5px solid var(--border)' }}>
                <Skeleton height={120} radius={12} style={{ marginBottom: 10 }} />
                <Skeleton height={14} width="70%" style={{ marginBottom: 6 }} />
                <Skeleton height={12} width="40%" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: "var(--text-tertiary)", fontSize: 14 }}>
            {search ? 'No products match your search' : 'No supplements available'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {filtered.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedProduct(p)}
                style={{
                  background: "var(--bg-card)", borderRadius: 16, padding: 0, border: '0.5px solid var(--border)',
                  textAlign: 'left', cursor: 'pointer', overflow: 'hidden',
                }}
              >
                <div style={{ aspectRatio: '1', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <Package size={32} color="var(--text-tertiary)" />
                  }
                </div>
                <div style={{ padding: 12 }}>
                  {p.category && (
                    <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-tertiary)", textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {p.category}
                    </span>
                  )}
                  <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", margin: '2px 0 6px', lineHeight: 1.3 }}>
                    {p.name}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>₹{p.price}</span>
                    {p.stock_count < 1 && (
                      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--error)' }}>Out of stock</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product detail sheet */}
      {selectedProduct && (
        <ProductDetailSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={handleAdd}
        />
      )}

      {/* Toast */}
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
