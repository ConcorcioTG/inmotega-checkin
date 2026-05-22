import { useCallback, useEffect, useRef, useState } from 'react'
import FloatingField from './components/FloatingField'
import SignaturePad from './components/SignaturePad'
import PhotoCapture from './components/PhotoCapture'
import Toast from './components/Toast'
import { JotformSubmitError, submitCheckin } from './services/jotformSubmit'
import {
  hasPhotoFile,
  preparePhotoFile,
  readPhotoAsDataUrl,
} from './utils/imageForJotform'
import {
  clearCheckinStorage,
  loadCheckinDraft,
  saveCheckinDraft,
} from './utils/formStorage'
import { logPhotoFile, logPhotoStep } from './utils/photoDebug'
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
  fotoFrontal: null,
  fotoTrasera: null,
}

/** El botón Continue solo se habilita cuando todo es válido, incluidas las fotos */
function isCheckinReady(form) {
  const fechasValidas =
    form.fechaInicio &&
    form.fechaSalida &&
    form.fechaSalida >= form.fechaInicio

  return (
    form.huesped1.trim() !== '' &&
    fechasValidas &&
    form.terminos &&
    Boolean(form.firma) &&
    hasPhotoFile(form.fotoFrontal) &&
    hasPhotoFile(form.fotoTrasera)
  )
}

function App() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [previews, setPreviews] = useState({ frontal: null, trasera: null })
  const [errors, setErrors] = useState({})
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)
  const [formKey, setFormKey] = useState(0)
  const [savingPhoto, setSavingPhoto] = useState(null)
  const [isHydrating, setIsHydrating] = useState(true)
  const skipSaveRef = useRef(true)
  const photoBusyRef = useRef(false)

  const closeToast = useCallback(() => setToast(null), [])

  const applyDraft = useCallback((draft) => {
    if (!draft || photoBusyRef.current) {
      logPhotoStep('App.applyDraft → omitido', {
        sinDraft: !draft,
        photoBusy: photoBusyRef.current,
      })
      return
    }
    setForm(draft.form)
    setPreviews(draft.previews)
    logPhotoStep('App.applyDraft → borrador restaurado')
  }, [])

  /** Restaurar borrador solo al cargar la página (recarga tras cámara en móvil) */
  useEffect(() => {
    loadCheckinDraft()
      .then(applyDraft)
      .finally(() => {
        setIsHydrating(false)
        skipSaveRef.current = false
      })
  }, [applyDraft])

  /** Autoguardado en localStorage + sessionStorage */
  useEffect(() => {
    if (skipSaveRef.current || isHydrating) return undefined

    const timer = setTimeout(() => {
      saveCheckinDraft(form)
    }, 400)

    return () => clearTimeout(timer)
  }, [form, isHydrating])

  /** Guardar al ocultar la página (antes de abrir la cámara) */
  useEffect(() => {
    const persistNow = () => {
      if (!skipSaveRef.current) saveCheckinDraft(form)
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
  }, [form])

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handlePhoto = (field, previewKey) => async (file) => {
    logPhotoStep('App.handlePhoto → inicio', { field, previewKey })
    logPhotoFile('App.handlePhoto → archivo recibido', file, { field })

    const photoFile = preparePhotoFile(file)
    if (!photoFile) {
      setErrors((prev) => ({
        ...prev,
        [field]: 'No se recibió la foto. Intenta de nuevo.',
      }))
      return
    }

    photoBusyRef.current = true
    setSavingPhoto(field)
    setErrors((prev) => ({ ...prev, [field]: undefined }))

    try {
      const dataUrl = await readPhotoAsDataUrl(photoFile)
      logPhotoStep('App.handlePhoto → dataUrl generada', {
        field,
        longitud: dataUrl?.length,
      })

      setPreviews((prev) => ({ ...prev, [previewKey]: dataUrl }))

      let nextForm = null
      setForm((prev) => {
        nextForm = { ...prev, [field]: photoFile }
        return nextForm
      })

      logPhotoFile('App.handlePhoto → guardado en estado', photoFile, { field })

      await saveCheckinDraft(nextForm)
      logPhotoStep('App.handlePhoto → guardado en storage OK', { field })
    } catch (err) {
      logPhotoStep('App.handlePhoto → error', { field, error: err?.message })
      setErrors((prev) => ({
        ...prev,
        [field]: 'No se pudo guardar la foto. Intenta de nuevo.',
      }))
    } finally {
      photoBusyRef.current = false
      setSavingPhoto(null)
    }
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
    logPhotoStep('App.validate → revisando fotos')
    if (!hasPhotoFile(form.fotoFrontal)) {
      next.fotoFrontal = 'Requerida'
    }
    if (!hasPhotoFile(form.fotoTrasera)) {
      next.fotoTrasera = 'Requerida'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const resetForm = () => {
    clearCheckinStorage()
    setForm(INITIAL_FORM)
    setErrors({})
    setPreviews({ frontal: null, trasera: null })
    setFormKey((k) => k + 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    setToast(null)

    try {
      const result = await submitCheckin(form)

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
          aria-busy={submitting || isHydrating}
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
              key={`frontal-${formKey}`}
              label="Foto frontal de Identificación Oficial"
              required
              preview={previews.frontal}
              saving={savingPhoto === 'fotoFrontal'}
              onCapture={handlePhoto('fotoFrontal', 'frontal')}
              hasError={Boolean(errors.fotoFrontal)}
            />
            {errors.fotoFrontal && <p className="field-error">{errors.fotoFrontal}</p>}

            <PhotoCapture
              key={`trasera-${formKey}`}
              label="Foto trasera de Identificación Oficial"
              required
              preview={previews.trasera}
              saving={savingPhoto === 'fotoTrasera'}
              onCapture={handlePhoto('fotoTrasera', 'trasera')}
              hasError={Boolean(errors.fotoTrasera)}
            />
            {errors.fotoTrasera && <p className="field-error">{errors.fotoTrasera}</p>}
          </section>

          <footer className="form-footer">
            <button
              type="submit"
              className="btn-continue"
              disabled={submitting || savingPhoto || !isCheckinReady(form)}
              title={
                savingPhoto
                  ? 'Espera a que se guarde la foto'
                  : !isCheckinReady(form) && !submitting
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

      <Toast
        message={toast?.message}
        type={toast?.type}
        onClose={closeToast}
      />
    </div>
  )
}

export default App
