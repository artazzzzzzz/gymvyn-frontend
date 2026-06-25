import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase';

const BASE = import.meta.env.VITE_API_URL || '';

export function useAssignedDietPlan() {
  const [plan, setPlan] = useState(undefined); // undefined = loading, null = no plan
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch(`${BASE}/api/diet-plans/my-plan`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (res.status === 404 || res.status === 204) {
        setPlan(null);
        return;
      }
      const data = await res.json().catch(() => null);
      setPlan(res.ok ? (data || null) : null);
    } catch (err) {
      setError(err);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  return { plan, loading, error, refetch: fetchPlan };
}
