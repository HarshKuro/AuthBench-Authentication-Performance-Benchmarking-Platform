const API_BASE = '/api/v1';

export const api = {
  // Overview
  async getOverview() {
    const res = await fetch(`${API_BASE}/analytics/overview`);
    return res.json();
  },

  // Experiments
  async getExperiments() {
    const res = await fetch(`${API_BASE}/benchmark/experiments`);
    return res.json();
  },

  async createExperiment(data: any) {
    const res = await fetch(`${API_BASE}/benchmark/experiment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },

  async runExperiment(id: string) {
    const res = await fetch(`${API_BASE}/benchmark/run/${id}`, { method: 'POST' });
    return res.json();
  },

  async abortExperiment(id: string) {
    const res = await fetch(`${API_BASE}/benchmark/abort/${id}`, { method: 'POST' });
    return res.json();
  },

  async runQuickSuite(targetVUs = 10, durationSec = 5) {
    const res = await fetch(`${API_BASE}/benchmark/quick-suite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetVUs, durationSec }),
    });
    return res.json();
  },

  // Analytics
  async getComparison() {
    const res = await fetch(`${API_BASE}/analytics/comparison`);
    return res.json();
  },

  async getScalability() {
    const res = await fetch(`${API_BASE}/analytics/scalability`);
    return res.json();
  },

  async getBottlenecks() {
    const res = await fetch(`${API_BASE}/analytics/bottlenecks`);
    return res.json();
  },

  async getTraces(method?: string, page = 1, limit = 25) {
    const url = `${API_BASE}/analytics/traces?page=${page}&limit=${limit}${method ? `&method=${method}` : ''}`;
    const res = await fetch(url);
    return res.json();
  },

  async getTraceDetails(traceId: string) {
    const res = await fetch(`${API_BASE}/analytics/trace/${traceId}`);
    return res.json();
  },

  async getStatisticalTests() {
    const res = await fetch(`${API_BASE}/analytics/statistical-tests`);
    return res.json();
  },

  async getExport() {
    const res = await fetch(`${API_BASE}/analytics/export`);
    return res.json();
  },

  // Interactive Auth Testing for Human Lab
  async generateQR(username: string) {
    const res = await fetch(`${API_BASE}/auth/qr/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  },

  async verifyQR(challengeToken: string, deviceSignature: string) {
    const res = await fetch(`${API_BASE}/auth/qr/scan-verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, deviceSignature }),
    });
    return res.json();
  },

  async requestOTP(username: string) {
    const res = await fetch(`${API_BASE}/auth/otp/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  },

  async verifyOTP(challengeToken: string, code: string) {
    const res = await fetch(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeToken, code }),
    });
    return res.json();
  },

  async initiateQROTP(username: string) {
    const res = await fetch(`${API_BASE}/auth/qr-otp/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    return res.json();
  },

  async verifyQROTP(qrChallengeToken: string, otpChallengeToken: string, code: string, deviceSignature: string) {
    const res = await fetch(`${API_BASE}/auth/qr-otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrChallengeToken, otpChallengeToken, code, deviceSignature }),
    });
    return res.json();
  },

  async logHumanTrial(trialData: any) {
    const res = await fetch(`${API_BASE}/auth/human-trial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trialData),
    });
    return res.json();
  }
};
