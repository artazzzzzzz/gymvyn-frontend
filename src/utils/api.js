const BASE_URL = import.meta.env.VITE_API_URL;

export async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
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
