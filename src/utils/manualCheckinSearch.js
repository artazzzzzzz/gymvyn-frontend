export function normalizeManualCheckinQuery(value) {
  return String(value || '').trim()
}

export function mergeInsideStatus(results, membersInside) {
  const insideIds = new Set((membersInside || []).map(member => member.member_id))
  return (results || []).map(member => ({ ...member, is_inside: insideIds.has(member.member_id) }))
}

export function createPendingActionGuard() {
  const pending = new Set()

  return {
    start(key) {
      if (!key || pending.has(key)) return false
      pending.add(key)
      return true
    },
    finish(key) {
      pending.delete(key)
    },
    isPending(key) {
      return pending.has(key)
    },
  }
}

export function createManualCheckinSearchController({
  searchMembers,
  onState,
  debounceMs = 350,
  minLength = 2,
}) {
  let state = { query: '', results: [], searching: false, error: '' }
  let timeoutId = null
  let abortController = null
  let requestSeq = 0
  let disposed = false

  const emit = next => {
    state = { ...state, ...next }
    onState?.(state)
  }

  const cancelActive = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const setQuery = value => {
    if (disposed) return
    const query = String(value || '')
    const normalized = normalizeManualCheckinQuery(query)
    requestSeq += 1
    const seq = requestSeq
    cancelActive()
    emit({ query })

    if (normalized.length < minLength) {
      emit({ results: [], searching: false, error: '' })
      return
    }

    timeoutId = setTimeout(async () => {
      timeoutId = null
      abortController = new AbortController()
      emit({ searching: true, error: '' })

      try {
        const results = await searchMembers(normalized, { signal: abortController.signal })
        if (!disposed && requestSeq === seq) {
          emit({ results: Array.isArray(results) ? results : [], searching: false, error: '' })
        }
      } catch (err) {
        if (err.name === 'AbortError') return
        if (!disposed && requestSeq === seq) {
          emit({ results: [], searching: false, error: err.message || 'Search failed' })
        }
      } finally {
        if (requestSeq === seq) abortController = null
      }
    }, debounceMs)
  }

  const clear = () => setQuery('')

  const dispose = () => {
    disposed = true
    requestSeq += 1
    cancelActive()
  }

  return {
    setQuery,
    clear,
    dispose,
    getState: () => state,
  }
}
