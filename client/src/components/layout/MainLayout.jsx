import { useEffect, useRef, useState } from 'react';
import Footer from './Footer.jsx';
import Header from './Header.jsx';
import MegaMenu from './MegaMenu.jsx';
import SecondaryNavigation from './SecondaryNavigation.jsx';

const menuId = 'all-services-menu';

export default function MainLayout({ children, onSearch, sidebar = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef(null);
  const menuButtonRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return undefined;

    function handlePointerDown(event) {
      const clickedMenu = menuPanelRef.current?.contains(event.target);
      const clickedToggle = menuButtonRef.current?.contains(event.target);

      if (!clickedMenu && !clickedToggle) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className="site-layout">
      <div className="site-navigation">
        <Header
          menuOpen={menuOpen}
          menuId={menuId}
          onMenuToggle={() => setMenuOpen((isOpen) => !isOpen)}
          menuButtonRef={menuButtonRef}
          onSearch={onSearch}
        />
        <SecondaryNavigation />
        <MegaMenu id={menuId} open={menuOpen} panelRef={menuPanelRef} />
      </div>
      <div className={`page-frame${sidebar ? ' page-frame--with-sidebar' : ''}`}>
        {sidebar}
        <main className="page-main">{children}</main>
      </div>
      <Footer />
    </div>
  );
}