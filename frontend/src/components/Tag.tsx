interface TagProps {
  label: string;
  onClick?: () => void;
  onRemove?: () => void;
  selected?: boolean;
  removable?: boolean;
}

export default function Tag({
  label,
  onClick,
  onRemove,
  selected = false,
  removable = false,
}: TagProps): JSX.Element {
  const tagClass = `tag ${selected ? 'selected' : ''}`.trim();

  return (
    <span className={tagClass} onClick={onClick}>
      {label}
      {removable && onRemove && (
        <span className="tag-remove" onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}>
          ×
        </span>
      )}
    </span>
  );
}
