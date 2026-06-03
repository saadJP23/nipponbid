import { useState, useEffect, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'

const BASE          = import.meta.env.VITE_API_URL || ''
const RECHECK_AFTER = 10 * 60 * 1000   // re-ping if last success was > 10 min ago

export default function ServerWakeupBar() {
  const location = useLocation()

  const [phase, setPhase]     = useState('idle')   // 'idle' | 'waking' | 'ready'
  const [elapsed, setElapsed] = useState(0)
  const [show, setShow]       = useState(false)
  const [fadeOut, setFadeOut] = useState(false)

  const mountedRef   = useRef(true)
  const pollRef      = useRef(null)
  const tickRef      = useRef(null)
  const startRef     = useRef(null)
  const revealRef    = useRef(null)
  const lastOkRef    = useRef(null)     // timestamp of last successful health ping
  const checkingRef  = useRef(false)    // prevent concurrent checks

  const stopAll = useCallback(() => {
    clearTimeout(pollRef.current)
    clearTimeout(tickRef.current)
    clearTimeout(revealRef.current)
  }, [])

  const startCheck = useCallback(() => {
    if (checkingRef.current) return
    checkingRef.current = true

    stopAll()
    startRef.current = Date.now()
    setPhase('idle')
    setFadeOut(false)
    setElapsed(0)
    setShow(false)

    // Only reveal the overlay if server doesn't respond within 1.5 s
    revealRef.current = setTimeout(() => {
      if (mountedRef.current && checkingRef.current) setShow(true)
    }, 1500)

    // Live timer
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
          lastOkRef.current  = Date.now()
          checkingRef.current = false
          clearTimeout(revealRef.current)
          clearTimeout(tickRef.current)
          setPhase('ready')
          setShow(true)      // ensure card visible for "ready" flash
          setFadeOut(true)
          setTimeout(() => {
            if (mountedRef.current) setShow(false)
          }, 900)
          return
        }
      } catch {}
      if (mountedRef.current) {
        setPhase('waking')
        pollRef.current = setTimeout(ping, 3500)
      }
    }
    ping()
  }, [stopAll])

  // ── Run on first mount ──
  useEffect(() => {
    mountedRef.current = true
    startCheck()
    return () => {
      mountedRef.current = false
      stopAll()
    }
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-check on route change if server might have gone back to sleep ──
  useEffect(() => {
    if (!lastOkRef.current) return                              // initial check still running
    if (checkingRef.current) return                             // already checking
    const stale = Date.now() - lastOkRef.current > RECHECK_AFTER
    if (stale) startCheck()
  }, [location.pathname, startCheck])

  // ── Re-check when user returns to tab after being away ──
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      if (checkingRef.current) return
      if (!lastOkRef.current) return
      const stale = Date.now() - lastOkRef.current > RECHECK_AFTER
      if (stale) startCheck()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [startCheck])

  if (!show) return null

  const isReady = phase === 'ready'

  return (
    <>
      {/* ── Full-page overlay ── */}
      <div style={{
        position:       'fixed',
        inset:          0,
        zIndex:         99999,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        background:     'rgba(10, 14, 26, 0.82)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity:        fadeOut ? 0 : 1,
        transition:     'opacity 0.9s ease',
        pointerEvents:  fadeOut ? 'none' : 'all',
      }}>

        {/* Card */}
        <div style={{
          background:    'rgba(15, 23, 41, 0.96)',
          border:        '1px solid rgba(255,255,255,0.08)',
          borderRadius:  '24px',
          padding:       '48px 56px',
          width:         'min(440px, 90vw)',
          display:       'flex',
          flexDirection: 'column',
          alignItems:    'center',
          boxShadow:     '0 32px 80px rgba(0,0,0,0.6)',
        }}>

          {/* Icon */}
          <div style={{
            width:         '64px',
            height:        '64px',
            borderRadius:  '18px',
            background:    isReady ? '#059669' : '#b7102a',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            marginBottom:  '24px',
            transition:    'background 0.4s ease',
            boxShadow:     isReady
              ? '0 0 32px rgba(5,150,105,0.4)'
              : '0 0 32px rgba(183,16,42,0.35)',
          }}>
            {isReady ? (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#fff" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L4 7v10l8 5 8-5V7L12 2z" stroke="#fff"
                      strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 2v15M4 7l8 5 8-5" stroke="#fff"
                      strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
            )}
          </div>

          {/* Brand label */}
          <p style={{
            color:         'rgba(255,255,255,0.35)',
            fontSize:      '11px',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontWeight:    600,
            marginBottom:  '6px',
          }}>NipponBid</p>

          {/* Heading */}
          <h2 style={{
            color:         '#ffffff',
            fontSize:      '20px',
            fontWeight:    700,
            marginBottom:  '8px',
            letterSpacing: '-0.3px',
            textAlign:     'center',
          }}>
            {isReady ? "You're all set" : 'Starting up server…'}
          </h2>

          {/* Sub-text */}
          <p style={{
            color:        'rgba(255,255,255,0.42)',
            fontSize:     '13px',
            textAlign:    'center',
            marginBottom: '32px',
            lineHeight:   '1.6',
            whiteSpace:   'pre-line',
          }}>
            {isReady
              ? 'Server is ready. Loading your data.'
              : 'The server spins down after inactivity.\nWarm-up usually takes 20–40 seconds.'}
          </p>

          {/* Progress bar */}
          <div style={{
            width:        '100%',
            height:       '6px',
            background:   'rgba(255,255,255,0.07)',
            borderRadius: '99px',
            overflow:     'hidden',
            marginBottom: '16px',
            position:     'relative',
          }}>
            {isReady ? (
              <div style={{
                position:     'absolute',
                inset:        0,
                background:   '#059669',
                borderRadius: '99px',
              }} />
            ) : (
              <div style={{
                position:   'absolute',
                top:        0,
                bottom:     0,
                width:      '40%',
                background: 'linear-gradient(90deg, transparent, #b7102a, #e8354a, #b7102a, transparent)',
                animation:  'nb-sweep 1.8s ease-in-out infinite',
              }} />
            )}
          </div>

          {/* Timer */}
          {!isReady && (
            <div style={{
              display:    'flex',
              alignItems: 'center',
              gap:        '8px',
              color:      'rgba(255,255,255,0.3)',
              fontSize:   '12px',
            }}>
              <span style={{
                width:       '8px',
                height:      '8px',
                borderRadius:'50%',
                background:  '#b7102a',
                display:     'inline-block',
                animation:   'nb-pulse 1.2s ease-in-out infinite',
                flexShrink:  0,
              }} />
              <span>
                Elapsed: <strong style={{ color: 'rgba(255,255,255,0.55)' }}>{elapsed}s</strong>
              </span>
              <span style={{ opacity: 0.5 }}>·</span>
              <span>Est. ~30s</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes nb-sweep {
          0%   { left: -45%; }
          100% { left: 110%; }
        }
        @keyframes nb-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </>
  )
}
