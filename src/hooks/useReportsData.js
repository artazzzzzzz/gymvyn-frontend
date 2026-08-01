import { supabase } from '../utils/supabase';

const BASE = import.meta.env.VITE_API_URL;

async function getToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function reportsFetch(path) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function rangeParams(from, to) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export const fetchSummary = (gymId, from, to) =>
  reportsFetch(`/api/reports/${gymId}/summary${rangeParams(from, to)}`);

export const fetchRevenueTrend = (gymId, from, to) =>
  reportsFetch(`/api/reports/${gymId}/revenue-trend${rangeParams(from, to)}`);

export const fetchTopMembers = (gymId, from, to) =>
  reportsFetch(`/api/reports/${gymId}/top-members${rangeParams(from, to)}`);

export const fetchTrainerPerformance = (gymId, from, to) =>
  reportsFetch(`/api/reports/${gymId}/trainer-performance${rangeParams(from, to)}`);

export const fetchAttendance = (gymId, from, to) =>
  reportsFetch(`/api/reports/${gymId}/attendance${rangeParams(from, to)}`);

export const fetchChurnRisk = (gymId) =>
  reportsFetch(`/api/reports/${gymId}/churn-risk`);
