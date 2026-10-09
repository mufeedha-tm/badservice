import { Link } from 'react-router-dom';
import AllMenuButton from './AllMenuButton.jsx';
import FileComplaintButton from './FileComplaintButton.jsx';
import Logo from './Logo.jsx';
import SearchBar from './SearchBar.jsx';

export default function Header({ menuOpen, menuId, onMenuToggle, menuButtonRef, onSearch }) {
  return (
    <header className="primary-header">
      <Logo />
      <AllMenuButton
        expanded={menuOpen}
        menuId={menuId}
        onClick={onMenuToggle}
        buttonRef={menuButtonRef}
      />
      <SearchBar onSearch={onSearch} />
      <div className="header-actions-group">
        <Link to="/track" className="track-complaint-button" title="Track your complaint status and updates">
          <span>📍 Track Status</span>
        </Link>
        <FileComplaintButton />
      </div>
    </header>
  );
}
