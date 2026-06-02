import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

export default function TrainerAssignPlan() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const preselectedClientId = searchParams.get('clientId');
  const preselectedTemplateId = searchParams.get('templateId');
  const preselectedType = searchParams.get('type') || 'workout';

  const [clients, setClients] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);

  const [selectedClient, setSelectedClient] = useState(preselectedClientId || '');
  const [selectedTemplate, setSelectedTemplate] = useState(preselectedTemplateId || '');
  const [planName, setPlanName] = useState('');
  const [notes, setNotes] = useState('');
  const [startsAt, setStartsAt] = useState(new Date().toISOString().split('T')[0]);
  const [endsAt, setEndsAt] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    loadData();
  }, [user?.id]);

  // Auto-fill plan name when template selected
  useEffect(() => {
    if (selectedTemplate) {
      const t = templates.find(t => t.id === selectedTemplate);
      if (t && !planName) setPlanName(t.name);
    }
  }, [selectedTemplate, templates]);

  const loadData = async () => {
    try {
      const [clientsRes, templatesRes] = await Promise.all([
        apiFetch(`/api/trainer/clients/${user.id}`),
        apiFetch(`/api/trainer/templates/${user.id}?type=${preselectedType}`)
      ]);
      const activeClients = (clientsRes || []).filter(c => c.status === 'active' && c.client_id);
      setClients(activeClients);
      setTemplates(templatesRes || []);

      // Auto-fill name if template preselected
      if (preselectedTemplateId && templatesRes?.length) {
        const t = templatesRes.find(x => x.id === preselectedTemplateId);
        if (t) setPlanName(t.name);
      }
    } catch (err) {
      console.error('Load assign data error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedClient) return alert('Select a client');
    if (!planName.trim()) return alert('Give the plan a name');

    setAssigning(true);
    try {
      const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

      await apiFetch('/api/trainer/assign-plan', {
        method: 'POST',
        body: JSON.stringify({
          trainerId: user.id,
          clientId: selectedClient,
          templateId: selectedTemplate || null,
          type: preselectedType,
          name: planName.trim(),
          planData: selectedTemplateData?.template_data || {},
          notes: notes.trim() || null,
          startsAt,
          endsAt: endsAt || null
        })
      });

      navigate(`/trainer/client/${selectedClient}`);
    } catch (err) {
      alert('Failed to assign plan');
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const selectedClientData = clients.find(c => c.client_id === selectedClient);
  const selectedTemplateData = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-36">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <button onClick={() => navigate(-1)} className="text-zinc-400 text-sm mb-3 flex items-center gap-1">
          ← Back
        </button>
        <h1 className="text-2xl font-bold">
          Assign {preselectedType === 'diet' ? 'Diet' : 'Workout'} Plan
        </h1>
        <p className="text-zinc-400 text-sm mt-0.5">
          {preselectedType === 'diet' ? '🍽️' : '🏋️'} Sending to a client
        </p>
      </div>

      <div className="px-5 space-y-5">
        {/* Client picker */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Client</label>
          {clients.length === 0 ? (
            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800 text-center">
              <p className="text-zinc-400 text-sm">No active clients yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clients.map(rel => (
                <button
                  key={rel.client_id}
                  onClick={() => setSelectedClient(rel.client_id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                    selectedClient === rel.client_id
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-emerald-400 font-bold text-sm">
                      {(rel.client?.full_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium">{rel.client?.full_name || 'Client'}</p>
                    <p className="text-xs text-zinc-500">{rel.client?.goal || '—'}</p>
                  </div>
                  {selectedClient === rel.client_id && (
                    <span className="ml-auto text-emerald-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Template picker */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            Template <span className="text-zinc-600">(optional)</span>
          </label>
          {templates.length === 0 ? (
            <button
              onClick={() => navigate('/trainer/templates/new')}
              className="w-full p-4 bg-zinc-900 border border-dashed border-zinc-700 rounded-xl text-zinc-400 text-sm text-center"
            >
              No templates yet — create one first
            </button>
          ) : (
            <div className="space-y-2">
              {/* No template option */}
              <button
                onClick={() => setSelectedTemplate('')}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  selectedTemplate === ''
                    ? 'border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900'
                }`}
              >
                <span className="text-zinc-400 text-sm">Custom plan (no template)</span>
                {selectedTemplate === '' && <span className="ml-auto text-zinc-400">✓</span>}
              </button>

              {templates.map(t => {
                const days = t.template_data?.days || [];
                const totalEx = days.reduce((s, d) => s + (d.exercises?.length || 0), 0);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplate(t.id)}
                    className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                      selectedTemplate === t.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-800 bg-zinc-900'
                    }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{t.name}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {days.length} days · {totalEx} exercises · {t.template_data?.difficulty || '—'}
                      </p>
                    </div>
                    {selectedTemplate === t.id && <span className="text-emerald-400">✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Plan name */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Plan name</label>
          <input
            type="text"
            placeholder="e.g. 4-Week Hypertrophy Program"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Start date</label>
            <input
              type="date"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-2">End date <span className="text-zinc-600">(optional)</span></label>
            <input
              type="date"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm text-zinc-400 mb-2">Notes for client <span className="text-zinc-600">(optional)</span></label>
          <textarea
            rows={3}
            placeholder="Any instructions, tips, or context for the client..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-none"
          />
        </div>

        {/* Summary card */}
        {selectedClient && planName && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
            <p className="text-emerald-400 text-sm font-medium mb-1">Ready to assign</p>
            <p className="text-sm text-zinc-300">
              <span className="text-white font-medium">{planName}</span>
              {' '}→{' '}
              <span className="text-white font-medium">{selectedClientData?.client?.full_name || 'Client'}</span>
            </p>
            {selectedTemplateData && (
              <p className="text-xs text-zinc-500 mt-1">
                Using template: {selectedTemplateData.name}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 p-5">
        <button
          onClick={handleAssign}
          disabled={!selectedClient || !planName.trim() || assigning}
          className="w-full py-4 bg-emerald-500 rounded-xl font-semibold text-base disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {assigning ? 'Assigning...' : `Assign to ${selectedClientData?.client?.full_name || 'Client'}`}
        </button>
      </div>
    </div>
  );
}
