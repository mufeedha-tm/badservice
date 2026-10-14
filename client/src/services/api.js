import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  // A failed connection should fail visibly instead of leaving a page indefinitely busy.
  // Longer-running uploads override this per request below.
  timeout: 30000,
  headers: {
    Accept: 'application/json',
  },
});

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('badservice_token') || sessionStorage.getItem('badservice_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return config;
});

export function getAssetUrl(path) {
  if (!path) return '';

  if (/^https?:\/\//i.test(path)) {
    if (path.includes('res.cloudinary.com') && path.includes('/image/upload/') && !path.includes('/f_auto')) {
      return path.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
    }
    return path;
  }

  const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
  const serverOrigin = baseUrl.replace(/\/api\/?$/, '');

  return `${serverOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
}

export function getErrorMessage(error, defaultMessage = 'An unexpected error occurred.') {
  if (error?.response?.data?.error?.message) {
    return error.response.data.error.message;
  }

  if (error?.response?.data?.message) {
    return error.response.data.message;
  }

  if (error?.message === 'Network Error' || (!error?.response && error?.request)) {
    return 'Unable to reach the server. Please check your network connection or try again later.';
  }

  if (error?.response?.status === 401) {
    return 'Your verification has expired or is invalid. Please verify again.';
  }

  if (error?.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }

  if (error?.response?.status === 404) {
    return 'The requested resource was not found.';
  }

  if (error?.response?.status >= 500) {
    return 'Server is temporarily unavailable. Please try again shortly.';
  }

  return error?.message || defaultMessage;
}

export async function getHealth() {
  const response = await api.get('/health');
  return response.data;
}

export async function getComplaints({ limit } = {}) {
  const response = await api.get('/complaints', {
    params: limit ? { limit } : undefined,
  });
  return response.data.data;
}

export async function getMyComplaints() {
  const response = await api.get('/complaints/my');
  return response.data.data;
}

let cachedCategories = null;
let pendingCategoriesPromise = null;
export async function getCategories() {
  if (cachedCategories) return cachedCategories;
  if (pendingCategoriesPromise) return pendingCategoriesPromise;
  pendingCategoriesPromise = api.get('/categories')
    .then((response) => {
      cachedCategories = response.data.data;
      return cachedCategories;
    })
    .finally(() => {
      pendingCategoriesPromise = null;
    });
  return pendingCategoriesPromise;
}

let cachedCompanies = null;
let pendingCompaniesPromise = null;
export async function getCompanies() {
  if (cachedCompanies) return cachedCompanies;
  if (pendingCompaniesPromise) return pendingCompaniesPromise;
  pendingCompaniesPromise = api.get('/companies')
    .then((response) => {
      cachedCompanies = response.data.data;
      return cachedCompanies;
    })
    .finally(() => {
      pendingCompaniesPromise = null;
    });
  return pendingCompaniesPromise;
}

export async function getCompany(id) {
  const response = await api.get(`/companies/${encodeURIComponent(id)}`);
  return response.data.data;
}

let pendingNavigationPromise = null;
export async function getNavigation() {
  if (pendingNavigationPromise) return pendingNavigationPromise;
  pendingNavigationPromise = api.get('/navigation')
    .then((response) => response.data.data)
    .finally(() => {
      setTimeout(() => { pendingNavigationPromise = null; }, 5000);
    });
  return pendingNavigationPromise;
}

export async function getComplaint(id) {
  const response = await api.get(`/complaints/${encodeURIComponent(id)}`);
  return response.data.data;
}

/** Send a 6-digit OTP to a phone number. */
export async function sendOtp({ phone }) {
  const response = await api.post('/otp/send', { phone });
  return response.data.data;
}

/** Verify a 6-digit OTP using a phone number. */
export async function verifyOtp({ phone, otp }) {
  const response = await api.post('/otp/verify', { phone, otp });
  return response.data.data;
}

let cachedRankings = null;
let pendingRankingsPromise = null;
export async function getComplaintRankings() {
  if (cachedRankings) return cachedRankings;
  if (pendingRankingsPromise) return pendingRankingsPromise;
  pendingRankingsPromise = api.get('/complaints/rankings')
    .then((response) => {
      cachedRankings = response.data.data;
      return cachedRankings;
    })
    .finally(() => {
      pendingRankingsPromise = null;
    });
  return pendingRankingsPromise;
}

export async function searchComplaints({
  q = '',
  category = '',
  subcategory = '',
  company = '',
  period = '',
  date = '',
  status = '',
  sort = '',
} = {}) {
  const params = {};
  if (q) params.q = q;
  if (category) params.category = category;
  if (subcategory) params.subcategory = subcategory;
  if (company) params.company = company;
  if (period) params.period = period;
  if (date) params.date = date;
  if (status) params.status = status;
  if (sort) params.sort = sort;

  const response = await api.get('/complaints/search', { params });
  return response.data.data;
}

export async function createComplaint(complaint) {
  const isFormData = typeof FormData !== 'undefined' && complaint instanceof FormData;
  const response = await api.post('/complaints', complaint, {
    timeout: 120000,
    headers: isFormData
      ? {
          'Content-Type': 'multipart/form-data',
        }
      : undefined,
  });
  return response.data.data;
}

export async function submitCompanyRequest({ companyName, categoryId, description }) {
  const response = await api.post('/company-requests', {
    companyName,
    categoryId,
    description,
  });
  return response.data.data;
}

// Authentication
export async function registerAccount(account) {
  const response = await api.post('/auth/register', account);
  const data = response.data.data;
  if (data?.token) {
    try { localStorage.setItem('badservice_token', data.token); } catch {}
  }
  return data;
}

export async function loginAccount(credentials) {
  const response = await api.post('/auth/login', credentials);
  const data = response.data.data;
  if (data?.token) {
    try { localStorage.setItem('badservice_token', data.token); } catch {}
  }
  return data;
}

export async function loginAdminAccount(credentials) {
  const response = await api.post('/auth/admin/login', credentials);
  const data = response.data.data;
  if (data?.token) {
    try { localStorage.setItem('badservice_token', data.token); } catch {}
  }
  return data;
}

export async function getCurrentAccount() {
  const response = await api.get('/auth/me');
  return response.data.data;
}

export async function logoutAccount() {
  try {
    const response = await api.post('/auth/logout');
    return response.data.data;
  } finally {
    try {
      localStorage.removeItem('badservice_token');
      sessionStorage.removeItem('badservice_token');
    } catch {}
  }
}

// Admin APIs
export async function getAdminStats() {
  const response = await api.get('/admin/stats');
  return response.data.data;
}

export async function getAdminCompanyRequests(status = '') {
  const response = await api.get('/admin/company-requests', {
    params: { status },
  });
  return response.data.data;
}

export async function approveCompanyRequest(id) {
  const response = await api.post(`/admin/company-requests/${encodeURIComponent(id)}/approve`);
  return response.data.data;
}

export async function rejectCompanyRequest(id) {
  const response = await api.post(`/admin/company-requests/${encodeURIComponent(id)}/reject`);
  return response.data.data;
}

export async function getAdminComplaints(params = {}) {
  const response = await api.get('/admin/complaints', { params });
  return response.data.data;
}

export async function createAdminComplaint(complaint) {
  const isFormData = typeof FormData !== 'undefined' && complaint instanceof FormData;
  const response = await api.post('/admin/complaints', complaint, {
    timeout: 120000,
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data.data;
}

// Bill files are admin-only. Fetch them through this client so the
// administrator's authorization header is included before displaying them.
export async function getAdminComplaintBill(id, { signal } = {}) {
  const response = await api.get(`/admin/complaints/${encodeURIComponent(id)}/bill`, {
    responseType: 'blob',
    signal,
  });
  return response.data;
}

export async function updateAdminComplaintStatus(id, status, reason = '') {
  const response = await api.patch(`/admin/complaints/${encodeURIComponent(id)}/status`, { status, reason });
  return response.data.data;
}

export async function editAdminComplaint(id, updates) {
  const response = await api.patch(`/admin/complaints/${encodeURIComponent(id)}`, updates);
  return response.data.data;
}

export async function uploadDraftMedia(file, mediaType, onProgress = null) {
  const formData = new FormData();
  formData.append('media', file);
  formData.append('mediaType', mediaType);
  const response = await api.post('/complaints/upload-media', formData, {
    timeout: 120000,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return response.data.data;
}

export async function trackComplaint(query) {
  const response = await api.get(`/complaints/track/${encodeURIComponent(query)}`);
  return response.data.data;
}

export async function getComments(complaintId) {
  const response = await api.get(`/complaints/${encodeURIComponent(complaintId)}/comments`);
  return response.data.data;
}

export async function postComment(complaintId, { authorName, authorEmail, body, parentId = null }) {
  const response = await api.post(`/complaints/${encodeURIComponent(complaintId)}/comments`, {
    authorName,
    authorEmail,
    body,
    parentId,
  });
  return response.data.data;
}

export async function editComment(id, { body, authorEmail }) {
  const response = await api.put(`/comments/${encodeURIComponent(id)}`, { body, authorEmail });
  return response.data.data;
}

export async function deleteComment(id, authorEmail = '') {
  const response = await api.delete(`/comments/${encodeURIComponent(id)}`, {
    data: authorEmail ? { authorEmail } : undefined,
  });
  return response.data;
}

export async function deleteAdminComplaint(id, reason = '') {
  const response = await api.delete(`/admin/complaints/${encodeURIComponent(id)}`, { data: { reason } });
  return response.data;
}

export async function restoreAdminComplaint(id) {
  const response = await api.post(`/admin/complaints/${encodeURIComponent(id)}/restore`);
  return response.data;
}

export async function requestDeleteComplaint(id, reason = '', contactInfo = '') {
  const response = await api.post(`/complaints/${encodeURIComponent(id)}/request-delete`, { reason, contactInfo });
  return response.data.data;
}

export async function cancelDeleteComplaint(id) {
  const response = await api.post(`/complaints/${encodeURIComponent(id)}/cancel-delete`);
  return response.data.data;
}

export async function rejectAdminDeleteRequest(id, reason = '') {
  const response = await api.post(`/admin/complaints/${encodeURIComponent(id)}/reject-delete`, { reason });
  return response.data.data;
}

export async function getAdminCompanies() {
  const response = await api.get('/admin/companies');
  return response.data.data;
}

export async function createAdminCompany({ name, categoryId, status }) {
  const response = await api.post('/admin/companies', {
    name,
    categoryId,
    status,
  });
  return response.data.data;
}

export async function updateAdminCompanyStatus(id, status) {
  const response = await api.patch(`/admin/companies/${encodeURIComponent(id)}/status`, { status });
  return response.data.data;
}

export async function getAdminUsers() {
  const response = await api.get('/admin/users');
  return response.data.data;
}

export async function updateAdminUserStatus(id, status) {
  const response = await api.patch(`/admin/users/${encodeURIComponent(id)}/status`, { status });
  return response.data.data;
}

export async function updateAdminUserRole(id, role) {
  const response = await api.patch(`/admin/users/${encodeURIComponent(id)}/role`, { role });
  return response.data.data;
}

export async function getAdminCategories() {
  const response = await api.get('/admin/categories');
  return response.data.data;
}

export default api;
