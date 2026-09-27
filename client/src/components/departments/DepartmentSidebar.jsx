import { useNavigation } from '../../context/NavigationContext.jsx';
import DepartmentSection from './DepartmentSection.jsx';
import FileComplaintCTA from './FileComplaintCTA.jsx';

export default function DepartmentSidebar() {
  const { navigation } = useNavigation();
  const departments = navigation?.departments || [];

  return (
    <aside className="department-sidebar" aria-labelledby="department-sidebar-title">
      <h2 id="department-sidebar-title">All Departments - Complaints</h2>
      <div className="department-sidebar__sections">
        {departments.map((department) => (
          <DepartmentSection department={department} key={department.id} />
        ))}
      </div>
      <div className="department-sidebar__cta">
        <FileComplaintCTA />
        <p>Can&apos;t find brand? Type company name while filing - auto added!</p>
      </div>
    </aside>
  );
}