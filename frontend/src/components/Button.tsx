import { ReactNode } from 'react';

interface ButtonProps {
  label?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  block?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

export default function Button({
  label,
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  block = false,
  type = 'button',
  className = '',
}: ButtonProps): JSX.Element {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = `btn-${size}`;
  const blockClass = block ? 'btn-block' : '';
  const classes = [baseClass, variantClass, sizeClass, blockClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classes}
    >
      {label || children}
    </button>
  );
}
