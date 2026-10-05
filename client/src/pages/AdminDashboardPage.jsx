import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  approveCompanyRequest,
  createAdminCompany,
  deleteAdminComplaint,
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
  updateAdminCompanyStatus,
  updateAdminComplaintStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
  loginAdminAccount,
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

  // Filters
  const [requestFilter, setRequestFilter] = useState('PENDING');
  const [complaintFilter, setComplaintFilter] = useState('');
  const [complaintSearch, setComplaintSearch] = useState('');

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

  async function loadComplaints() {
    setLoading(true);
    try {
      const data = await getAdminComplaints({
        status: complaintFilter,
        q: complaintSearch,
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
    try {
      await updateAdminComplaintStatus(id, newStatus);
      showMessage(`Complaint status updated to ${newStatus}`);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Update failed', 'error');
    }
  }

  async function handleDeleteComplaint(id) {
    if (!window.confirm('Delete this complaint permanently?')) return;
    try {
      await deleteAdminComplaint(id);
      showMessage('Complaint deleted successfully.');
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      loadStats();
    } catch (err) {
      showMessage(err.response?.data?.error?.message || 'Delete failed', 'error');
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
              <h2 style={{ margin: 0 }}>Complaints Management</h2>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  placeholder="Search title, company..."
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
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="COMPANY_RESPONDED">COMPANY_RESPONDED</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
                <button
                  onClick={loadComplaints}
                  style={{ padding: '0.3rem 0.8rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Filter
                </button>
              </div>
            </div>

            {loading && <p>Loading complaints...</p>}
            {!loading && complaints.length === 0 && (
              <p style={{ padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '6px' }}>
                No complaints found matching criteria.
              </p>
            )}

            {!loading && complaints.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Title</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Company</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Category</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Proof</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '0.6rem 0.8rem', maxWidth: '280px' }}>
                          <Link to={`/complaints/${encodeURIComponent(c.id)}`} target="_blank" style={{ color: '#0066cc', fontWeight: 500, textDecoration: 'none' }}>
                            {c.title}
                          </Link>
                          {c.location && <small style={{ display: 'block', color: '#666' }}>📍 {c.location}</small>}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>{c.company}</td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.category}
                          {c.subcategory && <small style={{ display: 'block', color: '#666' }}>({c.subcategory})</small>}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.proofUrl ? (
                            <a href={getAssetUrl(c.proofUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                              📎 View
                            </a>
                          ) : (
                            <span style={{ color: '#aaa' }}>None</span>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <select
                            value={c.status || 'PENDING'}
                            onChange={(e) => handleComplaintStatusChange(c.id, e.target.value)}
                            style={{
                              padding: '0.2rem 0.4rem',
                              fontSize: '0.8rem',
                              borderRadius: '4px',
                              fontWeight: 600,
                            }}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                            <option value="COMPANY_RESPONDED">COMPANY_RESPONDED</option>
                            <option value="RESOLVED">RESOLVED</option>
                            <option value="REJECTED">REJECTED</option>
                          </select>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          <button
                            onClick={() => handleDeleteComplaint(c.id)}
                            style={{ padding: '0.2rem 0.5rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}
                          >
                            Delete
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
