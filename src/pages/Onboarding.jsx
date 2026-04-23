import { useNavigate } from 'react-router-dom'

export default function Onboarding() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0c0c0e] flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-lg relative text-center">
        <div className="inline-flex items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            FitForge <span className="text-emerald-400">AI</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">
          Let&apos;s get you set up
        </h1>
        <p className="text-zinc-400 mb-12">
          Tell us about yourself so we can personalize your experience.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { label: 'Lose weight', icon: '🔥' },
            { label: 'Build muscle', icon: '💪' },
            { label: 'Improve endurance', icon: '🏃' },
            { label: 'Stay active', icon: '⚡' },
          ].map(goal => (
            <button
              key={goal.label}
              className="bg-[#141416] border border-white/[0.06] hover:border-emerald-500/40 rounded-2xl p-5 text-left transition-all duration-200 group"
            >
              <span className="text-2xl mb-3 block">{goal.icon}</span>
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                {goal.label}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate('/home')}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition-all duration-200 text-sm"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
