import { useState } from 'react'
import FloatingField from './components/FloatingField'
import SignaturePad from './components/SignaturePad'
import PhotoCapture from './components/PhotoCapture'
import logoSuites from './assets/LOGO-SUITES-ESLOGAN.png'
import logoInmotega from './assets/LOGO-INMOTEGA.png'
import './App.css'

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

function App() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [previews, setPreviews] = useState({ frontal: null, trasera: null })
  const [errors, setErrors] = useState({})
  const [showTerms, setShowTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  const handlePhoto = (field, previewKey) => (file) => {
    const url = URL.createObjectURL(file)
    setPreviews((prev) => {
      if (prev[previewKey]) URL.revokeObjectURL(prev[previewKey])
      return { ...prev, [previewKey]: url }
    })
    setForm((prev) => ({ ...prev, [field]: file }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
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
    if (!form.fotoFrontal) next.fotoFrontal = 'Requerida'
    if (!form.fotoTrasera) next.fotoTrasera = 'Requerida'

    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      // Backend se conectará en la siguiente fase
      await new Promise((resolve) => setTimeout(resolve, 600))
      console.log('Check-in listo para enviar:', form)
      alert('Formulario válido. En la siguiente fase conectamos el backend.')
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

        <form className="checkin-form" onSubmit={handleSubmit} noValidate>
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
                <button
                  type="button"
                  className="link-btn"
                  onClick={() => setShowTerms(true)}
                >
                  da clic aquí para ver
                </button>
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
              preview={previews.frontal}
              onCapture={handlePhoto('fotoFrontal', 'frontal')}
              hasError={Boolean(errors.fotoFrontal)}
            />
            {errors.fotoFrontal && <p className="field-error">{errors.fotoFrontal}</p>}

            <PhotoCapture
              label="Foto trasera de Identificación Oficial"
              required
              preview={previews.trasera}
              onCapture={handlePhoto('fotoTrasera', 'trasera')}
              hasError={Boolean(errors.fotoTrasera)}
            />
            {errors.fotoTrasera && <p className="field-error">{errors.fotoTrasera}</p>}
          </section>

          <footer className="form-footer">
            <button type="submit" className="btn-continue" disabled={submitting}>
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
              Suites Inmotega. El contenido capturado (firma e identificación) se utiliza
              únicamente para fines de registro y seguridad.
            </p>
            <button type="button" className="btn-continue btn-continue--small" onClick={() => setShowTerms(false)}>
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
