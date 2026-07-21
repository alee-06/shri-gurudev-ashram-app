import donationApi from '../api/donationAxiosClient'

export const getDonationHeads = async () => {
  const { data } = await donationApi.get('/api/public/donation-heads');
  return data;
}

export const createDonation = async (body: unknown) => {
  const { data } = await donationApi.post('/api/donations/create', body);
  return data;
}

export const createDonationOrder = async (id: string) => {
  const { data } = await donationApi.post('/api/donations/create-order', { donationId: id });
  return data;
}

export const getDonationStatus = async (id: string) => {
  const { data } = await donationApi.get(`/api/donations/${id}/status`);
  return data;
}

export const getDonationHistory = async () => {
  const { data } = await donationApi.get('/api/donations/history');
  return data;
}

export const getCollectorDashboard = async () => {
  const { data } = await donationApi.get('/api/collector/dashboard');
  return data;
}

export const applyCollector = async (body: FormData) => {
  const { data } = await donationApi.post('/api/collector/apply', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export const reapplyCollector = async (body: FormData) => {
  const { data } = await donationApi.post('/api/collector/reapply', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export const getCollectorStatus = async () => {
  const { data } = await donationApi.get('/api/collector/status');
  return data;
}

export const getLeaderboard = async () => {
  const { data } = await donationApi.get('/api/collector/leaderboard');
  return data;
}

export const getRecentDonations = async () => {
  const { data } = await donationApi.get('/api/public/donations/recent');
  return data;
}

export const getTopDonors = async () => {
  const { data } = await donationApi.get('/api/public/donations/top');
  return data;
}

