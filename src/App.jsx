import { useCallback, useEffect, useRef, useState } from 'react'
import FloatingField from './components/FloatingField'
import SignaturePad from './components/SignaturePad'
import PhotoCapture from './components/PhotoCapture'
import Toast from './components/Toast'
import { JotformSubmitError, submitCheckin } from './services/jotformSubmit'
import { PhotoUploadError, uploadPhotoAndGetUrl } from './services/photoUpload'
import {
  combinePhotosVertical,
  optimizePhotoForJotform,
} from './utils/imageForJotform'
import {
  clearCheckinStorage,
  loadCheckinDraft,
  saveCheckinDraft,
} from './utils/formStorage'
import {
  normalizeGuestsForSubmit,
  normalizeGuestsOnFieldExit,
} from './utils/guestFields'
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
  const [uploadingSharedLink, setUploadingSharedLink] = useState(false)
  const skipSaveRef = useRef(true)
  const photosReadyRef = useRef(true)
  const guestSectionRef = useRef(null)

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

  const handleGuestFocus = (field) => () => {
    setForm((prev) =>
      prev[field] === 'NA' ? { ...prev, [field]: '' } : prev,
    )
  }

  const handleGuestBlur = (field) => (e) => {
    const next = e.relatedTarget
    if (next && guestSectionRef.current?.contains(next)) return

    setForm((prev) => normalizeGuestsOnFieldExit(prev, field))
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

    reader.onload = async (event) => {
      try {
        const optimized = await optimizePhotoForJotform(event.target.result)
        setPhotos((prev) => ({
          ...prev,
          [side]: optimized,
          sharedLink: null,
        }))
        console.log('[CheckIn:Foto] capturada', side)
      } catch {
        setErrors((prev) => ({
          ...prev,
          [errorKey]: 'No se pudo procesar la foto. Intenta de nuevo.',
        }))
      } finally {
        setSavingPhoto(null)
      }
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

  const validate = (formData = form) => {
    const next = {}

    if (!formData.huesped1.trim()) next.huesped1 = 'Requerido'
    if (!formData.fechaInicio) next.fechaInicio = 'Requerido'
    if (!formData.fechaSalida) next.fechaSalida = 'Requerido'
    if (
      formData.fechaInicio &&
      formData.fechaSalida &&
      formData.fechaSalida < formData.fechaInicio
    ) {
      next.fechaSalida = 'Debe ser posterior a la fecha de inicio'
    }
    if (!formData.terminos) next.terminos = 'Debes aceptar los términos'
    if (!formData.firma) next.firma = 'La firma es obligatoria'
    if (!hasStoredPhoto(photos.frontal)) next.fotoFrontal = 'Requerida'
    if (!hasStoredPhoto(photos.trasera)) next.fotoTrasera = 'Requerida'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  /** Cuando hay frente y reverso, genera un solo enlace con ambas imágenes. */
  useEffect(() => {
    if (!hasStoredPhoto(photos.frontal) || !hasStoredPhoto(photos.trasera)) {
      return undefined
    }
    if (photos.sharedLink) return undefined

    let cancelled = false
    setUploadingSharedLink(true)

    ;(async () => {
      try {
        const combined = await combinePhotosVertical(
          photos.frontal,
          photos.trasera,
        )
        const url = await uploadPhotoAndGetUrl(combined, 'identificacion-checkin')
        if (!cancelled) {
          setPhotos((prev) => ({ ...prev, sharedLink: url }))
          console.log('[CheckIn:Foto] enlace único', url)
        }
      } catch (err) {
        if (!cancelled) {
          setErrors((prev) => ({
            ...prev,
            fotoFrontal:
              err instanceof PhotoUploadError
                ? err.message
                : 'No se pudo generar el enlace de las fotos.',
          }))
        }
      } finally {
        if (!cancelled) setUploadingSharedLink(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [photos.frontal, photos.trasera, photos.sharedLink])

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
    const formWithGuests = normalizeGuestsForSubmit(form)
    setForm(formWithGuests)

    if (!validate(formWithGuests)) return

    setSubmitting(true)
    setToast(null)

    try {
      let photoUrl = photos.sharedLink
      if (!photoUrl) {
        const combined = await combinePhotosVertical(
          photos.frontal,
          photos.trasera,
        )
        photoUrl = await uploadPhotoAndGetUrl(combined, 'identificacion-checkin')
      }

      const result = await submitCheckin(formWithGuests, photoUrl)

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

          <section
            ref={guestSectionRef}
            className="form-section form-section--guests"
          >
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
                onFocus={handleGuestFocus('huesped1')}
                onBlur={handleGuestBlur('huesped1')}
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
                onFocus={handleGuestFocus('huesped2')}
                onBlur={handleGuestBlur('huesped2')}
                autoComplete="name"
                placeholder="Nombre y apellido (opcional)"
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
                onFocus={handleGuestFocus('huespedExtra')}
                onBlur={handleGuestBlur('huespedExtra')}
                autoComplete="name"
                placeholder="Nombre y apellido (opcional)"
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

            {uploadingSharedLink && (
              <p className="photo-capture__saved" role="status">
                Generando enlace único con ambas fotos…
              </p>
            )}
            {photos.sharedLink && !uploadingSharedLink && (
              <p className="photo-capture__saved" role="status">
                ✓ Enlace único listo (frente y reverso)
              </p>
            )}
          </section>

          <footer className="form-footer">
            <button
              type="submit"
              className="btn-continue"
              disabled={
                submitting ||
                savingPhoto ||
                uploadingSharedLink ||
                !isCheckinReady(form, photos) ||
                (isCheckinReady(form, photos) && !photos.sharedLink)
              }
              title={
                savingPhoto || uploadingSharedLink
                  ? 'Espera a que se genere el enlace de las fotos'
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
