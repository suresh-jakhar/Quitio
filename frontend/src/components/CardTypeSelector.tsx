interface CardTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

const cardTypes = [
  { id: 'social_link', label: 'Social Link' },
  { id: 'pdf', label: 'PDF' },
  { id: 'docx', label: 'Word Document' },
];

export default function CardTypeSelector({
  value,
  onChange,
}: CardTypeSelectorProps): JSX.Element {
  return (
    <div className="card-type-selector">
      <label className="selector-label">Select card type:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="type-select"
      >
        {cardTypes.map((type) => (
          <option key={type.id} value={type.id}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}
