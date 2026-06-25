import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const CartContext = createContext(null)

const STORAGE_KEY = 'ff_supplement_cart'

function loadCart(gymId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (parsed.gymId !== gymId) return []
    return Array.isArray(parsed.items) ? parsed.items : []
  } catch { return [] }
}

function saveCart(gymId, items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ gymId, items }))
}

export function CartProvider({ children, gymId }) {
  const [items, setItems] = useState(() => loadCart(gymId))

  useEffect(() => {
    if (gymId) setItems(loadCart(gymId))
  }, [gymId])

  useEffect(() => {
    if (gymId) saveCart(gymId, items)
  }, [gymId, items])

  const addItem = useCallback((product, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.product_id === product.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty }
        return next
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        quantity: qty,
        stock_count: product.stock_count,
      }]
    })
  }, [])

  const updateQty = useCallback((productId, qty) => {
    if (qty < 1) return removeItem(productId)
    setItems(prev => prev.map(i => i.product_id === productId ? { ...i, quantity: qty } : i))
  }, [])

  const removeItem = useCallback((productId) => {
    setItems(prev => prev.filter(i => i.product_id !== productId))
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clearCart, totalItems, totalAmount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
