import Logo from './Logo.jsx';

export default function Footer() {
  return (
    <footer className="site-footer">
      <Logo />
      <span>© {new Date().getFullYear()} BadService.in · Check before you buy. Check before you book. Check before you trust.</span>
    </footer>
  );
}
