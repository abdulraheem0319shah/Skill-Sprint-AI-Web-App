import axios from 'axios';

const apiBaseURL = import.meta.env.VITE_API_BASE_URL
  || (import.meta.env.PROD ? 'https://skillsprintai.tech/api' : '/api');

const api = axios.create({
  baseURL: apiBaseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const authService = {
  login: (username, password, portal) => api.post('/auth/login', { username, password, portal }),
  getEmployeeRoles: async () => {
    try {
      return await api.get('/auth/employee-roles');
    } catch (error) {
      if (error.response?.status !== 404) throw error;
      const response = await api.get('/roles');
      return { ...response, data: { roles: response.data.roles || [] } };
    }
  },
  registerEmployee: (payload) => api.post('/auth/register-employee', payload),
  getUsers: () => api.get('/auth/users'),
};

export const statsService = {
  getDashboard: () => api.get('/stats/dashboard'),
};

export const documentService = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, payload) => api.put(`/documents/${id}`, payload),
  delete: (id) => api.delete(`/documents/${id}`),
  updateStatus: (id, status) => api.put(`/documents/${id}/status`, { status }),
  extractRequirements: (id, params) => api.post(`/documents/${id}/extract-requirements`, null, { params }),
};

export const roleService = {
  getAll: () => api.get('/roles'),
  create: (role) => api.post('/roles', role),
  update: (id, role) => api.put(`/roles/${id}`, role),
  delete: (id) => api.delete(`/roles/${id}`),
};

export const matrixService = {
  getMatrix: (params) => api.get('/matrix', { params }),
  addRequirement: (req) => api.post('/matrix', req),
  updateRequirement: (id, req) => api.put(`/matrix/${id}`, req),
  deleteRequirement: (id) => api.delete(`/matrix/${id}`),
};

export const employeeService = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (emp) => api.post('/employees', emp),
  update: (id, emp) => api.put(`/employees/${id}`, emp),
  delete: (id) => api.delete(`/employees/${id}`),
};

export const planService = {
  generate: (payload) => api.post('/plans/generate', payload),
  getAll: () => api.get('/plans'),
  getById: (id) => api.get(`/plans/${id}`),
  validate: (id) => api.post(`/plans/${id}/validate`),
  delete: (id) => api.delete(`/plans/${id}`),
};

export const comparisonService = {
  evaluate: (planId) => api.get(`/comparison/evaluate/${planId}`),
  getMultiRole: () => api.get('/comparison/multi-role'),
};

export const reviewService = {
  getAll: (params) => api.get('/reviews', { params }),
  takeAction: (id, payload) => api.post(`/reviews/${id}/action`, payload),
};

export const learnerService = {
  toggleTask: (taskId) => api.post(`/learner/tasks/${taskId}/toggle`),
  toggleChecklist: (itemId) => api.post(`/learner/checklists/${itemId}/toggle`),
  submitQuiz: (quizId, payload) => api.post(`/learner/quizzes/${quizId}/submit`, payload),
};

export const policyService = {
  impactAnalysis: (payload) => api.post('/policies/impact-analysis', payload),
  selectiveRegenerate: (payload) => api.post('/policies/selective-regenerate', payload),
};

export const reportService = {
  getSummary: () => api.get('/reports/summary'),
  exportCsvUrl: '/api/reports/export?format=csv',
  exportJsonUrl: '/api/reports/export?format=json',
};

export const promptService = {
  getPrompts: () => api.get('/prompts'),
  getAuditTrail: () => api.get('/audit'),
  resetSystem: () => api.post('/system/reset'),
};

export default api;
