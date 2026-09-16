import axios from 'axios';

// Set NEXT_PUBLIC_API_URL in .env.local for production; falls back to the
// local Express backend during development.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// Normalizes every failure into a single readable `err.message`, so
// components never need to reach into `error.response.data` themselves.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      (error.code === 'ECONNABORTED' ? 'انتهت مهلة الاتصال بالسيرفر' : null) ||
      error.message ||
      'حدث خطأ غير متوقع، حاول مرة أخرى';
    return Promise.reject(new Error(message));
  }
);

export const menuApi = {
  getFeatured: () => apiClient.get('/menu', { params: { isFeaturedOnHome: true } }),
  getAll: (params = {}) => apiClient.get('/menu', { params }),
  getBySlug: (slug) => apiClient.get(`/menu/${slug}`),
};

export const ordersApi = {
  create: (payload) => apiClient.post('/orders', payload),
  getByNumber: (orderNumber) => apiClient.get(`/orders/${orderNumber}`),
};

export default apiClient;