import { useId, useRef } from 'react'
import { logPhotoFile, logPhotoStep } from '../utils/photoDebug'

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
  compressing = false,
}) {
  const id = useId()
  const inputRef = useRef(null)

  return (
    <div className={`photo-capture ${hasError ? 'photo-capture--error' : ''}`}>
      <label htmlFor={id} className="photo-capture__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>

      <p className="photo-capture__hint">
        PNG o JPG. Se comprimen automáticamente para un envío más rápido.
      </p>

      <input
        ref={inputRef}
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        capture="environment"
        className="photo-capture__input"
        onChange={(e) => {
          logPhotoStep('PhotoCapture → input onChange', { label })
          const file = e.target.files?.[0]
          if (file) {
            logPhotoFile('PhotoCapture → archivo seleccionado', file, { label })
            onCapture(file)
          } else {
            logPhotoStep('PhotoCapture → sin archivo en input', { label })
          }
          e.target.value = ''
          logPhotoStep('PhotoCapture → input value reseteado', { label })
        }}
      />

      <button
        type="button"
        className="photo-capture__btn"
        disabled={compressing}
        onClick={() => {
          logPhotoStep('PhotoCapture → clic en Tomar foto', {
            label,
            compressing,
            tienePreview: Boolean(preview),
          })
          inputRef.current?.click()
        }}
      >
        <CameraIcon />
        {compressing ? 'Comprimiendo…' : preview ? 'Cambiar foto' : 'Tomar foto'}
      </button>

      {preview && (
        <div className="photo-capture__preview">
          <img src={preview} alt={`Vista previa: ${label}`} />
        </div>
      )}
    </div>
  )
}
