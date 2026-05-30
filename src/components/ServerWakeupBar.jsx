import { useState, useEffect, useRef } from 'react'

const BASE = import.meta.env.VITE_API_URL || ''

export default function ServerWakeupBar() {
  const [phase, setPhase]       = useState('idle')
  const [elapsed, setElapsed]   = useState(0)
  const [visible, setVisible]   = useState(false)
  const [fadeOut, setFadeOut]   = useState(false)
  const mountedRef  = useRef(true)
  const pollRef     = useRef(null)
  const tickRef     = useRef(null)
  const startRef    = useRef(Date.now())

  useEffect(() => {
    mountedRef.current = true

    const showAfter = setTimeout(() => {
      if (mountedRef.current && phase !== 'ready') setVisible(true)
    }, 2800)

    const tick = () => {
      if (!mountedRef.current) return
      setElapsed(Math.round((Date.now() - startRef.current) / 1000))
      tickRef.current = setTimeout(tick, 1000)
    }
    tick()

    const ping = async () => {
      try {
        const res = await fetch(`${BASE}/api/health`, {
          signal: AbortSignal.timeout(9000),
        })
        if (res.ok) {
          if (!mountedRef.current) return
          setPhase('ready')
          clearTimeout(tickRef.current)
          setFadeOut(true)
          setTimeout(() => {
            if (mountedRef.current) setVisible(false)
          }, 700)
          return
        }
      } catch {}
      if (mountedRef.current) {
        setPhase('waking')
        pollRef.current = setTimeout(ping, 3500)
      }
    }
    ping()

    return () => {
      mountedRef.current = false
      clearTimeout(showAfter)
      clearTimeout(pollRef.current)
      clearTimeout(tickRef.current)
    }
  }, [])

  if (!visible) return null

  const isReady = phase === 'ready'

  return (
    <>
      <div style={{
        position:   'fixed',
        top:        0, left: 0, right: 0,
        height:     '3px',
        zIndex:     99999,
        overflow:   'hidden',
        background: 'rgba(183,16,42,0.15)',
        opacity:    fadeOut ? 0 : 1,
        transition: 'opacity 0.7s ease',
      }}>
        {!isReady && (
          <div style={{
            position:   'absolute',
            top: 0, bottom: 0,
            width:      '45%',
            background: 'linear-gradient(90deg, transparent, #b7102a, #e8354a, #b7102a, transparent)',
            animation:  'nippon-sweep 1.6s ease-in-out infinite',
          }} />
        )}
        {isReady && (
          <div style={{
            position:   'absolute',
            top: 0, bottom: 0, left: 0,
            width:      '100%',
            background: '#22c55e',
            transition: 'width 0.4s ease',
          }} />
        )}
      </div>

      <div style={{
        position:    'fixed',
        bottom:      '24px',
        left:        '50%',
        transform:   'translateX(-50%)',
        zIndex:      99998,
        display:     'flex',
        alignItems:  'center',
        gap:         '10px',
        background:  'rgba(13, 20, 36, 0.95)',
        border:      '1px solid rgba(183,16,42,0.35)',
        borderRadius:'999px',
        padding:     '9px 18px',
        boxShadow:   '0 8px 32px rgba(0,0,0,0.45)',
        backdropFilter: 'blur(12px)',
        opacity:     fadeOut ? 0 : 1,
        transition:  'opacity 0.7s ease',
        whiteSpace:  'nowrap',
      }}>
        {!isReady ? (
          <>
            <span style={{
              width: '14px', height: '14px',
              border: '2px solid rgba(183,16,42,0.3)',
              borderTopColor: '#b7102a',
              borderRadius: '50%',
              display: 'inline-block',
              flexShrink: 0,
              animation: 'nippon-spin 0.75s linear infinite',
            }} />
            <span style={{ color: '#f9fafb', fontSize: '13px', fontWeight: 500 }}>
              Server is starting up
            </span>
            <span style={{
              background: 'rgba(183,16,42,0.18)',
              color: '#f87171',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '999px',
            }}>
              {elapsed}s
            </span>
            <span style={{ color: 'rgba(249,250,251,0.4)', fontSize: '12px' }}>
              may take ~30s
            </span>
          </>
        ) : (
          <>
            <span style={{ color: '#22c55e', fontSize: '15px' }}>✓</span>
            <span style={{ color: '#f9fafb', fontSize: '13px', fontWeight: 500 }}>
              Server ready
            </span>
          </>
        )}
      </div>

      <style>{`
        @keyframes nippon-sweep {
          0%   { left: -50%; }
          100% { left: 110%; }
        }
        @keyframes nippon-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
