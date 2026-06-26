import { useState, useEffect } from 'react'
import { EXERCISE_DATABASE } from '../../data/exerciseDatabase'
import { supabase } from '../../utils/supabase'
import { GOAL_LABELS, EXPERIENCE_LABELS } from './onboardingConfig'

const GOAL_MUSCLES = {
  muscle:       ['Chest', 'Back', 'Shoulders'],
  weight_loss:  ['Cardio', 'Core/Abs', 'Legs'],
  fitness:      ['Cardio', 'Back', 'Core/Abs'],
  performance:  ['Legs', 'Back', 'Shoulders'],
  health:       ['Core/Abs', 'Back', 'Chest'],
}

const EXP_DIFFICULTY = {
  beginner:     'Beginner',
  returning:    'Beginner',
  intermediate: 'Intermediate',
  advanced:     'Advanced',
}

function pickSampleExercises(goal, experience) {
  const muscles = GOAL_MUSCLES[goal] || ['Chest', 'Back', 'Core/Abs']
  const difficulty = EXP_DIFFICULTY[experience] || 'Beginner'

  const pool = EXERCISE_DATABASE.filter(
    ex => muscles.some(m => ex.muscle?.startsWith(m))
      && ex.difficulty === difficulty
  )
  const fallback = EXERCISE_DATABASE.filter(
    ex => muscles.some(m => ex.muscle?.startsWith(m))
  )

  const source = pool.length >= 3 ? pool : fallback
  const shuffled = [...source].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, 3)
}

export default function ScreenPreview({ answers, onNext, onBack }) {
  const { goals, experience, trainingDays } = answers
  const goal = goals?.[0] ?? ''
  const [exercises] = useState(() => pickSampleExercises(goal, experience))
  const [thumbnails, setThumbnails] = useState({})

  useEffect(() => {
    if (!exercises.length) return
    const names = exercises.map(e => e.name)
    supabase
      .from('exercise_metadata')
      .select('exercise_name, thumbnail_url')
      .in('exercise_name', names)
      .then(({ data }) => {
        if (data) {
          const map = {}
          data.forEach(row => {
            if (row.thumbnail_url) map[row.exercise_name] = row.thumbnail_url
          })
          setThumbnails(map)
        }
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const goalLabel = GOAL_LABELS[goal] || goal  // used in workout card title
  const expLabel = EXPERIENCE_LABELS[experience] || experience
  const monthlyCount = Math.round(trainingDays * 4 * 3)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      <button
        onClick={onBack}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: 24,
          padding: '20px 0 0', alignSelf: 'flex-start', lineHeight: 1,
        }}
        aria-label="Go back"
      >←</button>

      <div style={{ paddingTop: 20, paddingBottom: 20 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 800, lineHeight: 1.15,
          color: 'var(--text-primary)', margin: '0 0 8px',
          letterSpacing: '-0.3px',
        }}>
          Your Gymvyn is ready.
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-secondary)', margin: 0 }}>
          Here's a taste of what's waiting for you.
        </p>
      </div>

      {/* Summary chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', gap: 8,
        paddingBottom: 20,
      }}>
        {[
          ...(goals || []).map(g => GOAL_LABELS[g] || g),
          `${trainingDays}x / week`,
          expLabel,
        ].map(chip => (
          <span key={chip} style={{
            fontSize: 13, fontWeight: 600,
            backgroundColor: 'var(--bg-pill)',
            color: 'var(--text-primary)',
            borderRadius: 20,
            padding: '5px 12px',
            border: '1px solid var(--border)',
          }}>{chip}</span>
        ))}
      </div>

      {/* Sample workout card */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        overflow: 'hidden',
        flex: 1,
        marginBottom: 16,
      }}>
        <div style={{ padding: '16px 16px 12px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Sample workout
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            Day 1 — {goalLabel}
          </div>
        </div>

        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {exercises.map((ex, i) => (
            <div key={ex.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              backgroundColor: 'var(--bg-primary)',
              borderRadius: 12,
              border: '1px solid var(--border)',
            }}>
              {thumbnails[ex.name] ? (
                <img
                  src={thumbnails[ex.name]}
                  alt={ex.name}
                  style={{ width: 40, height: 40, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 40, height: 40, borderRadius: 8,
                  backgroundColor: 'var(--bg-elevated)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 18,
                }}>
                  {['💪', '🏋️', '🔥'][i % 3]}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--text-primary)', lineHeight: 1.2,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>{ex.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
                  {ex.muscle} · 3 sets
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border)',
          backgroundColor: 'var(--bg-elevated)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontSize: 16 }}>📊</span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
            You'll log ~{monthlyCount} exercises in your first month
          </span>
        </div>
      </div>

      <div style={{ paddingBottom: 48 }}>
        <button
          onClick={onNext}
          style={{
            width: '100%',
            padding: '17px 24px',
            backgroundColor: 'var(--text-cta)',
            color: 'var(--bg-primary)',
            border: 'none',
            borderRadius: 14,
            fontSize: 17,
            fontWeight: 700,
            cursor: 'pointer',
            letterSpacing: '-0.2px',
          }}
        >
          Looks good
        </button>
      </div>
    </div>
  )
}
