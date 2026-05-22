import { useCallback, useEffect, useRef, useState } from 'react'
import FloatingField from './components/FloatingField'
import SignaturePad from './components/SignaturePad'
import PhotoCapture from './components/PhotoCapture'
import Toast from './components/Toast'
import { JotformSubmitError, submitCheckin } from './services/jotformSubmit'
import { dataUrlToFile } from './utils/imageForJotform'
import {
  clearCheckinStorage,
  loadCheckinDraft,
  saveCheckinDraft,
} from './utils/formStorage'
import {
  clearPhotosStorage,
  hasStoredPhoto,
  INITIAL_PHOTOS,
  loadPhotosFromStorage,
  savePhotosToStorage,
} from './utils/photoStorage'
import logoSuites from './assets/LOGO-SUITES-ESLOGAN.png'
import logoInmotega from './assets/LOGO-INMOTEGA.png'
import './App.css'

const TERMS_URL = 'https://inmotega.com.mx/aviso-de-privacidad/'

const INITIAL_FORM = {
  huesped1: '',
  huesped2: '',
  huespedExtra: '',
  fechaInicio: '',
  fechaSalida: '',
  terminos: false,
  firma: null,
}

function isCheckinReady(form, photos) {
  const fechasValidas =
    form.fechaInicio &&
    form.fechaSalida &&
    form.fechaSalida >= form.fechaInicio

  return (
    form.huesped1.trim() !== '' &&
    fechasValidas &&
    form.terminos &&
    Boolean(form.firma) &&
    hasStoredPhoto(photos.frontal) &&
    hasStoredPhoto(photos.trasera)
  )
}

function App() {
  const [form, setForm] = useState(() => {
    const draft = loadCheckinDraft()
    return draft ? { ...INITIAL_FORM, ...draft } : INITIAL_FORM
  })
  const [photos, setPhotos] = useState(() => loadPhotosFromStorage())
  const [errors, setErrors] = useState({})
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [savingPhoto, setSavingPhoto] = useState(null)
  const skipSaveRef = useRef(true)
  const photosReadyRef = useRef(true)

  const closeToast = useCallback(() => setToast(null), [])

  useEffect(() => {
    skipSaveRef.current = false
  }, [])

  /** Guardar fotos cada vez que cambien */
  useEffect(() => {
    if (!photosReadyRef.current) return
    savePhotosToStorage(photos)
    console.log('[CheckIn:Foto] guardadas en storage', {
      frontal: hasStoredPhoto(photos.frontal),
      trasera: hasStoredPhoto(photos.trasera),
    })
  }, [photos])

  /** Autoguardado campos de texto, fechas, firma */
  useEffect(() => {
    if (skipSaveRef.current) return undefined
    const timer = setTimeout(() => saveCheckinDraft(form), 400)
    return () => clearTimeout(timer)
  }, [form])

  useEffect(() => {
    const persistNow = () => {
      if (!skipSaveRef.current) {
        saveCheckinDraft(form)
        savePhotosToStorage(photos)
      }
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') persistNow()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', persistNow)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', persistNow)
    }
  }, [form, photos])

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  /** Mismo patrón: FileReader → base64 → setPhotos */
  const handleCapture = (side) => (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    e.target.value = ''
    setSavingPhoto(side)

    const errorKey = side === 'frontal' ? 'fotoFrontal' : 'fotoTrasera'
    setErrors((prev) => ({ ...prev, [errorKey]: undefined }))

    const reader = new FileReader()

    reader.onload = (event) => {
      const base64Image = event.target.result
      setPhotos((prev) => ({ ...prev, [side]: base64Image }))
      setSavingPhoto(null)
      console.log('[CheckIn:Foto] capturada y guardada', side)
    }

    reader.onerror = () => {
      setErrors((prev) => ({
        ...prev,
        [errorKey]: 'No se pudo leer la foto. Intenta de nuevo.',
      }))
      setSavingPhoto(null)
    }

    reader.readAsDataURL(file)
  }

  const validate = () => {
    const next = {}

    if (!form.huesped1.trim()) next.huesped1 = 'Requerido'
    if (!form.fechaInicio) next.fechaInicio = 'Requerido'
    if (!form.fechaSalida) next.fechaSalida = 'Requerido'
    if (form.fechaInicio && form.fechaSalida && form.fechaSalida < form.fechaInicio) {
      next.fechaSalida = 'Debe ser posterior a la fecha de inicio'
    }
    if (!form.terminos) next.terminos = 'Debes aceptar los términos'
    if (!form.firma) next.firma = 'La firma es obligatoria'
    if (!hasStoredPhoto(photos.frontal)) next.fotoFrontal = 'Requerida'
    if (!hasStoredPhoto(photos.trasera)) next.fotoTrasera = 'Requerida'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const resetForm = () => {
    clearCheckinStorage()
    clearPhotosStorage()
    setForm(INITIAL_FORM)
    setPhotos(INITIAL_PHOTOS)
    setErrors({})
    setFormKey((k) => k + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setToast(null)

    try {
      const fotoFrontal = await dataUrlToFile(photos.frontal, 'identificacion-frontal.jpg')
      const fotoTrasera = await dataUrlToFile(photos.trasera, 'identificacion-trasera.jpg')

      const result = await submitCheckin({
        ...form,
        fotoFrontal,
        fotoTrasera,
      })

      setToast({
        type: 'success',
        message:
          result?.content?.submissionID
            ? `¡Check-in enviado correctamente! (ID: ${result.content.submissionID})`
            : '¡Check-in enviado correctamente! Gracias por registrarte.',
      })
      resetForm()
    } catch (err) {
      const message =
        err instanceof JotformSubmitError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado. Intenta de nuevo.'

      setToast({ type: 'error', message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="page">
      <div className="brand-logos">
        <div className="brand-logos__item brand-logos__item--inmotega">
          <img src={logoInmotega} alt="Inmotega" className="brand-logos__inmotega" />
        </div>
        <div className="brand-logos__divider" aria-hidden="true" />
        <div className="brand-logos__item brand-logos__item--suites">
          <img
            src={logoSuites}
            alt="Suites — No somos un hotel, somos tu hogar en SLP"
            className="brand-logos__suites"
          />
        </div>
      </div>

      <main className="checkin-card">
        <header className="checkin-header">
          <h1 className="checkin-title">Realiza tu Check-in</h1>
          <address className="checkin-contact">
            Inmotega SLP FRAY JOSE DE ARLEGUI #1526. COL. VIVEROS / TEL.444 428 6112 /
            EMAIL. recepciones.inmotega@outlook.com
          </address>
          <hr className="checkin-divider" />
        </header>

        <form
          className="checkin-form"
          onSubmit={handleSubmit}
          noValidate
          aria-busy={submitting}
        >
          <p className="form-instruction">
            Completa el Nombre y Apellido (puedes usar NA si es el caso)
            <span className="field__required" aria-hidden="true"> *</span>
          </p>

          <section className="form-section form-section--guests">
            <div className="guest-row">
              <label htmlFor="huesped1" className="guest-row__label">
                Huésped 1<span className="field__required"> *</span>
              </label>
              <input
                id="huesped1"
                name="huesped1"
                type="text"
                className={`guest-row__input ${errors.huesped1 ? 'input--error' : ''}`}
                value={form.huesped1}
                onChange={update('huesped1')}
                required
                autoComplete="name"
                placeholder="Nombre y apellido"
              />
            </div>
            {errors.huesped1 && <p className="field-error">{errors.huesped1}</p>}

            <div className="guest-row">
              <label htmlFor="huesped2" className="guest-row__label">Huésped 2</label>
              <input
                id="huesped2"
                name="huesped2"
                type="text"
                className="guest-row__input"
                value={form.huesped2}
                onChange={update('huesped2')}
                autoComplete="name"
                placeholder="Nombre y apellido"
              />
            </div>

            <div className="guest-row">
              <label htmlFor="huespedExtra" className="guest-row__label">Huésped Extra</label>
              <input
                id="huespedExtra"
                name="huespedExtra"
                type="text"
                className="guest-row__input"
                value={form.huespedExtra}
                onChange={update('huespedExtra')}
                autoComplete="name"
                placeholder="Nombre y apellido"
              />
            </div>
          </section>

          <section className="form-section">
            <FloatingField
              label="Fecha de inicio de tu estadía"
              type="date"
              name="fechaInicio"
              value={form.fechaInicio}
              onChange={update('fechaInicio')}
              required
              hint="Date"
              className={errors.fechaInicio ? 'field--error' : ''}
            />
            {errors.fechaInicio && <p className="field-error">{errors.fechaInicio}</p>}

            <FloatingField
              label="Fecha de salida de tu estadía"
              type="date"
              name="fechaSalida"
              value={form.fechaSalida}
              onChange={update('fechaSalida')}
              required
              hint="Date"
              className={errors.fechaSalida ? 'field--error' : ''}
            />
            {errors.fechaSalida && <p className="field-error">{errors.fechaSalida}</p>}
          </section>

          <section className="form-section">
            <label className={`checkbox-row ${errors.terminos ? 'checkbox-row--error' : ''}`}>
              <input
                type="checkbox"
                name="terminos"
                checked={form.terminos}
                onChange={update('terminos')}
                className="checkbox-row__input"
              />
              <span className="checkbox-row__box" aria-hidden="true" />
              <span className="checkbox-row__text">
                Al dar click acepto los términos y condiciones{' '}
                <a
                  href={TERMS_URL}
                  className="link-btn"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  da clic aquí para ver
                </a>
                <span className="field__required" aria-hidden="true"> *</span>
              </span>
            </label>
            {errors.terminos && <p className="field-error">{errors.terminos}</p>}
          </section>

          <section className="form-section">
            <h2 className="section-label">
              Firma<span className="field__required" aria-hidden="true"> *</span>
            </h2>
            <SignaturePad
              key={`firma-${formKey}`}
              initialValue={form.firma}
              onChange={(data) => {
                setForm((prev) => ({ ...prev, firma: data }))
                setErrors((prev) => ({ ...prev, firma: undefined }))
              }}
              hasError={Boolean(errors.firma)}
            />
            {errors.firma && <p className="field-error">{errors.firma}</p>}
          </section>

          <section className="form-section">
            <PhotoCapture
              label="Foto frontal de Identificación Oficial"
              required
              preview={photos.frontal}
              saved={hasStoredPhoto(photos.frontal)}
              saving={savingPhoto === 'frontal'}
              onCapture={handleCapture('frontal')}
              hasError={Boolean(errors.fotoFrontal)}
            />
            {errors.fotoFrontal && <p className="field-error">{errors.fotoFrontal}</p>}

            <PhotoCapture
              label="Foto trasera de Identificación Oficial"
              required
              preview={photos.trasera}
              saved={hasStoredPhoto(photos.trasera)}
              saving={savingPhoto === 'trasera'}
              onCapture={handleCapture('trasera')}
              hasError={Boolean(errors.fotoTrasera)}
            />
            {errors.fotoTrasera && <p className="field-error">{errors.fotoTrasera}</p>}
          </section>

          <footer className="form-footer">
            <button
              type="submit"
              className="btn-continue"
              disabled={submitting || savingPhoto || !isCheckinReady(form, photos)}
              title={
                savingPhoto
                  ? 'Espera a que se guarde la foto'
                  : !isCheckinReady(form, photos) && !submitting
                    ? 'Completa todos los campos y toma las dos fotos'
                    : undefined
              }
            >
              {submitting ? 'Enviando…' : 'Continue'}
            </button>
          </footer>
        </form>
      </main>

      {showTerms && (
        <div className="modal-overlay" role="presentation" onClick={() => setShowTerms(false)}>
          <div
            className="modal"
            role="dialog"
            aria-labelledby="terms-title"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="terms-title">Términos y condiciones</h2>
            <p>
              Al completar este formulario, el huésped acepta las políticas de estadía,
              horarios de entrada y salida, y el uso responsable de las instalaciones de
              Suites Inmotega.
            </p>
            <a
              href={TERMS_URL}
              className="modal__link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver aviso de privacidad completo
            </a>
            <button
              type="button"
              className="btn-continue btn-continue--small"
              onClick={() => setShowTerms(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <Toast message={toast?.message} type={toast?.type} onClose={closeToast} />
    </div>
  )
}

export default App
