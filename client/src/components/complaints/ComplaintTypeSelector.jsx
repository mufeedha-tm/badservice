export default function ComplaintTypeSelector({ value, onChange, productLabel, serviceLabel, heading }) {
  return (
    <fieldset className="complaint-form-section">
      <legend className="complaint-form-label">{heading}</legend>
      <div className="complaint-form-type-grid" role="radiogroup" aria-label={heading}>
        {[
          { id: 'Product', label: productLabel, icon: '🛒' },
          { id: 'Service', label: serviceLabel, icon: '🛎️' },
        ].map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={value === option.id}
            className={`complaint-form-type${value === option.id ? ' is-active' : ''}`}
            onClick={() => onChange(option.id)}
          >
            <span aria-hidden="true">{option.icon}</span>
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
