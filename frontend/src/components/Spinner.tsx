interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  center?: boolean;
}

export default function Spinner({ size = 'md', center = false }: SpinnerProps): JSX.Element {
  const spinnerClass = `spinner spinner-${size}`;

  if (center) {
    return (
      <div className="spinner-center">
        <div className={spinnerClass} />
      </div>
    );
  }

  return <div className={spinnerClass} />;
}
