interface CardTypeSelectorProps {
  value: string;
  onChange: (type: string) => void;
}

const cardTypes = [
  { id: 'social_link', label: 'Social Link', enabled: true },
  { id: 'pdf', label: 'PDF', enabled: true },
  { id: 'docx', label: 'Word Document (coming soon)', enabled: false },
];

export default function CardTypeSelector({
  value,
  onChange,
}: CardTypeSelectorProps) {
  return (
    <div className="card-type-selector">
      <label className="selector-label">Select card type:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="type-select"
      >
        {cardTypes.map((type) => (
          <option key={type.id} value={type.id} disabled={!type.enabled}>
            {type.label}
          </option>
        ))}
      </select>
    </div>
  );
}
