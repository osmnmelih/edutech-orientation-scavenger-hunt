import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

export const sessions = {
  create:    (name)              => api.post('/sessions', { name }),
  getByCode: (code)              => api.get(`/sessions/${code}`),
  getById:   (id)                => api.get(`/sessions/id/${id}`),
  getQR:     (id)                => api.get(`/sessions/${id}/qr`),
  join:      (code, teamName)    => api.post(`/sessions/${code}/join`, { teamName }),
  setStatus: (id, status)        => api.patch(`/sessions/${id}/status`, { status }),
  clear:     (id, options = {})  => api.post(`/sessions/${id}/clear`, options),
};

export const teams = {
  delete:    (id)                => api.delete(`/teams/${id}`),
};

export const checkpoints = {
  add:       (data)              => api.post('/checkpoints', data),
  getBySession: (sessionId)      => api.get(`/checkpoints/session/${sessionId}`),
  update:    (id, data)          => api.put(`/checkpoints/${id}`, data),
  remove:    (id)                => api.delete(`/checkpoints/${id}`),
};

export const tasks = {
  generate:  (checkpointId, teamId, lat, lng, bypass = false) => 
    api.get(`/task/${checkpointId}/${teamId}`, { params: { lat, lng, bypass } }),
};

export const hints = {
  get:       (data)              => api.post('/hint', data),
};

export const completions = {
  submit:    (data)              => api.post('/complete', data),
  getByTeam: (teamId)            => api.get(`/completions/${teamId}`),
  delete:    (data)              => api.post('/completions/delete', data),
};

export const reports = {
  generate:  (sessionId)         => api.get(`/report/${sessionId}`),
};

export const locations = {
  update:    (data)              => api.post('/location', data),
};
