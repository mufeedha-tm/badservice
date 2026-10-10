import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  approveCompanyRequest,
  createAdminCompany,
  deleteAdminComplaint,
  restoreAdminComplaint,
  getAdminCategories,
  getAdminCompanies,
  getAdminComplaints,
  getAdminCompanyRequests,
  getAdminStats,
  getAdminUsers,
  getErrorMessage,
  logoutAccount,
  getAssetUrl,
  rejectCompanyRequest,
  rejectAdminDeleteRequest,
  updateAdminCompanyStatus,
  updateAdminComplaintStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
  loginAdminAccount,
  editAdminComplaint,
} from '../services/api.js';

export default function AdminDashboardPage() {
  const { account, status: accountStatus, setAccount } = useAccount();
  const navigate = useNavigate();
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');
  const [adminLoggingIn, setAdminLoggingIn] = useState(false);
  const [adminSigningOut, setAdminSigningOut] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [requests, setRequests] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  // Filters & Review Modal
  const [requestFilter, setRequestFilter] = useState('PENDING');
  const [complaintFilter, setComplaintFilter] = useState('');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [deleteRequestOnly, setDeleteRequestOnly] = useState(false);
  const [viewDeleted, setViewDeleted] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    model: '',
    seller: '',
    location: '',
    complainantName: '',
    complainantCity: '',
    complainantAddress: '',
    complainantPincode: '',
    statusNote: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Company Admin Form
  const [newCompany, setNewCompany] = useState({ name: '', categoryId: '', status: 'ACTIVE' });
  const [addingCompany, setAddingCompany] = useState(false);

  useEffect(() => {
    if (account && account.role === 'ADMIN') {
      loadStats();
      if (activeTab === 'requests') loadRequests(requestFilter);
      if (activeTab === 'complaints') loadComplaints();
      if (activeTab === 'companies') {
        loadCompanies();
        loadCategories(false);
      }
      if (activeTab === 'users') loadUsers();
      if (activeTab === 'categories') loadCategories();
    }
  }, [account, activeTab, requestFilter]);

  function showMessage(text, type = 'success') {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 5000);
  }

  async function loadStats() {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch {
      // ignore
    }
  }

  async function loadRequests(status = '') {
    setLoading(true);
    try {
      const data = await getAdminCompanyRequests(status);
      setRequests(data);
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Error loading requests', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadComplaints(onlyDelete = deleteRequestOnly, showOnlyDeleted = viewDeleted) {
    setLoading(true);
    try {
      const data = await getAdminComplaints({
        status: complaintFilter,
        q: complaintSearch,
        deleteRequested: onlyDelete ? 'true' : '',
        onlyDeleted: showOnlyDeleted ? 'true' : '',
      });
      setComplaints(data);
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Error loading complaints', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCompanies() {
    setLoading(true);
    try {
      const data = await getAdminCompanies();
      setCompanies(data);
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Error loading companies', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    setLoading(true);
    try {
      const data = await getAdminUsers();
      setUsers(data);
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Error loading users', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const data = await getAdminCategories();
      setCategories(data);
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Error loading categories', 'error');
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Action Handlers
  async function handleApproveRequest(id) {
    try {
      await approveCompanyRequest(id);
      showMessage('Company request approved and company is now active!');
      loadRequests(requestFilter);
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Approval failed', 'error');
    }
  }

  async function handleRejectRequest(id) {
    if (!window.confirm('Are you sure you want to reject this company request?')) return;
    try {
      await rejectCompanyRequest(id);
      showMessage('Company request rejected.', 'info');
      loadRequests(requestFilter);
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Rejection failed', 'error');
    }
  }

  async function handleComplaintStatusChange(id, newStatus) {
    let reason = '';
    if (newStatus === 'REJECTED') {
      const promptRes = window.prompt(
        'Please enter the mandatory reason for REJECTING this complaint:\n(The complainant will see this reason when tracking their complaint)'
      );
      if (promptRes === null) return;
      if (!promptRes.trim()) {
        alert('A rejection reason is strictly mandatory so the complainant knows why their complaint was rejected.');
        return;
      }
      reason = promptRes.trim();
    }
    try {
      await updateAdminComplaintStatus(id, newStatus, reason);
      showMessage(`Complaint status updated to ${newStatus}`);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus, deleteAdminNote: reason || c.deleteAdminNote } : c))
      );
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => ({ ...prev, status: newStatus, deleteAdminNote: reason || prev.deleteAdminNote }));
      }
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Update failed', 'error');
    }
  }

  async function handleDeleteComplaint(id) {
    const reason = window.prompt(
      'Soft delete this complaint?\n\nIt will be hidden from the public website but safely kept in database archives.\n\nEnter deletion note / reason (mandatory):'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A deletion reason is strictly mandatory so the complainant can understand why their complaint was removed when tracking.');
      return;
    }
    try {
      await deleteAdminComplaint(id, reason.trim());
      showMessage('Complaint safely archived (soft-deleted) in database with mandatory note.');
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      if (selectedComplaint?.id === id) {
        setSelectedComplaint(null);
      }
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Delete failed', 'error');
    }
  }

  async function handleApproveDeleteRequest(id) {
    const reason = window.prompt(
      'Approve this user deletion request?\n\nEnter approval note / reason (mandatory, visible to user upon tracking):',
      'User deletion request approved by Admin'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A reason is mandatory for approving deletion.');
      return;
    }
    try {
      await deleteAdminComplaint(id, reason.trim());
      showMessage('Delete request approved. Complaint safely archived in database.');
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      if (selectedComplaint?.id === id) {
        setSelectedComplaint(null);
      }
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Delete approval failed', 'error');
    }
  }

  async function handleRestoreComplaint(id) {
    try {
      await restoreAdminComplaint(id);
      showMessage('Complaint restored successfully! It is now active on the platform.');
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      if (selectedComplaint?.id === id) {
        setSelectedComplaint(null);
      }
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Restore failed', 'error');
    }
  }

  async function handleRejectDeleteRequest(id) {
    const reason = window.prompt(
      'Enter the mandatory reason for rejecting this user deletion request:\n(The complainant will see this update when tracking their complaint)'
    );
    if (reason === null) return;
    if (!reason.trim()) {
      alert('A reason is strictly mandatory when rejecting a deletion request.');
      return;
    }
    try {
      await rejectAdminDeleteRequest(id, reason.trim());
      showMessage('Delete request rejected with explanation note.', 'info');
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, deleteRequested: false, deleteReason: null, statusNote: `Admin rejected deletion request: ${reason.trim()}` } : c))
      );
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => ({ ...prev, deleteRequested: false, deleteReason: null, statusNote: `Admin rejected deletion request: ${reason.trim()}` }));
      }
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Rejection failed', 'error');
    }
  }

  function handleStartEdit(complaint) {
    setEditingComplaint(complaint);
    setEditForm({
      title: complaint.title || '',
      description: complaint.description || '',
      model: complaint.model || '',
      seller: complaint.seller || '',
      location: complaint.location || '',
      complainantName: complaint.complainantName || '',
      complainantCity: complaint.complainantCity || '',
      complainantAddress: complaint.complainantAddress || '',
      complainantPincode: complaint.complainantPincode || '',
      statusNote: complaint.statusNote || '',
    });
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    if (!editingComplaint) return;
    setSavingEdit(true);
    try {
      const updated = await editAdminComplaint(editingComplaint.id, editForm);
      showMessage('Complaint details updated successfully, changes recorded in history.');
      setComplaints((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedComplaint?.id === updated.id) {
        setSelectedComplaint(updated);
      }
      setEditingComplaint(null);
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Failed to update complaint', 'error');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleToggleCompanyStatus(id, currentStatus) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    try {
      await updateAdminCompanyStatus(id, nextStatus);
      showMessage(`Company status changed to ${nextStatus}`);
      loadCompanies();
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Update failed', 'error');
    }
  }

  async function handleAddCompany(e) {
    e.preventDefault();
    if (!newCompany.name.trim()) return;

    setAddingCompany(true);
    try {
      await createAdminCompany({
        name: newCompany.name.trim(),
        categoryId: newCompany.categoryId || null,
        status: newCompany.status,
      });
      showMessage(`Company '${newCompany.name}' added successfully!`);
      setNewCompany({ name: '', categoryId: '', status: 'ACTIVE' });
      loadCompanies();
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Failed to add company', 'error');
    } finally {
      setAddingCompany(false);
    }
  }

  async function handleToggleUserStatus(userId, currentStatus) {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!window.confirm(`Set this user's account to ${nextStatus}?`)) return;
    try {
      await updateAdminUserStatus(userId, nextStatus);
      showMessage(`User account status set to ${nextStatus}`);
      loadUsers();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Update failed', 'error');
    }
  }

  async function handleAdminLogin(event) {
    event.preventDefault();
    if (adminLoggingIn) return;
    setAdminLoggingIn(true);
    setAdminLoginError('');
    try {
      const result = await loginAdminAccount({ username: adminUsername.trim(), password: adminPassword });
      if (result?.role !== 'ADMIN') {
        await logoutAccount().catch(() => {});
        setAdminLoginError('This account is not an administrator account.');
        return;
      }
      setAccount(result);
      setAdminPassword('');
    } catch (error) {
      setAdminLoginError(getErrorMessage(error, 'Admin login failed. Check your username and password.'));
    } finally {
      setAdminLoggingIn(false);
    }
  }

  async function handleAdminSignOut() {
    if (adminSigningOut) return;
    setAdminSigningOut(true);
    try {
      await logoutAccount();
      setAccount(null);
      navigate('/');
    } catch (error) {
      showMessage(getErrorMessage(error, 'Unable to sign out. Please try again.'), 'error');
    } finally {
      setAdminSigningOut(false);
    }
  }

  async function handleToggleUserRole(userId, currentRole) {
    const nextRole = currentRole === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!window.confirm(`Change this user's role to ${nextRole}?`)) return;
    try {
      await updateAdminUserRole(userId, nextRole);
      showMessage(`User role updated to ${nextRole}`);
      loadUsers();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Role update failed', 'error');
    }
  }

  // Access control check
  if (accountStatus === 'loading') {
    return (
      <MainLayout>
        <section style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Verifying administrative credentials...</p>
        </section>
      </MainLayout>
    );
  }

  if (!account || account.role !== 'ADMIN') {
    return (
      <MainLayout>
        <section className="admin-login-page">
          <div className="admin-login-card">
            <div className="admin-login-card__brand" aria-hidden="true">BS</div>
            <span className="admin-login-card__eyebrow">BADService.in · ADMINISTRATION</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage complaints, companies, requests and users.</p>
            <form onSubmit={handleAdminLogin} className="admin-login-form">
              <label className="field">
                <span>Admin username</span>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(event) => setAdminUsername(event.target.value)}
                  autoComplete="username"
                  placeholder="Enter admin username"
                  required
                />
              </label>
              <label className="field">
                <span>Password</span>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(event) => setAdminPassword(event.target.value)}
                  autoComplete="current-password"
                  placeholder="Enter your admin password"
                  required
                />
              </label>
              {adminLoginError && <p className="form-banner form-banner--error" role="alert">{adminLoginError}</p>}
              <button className="submit-button admin-login-submit" type="submit" disabled={adminLoggingIn}>
                {adminLoggingIn ? 'Signing in…' : 'Sign in to dashboard'}
              </button>
            </form>
            <p className="admin-login-card__note"><span aria-hidden="true">●</span> Secure access for authorized administrators</p>
          </div>
        </section>
      </MainLayout>
    );
  }

  const tabStyle = (tab) => ({
    padding: '0.6rem 1rem',
    background: activeTab === tab ? '#232f3e' : '#e9ecef',
    color: activeTab === tab ? '#fff' : '#333',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.9rem',
  });

  return (
    <MainLayout>
      <section className="admin-dashboard" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', borderBottom: '2px solid #eee', paddingBottom: '1rem' }}>
          <div>
            <h1 style={{ margin: 0 }}>⚙️ Admin Dashboard</h1>
            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
              Manage complaints, companies, requests and users.
            </p>
          </div>
          <div className="admin-dashboard__top-actions">
            <Link className="admin-dashboard__home-link" to="/">
              <span aria-hidden="true">←</span> Return to Home
            </Link>
            <button
              className="admin-dashboard__signout"
              type="button"
              onClick={handleAdminSignOut}
              disabled={adminSigningOut}
            >
              {adminSigningOut ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </div>

        {actionMessage.text && (
          <div
            style={{
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              borderRadius: '4px',
              background: actionMessage.type === 'error' ? '#f8d7da' : actionMessage.type === 'info' ? '#d1ecf1' : '#d4edda',
              color: actionMessage.type === 'error' ? '#721c24' : actionMessage.type === 'info' ? '#0c5460' : '#155724',
              fontWeight: 500,
            }}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button style={tabStyle('overview')} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
          <button style={tabStyle('requests')} onClick={() => setActiveTab('requests')}>
            Company Requests {stats?.pendingCompanyRequests > 0 && `(${stats.pendingCompanyRequests})`}
          </button>
          <button style={tabStyle('complaints')} onClick={() => setActiveTab('complaints')}>
            Complaints ({stats?.totalComplaints || 0})
          </button>
          <button style={tabStyle('companies')} onClick={() => setActiveTab('companies')}>
            Companies ({stats?.totalCompanies || 0})
          </button>
          <button style={tabStyle('users')} onClick={() => setActiveTab('users')}>
            Users ({stats?.totalUsers || 0})
          </button>
          <button style={tabStyle('categories')} onClick={() => setActiveTab('categories')}>
            Categories
          </button>
        </div>

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Pending Company Requests</p>
                <h2 style={{ margin: '0.5rem 0', color: '#d9534f' }}>{stats?.pendingCompanyRequests || 0}</h2>
                <button
                  onClick={() => { setActiveTab('requests'); setRequestFilter('PENDING'); }}
                  style={{ background: 'none', border: 'none', color: '#0066cc', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Review requests &rarr;
                </button>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Total Complaints</p>
                <h2 style={{ margin: '0.5rem 0' }}>{stats?.totalComplaints || 0}</h2>
                <small style={{ color: '#666' }}>{stats?.pendingComplaints || 0} pending review</small>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Active Companies</p>
                <h2 style={{ margin: '0.5rem 0', color: '#28a745' }}>{stats?.totalCompanies || 0}</h2>
                <small style={{ color: '#666' }}>Registered brands</small>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Registered Users</p>
                <h2 style={{ margin: '0.5rem 0' }}>{stats?.totalUsers || 0}</h2>
                <small style={{ color: '#666' }}>Community members</small>
              </div>

              <div style={{ background: '#fff', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.04)' }}>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>Soft-Deleted Archive</p>
                <h2 style={{ margin: '0.5rem 0', color: '#6c757d' }}>{stats?.deletedComplaints || 0}</h2>
                <small style={{ color: '#666' }}>Safely stored in DB</small>
              </div>
            </div>

            <div style={{ background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '8px', padding: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Quick Actions</h3>
              <ul style={{ margin: 0, paddingLeft: '1.2rem', lineHeight: '1.8' }}>
                <li>Review and approve user-requested companies to make them publicly available for complaints.</li>
                <li>Update complaint status as companies respond or issues get resolved.</li>
                <li>Manage user account statuses to protect platform integrity.</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB: COMPANY REQUESTS */}
        {activeTab === 'requests' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Company Requests</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {['', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setRequestFilter(st)}
                    style={{
                      padding: '0.3rem 0.6rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid #ccc',
                      background: requestFilter === st ? '#232f3e' : '#fff',
                      color: requestFilter === st ? '#fff' : '#333',
                      cursor: 'pointer',
                    }}
                  >
                    {st || 'All'}
                  </button>
                ))}
              </div>
            </div>

            {loading && <p>Loading requests...</p>}
            {!loading && requests.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '6px' }}>
                No company requests found for filter: <strong>{requestFilter || 'All'}</strong>
              </p>
            )}

            {!loading && requests.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Company</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Requested By</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Notes</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{r.companyName}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{r.categoryName || r.categoryId}</td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {r.requesterName} <br />
                          <small style={{ color: '#666' }}>{r.requesterEmail}</small>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#555' }}>
                          {r.description || '-'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: r.status === 'APPROVED' ? '#d4edda' : r.status === 'REJECTED' ? '#f8d7da' : '#fff3cd',
                              color: r.status === 'APPROVED' ? '#155724' : r.status === 'REJECTED' ? '#721c24' : '#856404',
                            }}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          {r.status === 'PENDING' ? (
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button
                                onClick={() => handleApproveRequest(r.id)}
                                style={{ padding: '0.3rem 0.6rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRejectRequest(r.id)}
                                style={{ padding: '0.3rem 0.6rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                              >
                                Reject
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.8rem', color: '#888' }}>
                              {r.reviewedBy ? 'Reviewed' : '-'}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ margin: 0 }}>Complaints Management</h2>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteRequestOnly(false);
                    setViewDeleted(false);
                    loadComplaints(false, false);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: !deleteRequestOnly && !viewDeleted ? '#232f3e' : '#f8f9fa',
                    color: !deleteRequestOnly && !viewDeleted ? '#fff' : '#495057',
                    border: '1px solid ' + (!deleteRequestOnly && !viewDeleted ? '#232f3e' : '#ced4da'),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  Active Complaints
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewDeleted(false);
                    setDeleteRequestOnly(true);
                    loadComplaints(true, false);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: deleteRequestOnly ? '#dc3545' : '#f8f9fa',
                    color: deleteRequestOnly ? '#fff' : '#495057',
                    border: '1px solid ' + (deleteRequestOnly ? '#dc3545' : '#ced4da'),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  ⚠️ Delete Requests {stats?.pendingDeleteRequests > 0 ? `(${stats.pendingDeleteRequests})` : ''}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteRequestOnly(false);
                    setViewDeleted(true);
                    loadComplaints(false, true);
                  }}
                  style={{
                    padding: '0.35rem 0.75rem',
                    background: viewDeleted ? '#6c757d' : '#f8f9fa',
                    color: viewDeleted ? '#fff' : '#495057',
                    border: '1px solid ' + (viewDeleted ? '#6c757d' : '#ced4da'),
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  🗄️ Soft-Deleted Archive {stats?.deletedComplaints > 0 ? `(${stats.deletedComplaints})` : ''}
                </button>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  placeholder="Search title, company, person..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadComplaints()}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                />
                <select
                  value={complaintFilter}
                  onChange={(e) => { setComplaintFilter(e.target.value); }}
                  style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="COMPANY_RESPONDED">COMPANY_RESPONDED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
                <button
                  onClick={() => loadComplaints()}
                  style={{ padding: '0.3rem 0.8rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Filter
                </button>
              </div>
            </div>

            {loading && <p>Loading complaints...</p>}
            {!loading && complaints.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '6px' }}>
                {deleteRequestOnly ? 'No pending delete requests.' : viewDeleted ? 'No soft-deleted complaints in archive.' : 'No complaints found matching criteria.'}
              </p>
            )}

            {!loading && complaints.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Complaint</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Type & Brand</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Complainant</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Bill (admin only)</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: c.deleteRequested ? '#fffaf0' : c.isDeleted ? '#fff5f5' : 'transparent' }}>
                        <td style={{ padding: '0.6rem 0.8rem', maxWidth: '260px' }}>
                          <button
                            type="button"
                            onClick={() => setSelectedComplaint(c)}
                            style={{
                              background: 'none',
                              border: 'none',
                              padding: 0,
                              color: '#0066cc',
                              fontWeight: 600,
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontSize: '0.9rem',
                            }}
                          >
                            {c.title}
                          </button>
                          {c.location && <small style={{ display: 'block', color: '#666' }}>📍 {c.location}</small>}
                          {c.deleteRequested && (
                            <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                              ⚠️ DELETE REQUESTED
                            </span>
                          )}
                          {c.isDeleted && (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                🗄️ ARCHIVED IN DB
                              </span>
                              {c.deleteAdminNote && <small style={{ display: 'block', color: '#888', fontStyle: 'italic' }}>Note: {c.deleteAdminNote}</small>}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: c.type === 'Service' ? '#856404' : '#004085', background: c.type === 'Service' ? '#fff3cd' : '#cce5ff', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>
                            {c.type || 'Product'}
                          </span>
                          <strong>{c.company}</strong>
                          {c.serviceType && <small style={{ display: 'block', color: '#555' }}>Type: {c.serviceType}</small>}
                          {c.category && <small style={{ display: 'block', color: '#888' }}>{c.category}</small>}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          <div>{c.complainantName || 'Anonymous'}</div>
                          {c.complainantPhone && (
                            <small style={{ color: '#555' }}>
                              📞 {c.complainantPhone} {c.phoneVerified ? '✓' : ''}
                            </small>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.billImageUrl ? (
                            <a href={getAssetUrl(c.billImageUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', fontWeight: 500 }}>
                              🔒 View Bill
                            </a>
                          ) : (
                            <span style={{ color: '#aaa' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          {c.isDeleted ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#f8d7da', color: '#721c24', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                              🗑️ SOFT-DELETED
                            </span>
                          ) : (
                            <select
                              value={c.status || 'PENDING'}
                              onChange={(e) => handleComplaintStatusChange(c.id, e.target.value)}
                              style={{
                                padding: '0.2rem 0.4rem',
                                fontSize: '0.8rem',
                                borderRadius: '4px',
                                fontWeight: 600,
                                background: c.status === 'APPROVED' ? '#e8f5e9' : c.status === 'PENDING' ? '#fff8e1' : '#f5f5f5',
                              }}
                            >
                              <option value="PENDING">PENDING</option>
                              <option value="APPROVED">APPROVED</option>
                              <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                              <option value="COMPANY_RESPONDED">COMPANY_RESPONDED</option>
                              <option value="RESOLVED">RESOLVED</option>
                              <option value="REJECTED">REJECTED</option>
                            </select>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          {c.isDeleted ? (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedComplaint(c)}
                                style={{ padding: '0.25rem 0.5rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                🔍 Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(c)}
                                style={{ padding: '0.25rem 0.5rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                title="Edit complaint details"
                              >
                                ✏️ Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestoreComplaint(c.id)}
                                style={{ padding: '0.25rem 0.55rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                title="Restore this complaint back to active status on the website"
                              >
                                ♻️ Restore
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedComplaint(c)}
                                style={{ padding: '0.25rem 0.5rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                              >
                                🔍 Review
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(c)}
                                style={{ padding: '0.25rem 0.5rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                title="Edit complaint details"
                              >
                                ✏️ Edit
                              </button>
                              {c.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() => handleComplaintStatusChange(c.id, 'APPROVED')}
                                  style={{ padding: '0.25rem 0.5rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                >
                                  ✓ Approve
                                </button>
                              )}
                              {c.deleteRequested && (
                                <button
                                  type="button"
                                  onClick={() => handleApproveDeleteRequest(c.id)}
                                  style={{ padding: '0.25rem 0.5rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                                  title="Approve deletion request and archive this complaint"
                                >
                                  Approve Delete
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleDeleteComplaint(c.id)}
                                style={{ padding: '0.25rem 0.4rem', background: '#eee', color: '#dc3545', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* FULL DETAILS COMPLAINT REVIEW MODAL */}
            {selectedComplaint && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.65)',
                  zIndex: 9999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                }}
                onClick={() => setSelectedComplaint(null)}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Modal Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #eee', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#666' }}>
                        Complaint ID: {selectedComplaint.id}
                      </span>
                      <h2 style={{ margin: '0.25rem 0 0 0', fontSize: '1.25rem', color: '#111' }}>
                        {selectedComplaint.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedComplaint(null)}
                      style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}
                    >
                      ×
                    </button>
                  </div>

                  {/* Deletion Request Alert (if user requested deletion) */}
                  {selectedComplaint.deleteRequested && (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', color: '#721c24' }}>
                        ⚠️ User Submitted a Delete Request
                      </h4>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                        <strong>Reason:</strong> {selectedComplaint.deleteReason || 'User requested deletion'}
                      </p>
                      {selectedComplaint.deleteRequestedAt && (
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#666' }}>
                          Requested at: {new Date(selectedComplaint.deleteRequestedAt).toLocaleString()}
                        </p>
                      )}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => handleApproveDeleteRequest(selectedComplaint.id)}
                          style={{ padding: '0.4rem 0.8rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          ✓ Approve Delete Request (Permanently Delete)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDeleteRequest(selectedComplaint.id)}
                          style={{ padding: '0.4rem 0.8rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                          ✗ Reject Delete Request (Keep Complaint)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Soft-Deleted In DB Alert */}
                  {selectedComplaint.isDeleted && (
                    <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', color: '#721c24' }}>
                        🗄️ Soft-Deleted & Safely Archived in Database
                      </h4>
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>
                        <strong>Admin Deletion Note:</strong> {selectedComplaint.deleteAdminNote || 'Archived by administrator'}
                      </p>
                      {selectedComplaint.deletedAt && (
                        <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#666' }}>
                          Deleted at: {new Date(selectedComplaint.deletedAt).toLocaleString()}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRestoreComplaint(selectedComplaint.id)}
                        style={{ padding: '0.45rem 1rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem' }}
                      >
                        ♻️ Restore Complaint to Website
                      </button>
                    </div>
                  )}

                  {/* Top Status & Quick Approve Banner */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '0.75rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Current Status:</span>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '4px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          background: selectedComplaint.status === 'APPROVED' ? '#d4edda' : selectedComplaint.status === 'PENDING' ? '#fff3cd' : '#e2e3e5',
                          color: selectedComplaint.status === 'APPROVED' ? '#155724' : selectedComplaint.status === 'PENDING' ? '#856404' : '#383d41',
                        }}
                      >
                        {selectedComplaint.status}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {selectedComplaint.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleComplaintStatusChange(selectedComplaint.id, 'APPROVED')}
                          style={{
                            padding: '0.45rem 1rem',
                            background: '#28a745',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                          }}
                        >
                          ✓ Approve & Publish to Website
                        </button>
                      )}
                      {['APPROVED', 'COMPANY_RESPONDED', 'RESOLVED'].includes(selectedComplaint.status) && (
                        <Link
                          to={`/complaints/${encodeURIComponent(selectedComplaint.id)}`}
                          target="_blank"
                          style={{
                            padding: '0.45rem 0.8rem',
                            background: '#0066cc',
                            color: '#fff',
                            textDecoration: 'none',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '0.82rem',
                          }}
                        >
                          View Public Page ↗
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(selectedComplaint)}
                        style={{
                          padding: '0.45rem 0.9rem',
                          background: '#0d6efd',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                        }}
                        title="Edit complaint details and preserve revision history"
                      >
                        ✏️ Edit Details
                      </button>
                    </div>
                  </div>

                  {/* Two column grid for details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Column 1: Complainant Details */}
                    <div style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', background: '#fafbfc' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#232f3e', borderBottom: '1px solid #ddd', paddingBottom: '0.4rem' }}>
                        👤 Complainant Information
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                        <div><strong>Full Name:</strong> {selectedComplaint.complainantName || 'Not specified'}</div>
                        <div>
                          <strong>Phone:</strong> {selectedComplaint.complainantPhone || 'Not specified'}
                          {selectedComplaint.phoneVerified && <span style={{ color: '#28a745', marginLeft: '6px', fontWeight: 600 }}>✓ Phone Verified</span>}
                        </div>
                        <div><strong>Email:</strong> {selectedComplaint.complainantEmail || 'None'}</div>
                        <div><strong>City:</strong> {selectedComplaint.complainantCity || 'Not specified'}</div>
                        <div><strong>Address:</strong> {selectedComplaint.complainantAddress || 'Not specified'}</div>
                        <div><strong>PIN Code:</strong> {selectedComplaint.complainantPincode || 'Not specified'}</div>
                        <div><strong>Submitted:</strong> {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : 'N/A'}</div>
                      </div>
                    </div>

                    {/* Column 2: Complaint Details */}
                    <div style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', background: '#fafbfc' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#232f3e', borderBottom: '1px solid #ddd', paddingBottom: '0.4rem' }}>
                        📋 Complaint Particulars
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                        <div><strong>Complaint Type:</strong> {selectedComplaint.type || 'Product'}</div>
                        <div><strong>Main Category:</strong> {selectedComplaint.category || 'N/A'}</div>
                        {selectedComplaint.serviceType && (
                          <div><strong>Service Type:</strong> {selectedComplaint.serviceType}</div>
                        )}
                        <div>
                          <strong>{selectedComplaint.type === 'Service' ? 'Service Provider:' : 'Company / Brand:'}</strong>{' '}
                          {selectedComplaint.company}
                        </div>
                        <div>
                          <strong>{selectedComplaint.type === 'Service' ? 'Purpose / Service Details:' : 'Product / Model:'}</strong>{' '}
                          {selectedComplaint.model || 'N/A'}
                        </div>
                        {selectedComplaint.seller && (
                          <div><strong>Seller / Shop:</strong> {selectedComplaint.seller}</div>
                        )}
                        <div><strong>Location:</strong> {selectedComplaint.location || 'N/A'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Full Complaint Description */}
                  <div style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#232f3e' }}>📝 Full Complaint Description</h4>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#333' }}>
                      {selectedComplaint.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Edit History Section (Preserving History) */}
                  {Array.isArray(selectedComplaint.editHistory) && selectedComplaint.editHistory.length > 0 && (
                    <div style={{ border: '1px solid #cce5ff', background: '#f0f7ff', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#004085', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        🕒 Edit & Correction History ({selectedComplaint.editHistory.length} revisions)
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                        {selectedComplaint.editHistory.map((hist, idx) => (
                          <div key={idx} style={{ background: '#fff', padding: '0.65rem 0.85rem', borderRadius: '4px', border: '1px solid #d6e9f8', fontSize: '0.82rem' }}>
                            <div style={{ color: '#555', marginBottom: '4px', fontWeight: 600 }}>
                              Edited at {hist.editedAt ? new Date(hist.editedAt).toLocaleString() : 'N/A'} by {hist.editedBy || 'admin'}
                            </div>
                            <ul style={{ margin: '0', paddingLeft: '1.2rem', lineHeight: '1.6' }}>
                              {Object.entries(hist.changes || {}).map(([fKey, ch]) => (
                                <li key={fKey}>
                                  <strong style={{ textTransform: 'capitalize' }}>{fKey}:</strong>{' '}
                                  <span style={{ color: '#dc3545', textDecoration: 'line-through' }}>{ch.from || '(empty)'}</span> &rarr;{' '}
                                  <span style={{ color: '#28a745', fontWeight: 600 }}>{ch.to || '(empty)'}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Evidences Section: Bill, Photo, Video */}
                  <div style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem', background: '#fff' }}>
                    <h4 style={{ margin: '0 0 0.75rem 0', color: '#232f3e' }}>
                      📎 Uploaded Evidence & Verification Files
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      {/* 1. Bill (Admin only) */}
                      <div style={{ border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem', background: '#fffdf6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>🔒 Purchase Proof / Bill</strong>
                          <span style={{ fontSize: '0.7rem', color: '#856404', background: '#fff3cd', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Admin Only
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                          Visible only in admin dashboard. Never displayed on public website.
                        </p>
                        {selectedComplaint.billImageUrl ? (
                          <div>
                            <img
                              src={getAssetUrl(selectedComplaint.billImageUrl)}
                              alt="Bill Evidence"
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: '#f5f5f5', borderRadius: '4px', border: '1px solid #eee' }}
                            />
                            <a
                              href={getAssetUrl(selectedComplaint.billImageUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.8rem', color: '#0066cc', fontWeight: 600 }}
                            >
                              Open Full Size ↗
                            </a>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: '#999', margin: 0 }}>No bill image attached.</p>
                        )}
                      </div>

                      {/* 2. Photo (Public Website Carousel) */}
                      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>
                            📸 {selectedComplaint.type === 'Service' ? 'Service Photo' : 'Product Photo'}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#155724', background: '#d4edda', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Public Carousel
                          </span>
                        </div>
                        {selectedComplaint.productImageUrl ? (
                          <div>
                            <img
                              src={getAssetUrl(selectedComplaint.productImageUrl)}
                              alt="Product Evidence"
                              style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', background: '#fff', borderRadius: '4px', border: '1px solid #eee' }}
                            />
                            <a
                              href={getAssetUrl(selectedComplaint.productImageUrl)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.8rem', color: '#0066cc', fontWeight: 600 }}
                            >
                              Open Full Size ↗
                            </a>
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: '#999', margin: 0 }}>No photo attached.</p>
                        )}
                      </div>

                      {/* 3. Video (Public Website Carousel) */}
                      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>
                            🎥 {selectedComplaint.type === 'Service' ? 'Service Video' : 'Product Video'}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#155724', background: '#d4edda', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Public Carousel
                          </span>
                        </div>
                        {selectedComplaint.productVideoUrl ? (
                          <div>
                            <video
                              controls
                              src={getAssetUrl(selectedComplaint.productVideoUrl)}
                              style={{ width: '100%', maxHeight: '180px', background: '#000', borderRadius: '4px' }}
                            />
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: '#999', margin: 0 }}>No video attached.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Change Status:</label>
                      <select
                        value={selectedComplaint.status || 'PENDING'}
                        onChange={(e) => handleComplaintStatusChange(selectedComplaint.id, e.target.value)}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.85rem', borderRadius: '4px' }}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                        <option value="COMPANY_RESPONDED">COMPANY_RESPONDED</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {selectedComplaint.isDeleted ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreComplaint(selectedComplaint.id)}
                          style={{ padding: '0.4rem 0.8rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                        >
                          ♻️ Restore to Website
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDeleteComplaint(selectedComplaint.id)}
                          style={{ padding: '0.4rem 0.8rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                        >
                          Soft Delete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setSelectedComplaint(null)}
                        style={{ padding: '0.4rem 0.8rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* EDIT COMPLAINT MODAL (ADMIN EDIT & SPELLING/DETAILS CORRECTION) */}
            {editingComplaint && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0,0,0,0.7)',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '1rem',
                }}
                onClick={() => setEditingComplaint(null)}
              >
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    width: '100%',
                    maxWidth: '800px',
                    maxHeight: '92vh',
                    overflowY: 'auto',
                    padding: '1.5rem',
                    boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0066cc', paddingBottom: '0.75rem', marginBottom: '1.25rem' }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111' }}>
                        ✏️ Edit Complaint #{editingComplaint.id}
                      </h2>
                      <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#666' }}>
                        Correct typos, seller, address, or details. All modifications are logged in complaint revision history.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingComplaint(null)}
                      style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#888' }}
                    >
                      ×
                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Complaint Title
                      </label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Product Model / Details
                        </label>
                        <input
                          type="text"
                          value={editForm.model}
                          onChange={(e) => setEditForm({ ...editForm, model: e.target.value })}
                          placeholder="e.g. iPhone 15 Pro, AC Repair"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Seller / Store Name
                        </label>
                        <input
                          type="text"
                          value={editForm.seller}
                          onChange={(e) => setEditForm({ ...editForm, seller: e.target.value })}
                          placeholder="e.g. Retailer or Branch"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Incident Location / Branch
                        </label>
                        <input
                          type="text"
                          value={editForm.location}
                          onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                          placeholder="e.g. Mumbai, Indiranagar Branch"
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                        />
                      </div>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px', border: '1px solid #e9ecef' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', color: '#232f3e' }}>
                        👤 Complainant Contact & Address Details
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            Complainant Name
                          </label>
                          <input
                            type="text"
                            value={editForm.complainantName}
                            onChange={(e) => setEditForm({ ...editForm, complainantName: e.target.value })}
                            style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            City / Town
                          </label>
                          <input
                            type="text"
                            value={editForm.complainantCity}
                            onChange={(e) => setEditForm({ ...editForm, complainantCity: e.target.value })}
                            style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            PIN Code (6 digits)
                          </label>
                          <input
                            type="text"
                            value={editForm.complainantPincode}
                            onChange={(e) => setEditForm({ ...editForm, complainantPincode: e.target.value })}
                            placeholder="6-digit PIN code"
                            maxLength={6}
                            style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Complete Postal Address
                        </label>
                        <input
                          type="text"
                          value={editForm.complainantAddress}
                          onChange={(e) => setEditForm({ ...editForm, complainantAddress: e.target.value })}
                          placeholder="House/flat number, street, area"
                          style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Complaint Description
                      </label>
                      <textarea
                        rows={5}
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        required
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem', lineHeight: '1.4' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                        Admin / Status Note (Optional explanation for complainant or internal audit)
                      </label>
                      <input
                        type="text"
                        value={editForm.statusNote}
                        onChange={(e) => setEditForm({ ...editForm, statusNote: e.target.value })}
                        placeholder="e.g. Corrected spelling in brand model per invoice review"
                        style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.9rem' }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setEditingComplaint(null)}
                        disabled={savingEdit}
                        style={{ padding: '0.5rem 1rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        style={{ padding: '0.5rem 1.25rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        {savingEdit ? 'Saving Changes…' : '💾 Save Changes & Log Revision'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: COMPANIES */}
        {activeTab === 'companies' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2 style={{ margin: 0 }}>Companies</h2>
            </div>

            {/* Admin Add Company Form */}
            <form onSubmit={handleAddCompany} style={{ background: '#f8f9fa', border: '1px solid #ddd', padding: '1rem', borderRadius: '6px', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>+ Add Company (Admin Direct)</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  placeholder="Company name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  style={{ flex: '1 1 200px', padding: '0.4rem' }}
                  required
                />
                <select
                  value={newCompany.categoryId}
                  onChange={(e) => setNewCompany({ ...newCompany, categoryId: e.target.value })}
                  style={{ flex: '1 1 180px', padding: '0.4rem' }}
                >
                  <option value="">Assign category (optional)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <select
                  value={newCompany.status}
                  onChange={(e) => setNewCompany({ ...newCompany, status: e.target.value })}
                  style={{ padding: '0.4rem' }}
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
                <button
                  type="submit"
                  disabled={addingCompany}
                  style={{ padding: '0.4rem 1rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {addingCompany ? 'Adding...' : 'Add Company'}
                </button>
              </div>
            </form>

            {loading && <p>Loading companies...</p>}
            {!loading && companies.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Name</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Slug</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Toggle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((co) => (
                      <tr key={co.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>
                          <Link to={`/companies/${encodeURIComponent(co.id)}`} target="_blank" style={{ color: '#0066cc', textDecoration: 'none' }}>
                            {co.name}
                          </Link>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#666', fontSize: '0.85rem' }}>{co.slug || co.id}</td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>{co.categoryName || '-'}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: co.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                              color: co.status === 'ACTIVE' ? '#155724' : '#721c24',
                            }}
                          >
                            {co.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <button
                            onClick={() => handleToggleCompanyStatus(co.id, co.status || 'ACTIVE')}
                            style={{
                              padding: '0.2rem 0.6rem',
                              fontSize: '0.8rem',
                              borderRadius: '4px',
                              border: '1px solid #ccc',
                              background: '#fff',
                              cursor: 'pointer',
                            }}
                          >
                            {co.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: USERS */}
        {activeTab === 'users' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>User Accounts</h2>
            {loading && <p>Loading users...</p>}
            {!loading && users.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Name</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Email</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Role</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Registered</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: 600 }}>{u.name}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{u.email}</td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: u.role === 'ADMIN' ? '#d9534f' : '#e2e3e5',
                              color: u.role === 'ADMIN' ? '#fff' : '#333',
                            }}
                          >
                            {u.role || 'USER'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span
                            style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: u.status === 'ACTIVE' ? '#d4edda' : '#f8d7da',
                              color: u.status === 'ACTIVE' ? '#155724' : '#721c24',
                            }}
                          >
                            {u.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#666' }}>
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '-'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status || 'ACTIVE')}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                            >
                              {u.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              onClick={() => handleToggleUserRole(u.id, u.role || 'USER')}
                              style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                            >
                              Make {u.role === 'ADMIN' ? 'USER' : 'ADMIN'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB: CATEGORIES */}
        {activeTab === 'categories' && (
          <div>
            <h2 style={{ marginBottom: '1rem' }}>Categories & Hierarchy</h2>
            {loading && <p>Loading categories...</p>}
            {!loading && categories.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Name</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>ID / Slug</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Type</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Parent Category</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((cat) => (
                      <tr key={cat.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.6rem 0.8rem', fontWeight: cat.parentId ? 'normal' : 600 }}>
                          {cat.parentId ? `└─ ${cat.name}` : cat.name}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', color: '#666', fontSize: '0.85rem' }}>{cat.slug || cat.id}</td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {cat.parentId ? 'Subcategory' : 'Parent Category'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem', color: '#666' }}>
                          {cat.parentId || '-'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, background: '#d4edda', color: '#155724' }}>
                            {cat.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </MainLayout>
  );
}
