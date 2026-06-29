import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Brain, BarChart3, Users, ArrowRight, ArrowLeft } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../utils/supabase'

function Spinner() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

const features = [
  {
    icon: Brain,
    iconColor: 'text-violet-400',
    iconBg: 'bg-violet-500/10',
    title: 'AI Churn Prediction',
    body: 'Know who’s leaving 3 weeks before they do',
  },
  {
    icon: BarChart3,
    iconColor: 'text-[var(--success)]',
    iconBg: 'bg-[var(--success-bg)]',
    title: 'Live Dashboard',
    body: 'Real-time occupancy, revenue, and member health',
  },
  {
    icon: Users,
    iconColor: 'text-[var(--warning)]',
    iconBg: 'bg-[var(--warning-bg)]',
    title: 'Member Management',
    body: 'Bulk import, payments, classes, announcements',
  },
]

export default function BecomeGymOwner() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!user) {
        setChecking(false)
        return
      }
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (cancelled) return
      if (data?.role === 'gym_owner') setIsOwner(true)
      setChecking(false)
    }
    check()
    return () => { cancelled = true }
  }, [user])

  if (loading || checking) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (isOwner) return <Navigate to="/gym/dashboard" replace />

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] overflow-x-hidden">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] halo-decoration bg-[rgba(212,181,117,0.08)] blur-[120px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-3xl mx-auto px-5 py-16 sm:py-24">
        {/* Back link */}
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors text-sm mb-12"
        >
          <ArrowLeft size={14} />
          Back to Gymvyn
        </Link>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-[var(--bg-hover)] border border-[var(--border)] rounded-full px-3.5 py-1.5 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
            <span className="text-[var(--success)] text-xs font-semibold tracking-wide">FOR GYM OWNERS</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] tracking-tight leading-tight mb-4">
            Run your gym <span className="text-[var(--success)]">intelligently.</span>
          </h1>
          <p className="text-[var(--text-secondary)] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Get AI churn prediction, live occupancy, member management, and trainer metrics — all in one dashboard.
            Your members get the full Gymvyn app for free.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {features.map(({ icon: Icon, iconColor, iconBg, title, body }) => (
            <div
              key={title}
              className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-strong)] transition-colors duration-150"
            >
              <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-4`}>
                <Icon size={18} className={iconColor} />
              </div>
              <p className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{title}</p>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Pricing glass card */}
        <div className="bg-[var(--bg-hover)] backdrop-blur-sm border border-[var(--border)] rounded-2xl p-6 mb-10 text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Starter <span className="text-[var(--success)]">₹2,000</span>/mo · Growth <span className="text-[var(--success)]">₹4,000</span>/mo · Pro <span className="text-[var(--success)]">₹8,000</span>/mo
          </p>
          <p className="text-xs text-[var(--text-tertiary)]">Free 30-day trial · No credit card · Cancel anytime</p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button
            onClick={() => navigate('/gym-onboarding')}
            className="inline-flex items-center gap-2 bg-[var(--success)] hover:bg-[var(--success)] text-[var(--text-primary)] font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl transition-all duration-150 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
          >
            Register My Gym
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
