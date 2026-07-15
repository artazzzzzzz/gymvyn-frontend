import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../utils/supabase'
import { createManualCheckinSearchController } from '../utils/manualCheckinSearch'

const API = import.meta.env.VITE_API_URL || ''

export function useManualCheckinSearch({ gymId, debounceMs = 350, minLength = 2 }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [rawSearchResults, setRawSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const controllerRef = useRef(null)
  const latestQueryRef = useRef('')

  const applyState = useCallback(next => {
    latestQueryRef.current = next.query
    setSearchQuery(next.query)
    setRawSearchResults(next.results)
    setSearching(next.searching)
    setSearchError(next.error)
  }, [])

  const searchMembers = useCallback(async (query, { signal }) => {
    if (!gymId) return []
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`${API}/api/gym-members-search/${gymId}?q=${encodeURIComponent(query)}`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
      signal,
    })
    const data = await res.json().catch(() => [])
    if (!res.ok) throw new Error(data.error || data.message || 'Search failed')
    return Array.isArray(data) ? data : []
  }, [gymId])

  useEffect(() => {
    const controller = createManualCheckinSearchController({
      searchMembers,
      onState: applyState,
      debounceMs,
      minLength,
    })
    controllerRef.current = controller

    if (latestQueryRef.current) {
      controller.setQuery(latestQueryRef.current)
    }

    return () => {
      controller.dispose()
      if (controllerRef.current === controller) {
        controllerRef.current = null
      }
    }
  }, [applyState, debounceMs, minLength, searchMembers])

  const clearSearch = useCallback(() => {
    controllerRef.current?.clear()
  }, [])

  const updateSearchQuery = useCallback(value => {
    controllerRef.current?.setQuery(value)
  }, [])

  return {
    searchQuery,
    setSearchQuery: updateSearchQuery,
    rawSearchResults,
    searching,
    searchError,
    clearSearch,
  }
}
