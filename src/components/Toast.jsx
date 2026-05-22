import { useEffect } from 'react'

const ICONS = {
  success: '✓',
  error: '✕',
}

export default function Toast({ message, type = 'success', onClose, duration = 5000 }) {
  useEffect(() => {
    if (!message) return undefined
    const timer = setTimeout(onClose, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onClose])

  if (!message) return null

  return (
    <div
      className={`toast toast--${type}`}
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
    >
      <span className="toast__icon" aria-hidden="true">
        {ICONS[type]}
      </span>
      <p className="toast__message">{message}</p>
      <button type="button" className="toast__close" onClick={onClose} aria-label="Cerrar">
        ×
      </button>
    </div>
  )
}
