import { supabase } from './supabase';

// Normalize the backend URL so a misconfigured env var (missing scheme, trailing
// slash) cannot cause every API call to land on the Vercel SPA host and 405.
function normalizeApiBase(raw) {
  if (!raw) throw new Error('VITE_API_URL is not set');
  let url = String(raw).trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, '');
}

const BASE_URL = normalizeApiBase(import.meta.env.VITE_API_URL);

export async function apiFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// ── Gym owner ────────────────────────────────────────────────────────────────

export async function createGym({ userId, gymName, address, city, state, pincode, phone, email }) {
  const res = await fetch(`${BASE_URL}/api/gyms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, gymName, address, city, state, pincode, phone, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to create gym (${res.status})`);
  return data;
}

export async function getGymByUserId(userId) {
  const res = await fetch(`${BASE_URL}/api/gyms/${userId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch gym (${res.status})`);
  return data;
}

// ── Gym member management ────────────────────────────────────────────────────

export async function getGymMembers(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-members?gymId=${encodeURIComponent(gymId)}`)
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch members (${res.status})`)
  return Array.isArray(data) ? data : (data?.members ?? [])
}

export async function addGymMember({
  gymId, fullName, phone, membershipType, monthlyFee,
  startDate, assignedTrainerId, notes,
}) {
  const res = await fetch(`${BASE_URL}/api/gym-members`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gymId, fullName, phone, membershipType, monthlyFee,
      startDate, assignedTrainerId, notes,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to add member (${res.status})`);
  return data;
}

export async function getGymTrainers(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-trainers/${gymId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch trainers (${res.status})`);
  return data || [];
}

export async function inviteTrainer({ gymId, fullName, phone, bio, specialties, hourlyRate }) {
  const res = await fetch(`${BASE_URL}/api/gym-trainers/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gym_id: gymId, full_name: fullName, phone, bio, specialties,
      hourly_rate: hourlyRate,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to invite trainer (${res.status})`);
  return data;
}

export async function removeTrainer(trainerId) {
  const res = await fetch(`${BASE_URL}/api/gym-trainers/${trainerId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to remove trainer (${res.status})`);
  return data;
}

export async function assignTrainer(memberId, trainerId) {
  const res = await fetch(`${BASE_URL}/api/gym-members/${memberId}/assign-trainer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trainer_id: trainerId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to assign trainer (${res.status})`);
  return data;
}

// ── Gym payments ─────────────────────────────────────────────────────────────

export async function getGymPayments(gymId, status) {
  const qs = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
  const res = await fetch(`${BASE_URL}/api/gym-payments/${gymId}${qs}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch payments (${res.status})`);
  return data || [];
}

export async function markPaymentPaid(paymentId, method, notes) {
  const res = await fetch(`${BASE_URL}/api/gym-payments/${paymentId}/mark-paid`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payment_method: method, notes }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to mark paid (${res.status})`);
  return data;
}

export async function recordPayment({ gymId, userId, membershipId, amount, dueDate, notes }) {
  const res = await fetch(`${BASE_URL}/api/gym-payments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gym_id: gymId,
      user_id: userId,
      membership_id: membershipId,
      amount,
      due_date: dueDate,
      notes,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to record payment (${res.status})`);
  return data;
}

// ── Class schedule ───────────────────────────────────────────────────────────

export async function getGymSchedule(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-schedule/${gymId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch schedule (${res.status})`);
  return data || [];
}

export async function addGymClass({
  gymId, className, description, trainerId,
  dayOfWeek, startTime, endTime, capacity,
}) {
  const res = await fetch(`${BASE_URL}/api/gym-schedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gym_id: gymId,
      class_name: className,
      description,
      trainer_id: trainerId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      capacity,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to add class (${res.status})`);
  return data;
}

export async function deleteGymClass(classId) {
  const res = await fetch(`${BASE_URL}/api/gym-schedule/${classId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to delete class (${res.status})`);
  return data;
}

// Member-facing: classes for a single day. Returns { date, classes: [...] }.
export async function getClassesByDate(gymId, date) {
  const res = await fetch(`${BASE_URL}/api/gym-schedule/${gymId}?date=${encodeURIComponent(date)}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch classes (${res.status})`);
  return data || { date, classes: [] };
}

// ── Announcements ────────────────────────────────────────────────────────────

export async function getGymAnnouncements(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-announcements/${gymId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch announcements (${res.status})`);
  return data || [];
}

export async function postAnnouncement({ gymId, postedBy, title, body, priority }) {
  const res = await fetch(`${BASE_URL}/api/gym-announcements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      gym_id: gymId,
      posted_by: postedBy,
      title,
      body,
      priority,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to post announcement (${res.status})`);
  return data;
}

export async function deleteAnnouncement(announcementId) {
  const res = await fetch(`${BASE_URL}/api/gym-announcements/${announcementId}`, { method: 'DELETE' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to delete announcement (${res.status})`);
  return data;
}

// ── Gym settings ─────────────────────────────────────────────────────────────

export async function getGymSettings(gymId) {
  const res = await fetch(`${BASE_URL}/api/gyms/${gymId}/settings`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch settings (${res.status})`);
  return data;
}

export async function updateGymSettings(gymId, updates) {
  const res = await fetch(`${BASE_URL}/api/gyms/${gymId}/settings`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to update settings (${res.status})`);
  return data;
}

export async function uploadGymLogo(gymId, file) {
  const form = new FormData();
  form.append('logo', file);
  const res = await fetch(`${BASE_URL}/api/gyms/${gymId}/upload-logo`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to upload logo (${res.status})`);
  return data;
}

// ── QR check-in ──────────────────────────────────────────────────────────────

export async function getGymQR(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-qr/${gymId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Failed to fetch QR (${res.status})`);
  return data;
}

export async function checkInMember(userId, gymId, method = 'manual') {
  const res = await fetch(`${BASE_URL}/api/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, gymId, method }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Failed to check in (${res.status})`);
  return data;
}

export async function checkOutMember(userId, gymId) {
  const res = await fetch(`${BASE_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, gymId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Failed to check out (${res.status})`);
  return data;
}

export async function getGymOccupancy(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-occupancy/${gymId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && (data.error || data.message)) || `Failed to fetch occupancy (${res.status})`);
  return data;
}

// ── Churn insights — legacy rule-based (kept for compatibility) ──────────────

export async function runChurnAnalysis(gymId) {
  const res = await fetch(`${BASE_URL}/api/gym-churn/score/${gymId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Failed to run analysis (${res.status})`);
  return data;
}

// ── ML-powered churn (XGBoost) ───────────────────────────────────────────────

export async function getMlStatus() {
  const res = await fetch(`${BASE_URL}/api/ml/status`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to fetch ML status`);
  return data;
}

export async function scoreGym(gymId) {
  const res = await fetch(`${BASE_URL}/api/ml/score/${gymId}`, { method: 'POST' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to score gym`);
  return data;
}

export async function getChurnScores(gymId) {
  const res = await fetch(`${BASE_URL}/api/ml/scores/${gymId}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Failed to fetch churn scores`);
  return data;
}

// ── Consumer side: My Gym ────────────────────────────────────────────────────

export async function getMyGym(userId) {
  const res = await fetch(`${BASE_URL}/api/my-gym/${userId}`);
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error((data && data.message) || `Failed to fetch gym (${res.status})`);
  return data || { linked: false };
}

export async function joinGym(userId, joinCode) {
  const res = await fetch(`${BASE_URL}/api/gym-join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, join_code: joinCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Failed to join gym (${res.status})`);
  return data;
}

// ── Diet & Macros ────────────────────────────────────────────────────────────

async function dietRequest(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

export const calculateMacros = (userId) =>
  dietRequest('/api/macros/calculate', { method: 'POST', body: { userId } });

export const getMacros = (userId) =>
  dietRequest(`/api/macros/${userId}`);

export const searchFood = (query) =>
  dietRequest(`/api/food-search?q=${encodeURIComponent(query)}`);

export const logFood = (data) =>
  dietRequest('/api/food-logs', { method: 'POST', body: data });

export const getFoodLogs = (userId, date) =>
  dietRequest(`/api/food-logs/${userId}?date=${encodeURIComponent(date)}`);

export const deleteFoodLog = (logId) =>
  dietRequest(`/api/food-logs/${logId}`, { method: 'DELETE' });

export const logFoodByVoice = (data) =>
  dietRequest('/api/food-logs/voice', { method: 'POST', body: data });

export const logFoodByCamera = (data) =>
  dietRequest('/api/food-logs/camera', { method: 'POST', body: data });

export const generateDietPlan = (data) =>
  dietRequest('/api/diet-plan/generate', { method: 'POST', body: data });

export const getDietPlan = (userId) =>
  dietRequest(`/api/diet-plan/${userId}`);

export const createCustomMeal = (data) =>
  dietRequest('/api/custom-meals', { method: 'POST', body: data });

export const getCustomMeals = (userId) =>
  dietRequest(`/api/custom-meals/${userId}`);

export const deleteCustomMeal = (mealId) =>
  dietRequest(`/api/custom-meals/${mealId}`, { method: 'DELETE' });

// ── Workout session ──────────────────────────────────────────────────────────

// Route the finish call through the backend (service-role key) to avoid the
// PostgREST schema-cache error on workout_logs.exercises (JSONB column).
export const finishWorkout = (data) =>
  apiFetch('/api/workout/finish', { method: 'POST', body: JSON.stringify(data) });

// ── XP / Gamification ────────────────────────────────────────────────────────

async function xpFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || `Request failed (${res.status})`);
  return data;
}

export const getXPProfile        = ()                  => xpFetch('/api/xp/profile');
export const getXPEvents         = (page = 1, limit = 20) => xpFetch(`/api/xp/events?page=${page}&limit=${limit}`);
export const getXPLeaderboard    = (type)              => xpFetch(`/api/xp/leaderboard/${type}`);
export const useStreakFreeze     = ()                  => xpFetch('/api/xp/freeze', { method: 'POST' });
export const getXPChallenges     = ()                  => xpFetch('/api/xp/challenges');
export const getMuscleBalance    = ()                  => xpFetch('/api/xp/muscle-balance');
export const getActiveSeason     = ()                  => xpFetch('/api/xp/season');

// ── Class bookings (consumer) ──────────────────────────────────────────────────

export const getMyClassBookings  = ()        => xpFetch('/api/class-bookings/my');
export const bookClass           = (classId) => xpFetch(`/api/class-bookings/${classId}`, { method: 'POST' });
export const cancelClassBooking  = (classId) => xpFetch(`/api/class-bookings/${classId}`, { method: 'DELETE' });

// ── Workout editing ────────────────────────────────────────────────────────────

export const updateWorkoutSet = (setId, userId, weight_kg, reps) =>
  apiFetch(`/api/workout-sets/${setId}`, {
    method: 'PUT',
    body: JSON.stringify({ userId, weight_kg, reps }),
  });

export const deleteWorkoutSet = (setId, userId) =>
  apiFetch(`/api/workout-sets/${setId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });

export const deleteWorkout = (workoutId, userId) =>
  apiFetch(`/api/workouts/${workoutId}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  });
