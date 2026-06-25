import { createContext, useContext, useState, useEffect, useLayoutEffect } from 'react'

const ThemeContext = createContext()
const STORAGE_KEY = 'gv_theme'

const applyTheme = (mode) => {
  const root = document.documentElement
  const resolved =
    mode === 'dark'
      ? 'dark'
      : mode === 'light'
        ? 'light'
        : window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
  if (resolved === 'dark') {
    root.setAttribute('data-theme', 'dark')
  } else {
    root.removeAttribute('data-theme')
  }
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEY) || 'system')

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  const setThemeMode = (mode) => {
    setTheme(mode)
    localStorage.setItem(STORAGE_KEY, mode)
  }

  return (
    <ThemeContext.Provider value={{ theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
