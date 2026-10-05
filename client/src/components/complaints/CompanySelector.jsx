import { useMemo, useState } from 'react';

export default function CompanySelector({
  companies,
  value,
  onChange,
  error,
  label,
  placeholder,
  onAddCompany,
  addCompanyLabel = '+ Add Company',
  addCompanyOptionLabel = (companyName) => `+ Add “${companyName}”`,
  loadingLabel = 'Loading companies…',
  loading = false,
}) {
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    const list = Array.isArray(companies) ? companies : [];
    if (!query) return list.slice(0, 8);
    return list.filter((company) => company.name.toLowerCase().includes(query)).slice(0, 8);
  }, [companies, value]);
  const hasExact = matches.some((company) => company.name.trim().toLowerCase() === value.trim().toLowerCase());

  return (
    <label className="field company-selector">
      <span>{label}</span>
      <div className="company-selector__control">
        <input
          name="company" value={value} autoComplete="off" placeholder={placeholder}
          aria-autocomplete="list" aria-expanded={open} className={error ? 'is-invalid' : ''}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 140)}
          onChange={(event) => onChange(event.target.value)}
        />
        {value.trim() && !hasExact && onAddCompany && (
          <button type="button" className="company-selector__add" onMouseDown={(event) => event.preventDefault()} onClick={() => onAddCompany(value.trim())}>{addCompanyLabel}</button>
        )}
      </div>
      {loading && <small className="company-selector__loading">{loadingLabel}</small>}
      {open && !loading && (matches.length > 0 || value.trim()) && (
        <ul className="company-selector__list" role="listbox">
          {matches.map((company) => (
            <li key={company.id}>
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(company.name); setOpen(false); }}>
                {company.name}
              </button>
            </li>
          ))}
          {value.trim() && !hasExact && onAddCompany && (
            <li className="company-selector__add-row"><button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onAddCompany(value.trim())}>{addCompanyOptionLabel(value.trim())}</button></li>
          )}
        </ul>
      )}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
