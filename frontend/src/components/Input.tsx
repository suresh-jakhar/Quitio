import { ReactNode } from 'react';

interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'textarea';
  placeholder?: string;
  value?: string | number;
  onChange?: (value: string) => void;
  label?: string;
  error?: string;
  disabled?: boolean;
  required?: boolean;
  name?: string;
  className?: string;
}

export default function Input({
  type = 'text',
  placeholder = '',
  value = '',
  onChange,
  label,
  error,
  disabled = false,
  required = false,
  name,
  className = '',
}: InputProps): JSX.Element {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange?.(e.target.value);
  };

  const inputClass = `input-field ${error ? 'error' : ''} ${className}`.trim();

  return (
    <div className="input-group">
      {label && (
        <label className="input-label">
          {label}
          {required && <span style={{ color: 'var(--color-danger)', marginLeft: '4px' }}>*</span>}
        </label>
      )}
      {type === 'textarea' ? (
        <textarea
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={inputClass}
          style={{ minHeight: '120px', fontFamily: 'inherit', resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={inputClass}
        />
      )}
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
