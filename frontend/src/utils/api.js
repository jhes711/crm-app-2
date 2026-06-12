import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getOpportunities = (params) => api.get('/opportunities', { params }).then(r => r.data);
export const getOpportunity = (id) => api.get(`/opportunities/${id}`).then(r => r.data);
export const createOpportunity = (data) => api.post('/opportunities', data).then(r => r.data);
export const updateOpportunity = (id, data) => api.put(`/opportunities/${id}`, data).then(r => r.data);
export const deleteOpportunity = (id) => api.delete(`/opportunities/${id}`).then(r => r.data);
export const getStageHistory = (id) => api.get(`/opportunities/${id}/history`).then(r => r.data);
export const getActivityLog = (id) => api.get(`/opportunities/${id}/activity`).then(r => r.data);
export const getActivityFeed = () => api.get('/activity').then(r => r.data);
export const getReport = (params) => api.get('/reports', { params }).then(r => r.data);

// Activity Tracker
export const getActivityTrackerWeek = (week_start) => api.get('/activity-tracker', { params: { week_start } }).then(r => r.data);
export const getActivityTrackerMonth = (year, month) => api.get('/activity-tracker/month', { params: { year, month } }).then(r => r.data);
export const upsertActivityTrackerRow = (week_start, activity_key, days) =>
  api.put('/activity-tracker', { week_start, activity_key, ...days }).then(r => r.data);

// Deals
export const getDeals = () => api.get('/deals').then(r => r.data);
export const createDeal = (data) => api.post('/deals', data).then(r => r.data);
export const updateDeal = (id, data) => api.put(`/deals/${id}`, data).then(r => r.data);
export const deleteDeal = (id) => api.delete(`/deals/${id}`).then(r => r.data);

// Auth
export const loginApi = (password) => api.post('/auth/login', { password }).then(r => r.data);
export const forgotPasswordApi = () => api.post('/auth/forgot-password').then(r => r.data);
export const resetPasswordApi = (token, password) => api.post('/auth/reset-password', { token, password }).then(r => r.data);
