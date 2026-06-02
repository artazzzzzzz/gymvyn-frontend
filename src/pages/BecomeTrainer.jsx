import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../utils/api';

const SPECIALIZATIONS = [
  'Weight Loss', 'Muscle Building', 'Powerlifting', 'CrossFit',
  'Calisthenics', 'Yoga', 'HIIT', 'Sports Performance',
  'Bodybuilding', 'Functional Training', 'Rehabilitation', 'Nutrition'
];

export default function BecomeTrainer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    isIndependent: true,
    bio: '',
    specializations: [],
    experienceYears: '',
    hourlyRate: '',
    phone: '',
    city: '',
    gymId: null
  });

  const updateForm = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const toggleSpec = (spec) => {
    setForm(prev => ({
      ...prev,
      specializations: prev.specializations.includes(spec)
        ? prev.specializations.filter(s => s !== spec)
        : [...prev.specializations, spec]
    }));
  };

  const handleSubmit = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await apiFetch('/api/trainer/onboard', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.id,
          ...form,
          experienceYears: parseInt(form.experienceYears) || 0,
          hourlyRate: parseFloat(form.hourlyRate) || null
        })
      });
      if (res.success) {
        navigate('/trainer/dashboard');
      }
    } catch (err) {
      console.error('Onboard error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="px-5 pt-12 pb-6">
        <p className="text-emerald-400 text-sm font-medium tracking-wider uppercase mb-2">
          Become a Trainer
        </p>
        <h1 className="text-2xl font-bold">
          {step === 1 && 'How do you train?'}
          {step === 2 && 'About you'}
          {step === 3 && 'Your specializations'}
          {step === 4 && 'Almost there'}
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Step {step} of 4</p>

        {/* Progress bar */}
        <div className="mt-4 h-1 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-5 pb-32">
        {/* Step 1: Trainer type */}
        {step === 1 && (
          <div className="space-y-4">
            <button
              onClick={() => updateForm('isIndependent', true)}
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                form.isIndependent
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🌐</span>
                <span className="font-semibold text-lg">Independent Trainer</span>
              </div>
              <p className="text-zinc-400 text-sm">
                Online PT or freelance trainer. Manage your own clients from anywhere.
              </p>
            </button>

            <button
              onClick={() => updateForm('isIndependent', false)}
              className={`w-full p-5 rounded-2xl border text-left transition-all ${
                !form.isIndependent
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-zinc-800 bg-zinc-900'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🏋️</span>
                <span className="font-semibold text-lg">Gym Trainer</span>
              </div>
              <p className="text-zinc-400 text-sm">
                Affiliated with a gym. Train members 1-on-1 inside a gym on FitForge.
              </p>
            </button>

            {!form.isIndependent && (
              <div className="mt-4">
                <label className="block text-sm text-zinc-400 mb-2">Gym Join Code</label>
                <input
                  type="text"
                  placeholder="Enter gym code from your owner"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                  onChange={(e) => updateForm('gymId', e.target.value)}
                />
                <p className="text-xs text-zinc-500 mt-1">Ask your gym owner for the code</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Basic info */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Your bio</label>
              <textarea
                rows={4}
                placeholder="Tell clients about your training philosophy, experience, achievements..."
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none resize-none"
                value={form.bio}
                onChange={(e) => updateForm('bio', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Experience (years)</label>
                <input
                  type="number"
                  placeholder="e.g. 3"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                  value={form.experienceYears}
                  onChange={(e) => updateForm('experienceYears', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Rate (₹/hour)</label>
                <input
                  type="number"
                  placeholder="e.g. 500"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                  value={form.hourlyRate}
                  onChange={(e) => updateForm('hourlyRate', e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                value={form.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">City</label>
              <input
                type="text"
                placeholder="e.g. Bhopal"
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder:text-zinc-600 focus:border-emerald-500 focus:outline-none"
                value={form.city}
                onChange={(e) => updateForm('city', e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Step 3: Specializations */}
        {step === 3 && (
          <div>
            <p className="text-zinc-400 text-sm mb-4">
              Pick your areas of expertise (select at least 1)
            </p>
            <div className="flex flex-wrap gap-2">
              {SPECIALIZATIONS.map(spec => (
                <button
                  key={spec}
                  onClick={() => toggleSpec(spec)}
                  className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all ${
                    form.specializations.includes(spec)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                  }`}
                >
                  {spec}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800">
              <h3 className="text-sm text-zinc-400 mb-3 uppercase tracking-wider">Review</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Type</span>
                  <span>{form.isIndependent ? 'Independent' : 'Gym Trainer'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Experience</span>
                  <span>{form.experienceYears || 0} years</span>
                </div>
                {form.hourlyRate && (
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Rate</span>
                    <span>₹{form.hourlyRate}/hr</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-zinc-400">City</span>
                  <span>{form.city || '—'}</span>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-2">Specializations</span>
                  <div className="flex flex-wrap gap-1.5">
                    {form.specializations.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 rounded-full text-xs">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                {form.bio && (
                  <div>
                    <span className="text-zinc-400 block mb-1">Bio</span>
                    <p className="text-sm text-zinc-300">{form.bio}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <p className="text-emerald-400 text-sm">
                After setup, you'll get a unique invite code to share with clients.
                They can join using the code in the app.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/90 backdrop-blur-lg border-t border-zinc-800 p-5 flex gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3.5 rounded-xl bg-zinc-800 text-white font-medium"
          >
            Back
          </button>
        )}
        {step < 4 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            disabled={step === 3 && form.specializations.length === 0}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 py-3.5 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-60"
          >
            {loading ? 'Setting up...' : 'Launch Trainer Profile 🚀'}
          </button>
        )}
      </div>
    </div>
  );
}
