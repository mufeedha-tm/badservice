import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export async function getHealth() {
  const response = await api.get('/health');
  return response.data;
}

export async function getComplaints() {
  const response = await api.get('/complaints');
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

export async function getNavigation() {
  const response = await api.get('/navigation');
  return response.data.data;
}

export async function getComplaint(id) {
  const response = await api.get(`/complaints/${encodeURIComponent(id)}`);
  return response.data.data;
}

export async function searchComplaints({ q = '', category = '', company = '', period = '', sort = '' }) {
  const response = await api.get('/complaints/search', {
    params: { q, category, company, period, sort },
  });
  return response.data.data;
}

export async function createComplaint(complaint) {
  const response = await api.post('/complaints', complaint);
  return response.data.data;
}

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

export default api;