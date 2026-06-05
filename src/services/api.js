import axios from 'axios';
import { normalizeDateField } from '../utils/dates.js';

export const API_BASE = import.meta.env.VITE_API_URL || '';

export function resolveImageUrl(url) {
  if (!url) return null;
  // Cloudinary URLs are public — serve directly, no proxy needed
  if (url.includes('cloudinary.com')) return url;
  // Local uploads path — proxy through backend (Render filesystem is ephemeral)
  if (url.startsWith('/uploads/')) return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  // External URL (Shinchuo CDN etc.) — proxy to bypass hotlink protection
  if (url.startsWith('http')) return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(url)}`;
  return `${API_BASE}${url}`;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.put('/auth/change-password', data);

export const getAuctions = (params) => api.get('/cars/auctions', { params });
export const getAuction = (id) => api.get(`/cars/auctions/${id}`);
export const getCars = (params) => api.get('/cars', { params });
export const getCar = (id) => api.get(`/cars/${id}`);
export const getMakes = () => api.get('/cars/meta/makes');
export const createAuction = (data) => api.post('/cars/auctions', data);
export const updateAuction = (id, data) => api.put(`/cars/auctions/${id}`, data);
export const createCar = (data) => api.post('/cars', data);
export const updateCar = (id, data) => api.put(`/cars/${id}`, data);
export const deleteCar = (id) => api.delete(`/cars/${id}`);
export const uploadCarImages = (id, formData) => api.post(`/cars/${id}/images`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });

export const placeBid = (data) => api.post('/bids', data);
export const getMyBids = (params) => api.get('/bids/my', { params });
export const getAllBids = (params) => api.get('/bids', { params });
export const updateBid = (id, data) => api.put(`/bids/${id}`, data);

export const getMyPurchases = (params) => api.get('/purchases/my', { params });
export const getPurchase = (id) => api.get(`/purchases/${id}`);
export const getAllPurchases = (params) => api.get('/purchases', { params });
export const createPurchase = (data) => api.post('/purchases', data);
export const updatePurchase = (id, data) => api.put(`/purchases/${id}`, data);
export const getPurchaseNextMeta = (user_id) => api.get('/purchases/next-meta', { params: { user_id } });
export const updateShipping = (id, data) => api.put(`/purchases/${id}/shipping`, data);
export const uploadDocument = (id, formData) => api.post(`/purchases/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteDocument = (purchaseId, docId) => api.delete(`/purchases/${purchaseId}/documents/${docId}`);

export const submitPart = (data) => api.post('/parts', data);
export const adminCreatePart = (data) => api.post('/parts/admin-create', data);
export const getMyParts = (params) => api.get('/parts/my', { params });
export const exportMyParts = () => api.get('/parts/my/export', { responseType: 'blob' });
export const getAllParts = (params) => api.get('/parts', { params });
export const updatePart = (id, data) => api.put(`/parts/${id}`, data);
export const exportAllParts = () => api.get('/parts/export', { responseType: 'blob' });

export const getNotifications = (params) => api.get('/notifications', { params });
export const markRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllRead = () => api.put('/notifications/read-all');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

export const getWatchlist = () => api.get('/watchlist');
export const addToWatchlist = (carId) => api.post(`/watchlist/${carId}`);
export const removeFromWatchlist = (carId) => api.delete(`/watchlist/${carId}`);
export const checkWatchlist = (carId) => api.get(`/watchlist/check/${carId}`);

export const getAdminStats = (params = {}) => api.get('/admin/stats', { params });
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const getAdminUser = (id) => api.get(`/admin/users/${id}`);
export const createAdminUser = (data) => api.post('/admin/users', data);
export const updateAdminUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const toggleUser = (id) => api.put(`/admin/users/${id}/toggle`);
export const sendNotification = (data) => api.post('/admin/notify', data);

export const addRemittance = (formData) => api.post('/remittances', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMyRemittances = (params) => api.get('/remittances/my', { params });
export const getAllRemittances = (params) => api.get('/remittances', { params });
export const confirmRemittance = (id, data) => api.put(`/remittances/${id}/confirm`, data);
export const deleteRemittance      = (id)     => api.delete(`/remittances/${id}`);
export const adminCreateRemittance = (data)   => api.post('/remittances/admin-create', data);

export const getSavedSearches = (params) => api.get('/saved-searches', { params });
export const saveSearch = (data) => api.post('/saved-searches', data);
export const deleteSavedSearch = (id) => api.delete(`/saved-searches/${id}`);

export const getMyShipments = (params) => api.get('/shipments/my', { params });
export const getAllShipments    = ()          => api.get('/shipments');
export const getShipmentByFileCode = (fc)    => api.get('/shipments/by-file-code', { params: { file_code: fc } });
function withShipmentDates(data) {
  if (!data) return data;
  return {
    ...data,
    etd: data.etd !== undefined ? normalizeDateField(data.etd) : undefined,
    eta: data.eta !== undefined ? normalizeDateField(data.eta) : undefined,
  };
}

function withBLDates(data) {
  if (!data) return data;
  return {
    ...data,
    eto: data.eto !== undefined ? normalizeDateField(data.eto) : undefined,
    eta: data.eta !== undefined ? normalizeDateField(data.eta) : undefined,
  };
}

export const createShipment    = (data)      => api.post('/shipments', withShipmentDates(data));
export const updateShipment    = (id, data)  => api.put(`/shipments/${id}`, withShipmentDates(data));
export const getBLRequests     = (params)    => api.get('/shipments/bl-requests', { params });
export const createBLRequest   = (data)      => api.post('/shipments/bl-requests', withBLDates(data));
export const updateBLRequest   = (id, data)  => api.put(`/shipments/bl-requests/${id}`, withBLDates(data));
export const uploadShipmentDoc = (id, formData) => api.post(`/shipments/${id}/document`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const uploadBLDoc  = (id, formData) => api.post(`/shipments/bl-requests/${id}/document`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteBLDoc  = (id, data)     => api.delete(`/shipments/bl-requests/${id}/document`, { data });
export const getAdminOthers = () => api.get('/shipments/others');
export const createAdminOther = (formData) => api.post('/shipments/others', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const updateAdminOther = (id, formData) => api.put(`/shipments/others/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteAdminOther = (id) => api.delete(`/shipments/others/${id}`);

export const getMyProformaInvoices = (params) => api.get('/invoices/proforma/my', { params });
export const getAllProformaInvoices = (params) => api.get('/invoices/proforma', { params });
export const createProformaInvoice = (data) => api.post('/invoices/proforma', data);
export const updateProformaInvoice = (id, data) => api.put(`/invoices/proforma/${id}`, data);
export const deleteProformaInvoice = (id) => api.delete(`/invoices/proforma/${id}`);

export const getMyFinalInvoices = (params) => api.get('/invoices/final/my', { params });
export const getAllFinalInvoices = (params) => api.get('/invoices/final', { params });
export const createFinalInvoice = (data) => api.post('/invoices/final', data);
export const updateFinalInvoice = (id, data) => api.put(`/invoices/final/${id}`, data);
export const deleteFinalInvoice = (id) => api.delete(`/invoices/final/${id}`);

export const getMyLedger = () => api.get('/accounting/my');
export const getUserLedger = (userId) => api.get(`/accounting/user/${userId}`);
export const getAccountingSummary = () => api.get('/accounting/summary');

export const getMySubClients = () => api.get('/sub-clients/my');
export const createSubClient = (data) => api.post('/sub-clients/my', data);
export const updateSubClient = (id, data) => api.put(`/sub-clients/my/${id}`, data);
export const deleteSubClient = (id) => api.delete(`/sub-clients/my/${id}`);
export const getAllSubClients = (params) => api.get('/sub-clients', { params });

export const getJapanFeatured = ()       => api.get('/japan/featured');
export const getJapanCars     = (params) => api.get('/japan/cars', { params });
export const getJapanCar      = (pid)    => api.get(`/japan/cars/${pid}`);
export const getJapanStats    = ()       => api.get('/japan/stats');
export const getJapanMakes    = ()       => api.get('/japan/makes');
export const getJapanDates    = ()       => api.get('/japan/dates');

export const placeJapanBid       = (data)           => api.post('/japan/bids', data);
export const getMyJapanBids       = ()               => api.get('/japan/bids/my');
export const getAllJapanBids       = (params)         => api.get('/japan/bids', { params });
export const exportJapanBids      = (params)         => api.get('/japan/bids/export', { params, responseType: 'blob' });
export const updateJapanBid       = (id, data)       => api.put(`/japan/bids/${id}`, data);

export const createJapanPurchase       = (data) => api.post('/japan/purchases', data);
export const createManualJapanPurchase = (data) => api.post('/japan/purchases/manual', data);
export const uploadJapanCarImages = (formData) => api.post('/japan/purchases/upload-images', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMyJapanPurchases      = ()               => api.get('/japan/purchases/my');
export const getJapanPartsPurchases   = (params)         => api.get('/japan/parts-purchases', { params });
export const getJapanPartsPurchase    = (id)             => api.get(`/japan/parts-purchases/${id}`);
export const createJapanPartsPurchase = (data)           => api.post('/japan/parts-purchases', data);
export const updateJapanPartsPurchase = (id, data)       => api.put(`/japan/parts-purchases/${id}`, data);
export const deleteJapanPartsPurchase = (id)             => api.delete(`/japan/parts-purchases/${id}`);
export const exportJapanPartsExcel    = (params)         => api.get('/japan/parts-purchases/export', { params, responseType: 'blob' });
export const getAllJapanPurchases  = (params)         => api.get('/japan/purchases', { params });
export const getJapanPurchase     = (id)             => api.get(`/japan/purchases/${id}`);

const JAPAN_PURCHASE_NUMERIC_FIELDS = new Set([
  'bid_price', 'auction_fee', 'auction_commission', 'transportation',
  'loading_custom', 'commission', 'tax_10pct', 'radiation_photos',
  'custom_fee', 'freight', 'recycle', 'total',
]);

const JAPAN_PURCHASE_DATE_FIELDS = new Set(['etd', 'eta']);

export function buildJapanPurchasePayload(source) {
  const src = source || {};
  const num = (key) => {
    const v = src[key];
    if (v === '' || v === null || v === undefined) return 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const str = (key) => {
    const v = src[key];
    if (v === '' || v === null || v === undefined) return null;
    return String(v);
  };
  const date = (key) => normalizeDateField(src[key]);

  const keys = [
    'pro_invoice_no', 'file_code', 'destination',
    'bid_price', 'auction_fee', 'auction_commission', 'transportation',
    'loading_custom', 'commission', 'tax_10pct', 'radiation_photos',
    'custom_fee', 'freight', 'recycle', 'total',
    'etd', 'ship_name', 'shipping_company', 'eta', 'route',
    'result_of_inspection', 'remarks', 'bl_status',
  ];

  return keys.reduce((payload, key) => {
    if (JAPAN_PURCHASE_NUMERIC_FIELDS.has(key)) payload[key] = num(key);
    else if (JAPAN_PURCHASE_DATE_FIELDS.has(key)) payload[key] = date(key);
    else payload[key] = str(key);
    return payload;
  }, {});
}

export const updateJapanPurchase = (id, data) => {
  if (data === undefined || data === null) {
    return Promise.reject(new Error('updateJapanPurchase requires purchase field data'));
  }
  return api.put(`/japan/purchases/${id}`, buildJapanPurchasePayload(data));
};
export const deleteJapanPurchase  = (id)             => api.delete(`/japan/purchases/${id}`);
export const uploadJapanDocument  = (id, formData)   => api.post(`/japan/purchases/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const deleteJapanDocument  = (purchaseId, docId) => api.delete(`/japan/purchases/${purchaseId}/documents/${docId}`);
export const downloadAccountExcel      = ()         => api.get('/japan/purchases/account-excel', { responseType: 'blob' });
export const adminDownloadAccountExcel = (userId) => api.get('/accounting/export', { params: { user_id: userId }, responseType: 'blob' });
