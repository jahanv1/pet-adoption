import { useState } from 'react'
import { useTheme } from '../context/ThemeContext'

const THEMES = [
  {
    id: 'starry',
    name: 'STARRY NIGHT',
    swatches: ['#0A0E2A', '#111638', '#E8C547', '#4A90C4'],
  },
  {
    id: 'dark',
    name: 'DARK',
    swatches: ['#0d0d0d', '#1a1a1a', '#FF6B35', '#FFE135'],
  },
  {
    id: 'wild',
    name: 'WILD',
    swatches: ['#2D3D2A', '#1E2B1C', '#E8792A', '#5A7A3A'],
  },
  {
    id: 'dusk',
    name: 'DUSK',
    swatches: ['#F5F3F4', '#2D2D2D', '#7D4E6A', '#4A3650'],
  },
  {
    id: 'bold',
    name: 'BOLD',
    swatches: ['#000B2E', '#001547', '#FF2233', '#0A2280'],
  },
  {
    id: 'forest',
    name: 'FOREST',
    swatches: ['#091413', '#0e1e1c', '#2D6A4F', '#52B788'],
  },
  {
    id: 'heritage',
    name: 'HERITAGE',
    swatches: ['#A82323', '#7a1a1a', '#F7F5D0', '#6B8F71'],
  },
  {
    id: 'noir',
    name: 'NOIR',
    swatches: ['#0d0d0d', '#181818', '#6B1A1A', '#3D7A8A'],
  },
  {
    id: 'blossom',
    name: 'BLOSSOM',
    swatches: ['#FFF5F0', '#ffffff', '#E8A0A0', '#4A8B7B'],
  },
]

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="theme-sw">
      <button
        className="theme-sw-trigger"
        onClick={() => setOpen(!open)}
        aria-label="Switch theme"
        title="Switch theme"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      </button>

      {open && (
        <>
          <div className="theme-sw-backdrop" onClick={() => setOpen(false)} />
          <div className="theme-sw-panel">
            <p className="theme-sw-label">THEME</p>
            <div className="theme-sw-list">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-sw-item ${theme === t.id ? 'active' : ''}`}
                  onClick={() => { setTheme(t.id); setOpen(false) }}
                >
                  <div className="theme-sw-stripes">
                    {t.swatches.map((color, i) => (
                      <div key={i} className="theme-sw-stripe" style={{ background: color }} />
                    ))}
                  </div>
                  <span className="theme-sw-name">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
