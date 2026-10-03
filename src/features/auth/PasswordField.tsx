import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface PasswordFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** i18n key for the field label (e.g. "auth.field.password"). */
  labelKey: string;
  autoComplete?: 'current-password' | 'new-password';
  minLength?: number;
  required?: boolean;
}

/**
 * Password input with a show/hide toggle. The toggle is a real button with an
 * accessible label and aria-pressed so screen readers announce the state;
 * revealing is per-field and resets on unmount.
 */
export function PasswordField({
  id,
  value,
  onChange,
  labelKey,
  autoComplete = 'current-password',
  minLength,
  required = true,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  return (
    <>
      <label htmlFor={id}>{t(labelKey)}</label>
      <div className="carelink-password">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          minLength={minLength}
          className="carelink-password__input"
        />
        <button
          type="button"
          className="carelink-password__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? t('auth.field.hide_password') : t('auth.field.show_password')}
        >
          {visible ? t('auth.field.hide') : t('auth.field.show')}
        </button>
      </div>
    </>
  );
}
