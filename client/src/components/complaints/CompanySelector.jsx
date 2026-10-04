import { useMemo, useState } from 'react';

export default function CompanySelector({
  companies,
  value,
  onChange,
  error,
  label,
  placeholder,
}) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    const list = Array.isArray(companies) ? companies : [];
    if (!query) return list.slice(0, 8);
    return list
      .filter((company) => company.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [companies, value]);

  return (
    <label className="field company-selector">
      <span>{label}</span>
      <input
        name="company"
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        className={error ? 'is-invalid' : ''}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => onChange(event.target.value)}
      />
      {open && matches.length > 0 && (
        <ul className="company-selector__list" role="listbox">
          {matches.map((company) => (
            <li key={company.id}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(company.name);
                  setOpen(false);
                }}
              >
                {company.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
