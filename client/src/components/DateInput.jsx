import React, { useState, useEffect, useRef } from 'react';
import { Calendar } from 'lucide-react';

/** Convert ISO YYYY-MM-DD to display DD-MM-YYYY. */
export function formatIsoToDisplayDate(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

/** Validate real calendar date and return ISO YYYY-MM-DD, or null if invalid. */
function buildValidIso(year, month, day) {
  const y = Number(year);
  const mo = Number(month);
  const d = Number(day);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) return null;
  if (y < 1900 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parse manual input (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD, or DDMMYYYY) into ISO YYYY-MM-DD. */
export function parseManualDateInput(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';

  // ISO: YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (m) return buildValidIso(m[1], m[2], m[3]);

  // Standard Indian: DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return buildValidIso(m[3], m[2], m[1]);

  // Compact 8 digits: DDMMYYYY
  m = s.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (m) return buildValidIso(m[3], m[2], m[1]);

  return null;
}

/**
 * Dual-mode DateInput: supports free manual typing (DD-MM-YYYY / DD/MM/YYYY / YYYY-MM-DD / DDMMYYYY)
 * AND clicking the Calendar icon to open a visual date picker, while keeping React onChange API
 * (`e.target.value` as standard `YYYY-MM-DD`).
 */
export default function DateInput({
  value = '',
  onChange,
  name,
  id,
  className = '',
  wrapperClassName = '',
  required = false,
  min,
  max,
  disabled = false,
  placeholder = 'DD-MM-YYYY',
  title,
  style,
}) {
  const safeValue = value || '';
  const [text, setText] = useState(() => formatIsoToDisplayDate(safeValue));
  const [invalidMsg, setInvalidMsg] = useState('');
  const textInputRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    setText(formatIsoToDisplayDate(safeValue));
    setInvalidMsg('');
    if (textInputRef.current) textInputRef.current.setCustomValidity('');
  }, [safeValue]);

  const emitIso = (nextIso) => {
    if (onChange) {
      onChange({
        target: { value: nextIso, name, id, type: 'date' },
        currentTarget: { value: nextIso, name, id, type: 'date' },
      });
    }
  };

  const checkRange = (iso) => {
    if (!iso) return '';
    if (min && iso < min) return `Date must be on or after ${formatIsoToDisplayDate(min)}`;
    if (max && iso > max) return `Date must be on or before ${formatIsoToDisplayDate(max)}`;
    return '';
  };

  const handleTextChange = (e) => {
    const raw = e.target.value;
    setText(raw);

    const trimmed = raw.trim();
    if (trimmed === '') {
      setInvalidMsg('');
      if (textInputRef.current) textInputRef.current.setCustomValidity('');
      emitIso('');
      return;
    }

    const parsed = parseManualDateInput(trimmed);
    if (parsed) {
      const rangeErr = checkRange(parsed);
      setInvalidMsg(rangeErr);
      if (textInputRef.current) textInputRef.current.setCustomValidity(rangeErr);
      if (!rangeErr) emitIso(parsed);
    } else {
      setInvalidMsg('');
      if (textInputRef.current) {
        textInputRef.current.setCustomValidity('Enter valid date as DD-MM-YYYY (e.g. 26-11-2026) or pick from calendar');
      }
    }
  };

  const handleBlur = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setInvalidMsg('');
      if (textInputRef.current) textInputRef.current.setCustomValidity('');
      return;
    }
    const parsed = parseManualDateInput(trimmed);
    if (parsed) {
      const rangeErr = checkRange(parsed);
      if (rangeErr) {
        setInvalidMsg(rangeErr);
        if (textInputRef.current) textInputRef.current.setCustomValidity(rangeErr);
        return;
      }
      setText(formatIsoToDisplayDate(parsed));
      setInvalidMsg('');
      if (textInputRef.current) textInputRef.current.setCustomValidity('');
      if (parsed !== safeValue) emitIso(parsed);
    } else {
      const err = 'अमान्य तारीख — DD-MM-YYYY लिखें या कैलेंडर चुनें';
      setInvalidMsg(err);
      if (textInputRef.current) textInputRef.current.setCustomValidity(err);
    }
  };

  const handlePickerChange = (e) => {
    const nextIso = e.target.value || '';
    setText(formatIsoToDisplayDate(nextIso));
    setInvalidMsg('');
    if (textInputRef.current) textInputRef.current.setCustomValidity('');
    emitIso(nextIso);
  };

  const openCalendar = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();
    const el = pickerRef.current;
    if (!el) return;
    try {
      if (typeof el.showPicker === 'function') el.showPicker();
      else el.click();
    } catch {
      el.focus();
      el.click();
    }
  };

  const hasExplicitWidth = /\bw-/.test(className);
  const isFullWidth = /\bw-full\b/.test(className) || /\bw-full\b/.test(wrapperClassName);
  const fallbackWidth = hasExplicitWidth ? '' : 'w-[122px]';
  const inputDefaultLook = className ? '' : 'px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800';
  const validationBorder = invalidMsg ? ' border-rose-500 ring-1 ring-rose-400' : '';

  return (
    <div className={`relative ${isFullWidth ? 'flex w-full' : 'inline-flex'} items-center ${wrapperClassName}`}>
      <input
        ref={textInputRef}
        type="text"
        inputMode="numeric"
        id={id}
        name={name}
        value={text}
        onChange={handleTextChange}
        onBlur={handleBlur}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        title={invalidMsg || title || 'मैनुअल टाइप करें (DD-MM-YYYY) या कैलेंडर आइकन पर क्लिक करें'}
        style={style}
        aria-invalid={Boolean(invalidMsg)}
        className={`${inputDefaultLook} ${fallbackWidth} ${className}${validationBorder} pr-7`}
      />
      <input
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={/^\d{4}-\d{2}-\d{2}$/.test(safeValue) ? safeValue : ''}
        min={min}
        max={max}
        disabled={disabled}
        onChange={handlePickerChange}
        className="absolute right-0 bottom-0 w-7 h-full opacity-0 pointer-events-none"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={openCalendar}
        tabIndex={-1}
        title="Open Calendar Picker (कैलेंडर से चुनें)"
        aria-label="Open calendar picker"
        className="absolute right-1 inset-y-0 my-auto w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:text-indigo-700 hover:bg-slate-200/70 transition cursor-pointer disabled:opacity-40"
      >
        <Calendar className="w-3.5 h-3.5 pointer-events-none" />
      </button>
    </div>
  );
}
