import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTranslation } from '../../utils/FileComplaintTranslations.js';

function ComplaintFileIcon() {
  return (
    <svg className="file-complaint-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M6 3.75h8l4 4V20.25H6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3.75v4h4M9 13h6M12 10v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export default function FileComplaintButton() {
  const [lang, setLang] = useState(() => localStorage.getItem('badservice_lang') === 'ml' ? 'ml' : 'en');

  useEffect(() => {
    const updateLanguage = () => {
      setLang(localStorage.getItem('badservice_lang') === 'ml' ? 'ml' : 'en');
    };
    window.addEventListener('badservice-language-change', updateLanguage);
    window.addEventListener('storage', updateLanguage);
    return () => {
      window.removeEventListener('badservice-language-change', updateLanguage);
      window.removeEventListener('storage', updateLanguage);
    };
  }, []);

  return (
    <Link className="file-complaint-button" to="/file-complaint">
      <ComplaintFileIcon />
      <span>{getTranslation(lang, 'fileComplaintCta')}</span>
    </Link>
  );
}
