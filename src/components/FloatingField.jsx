import { useId, useState } from 'react'

export default function FloatingField({
  label,
  type = 'text',
  value,
  onChange,
  required = false,
  name,
  hint,
  className = '',
  inputMode,
  placeholder,
}) {
  const id = useId()
  const [focused, setFocused] = useState(false)
  const active = focused || Boolean(value)
  const isDate = type === 'date'

  const labelContent = (
    <>
      {label}
      {required && <span className="field__required" aria-hidden="true"> *</span>}
    </>
  )

  if (isDate) {
    return (
      <div className={`field field--date ${focused ? 'field--focused' : ''} ${className}`.trim()}>
        <label htmlFor={id} className="field__label-static">
          {labelContent}
        </label>
        <input
          id={id}
          name={name}
          type="date"
          value={value}
          onChange={onChange}
          required={required}
          className="field__input field__input--date"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-required={required}
        />
        {hint && <span className="field__hint">{hint}</span>}
      </div>
    )
  }

  return (
    <div className={`field ${active ? 'field--active' : ''} ${className}`.trim()}>
      <div className="field__control">
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          required={required}
          inputMode={inputMode}
          placeholder={placeholder ?? ' '}
          className="field__input"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-required={required}
        />
        <label htmlFor={id} className="field__label">
          {labelContent}
        </label>
      </div>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  )
}
