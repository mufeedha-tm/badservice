import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export function getAssetUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
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
    return 'Please sign in to continue.';
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

export async function getComplaints() {
  const response = await api.get('/complaints');
  return response.data.data;
}

export async function getMyComplaints() {
  const response = await api.get('/complaints/my');
  return response.data.data;
}

export async function getCategories() {
  const response = await api.get('/categories');
  return response.data.data;
}

export async function getCompanies() {
  const response = await api.get('/companies');
  return response.data.data;
}

export async function getCompany(id) {
  const response = await api.get(`/companies/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function getNavigation() {
  const response = await api.get('/navigation');
  return response.data.data;
}

export async function getComplaint(id) {
  const response = await api.get(`/complaints/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function searchComplaints({ q = '', category = '', subcategory = '', company = '', period = '', date = '', status = '', sort = '' } = {}) {
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
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return response.data.data;
}

// Company request (User submitted)
export async function submitCompanyRequest({ companyName, categoryId, description }) {
  const response = await api.post('/company-requests', { companyName, categoryId, description });
  return response.data.data;
}

// Authentication
export async function registerAccount(account) {
  const response = await api.post('/auth/register', account);
  return response.data.data;
}

export async function loginAccount(credentials) {
  const response = await api.post('/auth/login', credentials);
  return response.data.data;
}

export async function getCurrentAccount() {
  const response = await api.get('/auth/me');
  return response.data.data;
}

export async function logoutAccount() {
  const response = await api.post('/auth/logout');
  return response.data.data;
}

// Admin APIs
export async function getAdminStats() {
  const response = await api.get('/admin/stats');
  return response.data.data;
}

export async function getAdminCompanyRequests(status = '') {
  const response = await api.get('/admin/company-requests', { params: { status } });
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

export async function updateAdminComplaintStatus(id, status) {
  const response = await api.patch(`/admin/complaints/${encodeURIComponent(id)}/status`, { status });
  return response.data.data;
}

export async function deleteAdminComplaint(id) {
  const response = await api.delete(`/admin/complaints/${encodeURIComponent(id)}`);
  return response.data;
}

export async function getAdminCompanies() {
  const response = await api.get('/admin/companies');
  return response.data.data;
}

export async function createAdminCompany({ name, categoryId, status }) {
  const response = await api.post('/admin/companies', { name, categoryId, status });
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