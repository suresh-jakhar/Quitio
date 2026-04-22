import { XIcon } from './icons';

import React from 'react';

interface TagProps {
  label: string;
  onClick?: (e: React.MouseEvent<HTMLSpanElement>) => void;
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
          <XIcon />
        </span>
      )}
    </span>
  );
}
