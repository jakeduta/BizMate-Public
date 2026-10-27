import axios from "axios";

const api = axios.create({
    baseURL:         "/api",
    withCredentials: true,
});

// ── Auth token management ─────────────────────────────────────────────────────
let _token = null;

export function setAuthToken(token) {
    _token = token;
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
}

export function getAuthToken() {
    return _token;
}

// ── Resources ─────────────────────────────────────────────────────────────────

export const Customer = {
    list:   async ()           => (await api.get('/customers')).data,
    create: async (data)       => (await api.post('/customers', data)).data,
    update: async (id, data)   => (await api.put(`/customers/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/customers/${id}`)).data,
};

export const Appointment = {
    list:   async ()           => (await api.get('/appointments')).data,
    create: async (data)       => (await api.post('/appointments', data)).data,
    update: async (id, data)   => (await api.put(`/appointments/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/appointments/${id}`)).data,
};

export const Invoice = {
    list:   async ()           => (await api.get('/invoices')).data,
    get:    async (id)         => (await api.get(`/invoices/${id}`)).data,
    create: async (data)       => (await api.post('/invoices', data)).data,
    update: async (id, data)   => (await api.put(`/invoices/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/invoices/${id}`)).data,
};

export const Employee = {
    list:   async ()           => (await api.get('/employees')).data,
    create: async (data)       => (await api.post('/employees', data)).data,
    update: async (id, data)   => (await api.put(`/employees/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/employees/${id}`)).data,
};

export const ClockIn = {
    list:     async ()            => (await api.get('/clockins')).data,
    clockIn:  async (employee_id, coords) => (await api.post('/clockins/clockin', { employee_id, lat: coords?.lat ?? null, lng: coords?.lng ?? null })).data,
    clockOut: async (recordId)    => (await api.put(`/clockins/clockout/${recordId}`)).data,
    update:   async (id, data)    => (await api.put(`/clockins/${id}`, data)).data,
    delete:   async (id)          => (await api.delete(`/clockins/${id}`)).data,
};

export const Member = {
    list:       async ()             => (await api.get('/members')).data,
    updateRole: async (userId, role) => (await api.put(`/members/${userId}/role`, { role })).data,
    remove:     async (userId)       => (await api.delete(`/members/${userId}`)).data,
};

export const Payment = {
    list:   async ()           => (await api.get('/payments')).data,
    create: async (data)       => (await api.post('/payments', data)).data,
    update: async (id, data)   => (await api.put(`/payments/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/payments/${id}`)).data,
};

export const Service = {
    list:   async ()           => (await api.get('/services')).data,
    all:    async ()           => (await api.get('/services/all')).data,
    create: async (data)       => (await api.post('/services', data)).data,
    update: async (id, data)   => (await api.put(`/services/${id}`, data)).data,
    delete: async (id)         => (await api.delete(`/services/${id}?hard=true`)).data,
};

export const Analytics = {
    query:       async (question) => (await api.post('/analytics/query', { question })).data,
    suggestions: async ()         => (await api.get('/analytics/suggestions')).data,
};

export const Tax = {
    getDashboard:          async (year)       => (await api.get('/tax/dashboard', { params: { year } })).data,
    getProfile:            async ()           => (await api.get('/tax/profile')).data,
    saveProfile:           async (data)       => (await api.post('/tax/profile', data)).data,
    getManualEntries:      async (year)       => (await api.get('/tax/manual-entries', { params: { year } })).data,
    createManualEntry:     async (data)       => (await api.post('/tax/manual-entries', data)).data,
    updateManualEntry:     async (id, data)   => (await api.put(`/tax/manual-entries/${id}`, data)).data,
    deleteManualEntry:     async (id)         => (await api.delete(`/tax/manual-entries/${id}`)).data,
    getContractors:        async (year)       => (await api.get('/tax/contractors', { params: { year } })).data,
    createContractor:      async (data)       => (await api.post('/tax/contractors', data)).data,
    updateContractor:      async (id, data)   => (await api.put(`/tax/contractors/${id}`, data)).data,
    deleteContractor:      async (id)         => (await api.delete(`/tax/contractors/${id}`)).data,
    getSalesSummaries:     async (year)       => (await api.get('/tax/sales-summaries', { params: { year } })).data,
    createSalesSummary:    async (data)       => (await api.post('/tax/sales-summaries', data)).data,
    getPayments:           async (year)       => (await api.get('/tax/payments', { params: { year } })).data,
    createPayment:         async (data)       => (await api.post('/tax/payments', data)).data,
    updatePayment:         async (id, data)   => (await api.put(`/tax/payments/${id}`, data)).data,
    deletePayment:         async (id)         => (await api.delete(`/tax/payments/${id}`)).data,
    getCompliance:         async ()           => (await api.get('/tax/compliance')).data,
    createCompliance:      async (data)       => (await api.post('/tax/compliance', data)).data,
    updateCompliance:      async (id, data)   => (await api.put(`/tax/compliance/${id}`, data)).data,
    deleteCompliance:      async (id)         => (await api.delete(`/tax/compliance/${id}`)).data,
    getForms:              async (year)       => (await api.get('/tax/forms', { params: { year } })).data,
    updateFormStatus:      async (code, data) => (await api.post(`/tax/forms/${code}/status`, data)).data,
    getDocuments:          async (params)     => (await api.get('/tax/documents', { params })).data,
    createDocument:        async (data)       => (await api.post('/tax/documents', data)).data,
    updateDocument:        async (id, data)   => (await api.put(`/tax/documents/${id}`, data)).data,
    deleteDocument:        async (id)         => (await api.delete(`/tax/documents/${id}`)).data,
    getAuditLog:           async ()           => (await api.get('/tax/audit-log')).data,
    getReport:             async (year)       => (await api.get('/tax/report', { params: { year } })).data,
    getLocalConfig:        async ()           => (await api.get('/tax/local-config')).data,
    createLocalConfig:     async (data)       => (await api.post('/tax/local-config', data)).data,
    updateLocalConfig:     async (id, data)   => (await api.put(`/tax/local-config/${id}`, data)).data,
    deleteLocalConfig:     async (id)         => (await api.delete(`/tax/local-config/${id}`)).data,
    getBookAdjustments:    async (year)       => (await api.get('/tax/book-adjustments', { params: { year } })).data,
    createBookAdjustment:  async (data)       => (await api.post('/tax/book-adjustments', data)).data,
    updateBookAdjustment:  async (id, data)   => (await api.put(`/tax/book-adjustments/${id}`, data)).data,
    deleteBookAdjustment:  async (id)         => (await api.delete(`/tax/book-adjustments/${id}`)).data,
    getEntityDetails:      async (year)       => (await api.get('/tax/entity-details', { params: { year } })).data,
    createEntityDetail:    async (data)       => (await api.post('/tax/entity-details', data)).data,
    updateEntityDetail:    async (id, data)   => (await api.put(`/tax/entity-details/${id}`, data)).data,
    deleteEntityDetail:    async (id)         => (await api.delete(`/tax/entity-details/${id}`)).data,
    getWorkflow:           async (year)       => (await api.get('/tax/workflow', { params: { year } })).data,
    updateWorkflow:        async (year, data) => (await api.post('/tax/workflow', { ...data, tax_year: year })).data,
};
