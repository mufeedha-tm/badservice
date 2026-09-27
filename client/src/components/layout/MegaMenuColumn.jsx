import MegaMenuSection from './MegaMenuSection.jsx';

export default function MegaMenuColumn({ column }) {
  return (
    <div className="mega-menu__column">
      {column.sections.map((section) => (
        <MegaMenuSection section={section} key={section.id} />
      ))}
      {column.note && <p className="mega-menu__note">{column.note}</p>}
    </div>
  );
}