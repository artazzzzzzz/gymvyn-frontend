export function getAsyncViewState({ loading, error, hasData, permissionDenied = false }) {
  if (permissionDenied) return 'permission'
  if (loading && !hasData) return 'loading'
  if (error) return 'error'
  if (!hasData) return 'empty'
  if (loading) return 'refreshing'
  return 'data'
}

export function shouldShowDelayedLoading(startedAt, now = Date.now(), delayMs = 180) {
  return Boolean(startedAt) && now - startedAt >= delayMs
}
