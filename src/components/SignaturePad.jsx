import { useCallback, useEffect, useRef, useState } from 'react'

export default function SignaturePad({ onChange, hasError, initialValue = null }) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastPointRef = useRef(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const hasDrawnRef = useRef(false)

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const saved = hasDrawnRef.current ? canvas.toDataURL('image/png') : null

    canvas.width = Math.floor(rect.width * dpr)
    canvas.height = Math.floor(rect.height * dpr)

    const ctx = canvas.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    if (saved) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height)
      img.src = saved
    }
  }, [])

  useEffect(() => {
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [resizeCanvas])

  /** Restaura firma guardada en storage (p. ej. tras volver de la cámara en móvil) */
  useEffect(() => {
    if (!initialValue) return

    const canvas = canvasRef.current
    if (!canvas) return

    const img = new Image()
    img.onload = () => {
      const rect = canvas.getBoundingClientRect()
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, rect.width, rect.height)
      setIsEmpty(false)
      hasDrawnRef.current = true
    }
    img.src = initialValue
  }, [initialValue])

  const getPoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const source = event.touches ? event.touches[0] : event
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    }
  }

  const drawLine = (from, to) => {
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }

  const emitChange = () => {
    const dataUrl = canvasRef.current.toDataURL('image/png')
    onChange(dataUrl)
  }

  const startDrawing = (event) => {
    event.preventDefault()
    drawingRef.current = true
    lastPointRef.current = getPoint(event)
  }

  const draw = (event) => {
    if (!drawingRef.current) return
    event.preventDefault()

    const point = getPoint(event)
    drawLine(lastPointRef.current, point)
    lastPointRef.current = point

    if (isEmpty) {
      setIsEmpty(false)
      hasDrawnRef.current = true
    }
    emitChange()
  }

  const stopDrawing = () => {
    drawingRef.current = false
    lastPointRef.current = null
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    ctx.clearRect(0, 0, rect.width, rect.height)
    setIsEmpty(true)
    hasDrawnRef.current = false
    onChange(null)
  }

  return (
    <div className={`signature ${hasError ? 'signature--error' : ''}`}>
      <div className="signature__box">
        <canvas
          ref={canvasRef}
          className="signature__canvas"
          aria-label="Área para dibujar tu firma"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        <div className="signature__baseline" aria-hidden="true" />
        {isEmpty && (
          <span className="signature__placeholder">Firma aquí con el dedo o el mouse</span>
        )}
        <button type="button" className="signature__clear" onClick={clear}>
          Limpiar
        </button>
      </div>
    </div>
  )
}
