import axios from 'axios';
import { DocumentRecord, VerificationTask, GISParcel, AuditLogItem, OfficialAccountRequest, User, GovernmentSourceStatus } from '../types';

const API_BASE = '/api';

export const api = {
  login: async (bhoomiId: string, password: string) => {
    const res = await axios.post(`${API_BASE}/auth/login`, { bhoomi_id: bhoomiId, password });
    return res.data;
  },

  sendRegistrationOtp: async (email: string, mobileNo: string): Promise<{ message: string; demo_otp?: string; expires_in_minutes: number }> => {
    const res = await axios.post(`${API_BASE}/auth/register/send-otp`, { email, mobile_no: mobileNo });
    return res.data;
  },

  verifyRegistrationOtp: async (email: string, mobileNo: string, otpCode: string): Promise<{ verified: boolean }> => {
    const res = await axios.post(`${API_BASE}/auth/register/verify-otp`, { email, mobile_no: mobileNo, otp_code: otpCode });
    return res.data;
  },

  createOfficialAccount: async (payload: OfficialAccountRequest): Promise<{ message: string; bhoomi_id: string; account_status: string; user: User }> => {
    const res = await axios.post(`${API_BASE}/auth/register`, payload);
    return res.data;
  },

  getAccountRequests: async (): Promise<User[]> => {
    const res = await axios.get(`${API_BASE}/auth/account-requests`);
    return res.data;
  },

  approveAccountRequest: async (userId: string, role?: string): Promise<User> => {
    const res = await axios.post(`${API_BASE}/auth/account-requests/${userId}/approve`, {
      approved_by: 'admin@bhoomiai.demo',
      role,
    });
    return res.data;
  },

  rejectAccountRequest: async (userId: string, reason?: string): Promise<User> => {
    const res = await axios.post(`${API_BASE}/auth/account-requests/${userId}/reject`, {
      approved_by: 'admin@bhoomiai.demo',
      reason,
    });
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await axios.get(`${API_BASE}/auth/me`);
    return res.data;
  },

  getDashboardStats: async () => {
    const res = await axios.get(`${API_BASE}/dashboard`);
    return res.data;
  },

  uploadDocument: async (file: File, language: string = 'mr') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);
    formData.append('uploaded_by', 'admin@bhoomiai.demo');
    const res = await axios.post(`${API_BASE}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  processDocument: async (document_id: string) => {
    const res = await axios.post(`${API_BASE}/documents/process`, { document_id });
    return res.data;
  },

  getAllDocuments: async (): Promise<DocumentRecord[]> => {
    const res = await axios.get(`${API_BASE}/documents`);
    return res.data;
  },

  getDocumentById: async (id: string): Promise<DocumentRecord> => {
    const res = await axios.get(`${API_BASE}/documents/${id}`);
    return res.data;
  },

  updateField: async (docId: string, fieldId: string, value: string) => {
    const res = await axios.put(`${API_BASE}/documents/${docId}/fields/${fieldId}`, {
      field_value: value,
      user_email: 'officer@bhoomiai.demo',
    });
    return res.data;
  },

  verifyDocument: async (docId: string, action: 'approve' | 'reject', comment?: string) => {
    const res = await axios.post(`${API_BASE}/documents/${docId}/verify`, {
      action,
      comment,
      user_email: 'officer@bhoomiai.demo',
    });
    return res.data;
  },

  getVerificationQueue: async (): Promise<VerificationTask[]> => {
    const res = await axios.get(`${API_BASE}/verification/queue`);
    return res.data;
  },

  getGISParcels: async (search?: string): Promise<{ disclaimer: string; parcels: GISParcel[] }> => {
    const res = await axios.get(`${API_BASE}/gis/parcels`, { params: { search } });
    return res.data;
  },

  geocodeLocation: async (q: string) => {
    const res = await axios.get(`${API_BASE}/gis/geocode`, { params: { q } });
    return res.data;
  },

  reverseGeocodeLocation: async (lat: number, lng: number) => {
    const res = await axios.get(`${API_BASE}/gis/reverse-geocode`, { params: { lat, lng } });
    return res.data;
  },

  getAnalytics: async () => {
    const res = await axios.get(`${API_BASE}/analytics`);
    return res.data;
  },

  getAuditLogs: async (): Promise<AuditLogItem[]> => {
    const res = await axios.get(`${API_BASE}/audit-logs`);
    return res.data;
  },

  getGovernmentSources: async (): Promise<GovernmentSourceStatus> => {
    const res = await axios.get(`${API_BASE}/government/sources`);
    return res.data;
  },

  getGovernmentSourceCatalog: async () => {
    const res = await axios.get(`${API_BASE}/government/sources/catalog`);
    return res.data;
  },

  getTrainingStatus: async () => {
    const res = await axios.get(`${API_BASE}/government/training/status`);
    return res.data;
  },

  trainLandRecordModel: async (limit: number = 250) => {
    const res = await axios.post(`${API_BASE}/government/training/run`, null, {
      params: { limit },
    });
    return res.data;
  },

  seedDemoData: async () => {
    const res = await axios.post(`${API_BASE}/demo/seed`);
    return res.data;
  }
};
