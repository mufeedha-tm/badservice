export default function MainLayout({ children, sidebar = null }) {
  return (
    <div className={`page-frame${sidebar ? ' page-frame--with-sidebar' : ''}`}>
      {sidebar}
      <main className="page-main">{children}</main>
    </div>
  );
}
