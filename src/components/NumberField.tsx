import { useEffect, useState, type InputHTMLAttributes } from 'react'

interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value: number | null
  onChange: (value: number | null) => void
  /** Allow a single decimal point (e.g. body weight 60.5). Integer-only by default. */
  decimal?: boolean
  /** Emit `null` when the field is cleared. Otherwise clearing is allowed while
   *  editing but reverts to the last value on blur (for required numbers). */
  nullable?: boolean
  /** Clamped on blur, since this renders as type="text" and browsers only
   *  enforce min/max on native type="number" inputs. */
  min?: number
  max?: number
}

/**
 * A numeric input that never accepts leading zeros ("048" → "48") and shows the
 * numeric keypad on mobile. It keeps its own text buffer so the user can freely
 * clear and retype; it re-syncs from `value` only when not focused, so external
 * changes (like "use suggested goal") still flow in.
 */
export function NumberField({ value, onChange, decimal = false, nullable = false, min, max, ...rest }: NumberFieldProps) {
  const [text, setText] = useState(value == null ? '' : String(value))
  const [focused, setFocused] = useState(false)

  useEffect(() => {
    if (!focused) setText(value == null ? '' : String(value))
  }, [value, focused])

  function sanitize(raw: string): string {
    let cleaned = raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '')
    if (decimal) {
      const [intPart, ...frac] = cleaned.split('.')
      cleaned = frac.length ? `${intPart}.${frac.join('')}` : intPart
    }
    // Strip leading zeros ("048" → "48") but keep a lone "0" and "0.x".
    return cleaned.replace(/^0+(?=\d)/, '')
  }

  function handleChange(raw: string) {
    const cleaned = sanitize(raw)
    setText(cleaned)
    if (cleaned === '' || cleaned === '.') {
      if (nullable) onChange(null)
      return
    }
    onChange(Number(cleaned))
  }

  function handleBlur() {
    setFocused(false)
    if ((text === '' || text === '.') && !nullable) {
      setText(value == null ? '' : String(value))
      return
    }
    const parsed = text === '' || text === '.' ? null : Number(text)
    if (parsed != null && (min != null || max != null)) {
      const clamped = Math.min(max ?? Infinity, Math.max(min ?? -Infinity, parsed))
      if (clamped !== parsed) {
        setText(String(clamped))
        onChange(clamped)
      }
    }
  }

  return (
    <input
      {...rest}
      type="text"
      inputMode={decimal ? 'decimal' : 'numeric'}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={handleBlur}
    />
  )
}
