import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout.jsx';
import Logo from '../components/layout/Logo.jsx';
import { useAccount } from '../context/AccountContext.jsx';
import {
  createAdminCompany,
  createAdminComplaint,
  deleteAdminComplaint,
  restoreAdminComplaint,
  getAdminCategories,
  getAdminComplaintBill,
  getAdminCompanies,
  getAdminComplaints,
  getAdminStats,
  getAdminUsers,
  getErrorMessage,
  getAssetUrl,
  logoutAccount,
  rejectAdminDeleteRequest,
  updateAdminCompanyStatus,
  updateAdminComplaintStatus,
  updateAdminUserRole,
  updateAdminUserStatus,
  loginAdminAccount,
  editAdminComplaint,
  uploadDraftMedia,
} from '../services/api.js';
import { IMAGE_ACCEPT, VIDEO_ACCEPT } from '../utils/complaintMedia.js';

function getComplaintPhotoUrls(complaint) {
  const uploadedPhotos = Array.isArray(complaint?.productImages)
    ? complaint.productImages
      .map((photo) => (typeof photo === 'string' ? photo : photo?.url))
      .filter(Boolean)
    : [];

  const photoUrls = uploadedPhotos.length > 0
    ? uploadedPhotos
    : complaint?.productImageUrl ? [complaint.productImageUrl] : [];

  return [...new Set(photoUrls)];
}

function AdminComplaintFilePreview({ file }) {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl('');
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (!file || !previewUrl) return null;
  if (file.type.startsWith('image/')) {
    return <img className="admin-upload-preview__image" src={previewUrl} alt={`Preview of ${file.name}`} />;
  }
  if (file.type.startsWith('video/')) {
    return <video className="admin-upload-preview__video" src={previewUrl} controls preload="metadata" aria-label={`Preview of ${file.name}`} />;
  }
  return null;
}

function AdminIcon({ name, size = 18 }) {
  const paths = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    complaints: <><path d="M8 3h8l5 5v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3Z" /><path d="M8 12h8M8 16h8M15 3v5h5" /></>,
    create: <><path d="M12 5v14M5 12h14" /></>,
    companies: <><path d="M3 21h18M5 21V7l7-4 7 4v14M9 10h.01M15 10h.01M9 14h.01M15 14h.01M10 21v-4h4v4" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    categories: <><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></>,
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    reports: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    archive: <><path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name] || paths.overview}</svg>;
}

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
  const [complaints, setComplaints] = useState([]);
  const [complaintPagination, setComplaintPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentComplaintsLoading, setRecentComplaintsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  // Filters & Review Modal
  const [complaintFilter, setComplaintFilter] = useState('');
  const [complaintSearch, setComplaintSearch] = useState('');
  const [deleteRequestOnly, setDeleteRequestOnly] = useState(false);
  const [viewDeleted, setViewDeleted] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editingComplaint, setEditingComplaint] = useState(null);
  const [previewBillUrl, setPreviewBillUrl] = useState(null);
  const [billPreviewOpen, setBillPreviewOpen] = useState(false);
  const [previewBillId, setPreviewBillId] = useState(null);
  const [billImageLoading, setBillImageLoading] = useState(true);
  const [billImageError, setBillImageError] = useState(false);
  const billPreviewObjectUrlRef = useRef(null);
  const billRequestRef = useRef(0);
  const billAbortControllerRef = useRef(null);
  const complaintsRequestRef = useRef(0);
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
  const emptyAdminComplaintForm = {
    type: '', title: '', description: '', company: '', category: '', subcategory: '',
    model: '', seller: '', location: '', serviceType: '', complainantName: '',
    complainantPhone: '', complainantEmail: '', complainantCity: '', complainantAddress: '',
    complainantPincode: '',
  };
  const [adminComplaintForm, setAdminComplaintForm] = useState(emptyAdminComplaintForm);
  const [adminComplaintMedia, setAdminComplaintMedia] = useState({
    productImage: null,
    productImage2: null,
    productImage3: null,
    billImage: null,
    productVideo: null,
  });
  const [adminComplaintMediaKey, setAdminComplaintMediaKey] = useState(0);
  const [adminUploadedMedia, setAdminUploadedMedia] = useState({});
  const [adminUploadProgress, setAdminUploadProgress] = useState({
    productImage: 0, productImage2: 0, productImage3: 0, billImage: 0, productVideo: 0,
  });
  const [adminUploadStatus, setAdminUploadStatus] = useState({
    productImage: 'idle', productImage2: 'idle', productImage3: 'idle', billImage: 'idle', productVideo: 'idle',
  });
  const adminMediaRequestRef = useRef({});
  const [creatingAdminComplaint, setCreatingAdminComplaint] = useState(false);

  useEffect(() => {
    if (account?.role === 'ADMIN') loadStats();
  }, [account]);

  useEffect(() => {
    if (account?.role !== 'ADMIN') return;
    if (activeTab === 'overview') {
      let current = true;
      setRecentComplaintsLoading(true);
      getAdminComplaints({ page: 1, limit: 5, sort: 'latest' })
        .then((data) => current && setRecentComplaints(data?.items || []))
        .catch(() => current && setRecentComplaints([]))
        .finally(() => current && setRecentComplaintsLoading(false));
      return () => { current = false; };
    }
    if (activeTab === 'complaints') {
      loadComplaints();
      loadCategories(false);
    }
    if (activeTab === 'create-complaint') loadCategories(false);
    if (activeTab === 'companies') {
      loadCompanies();
      loadCategories(false);
    }
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'categories') loadCategories();
  }, [account, activeTab]);

  useEffect(() => () => {
    billAbortControllerRef.current?.abort();
    if (billPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(billPreviewObjectUrlRef.current);
    }
  }, []);

  function clearBillPreviewUrl() {
    if (billPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(billPreviewObjectUrlRef.current);
      billPreviewObjectUrlRef.current = null;
    }
    setPreviewBillUrl(null);
  }

  function closeBillPreview() {
    billRequestRef.current += 1;
    billAbortControllerRef.current?.abort();
    billAbortControllerRef.current = null;
    clearBillPreviewUrl();
    setBillPreviewOpen(false);
    setPreviewBillId(null);
    setBillImageError(false);
  }

  async function openBillPreview(id) {
    const requestId = ++billRequestRef.current;
    billAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    billAbortControllerRef.current = abortController;
    clearBillPreviewUrl();
    setPreviewBillId(id);
    setBillPreviewOpen(true);
    setBillImageLoading(true);
    setBillImageError(false);

    try {
      const billBlob = await getAdminComplaintBill(id, { signal: abortController.signal });
      const objectUrl = URL.createObjectURL(billBlob);
      if (requestId !== billRequestRef.current) {
        URL.revokeObjectURL(objectUrl);
        return;
      }
      billPreviewObjectUrlRef.current = objectUrl;
      setPreviewBillUrl(objectUrl);
    } catch (error) {
      if (requestId === billRequestRef.current && error?.code !== 'ERR_CANCELED') {
        setBillImageLoading(false);
        setBillImageError(true);
      }
    }
  }

  function showMessage(text, type = 'success') {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage({ text: '', type: '' }), 5000);
  }

  async function loadStats() {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      if (err?.response?.status === 403 || err?.response?.status === 401) {
        showMessage('Administrator authorization required. Please sign out and sign in with an admin account.', 'error');
      }
    }
  }

  async function loadComplaints({
    page = 1,
    onlyDelete = deleteRequestOnly,
    showOnlyDeleted = viewDeleted,
  } = {}) {
    const requestId = ++complaintsRequestRef.current;
    setLoading(true);
    try {
      const data = await getAdminComplaints({
        status: complaintFilter,
        q: complaintSearch,
        deleteRequested: onlyDelete ? 'true' : '',
        onlyDeleted: showOnlyDeleted ? 'true' : '',
        page,
        limit: complaintPagination.limit,
      });
      if (requestId !== complaintsRequestRef.current) return;
      setComplaints(data?.items || []);
      setComplaintPagination(data?.pagination || {
        page: 1,
        limit: complaintPagination.limit,
        total: 0,
        totalPages: 1,
      });
    } catch (err) {
      if (requestId === complaintsRequestRef.current) {
        showMessage(err.response?.data?.error?.message || 'Error loading complaints', 'error');
      }
    } finally {
      if (requestId === complaintsRequestRef.current) setLoading(false);
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
  async function handleComplaintStatusChange(id, newStatus) {
    let reason = '';
    const statusUpdateDefaults = {
      REJECTED: '',
      COMPANY_RESPONDED: 'The company or service provider has responded. Follow-up communication is now in progress.',
      RESOLVED: 'The issue has been marked resolved after the reported outcome was confirmed.',
    };
    if (Object.hasOwn(statusUpdateDefaults, newStatus)) {
      const promptRes = window.prompt(
        `Enter the update the complainant should see for ${newStatus.replace(/_/g, ' ')}:\n(This is saved in their Track Status history.)`,
        statusUpdateDefaults[newStatus]
      );
      if (promptRes === null) return;
      if (!promptRes.trim()) {
        alert('A clear update is required so the complainant can understand this status change.');
        return;
      }
      reason = promptRes.trim();
    }
    try {
      const updated = await updateAdminComplaintStatus(id, newStatus, reason);
      showMessage(`Complaint status updated to ${newStatus}`);
      setComplaints((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
      );
      if (selectedComplaint?.id === id) {
        setSelectedComplaint((prev) => ({ ...prev, ...updated }));
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
      model: complaint.model || complaint.productModel || complaint.serviceDetails || '',
      seller: complaint.seller || complaint.sellerName || '',
      location: complaint.location || '',
      subcategory: complaint.subcategory || '',
      serviceType: complaint.serviceType || '',
      complainantName: complaint.complainantName || complaint.name || '',
      complainantPhone: complaint.complainantPhone || complaint.phone || '',
      complainantEmail: complaint.complainantEmail || complaint.email || '',
      complainantCity: complaint.complainantCity || complaint.city || '',
      complainantAddress: complaint.complainantAddress || complaint.address || '',
      complainantPincode: complaint.complainantPincode || complaint.pincode || '',
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

  function handleAdminComplaintMediaSelect(kind, file) {
    const requestId = (adminMediaRequestRef.current[kind] || 0) + 1;
    adminMediaRequestRef.current[kind] = requestId;
    setAdminComplaintMedia((media) => ({ ...media, [kind]: file || null }));
    setAdminUploadedMedia((media) => {
      const next = { ...media };
      delete next[kind];
      return next;
    });

    if (!file) {
      setAdminUploadStatus((status) => ({ ...status, [kind]: 'idle' }));
      setAdminUploadProgress((progress) => ({ ...progress, [kind]: 0 }));
      return;
    }

    setAdminUploadStatus((status) => ({ ...status, [kind]: 'uploading' }));
    setAdminUploadProgress((progress) => ({ ...progress, [kind]: 10 }));
    uploadDraftMedia(file, kind, (percent) => {
      if (adminMediaRequestRef.current[kind] !== requestId) return;
      setAdminUploadProgress((progress) => ({ ...progress, [kind]: Math.min(95, Math.max(10, Math.round(percent))) }));
    })
      .then((savedMedia) => {
        if (adminMediaRequestRef.current[kind] !== requestId) return;
        setAdminUploadedMedia((media) => ({ ...media, [kind]: savedMedia }));
        setAdminUploadStatus((status) => ({ ...status, [kind]: 'done' }));
        setAdminUploadProgress((progress) => ({ ...progress, [kind]: 100 }));
      })
      .catch(() => {
        if (adminMediaRequestRef.current[kind] !== requestId) return;
        setAdminUploadStatus((status) => ({ ...status, [kind]: 'error' }));
      });
  }

  function handleAdminComplaintFieldChange(field, value, uppercase = true) {
    setAdminComplaintForm((form) => ({
      ...form,
      [field]: uppercase ? value.toUpperCase() : value,
    }));
  }

  async function handleCreateAdminComplaint(event) {
    event.preventDefault();
    if (creatingAdminComplaint) return;

    if (Object.values(adminUploadStatus).some((status) => status === 'uploading')) {
      showMessage('Please wait for all selected evidence files to finish uploading.', 'error');
      return;
    }

    setCreatingAdminComplaint(true);
    try {
      const payload = new FormData();
      Object.entries(adminComplaintForm).forEach(([key, value]) => payload.append(key, value));
      Object.entries(adminComplaintMedia).forEach(([key, file]) => {
        const savedMedia = adminUploadedMedia[key];
        if (savedMedia?.url) {
          payload.append(`${key}Url`, savedMedia.url);
          payload.append(`${key}Name`, savedMedia.name || key);
        } else if (file) {
          payload.append(key, file);
        }
      });

      const created = await createAdminComplaint(payload);
      showMessage(`Complaint ${created.id.slice(0, 8)} was recorded and placed in the review queue.`);
      setAdminComplaintForm(emptyAdminComplaintForm);
      setAdminComplaintMedia({ productImage: null, productImage2: null, productImage3: null, billImage: null, productVideo: null });
      setAdminUploadedMedia({});
      setAdminUploadProgress({ productImage: 0, productImage2: 0, productImage3: 0, billImage: 0, productVideo: 0 });
      setAdminUploadStatus({ productImage: 'idle', productImage2: 'idle', productImage3: 'idle', billImage: 'idle', productVideo: 'idle' });
      setAdminComplaintMediaKey((key) => key + 1);
      await Promise.all([loadComplaints({ page: 1 }), loadStats()]);
    } catch (err) {
      showMessage(getErrorMessage(err, 'Unable to record the complaint.'), 'error');
    } finally {
      setCreatingAdminComplaint(false);
    }
  }

  function renderAdminUploadState(kind) {
    const status = adminUploadStatus[kind];
    const file = adminComplaintMedia[kind];
    const sizeLabel = file ? `${(file.size / (1024 * 1024)).toFixed(file.size >= 1024 * 1024 ? 1 : 2)} MB` : '';
    const preview = file && <AdminComplaintFilePreview file={file} />;
    const fileDetails = file && <span className="admin-upload-state__file"><strong>{file.name}</strong><small>{sizeLabel}</small></span>;

    if (status === 'uploading') {
      const progress = adminUploadProgress[kind] || 0;
      return (
        <div className="admin-upload-state" aria-live="polite">
          {preview}{fileDetails}
          <small style={{ display: 'block', color: '#0369a1', fontWeight: 600 }}>Uploading... {progress}%</small>
          <div className="admin-upload-state__track"><div style={{ width: `${progress}%` }} /></div>
        </div>
      );
    }
    if (status === 'done') {
      return <div className="admin-upload-state admin-upload-state--done">{preview}{fileDetails}<small>Saved automatically {'\u2713'}</small></div>;
    }
    if (status === 'error') {
      return <div className="admin-upload-state admin-upload-state--error">{preview}{fileDetails}<small>Auto-save failed; this file will upload when you create the complaint.</small></div>;
    }
    return file ? <div className="admin-upload-state">{preview}{fileDetails}</div> : null;
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
            <Logo to="/admin" ariaLabel="BadService admin dashboard" className="admin-login-card__logo" />
            <span className="admin-login-card__eyebrow">ADMINISTRATION</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage complaints, companies and users.</p>
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
                {adminLoggingIn ? 'Signing in' : 'Sign in to dashboard'}
              </button>
            </form>
            <p className="admin-login-card__note"><span aria-hidden="true"></span> Secure access for authorized administrators</p>
          </div>
        </section>
      </MainLayout>
    );
  }

  const complaintTotal = Number(stats?.totalComplaints) || 0;
  const statusOverview = [
    { label: 'Pending review', count: Number(stats?.pendingComplaints) || 0, className: 'is-pending' },
    { label: 'Resolved', count: Number(stats?.resolvedComplaints) || 0, className: 'is-resolved' },
    {
      label: 'Other statuses',
      count: Math.max(0, complaintTotal - (Number(stats?.pendingComplaints) || 0) - (Number(stats?.resolvedComplaints) || 0)),
      className: 'is-other',
    },
  ];
  const activityByDate = recentComplaints.reduce((days, complaint) => {
    if (!complaint.createdAt) return days;
    const date = new Date(complaint.createdAt);
    if (Number.isNaN(date.getTime())) return days;
    const key = date.toISOString().slice(0, 10);
    days[key] = (days[key] || 0) + 1;
    return days;
  }, {});
  const activityTrend = Object.entries(activityByDate)
    .sort(([first], [second]) => first.localeCompare(second))
    .slice(-7)
    .map(([date, count]) => ({ date, count }));
  const activityMax = Math.max(1, ...activityTrend.map((item) => item.count));
  const activityPoints = activityTrend.map((item, index) => ({
    ...item,
    x: activityTrend.length < 2 ? 320 : 28 + (index * 584) / (activityTrend.length - 1),
    y: 170 - (item.count / activityMax) * 126,
  }));
  const activityPath = activityPoints.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  let statusOffset = 0;
  const statusSegments = statusOverview.map((item) => {
    const percentage = complaintTotal ? (item.count / complaintTotal) * 100 : 0;
    const segment = { ...item, percentage, offset: statusOffset };
    statusOffset += percentage;
    return segment;
  });

  return (
    <MainLayout>
      <section className="admin-dashboard">
          <div className="admin-dashboard__header">
          <div>
              <Logo to="/admin" ariaLabel="BadService admin dashboard" className="admin-dashboard__logo" />
              <span className="admin-dashboard__eyebrow">Administration</span>
              <h1 style={{ margin: 0 }}>Admin dashboard</h1>
            <p style={{ margin: '0.25rem 0', color: '#666', fontSize: '0.9rem' }}>
              Manage complaints, companies and users.
            </p>
          </div>
          <div className="admin-dashboard__top-actions">
            <Link className="admin-dashboard__home-link" to="/">
              <AdminIcon name="home" /> Return to Home
            </Link>
            <button
              className="admin-dashboard__signout"
              type="button"
              onClick={handleAdminSignOut}
              disabled={adminSigningOut}
            >
              {!adminSigningOut && <AdminIcon name="logout" />}
              {adminSigningOut ? 'Signing out' : 'Sign out'}
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

        <div className="admin-dashboard__workspace">
          <button type="button" className="admin-sidebar-toggle" aria-expanded={sidebarOpen} aria-controls="admin-workspace-nav" onClick={() => setSidebarOpen((open) => !open)}>
            <span className="admin-sidebar-toggle__bars" aria-hidden="true"><i /><i /><i /></span>
            Workspace navigation
            <span className="admin-sidebar-toggle__chevron" aria-hidden="true">{sidebarOpen ? '−' : '+'}</span>
          </button>
          <nav id="admin-workspace-nav" className={`admin-dashboard__sidebar${sidebarOpen ? ' is-open' : ''}`} aria-label="Admin sections">
            <Logo to="/admin" ariaLabel="BadService admin dashboard" compact className="admin-dashboard__sidebar-brand" />
            <span className="admin-dashboard__sidebar-label">Workspace</span>
            {[
              ['overview', 'Overview', 'overview'],
              ['complaints', `Complaints  ${stats?.totalComplaints || 0}`, 'complaints'],
              ['create-complaint', 'Create complaint', 'create'],
              ['companies', `Companies  ${stats?.totalCompanies || 0}`, 'companies'],
              ['users', `Users  ${stats?.totalUsers || 0}`, 'users'],
              ['categories', 'Categories', 'categories'],
            ].map(([tab, label, icon]) => (
              <button
                key={tab}
                type="button"
                className={`admin-dashboard__nav-item${activeTab === tab ? ' is-active' : ''}`}
                onClick={() => { setActiveTab(tab); setSidebarOpen(false); }}
                aria-pressed={activeTab === tab}
              >
                <span className="admin-dashboard__nav-icon"><AdminIcon name={icon} size={17} /></span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="admin-dashboard__content">

        {/* TAB: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="admin-overview">
            <div className="admin-overview__metrics">
              <button type="button" className="admin-metric-card metric-blue admin-metric-card--action" onClick={() => { setActiveTab('complaints'); setDeleteRequestOnly(false); setViewDeleted(false); loadComplaints({ page: 1, onlyDelete: false, showOnlyDeleted: false }); }} aria-label={`Open complaints, ${stats?.totalComplaints || 0} total`}><span className="admin-metric-card__icon"><AdminIcon name="complaints" size={20} /></span><div><span className="admin-metric-card__label">Total Complaints</span><strong>{stats?.totalComplaints || 0}</strong><small>{stats?.pendingComplaints || 0} pending review</small></div></button>
              <button type="button" className="admin-metric-card metric-green admin-metric-card--action" onClick={() => setActiveTab('companies')} aria-label={`Open companies, ${stats?.totalCompanies || 0} registered`}><span className="admin-metric-card__icon"><AdminIcon name="companies" size={20} /></span><div><span className="admin-metric-card__label">Active Companies</span><strong>{stats?.totalCompanies || 0}</strong><small>Registered brands</small></div></button>
              <button type="button" className="admin-metric-card metric-violet admin-metric-card--action" onClick={() => setActiveTab('users')} aria-label={`Open users, ${stats?.totalUsers || 0} registered`}><span className="admin-metric-card__icon"><AdminIcon name="users" size={20} /></span><div><span className="admin-metric-card__label">Registered Users</span><strong>{stats?.totalUsers || 0}</strong><small>Community members</small></div></button>
              <button
                type="button"
                className="admin-metric-card metric-amber admin-metric-card--action"
                onClick={() => {
                  setActiveTab('complaints');
                  setDeleteRequestOnly(false);
                  setViewDeleted(true);
                  loadComplaints({ page: 1, onlyDelete: false, showOnlyDeleted: true });
                }}
                aria-label={`Open soft-deleted archive, ${stats?.deletedComplaints || 0} complaints`}
              ><span className="admin-metric-card__icon"><AdminIcon name="archive" size={20} /></span><div><span className="admin-metric-card__label">Soft-Deleted Archive</span><strong>{stats?.deletedComplaints || 0}</strong><small>Safely stored in DB</small></div></button>
            </div>

            <div className="admin-overview__charts">
              <section className="admin-analytics-card" aria-labelledby="admin-status-chart-title">
                <div className="admin-analytics-card__heading"><div><span className="admin-section-kicker">Complaint analytics</span><h2 id="admin-status-chart-title">Status overview</h2></div><span className="admin-analytics-card__meta">{complaintTotal.toLocaleString()} total reports</span></div>
                <div className="admin-status-donut">
                  <div className="admin-status-donut__visual">
                    <svg viewBox="0 0 120 120" role="img" aria-label={statusOverview.map((item) => `${item.label}: ${item.count}`).join(', ')}>
                      <circle className="admin-status-donut__track" cx="60" cy="60" r="50" />
                      {complaintTotal > 0 && statusSegments.map((item) => <circle key={item.className} className={`admin-status-donut__segment ${item.className}`} cx="60" cy="60" r="50" pathLength="100" strokeDasharray={`${item.percentage} ${100 - item.percentage}`} strokeDashoffset={-item.offset}><title>{item.label}: {item.count}</title></circle>)}
                    </svg>
                    <div className="admin-status-donut__center"><strong>{complaintTotal.toLocaleString()}</strong><span>Reports</span></div>
                  </div>
                  <div className="admin-status-donut__legend">{statusOverview.map((item) => <div key={item.className}><span className={`admin-status-donut__dot ${item.className}`} /><span>{item.label}</span><strong>{item.count.toLocaleString()}</strong></div>)}</div>
                </div>
              </section>

              <section className="admin-analytics-card admin-activity-chart" aria-labelledby="admin-activity-chart-title">
                <div className="admin-analytics-card__heading"><div><span className="admin-section-kicker">Latest activity</span><h2 id="admin-activity-chart-title">Complaint activity</h2></div><span className="admin-analytics-card__meta">Recent records by date</span></div>
                {activityTrend.length === 0 ? <div className="admin-chart-empty">No complaint date data is available yet.</div> : (
                  <div className="admin-activity-chart__plot" role="img" aria-label={`Recent complaints by date: ${activityTrend.map((item) => `${new Date(`${item.date}T00:00:00`).toLocaleDateString()}: ${item.count}`).join(', ')}`}>
                    <svg viewBox="0 0 640 210" preserveAspectRatio="none" aria-hidden="true">
                      {[44, 86, 128, 170].map((y) => <line key={y} x1="28" y1={y} x2="612" y2={y} className="admin-activity-chart__gridline" />)}
                      <path d={`${activityPath} L ${activityPoints.at(-1).x} 170 L ${activityPoints[0].x} 170 Z`} className="admin-activity-chart__area" />
                      <path d={activityPath} className="admin-activity-chart__line" />
                      {activityPoints.map((point) => <circle key={point.date} cx={point.x} cy={point.y} r="4" className="admin-activity-chart__point"><title>{new Date(`${point.date}T00:00:00`).toLocaleDateString()}: {point.count} complaint{point.count === 1 ? '' : 's'}</title></circle>)}
                    </svg>
                    <div className="admin-activity-chart__labels">{activityPoints.map((point) => <span key={point.date}>{new Date(`${point.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>)}</div>
                  </div>
                )}
              </section>
            </div>

            <section className="admin-recent-complaints" aria-labelledby="admin-recent-title">
              <div className="admin-section-heading"><div><span className="admin-section-kicker">Latest activity</span><h2 id="admin-recent-title">Recent complaints</h2></div><button type="button" className="admin-dashboard__text-action" onClick={() => setActiveTab('complaints')}>Manage Complaints <AdminIcon name="arrow" size={16} /></button></div>
              {recentComplaintsLoading && <div className="admin-recent-complaints__loading" role="status">Loading recent complaints</div>}
              {!recentComplaintsLoading && recentComplaints.length === 0 && <p className="admin-recent-complaints__empty">No recent complaints to display.</p>}
              {!recentComplaintsLoading && recentComplaints.length > 0 && (
                <div className="admin-recent-complaints__table-wrap"><div className="admin-recent-complaints__table-head"><span>Complaint</span><span>Brand</span><span>Date</span><span>Status</span></div>
                  <div className="admin-recent-complaints__list">{recentComplaints.map((complaint) => (
                    <article key={complaint.id} className="admin-recent-complaints__item">
                      <strong title={complaint.title}>{complaint.title}</strong><span className="admin-recent-complaints__brand">{complaint.company || 'Unlisted company'}</span><span className="admin-recent-complaints__date">{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : 'Recently submitted'}</span>
                      <span className={`admin-recent-complaints__status status-${String(complaint.status || 'pending').toLowerCase().replace(/_/g, '-')}`}>{String(complaint.status || 'PENDING').replace(/_/g, ' ')}</span>
                    </article>
                  ))}</div>
                </div>
              )}
            </section>

            <section className="admin-quick-actions" aria-labelledby="admin-quick-actions-title">
              <div className="admin-section-heading"><div><span className="admin-section-kicker">Platform tools</span><h2 id="admin-quick-actions-title">Quick Actions</h2></div></div>
              <div className="admin-quick-actions__grid">
                <article><span><AdminIcon name="companies" /></span><p>Review and approve user-requested companies to make them publicly available for complaints.</p></article>
                <article><span><AdminIcon name="reports" /></span><p>Update complaint status as companies respond or issues get resolved.</p></article>
                <article><span><AdminIcon name="users" /></span><p>Manage user account statuses to protect platform integrity.</p></article>
              </div>
            </section>
          </div>
        )}


        {/* COMPLAINT MANAGEMENT AND CREATE COMPLAINT PAGES */}
        {(activeTab === 'complaints' || activeTab === 'create-complaint') && (
          <div>
            {activeTab === 'create-complaint' && (
            <form
              className="admin-complaint-form"
              onSubmit={handleCreateAdminComplaint}
              style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', marginBottom: '1.25rem' }}
            >
              <div className="admin-complaint-form__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1rem' }}>Record a complaint for a user</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.82rem' }}>
                    Admin-only entry. Every field except email is required; no OTP is required. New records start as PENDING for review.
                  </p>
                </div>
              </div>

              <div className="admin-complaint-form__fields" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.65rem' }}>
                <div className="admin-complaint-form__section-title"><span>01</span><div><strong>Complaint information</strong><small>Product or service details</small></div></div>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Type *
                  <select
                    value={adminComplaintForm.type}
                    onChange={(event) => setAdminComplaintForm((form) => ({ ...form, type: event.target.value }))}
                    required
                    style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem' }}
                  >
                    <option value="">Select type</option>
                    <option value="Product">Product</option>
                    <option value="Service">Service</option>
                  </select>
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Complaint title *
                  <input required value={adminComplaintForm.title} onChange={(event) => handleAdminComplaintFieldChange('title', event.target.value)} placeholder="Enter complaint title" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  {adminComplaintForm.type === 'Service' ? 'Service provider' : 'Company / brand'} *
                  <input required value={adminComplaintForm.company} onChange={(event) => handleAdminComplaintFieldChange('company', event.target.value)} placeholder="Enter name" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Category *
                  <select required value={adminComplaintForm.category} onChange={(event) => setAdminComplaintForm((form) => ({ ...form, category: event.target.value }))} style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem' }}>
                    <option value="">Select category</option>
                    {categories.map((category) => <option key={category.id} value={category.name}>{category.name}</option>)}
                  </select>
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  {adminComplaintForm.type === 'Service' ? 'Service details' : 'Product / model'} *
                  <input required value={adminComplaintForm.model} onChange={(event) => handleAdminComplaintFieldChange('model', event.target.value)} placeholder="Enter details" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  {adminComplaintForm.type === 'Service' ? 'Service provider' : 'Seller / shop'} *
                  <input required value={adminComplaintForm.seller} onChange={(event) => handleAdminComplaintFieldChange('seller', event.target.value)} placeholder="Enter name" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Location *
                  <input required value={adminComplaintForm.location} onChange={(event) => handleAdminComplaintFieldChange('location', event.target.value)} placeholder="Enter location" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <div className="admin-complaint-form__section-title"><span>02</span><div><strong>Complainant information</strong><small>Contact details for this report</small></div></div>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Complainant name *
                  <input required value={adminComplaintForm.complainantName} onChange={(event) => handleAdminComplaintFieldChange('complainantName', event.target.value)} placeholder="Enter full name" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Phone *
                  <input required type="tel" value={adminComplaintForm.complainantPhone} onChange={(event) => setAdminComplaintForm((form) => ({ ...form, complainantPhone: event.target.value }))} placeholder="10-digit mobile number" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Email
                  <input type="email" value={adminComplaintForm.complainantEmail} onChange={(event) => setAdminComplaintForm((form) => ({ ...form, complainantEmail: event.target.value }))} placeholder="Optional" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                {adminComplaintForm.type === 'Service' && (
                  <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Service type *
                    <input required value={adminComplaintForm.serviceType} onChange={(event) => handleAdminComplaintFieldChange('serviceType', event.target.value)} placeholder="For example: Hotel or Bank" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                  </label>
                )}
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  City *
                  <input required value={adminComplaintForm.complainantCity} onChange={(event) => handleAdminComplaintFieldChange('complainantCity', event.target.value)} placeholder="Enter city" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
                <label style={{ fontSize: '0.82rem', color: '#334155' }}>
                  Pincode (optional)
                  <input inputMode="numeric" maxLength="6" value={adminComplaintForm.complainantPincode} onChange={(event) => setAdminComplaintForm((form) => ({ ...form, complainantPincode: event.target.value }))} placeholder="6-digit pincode" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box' }} />
                </label>
              </div>
              <section className="admin-complaint-form__section admin-complaint-form__section--wide">
              <div className="admin-complaint-form__section-title"><span>03</span><div><strong>Incident details</strong><small>Describe what happened and where</small></div></div>
              <label className="admin-complaint-form__wide-field" style={{ display: 'block', marginTop: '0.65rem', fontSize: '0.82rem', color: '#334155' }}>
                Complainant address (optional)
                <textarea value={adminComplaintForm.complainantAddress} onChange={(event) => handleAdminComplaintFieldChange('complainantAddress', event.target.value)} placeholder="Enter full address" rows="2" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </label>
              <label className="admin-complaint-form__wide-field" style={{ display: 'block', marginTop: '0.65rem', fontSize: '0.82rem', color: '#334155' }}>
                Complaint details *
                <textarea required value={adminComplaintForm.description} onChange={(event) => handleAdminComplaintFieldChange('description', event.target.value)} placeholder="Enter complete complaint details" rows="3" style={{ display: 'block', width: '100%', marginTop: '0.2rem', padding: '0.45rem', boxSizing: 'border-box', resize: 'vertical' }} />
              </label>
              </section>
              <fieldset className="admin-complaint-form__evidence" style={{ margin: '0.9rem 0 0', padding: '0.8rem', border: '1px solid #bae6fd', borderRadius: '6px' }}>
                <legend style={{ padding: '0 0.3rem', color: '#0369a1', fontSize: '0.86rem', fontWeight: 700 }}>
                  Required evidence uploads
                </legend>
                <p style={{ margin: '0 0 0.7rem', color: '#64748b', fontSize: '0.8rem' }}>
                  Upload one required product/service photo, with up to two optional extra photos. Bill/receipt and evidence video are required.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '0.65rem' }}>
                  <label className="admin-upload-dropzone" style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Product / service photo *
                    <span className="admin-upload-dropzone__icon" aria-hidden="true">+</span>
                    <span className="admin-upload-dropzone__hint">Drop a file here or choose a photo</span>
                    <input
                      className="admin-upload-input"
                      key={`admin-product-image-${adminComplaintMediaKey}`}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      required
                      onChange={(event) => handleAdminComplaintMediaSelect('productImage', event.target.files?.[0] || null)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                    {renderAdminUploadState('productImage')}
                  </label>
                  <label className="admin-upload-dropzone" style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Additional photo 2 (optional)
                    <span className="admin-upload-dropzone__icon" aria-hidden="true">+</span>
                    <span className="admin-upload-dropzone__hint">Drop a file here or choose a photo</span>
                    <input
                      className="admin-upload-input"
                      key={`admin-product-image-2-${adminComplaintMediaKey}`}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      onChange={(event) => handleAdminComplaintMediaSelect('productImage2', event.target.files?.[0] || null)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                    {renderAdminUploadState('productImage2')}
                  </label>
                  <label className="admin-upload-dropzone" style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Additional photo 3 (optional)
                    <span className="admin-upload-dropzone__icon" aria-hidden="true">+</span>
                    <span className="admin-upload-dropzone__hint">Drop a file here or choose a photo</span>
                    <input
                      className="admin-upload-input"
                      key={`admin-product-image-3-${adminComplaintMediaKey}`}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      onChange={(event) => handleAdminComplaintMediaSelect('productImage3', event.target.files?.[0] || null)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                    {renderAdminUploadState('productImage3')}
                  </label>
                  <label className="admin-upload-dropzone" style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Bill / receipt image *
                    <span className="admin-upload-dropzone__icon" aria-hidden="true">+</span>
                    <span className="admin-upload-dropzone__hint">Drop a file here or choose the bill image</span>
                    <input
                      className="admin-upload-input"
                      key={`admin-bill-image-${adminComplaintMediaKey}`}
                      type="file"
                      accept={IMAGE_ACCEPT}
                      required
                      onChange={(event) => handleAdminComplaintMediaSelect('billImage', event.target.files?.[0] || null)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                    {renderAdminUploadState('billImage')}
                  </label>
                  <label className="admin-upload-dropzone" style={{ fontSize: '0.82rem', color: '#334155' }}>
                    Evidence video *
                    <span className="admin-upload-dropzone__icon" aria-hidden="true">VID</span>
                    <span className="admin-upload-dropzone__hint">Drop a file here or choose a video</span>
                    <input
                      className="admin-upload-input"
                      key={`admin-product-video-${adminComplaintMediaKey}`}
                      type="file"
                      accept={VIDEO_ACCEPT}
                      required
                      onChange={(event) => handleAdminComplaintMediaSelect('productVideo', event.target.files?.[0] || null)}
                      style={{ display: 'block', width: '100%', marginTop: '0.25rem' }}
                    />
                    {renderAdminUploadState('productVideo')}
                  </label>
                </div>
              </fieldset>
              <div className="admin-complaint-form__actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.9rem' }}>
                <button
                  className="admin-complaint-form__submit"
                  type="submit"
                  disabled={creatingAdminComplaint}
                  style={{ padding: '0.45rem 0.8rem', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: creatingAdminComplaint ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: creatingAdminComplaint ? 0.7 : 1 }}
                >
                  {creatingAdminComplaint ? 'Saving...' : 'Create complaint'}
                </button>
              </div>
            </form>
            )}
            {activeTab === 'complaints' && (
            <>
            <div className="admin-complaints-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div className="admin-complaints-tabs" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="admin-complaints-heading">
                  <h2 style={{ margin: 0 }}>Complaints Management</h2>
                  <p>Review reports, manage complaint status, and respond to customer requests.</p>
                </div>
                <button
                  type="button"
                  className={`admin-complaints-tab${!deleteRequestOnly && !viewDeleted ? ' is-active' : ''}`}
                  aria-pressed={!deleteRequestOnly && !viewDeleted}
                  onClick={() => {
                    setDeleteRequestOnly(false);
                    setViewDeleted(false);
                    loadComplaints({ page: 1, onlyDelete: false, showOnlyDeleted: false });
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
                  className={`admin-complaints-tab${deleteRequestOnly ? ' is-active is-delete' : ''}`}
                  aria-pressed={deleteRequestOnly}
                  onClick={() => {
                    setViewDeleted(false);
                    setDeleteRequestOnly(true);
                    loadComplaints({ page: 1, onlyDelete: true, showOnlyDeleted: false });
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
                   Delete Requests {stats?.pendingDeleteRequests > 0 ? `(${stats.pendingDeleteRequests})` : ''}
                </button>
                <button
                  type="button"
                  className={`admin-complaints-tab${viewDeleted ? ' is-active' : ''}`}
                  aria-pressed={viewDeleted}
                  onClick={() => {
                    setDeleteRequestOnly(false);
                    setViewDeleted(true);
                    loadComplaints({ page: 1, onlyDelete: false, showOnlyDeleted: true });
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
                   Soft-Deleted Archive {stats?.deletedComplaints > 0 ? `(${stats.deletedComplaints})` : ''}
                </button>
              </div>

              <div className="admin-complaints-filters" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <input
                  placeholder="Search title, company, person..."
                  value={complaintSearch}
                  onChange={(e) => setComplaintSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadComplaints({ page: 1 })}
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
                  onClick={() => loadComplaints({ page: 1 })}
                  style={{ padding: '0.3rem 0.8rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  Filter
                </button>
              </div>
            </div>

            {loading && <p className="admin-complaints-state">Loading complaints...</p>}
            {!loading && complaints.length === 0 && (
              <p className="admin-complaints-state" style={{ padding: '2rem', textAlign: 'center', background: '#f9f9f9', borderRadius: '6px' }}>
                {deleteRequestOnly ? 'No pending delete requests.' : viewDeleted ? 'No soft-deleted complaints in archive.' : 'No complaints found matching criteria.'}
              </p>
            )}

            {!loading && complaints.length > 0 && (
              <>
                <div className="admin-complaints-table-wrap" style={{ overflowX: 'auto' }}>
                  <table className="admin-complaints-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: '#fff', border: '1px solid #eee' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #ddd' }}>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Complaint</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Type & Brand</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Complainant</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Date</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Bill and Actions</th>
                      <th style={{ padding: '0.6rem 0.8rem' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {complaints.map((c) => (
                      <tr key={c.id} style={{ borderBottom: '1px solid #eee', background: c.deleteRequested ? '#fffaf0' : c.isDeleted ? '#fff5f5' : 'transparent' }}>
                        <td style={{ padding: '0.6rem 0.8rem', maxWidth: '260px' }}>
                          <small className="admin-complaint-id">ID {c.id}</small>
                          <button
                            type="button"
                            className="admin-complaint-title"
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
                          {c.location && <small style={{ display: 'block', color: '#666' }}> {c.location}</small>}
                          {c.deleteRequested && (
                            <span style={{ display: 'inline-block', marginTop: '4px', padding: '2px 6px', background: '#ffebee', color: '#c62828', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                               DELETE REQUESTED
                            </span>
                          )}
                          {c.isDeleted && (
                            <div style={{ marginTop: '4px' }}>
                              <span style={{ display: 'inline-block', padding: '2px 6px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 700 }}>
                                 ARCHIVED IN DB
                              </span>
                              {c.deleteAdminNote && <small style={{ display: 'block', color: '#888', fontStyle: 'italic' }}>Note: {c.deleteAdminNote}</small>}
                            </div>
                          )}
                        </td>
                        <td className="admin-complaint-company" style={{ padding: '0.6rem 0.8rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: c.type === 'Service' ? '#856404' : '#004085', background: c.type === 'Service' ? '#fff3cd' : '#cce5ff', padding: '1px 5px', borderRadius: '3px', marginRight: '4px' }}>
                            {c.type || 'Product'}
                          </span>
                          <strong>{c.company}</strong>
                          {c.serviceType && <small style={{ display: 'block', color: '#555' }}>Type: {c.serviceType}</small>}
                          {c.category && <small style={{ display: 'block', color: '#888' }}>{c.category}</small>}
                        </td>
                        <td className="admin-complaint-person" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          <div>{c.complainantName || 'Anonymous'}</div>
                          {c.complainantPhone && (
                            <small style={{ color: '#555' }}>
                               {c.complainantPhone} {c.phoneVerified ? 'Verified' : ''}
                            </small>
                          )}
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'Recent'}
                        </td>
                        <td className="admin-complaint-bill-actions" style={{ padding: '0.6rem 0.8rem', fontSize: '0.85rem' }}>
                          {c.billImageUrl ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={() => openBillPreview(c.id)}
                                style={{
                                  background: '#e0f2fe',
                                  border: '1px solid #7dd3fc',
                                  color: '#0369a1',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                                title="Click for instant preview without opening new tab"
                              >
                                 View Bill
                              </button>
                            </div>
                          ) : (
                            <span style={{ color: '#aaa' }}>None</span>
                          )}
                          <div className="admin-complaint-actions" style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '8px' }}>
                            <button type="button" onClick={() => setSelectedComplaint(c)} style={{ padding: '0.25rem 0.5rem', background: '#232f3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Review</button>
                            <button type="button" onClick={() => handleStartEdit(c)} style={{ padding: '0.25rem 0.5rem', background: '#0066cc', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }} title="Edit complaint details">Edit</button>
                            {c.isDeleted ? (
                              <button type="button" onClick={() => handleRestoreComplaint(c.id)} style={{ padding: '0.25rem 0.55rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }} title="Restore this complaint back to active status on the website">Restore</button>
                            ) : (
                              <>
                                {c.status === 'PENDING' && <button type="button" onClick={() => handleComplaintStatusChange(c.id, 'APPROVED')} style={{ padding: '0.25rem 0.5rem', background: '#28a745', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}>Approve</button>}
                                {c.deleteRequested && <button type="button" onClick={() => handleApproveDeleteRequest(c.id)} style={{ padding: '0.25rem 0.5rem', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }} title="Approve deletion request and archive this complaint">Approve Delete</button>}
                                <button type="button" onClick={() => handleDeleteComplaint(c.id)} style={{ padding: '0.25rem 0.4rem', background: '#eee', color: '#dc3545', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem' }}>Delete</button>
                              </>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.6rem 0.8rem' }}>
                          {c.isDeleted ? (
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, background: '#f8d7da', color: '#721c24', padding: '3px 8px', borderRadius: '4px', display: 'inline-block' }}>
                               SOFT-DELETED
                            </span>
                          ) : (
                            <select
                              className={`admin-complaint-status admin-complaint-status--${String(c.status || 'PENDING').toLowerCase().replace(/_/g, '-')}`}
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
                      </tr>
                    ))}
                  </tbody>
                  </table>
                </div>
                <div className="admin-complaints-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1rem' }}>
                  <small style={{ color: '#64748b' }}>
                    Showing {((complaintPagination.page - 1) * complaintPagination.limit) + 1}{Math.min(complaintPagination.page * complaintPagination.limit, complaintPagination.total)} of {complaintPagination.total}
                  </small>
                  <div className="admin-complaints-pagination__controls" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      disabled={complaintPagination.page <= 1}
                      onClick={() => loadComplaints({ page: complaintPagination.page - 1 })}
                      style={{ padding: '0.35rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: complaintPagination.page <= 1 ? 'not-allowed' : 'pointer', opacity: complaintPagination.page <= 1 ? 0.55 : 1 }}
                    >
                      Previous
                    </button>
                    <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#475569' }}>
                      Page {complaintPagination.page} of {complaintPagination.totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={complaintPagination.page >= complaintPagination.totalPages}
                      onClick={() => loadComplaints({ page: complaintPagination.page + 1 })}
                      style={{ padding: '0.35rem 0.7rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', cursor: complaintPagination.page >= complaintPagination.totalPages ? 'not-allowed' : 'pointer', opacity: complaintPagination.page >= complaintPagination.totalPages ? 0.55 : 1 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
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

                    </button>
                  </div>

                  {/* Deletion Request Alert (if user requested deletion) */}
                  {selectedComplaint.deleteRequested && (
                    <div style={{ background: '#fff3cd', border: '1px solid #ffeeba', color: '#856404', padding: '1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', color: '#721c24' }}>
                         User Submitted a Delete Request
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
                           Approve Delete Request (Permanently Delete)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectDeleteRequest(selectedComplaint.id)}
                          style={{ padding: '0.4rem 0.8rem', background: '#6c757d', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                        >
                           Reject Delete Request (Keep Complaint)
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Soft-Deleted In DB Alert */}
                  {selectedComplaint.isDeleted && (
                    <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', color: '#721c24', padding: '1rem', borderRadius: '6px', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.35rem 0', color: '#721c24' }}>
                         Soft-Deleted & Safely Archived in Database
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
                         Restore Complaint to Website
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
                           Approve & Publish to Website
                        </button>
                      )}
                      {['APPROVED', 'UNDER_REVIEW', 'COMPANY_RESPONDED', 'RESOLVED'].includes(selectedComplaint.status) && (
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
                          View Public Page
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
                         Edit Details
                      </button>
                    </div>
                  </div>

                  {/* Two column grid for details */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    {/* Column 1: Complainant Details */}
                    <div style={{ border: '1px solid #e9ecef', borderRadius: '6px', padding: '1rem', background: '#fafbfc' }}>
                      <h4 style={{ margin: '0 0 0.75rem 0', color: '#232f3e', borderBottom: '1px solid #ddd', paddingBottom: '0.4rem' }}>
                         Complainant Information
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.88rem' }}>
                        <div><strong>Full Name:</strong> {selectedComplaint.complainantName || 'Not specified'}</div>
                        <div>
                          <strong>Phone:</strong> {selectedComplaint.complainantPhone || 'Not specified'}
                          {selectedComplaint.phoneVerified && <span style={{ color: '#28a745', marginLeft: '6px', fontWeight: 600 }}> Phone Verified</span>}
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
                         Complaint Particulars
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
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#232f3e' }}> Full Complaint Description</h4>
                    <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#333' }}>
                      {selectedComplaint.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Edit History Section (Preserving History) */}
                  {Array.isArray(selectedComplaint.editHistory) && selectedComplaint.editHistory.length > 0 && (
                    <div style={{ border: '1px solid #cce5ff', background: '#f0f7ff', borderRadius: '6px', padding: '1rem', marginBottom: '1.25rem' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', color: '#004085', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         Edit & Correction History ({selectedComplaint.editHistory.length} revisions)
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
                       Uploaded Evidence & Verification Files
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                      {/* 1. Bill (Admin only) */}
                      <div style={{ border: '1px solid #ffc107', borderRadius: '6px', padding: '0.75rem', background: '#fffdf6' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}> Purchase Proof / Bill</strong>
                          <span style={{ fontSize: '0.7rem', color: '#856404', background: '#fff3cd', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Admin Only
                          </span>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0 0 0.5rem 0' }}>
                          Visible only in admin dashboard. Never displayed on public website.
                        </p>
                        {selectedComplaint.billImageUrl ? (
                          <button
                            type="button"
                            onClick={() => openBillPreview(selectedComplaint.id)}
                            style={{ padding: '0.45rem 0.7rem', background: '#e0f2fe', border: '1px solid #7dd3fc', borderRadius: '4px', color: '#0369a1', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                          >
                            View Bill Securely
                          </button>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: '#999', margin: 0 }}>No bill image attached.</p>
                        )}
                      </div>

                      {/* 2. Photo (Public Website Carousel) */}
                      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>
                             {selectedComplaint.type === 'Service' ? 'Service Photo' : 'Product Photo'}
                          </strong>
                          <span style={{ fontSize: '0.7rem', color: '#155724', background: '#d4edda', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                            Public Carousel
                          </span>
                        </div>
                        {getComplaintPhotoUrls(selectedComplaint).length > 0 ? (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.65rem' }}>
                            {getComplaintPhotoUrls(selectedComplaint).map((photoUrl, index) => (
                              <div key={photoUrl}>
                                <img
                                  src={getAssetUrl(photoUrl)}
                                  alt={`${selectedComplaint.type === 'Service' ? 'Service' : 'Product'} evidence ${index + 1}`}
                                  loading="lazy"
                                  style={{ width: '100%', height: '120px', objectFit: 'contain', background: '#fff', borderRadius: '4px', border: '1px solid #eee' }}
                                />
                                <a
                                  href={getAssetUrl(photoUrl)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{ display: 'inline-block', marginTop: '6px', fontSize: '0.76rem', color: '#0066cc', fontWeight: 600 }}
                                >
                                  Photo {index + 1}  Open Full Size
                                </a>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '0.82rem', color: '#999', margin: 0 }}>No photo attached.</p>
                        )}
                      </div>

                      {/* 3. Video (Public Website Carousel) */}
                      <div style={{ border: '1px solid #ddd', borderRadius: '6px', padding: '0.75rem', background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                          <strong style={{ fontSize: '0.85rem' }}>
                             {selectedComplaint.type === 'Service' ? 'Service Video' : 'Product Video'}
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
                           Restore to Website
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
                         Edit Complaint #{editingComplaint.id}
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

                    </button>
                  </div>

                  <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#f0f9ff', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                      <div>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0369a1', fontWeight: 800 }}>Type &amp; Category</span>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0c4a6e' }}>
                          {editingComplaint.type || 'Product'}  {editingComplaint.category || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0369a1', fontWeight: 800 }}>Company / Provider</span>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#0c4a6e' }}>
                          {editingComplaint.company || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#0369a1', fontWeight: 800 }}>Current Status</span>
                        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: editingComplaint.status === 'APPROVED' ? '#15803d' : '#854d0e' }}>
                           {editingComplaint.status || 'PENDING'}
                        </div>
                      </div>
                    </div>

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

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                          Product Model / Service
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
                          Subcategory / Service Type
                        </label>
                        <input
                          type="text"
                          value={editForm.subcategory || editForm.serviceType}
                          onChange={(e) => setEditForm({ ...editForm, subcategory: e.target.value, serviceType: e.target.value })}
                          placeholder="e.g. Hospital, Smartphone, Delivery"
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
                         Complainant Contact & Address Details
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
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
                            Phone Number
                          </label>
                          <input
                            type="text"
                            value={editForm.complainantPhone}
                            onChange={(e) => setEditForm({ ...editForm, complainantPhone: e.target.value })}
                            placeholder="Mobile number"
                            style={{ width: '100%', padding: '0.45rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '0.85rem' }}
                          />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editForm.complainantEmail}
                            onChange={(e) => setEditForm({ ...editForm, complainantEmail: e.target.value })}
                            placeholder="Email address"
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
                        {savingEdit ? 'Saving Changes' : ' Save Changes & Log Revision'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
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
                          {cat.parentId ? ` ${cat.name}` : cat.name}
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

          </div>
        </div>

        {/* Quick Instant Bill Viewer Modal */}
        {billPreviewOpen && (
          <div
            onClick={closeBillPreview}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              zIndex: 10000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              backdropFilter: 'blur(4px)',
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#fff',
                borderRadius: '12px',
                maxWidth: '850px',
                width: '100%',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div
                style={{
                  padding: '12px 18px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.2rem' }}></span>
                  <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>Bill / Purchase Proof (Admin Confidential)</strong>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {previewBillUrl && (
                    <a
                      href={previewBillUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '4px 10px',
                        background: '#0284c7',
                        color: '#fff',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        fontWeight: 600,
                      }}
                    >
                      Open Full Size
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={closeBillPreview}
                    style={{
                      background: '#e2e8f0',
                      border: 'none',
                      borderRadius: '50%',
                      width: '28px',
                      height: '28px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: 700,
                      color: '#475569',
                    }}
                  >

                  </button>
                </div>
              </div>
              <div
                style={{
                  padding: '16px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f1f5f9',
                  minHeight: '320px',
                  position: 'relative',
                }}
              >
                {billImageLoading && !billImageError && (
                  <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}></span> Loading bill proof...
                  </div>
                )}

                {billImageError ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem 1rem', maxWidth: '420px' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}></div>
                    <strong style={{ display: 'block', fontSize: '1.02rem', color: '#1e293b', marginBottom: '6px' }}>
                      Unable to render inline image preview
                    </strong>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px', lineHeight: 1.5 }}>
                      The bill could not be loaded. Please try again.
                    </p>
                    <button
                      type="button"
                      onClick={() => previewBillId && openBillPreview(previewBillId)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '9px 18px',
                        background: '#0284c7',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '0.88rem',
                        fontWeight: 600,
                        textDecoration: 'none',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Retry Bill Preview
                    </button>
                  </div>
                ) : previewBillUrl ? (
                  <img
                    src={previewBillUrl}
                    alt="Bill preview"
                    loading="eager"
                    decoding="async"
                    onLoad={() => setBillImageLoading(false)}
                    onError={() => {
                      setBillImageLoading(false);
                      setBillImageError(true);
                    }}
                    style={{
                      display: billImageLoading ? 'none' : 'block',
                      maxWidth: '100%',
                      maxHeight: '75vh',
                      objectFit: 'contain',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      background: '#fff',
                    }}
                  />
                ) : null}
              </div>
            </div>
          </div>
        )}
      </section>
    </MainLayout>
  );
}
