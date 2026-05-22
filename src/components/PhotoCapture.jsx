import { useId, useRef } from 'react'

function CameraIcon() {
  return (
    <svg
      className="photo-capture__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

export default function PhotoCapture({
  label,
  required,
  preview,
  onCapture,
  hasError,
  saving = false,
  saved = false,
}) {
  const id = useId()
  const inputRef = useRef(null)

  return (
    <div className={`photo-capture ${hasError ? 'photo-capture--error' : ''}`}>
      <label htmlFor={id} className="photo-capture__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/*"
        capture="environment"
        className="photo-capture__input"
        onChange={(e) => onCapture(e)}
      />

      <button
        type="button"
        className="photo-capture__btn"
        disabled={saving}
        onClick={() => inputRef.current?.click()}
      >
        <CameraIcon />
        {saving ? 'Guardando…' : preview ? 'Cambiar foto' : 'Tomar foto'}
      </button>

      {saved && preview && (
        <p className="photo-capture__saved" role="status">
          ✓ Foto guardada
        </p>
      )}

      {preview && (
        <div className="photo-capture__preview">
          <img src={preview} alt={`Vista previa: ${label}`} />
        </div>
      )}
    </div>
  )
}
