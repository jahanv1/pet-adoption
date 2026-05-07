import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext(null)

const CURSOR_COLORS = {
  dark:     '#FF6B35',
  starry:   '#E8C547',
  wild:     '#E8792A',
  dusk:     '#7D4E6A',
  bold:     '#FF2233',
  forest:   '#52B788',
  heritage: '#F7F5D0',
  noir:     '#88CCDD',
  blossom:  '#E8A0A0',
}

function buildCursorStyle(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="32" height="32"><defs><filter id="b"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter></defs><ellipse cx="50" cy="65" rx="22" ry="20" fill="${color}" opacity="0.9" filter="url(#b)"/><ellipse cx="32" cy="38" rx="9" ry="11" fill="${color}" opacity="0.85" transform="rotate(-15 32 38)" filter="url(#b)"/><ellipse cx="44" cy="30" rx="8" ry="11" fill="${color}" opacity="0.85" transform="rotate(-5 44 30)" filter="url(#b)"/><ellipse cx="57" cy="30" rx="8" ry="11" fill="${color}" opacity="0.85" transform="rotate(5 57 30)" filter="url(#b)"/><ellipse cx="69" cy="38" rx="9" ry="11" fill="${color}" opacity="0.85" transform="rotate(15 69 38)" filter="url(#b)"/></svg>`
  const url = `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}") 8 8, auto`
  return `*, *::before, *::after { cursor: ${url} !important; }`
}

function applyThemeCursor(theme) {
  const color = CURSOR_COLORS[theme] || '#FF6B35'
  let el = document.getElementById('paws-cursor-style')
  if (!el) { el = document.createElement('style'); el.id = 'paws-cursor-style'; document.head.appendChild(el) }
  el.textContent = buildCursorStyle(color)
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('paws-theme') || 'dark'
  })

  const setTheme = (t) => {
    setThemeState(t)
    localStorage.setItem('paws-theme', t)
    document.documentElement.setAttribute('data-theme', t)
    applyThemeCursor(t)
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    applyThemeCursor(theme)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
