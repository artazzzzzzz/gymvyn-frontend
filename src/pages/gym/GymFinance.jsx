import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import GymBottomNav from '../../components/GymBottomNav'
import MoreSheet from '../../components/MoreSheet'
import GymPayments from './GymPayments'
import GymExpenses from './GymExpenses'
import GymTrainerPayouts from './GymTrainerPayouts'
import GymStaffSalary from './GymStaffSalary'
import GymInsights from './GymInsights'
import GymReports from './GymReports'

// ── Section routing ───────────────────────────────────────────────────────────
// A `?section=` deep-link key maps to a top-level tab + (optionally) an inner
// sub-section, so old routes/nav/dashboard links can target a specific view.

const SECTION_TO_TAB = {
  payments:         { tab: 'payments' },
  expenses:         { tab: 'money-out', sub: 'expenses' },
  'trainer-payouts':{ tab: 'money-out', sub: 'trainer-salary' },
  'staff-salary':   { tab: 'money-out', sub: 'staff-salary' },
  insights:         { tab: 'analytics', sub: 'insights' },
  reports:          { tab: 'analytics', sub: 'reports' },
}

const TABS = [
  { key: 'payments',  label: 'Payments' },
  { key: 'money-out', label: 'Expenses & Salary' },
  { key: 'analytics', label: 'Insights & Reports' },
]

const MONEY_OUT_SECTIONS = [
  { key: 'expenses',      label: 'Expenses' },
  { key: 'trainer-salary', label: 'Trainer Salary' },
  { key: 'staff-salary',   label: 'Staff Salary' },
]

const ANALYTICS_SECTIONS = [
  { key: 'insights', label: 'Insights' },
  { key: 'reports',  label: 'Reports' },
]

const HEADER_HEIGHT = 52
const TAB_ROW_HEIGHT = 48
const SUBTAB_ROW_HEIGHT = 44

export default function GymFinance() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const initial = SECTION_TO_TAB[searchParams.get('section')] || { tab: 'payments' }

  const [activeTab, setActiveTab] = useState(initial.tab)
  const [activeMoneyOutSection, setActiveMoneyOutSection] = useState(initial.sub && initial.tab === 'money-out' ? initial.sub : 'expenses')
  const [activeAnalyticsSection, setActiveAnalyticsSection] = useState(initial.sub && initial.tab === 'analytics' ? initial.sub : 'insights')
  const [moreOpen, setMoreOpen] = useState(false)

  function selectTab(tabKey) {
    setActiveTab(tabKey)
    const defaultSection =
      tabKey === 'payments' ? 'payments' :
      tabKey === 'money-out' ? (activeMoneyOutSection === 'trainer-salary' ? 'trainer-payouts' : activeMoneyOutSection === 'staff-salary' ? 'staff-salary' : 'expenses') :
      (activeAnalyticsSection === 'reports' ? 'reports' : 'insights')
    setSearchParams({ section: defaultSection }, { replace: true })
  }

  function selectMoneyOutSection(sectionKey) {
    setActiveMoneyOutSection(sectionKey)
    const section = sectionKey === 'trainer-salary' ? 'trainer-payouts' : sectionKey === 'staff-salary' ? 'staff-salary' : 'expenses'
    setSearchParams({ section }, { replace: true })
  }

  function selectAnalyticsSection(sectionKey) {
    setActiveAnalyticsSection(sectionKey)
    setSearchParams({ section: sectionKey }, { replace: true })
  }

  const showSubtabRow = activeTab === 'money-out' || activeTab === 'analytics'
  const topOffset = HEADER_HEIGHT + TAB_ROW_HEIGHT + (showSubtabRow ? SUBTAB_ROW_HEIGHT : 0)

  const subtabs = activeTab === 'money-out' ? MONEY_OUT_SECTIONS : activeTab === 'analytics' ? ANALYTICS_SECTIONS : []
  const activeSubtab = activeTab === 'money-out' ? activeMoneyOutSection : activeAnalyticsSection
  const onSelectSubtab = activeTab === 'money-out' ? selectMoneyOutSection : selectAnalyticsSection

  const content = useMemo(() => {
    if (activeTab === 'payments') return <GymPayments embedded topOffset={topOffset} />
    if (activeTab === 'money-out') {
      if (activeMoneyOutSection === 'trainer-salary') return <GymTrainerPayouts embedded topOffset={topOffset} />
      if (activeMoneyOutSection === 'staff-salary') return <GymStaffSalary embedded topOffset={topOffset} />
      return <GymExpenses embedded topOffset={topOffset} />
    }
    if (activeAnalyticsSection === 'reports') return <GymReports embedded />
    return <GymInsights embedded topOffset={topOffset} />
  }, [activeTab, activeMoneyOutSection, activeAnalyticsSection, topOffset])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 80 }}>

      {/* Title bar */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 4,
        height: HEADER_HEIGHT, boxSizing: 'border-box',
        position: 'sticky', top: 0, zIndex: 32,
      }}>
        <button onClick={() => navigate('/gym/dashboard')} style={{ background: 'none', border: 'none', padding: '4px 6px 4px 2px', cursor: 'pointer', display: 'flex' }}>
          <ChevronLeft size={22} color="var(--text-primary)" />
        </button>
        <span style={{ flex: 1, fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Finance</span>
      </div>

      {/* Top-level tabs */}
      <div style={{
        display: 'flex', background: 'var(--bg-card)', borderBottom: '0.5px solid rgba(0,0,0,0.08)',
        height: TAB_ROW_HEIGHT, boxSizing: 'border-box',
        position: 'sticky', top: HEADER_HEIGHT, zIndex: 31,
      }}>
        {TABS.map(t => {
          const active = activeTab === t.key
          return (
            <button
              key={t.key}
              onClick={() => selectTab(t.key)}
              style={{
                flex: 1, background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: active ? 700 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-tertiary)',
                borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Secondary segmented control */}
      {showSubtabRow && (
        <div style={{
          display: 'flex', gap: 8, padding: '6px 16px', background: 'var(--bg-primary)',
          height: SUBTAB_ROW_HEIGHT, boxSizing: 'border-box', alignItems: 'center', overflowX: 'auto',
          position: 'sticky', top: HEADER_HEIGHT + TAB_ROW_HEIGHT, zIndex: 30,
        }}>
          {subtabs.map(s => {
            const active = activeSubtab === s.key
            return (
              <button
                key={s.key}
                onClick={() => onSelectSubtab(s.key)}
                style={{
                  borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: 500,
                  whiteSpace: 'nowrap', cursor: 'pointer',
                  border: active ? 'none' : '0.5px solid var(--border)',
                  background: active ? 'var(--text-primary)' : 'var(--bg-card)',
                  color: active ? 'var(--bg-card)' : 'var(--text-secondary)',
                }}
              >
                {s.label}
              </button>
            )
          })}
        </div>
      )}

      {content}

      <GymBottomNav onMorePress={() => setMoreOpen(true)} />
      <MoreSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  )
}
