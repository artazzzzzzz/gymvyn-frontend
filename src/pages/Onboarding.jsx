import { useState } from 'react'
import { STEPS, PROGRESS_SCREENS } from '../components/onboarding/onboardingConfig'
import OnboardingProgress from '../components/onboarding/OnboardingProgress'
import ScreenWelcome from '../components/onboarding/ScreenWelcome'
import ScreenGoal from '../components/onboarding/ScreenGoal'
import ScreenExperience from '../components/onboarding/ScreenExperience'
import ScreenFrequency from '../components/onboarding/ScreenFrequency'
import ScreenPriorities from '../components/onboarding/ScreenPriorities'
import ScreenBodyStats from '../components/onboarding/ScreenBodyStats'
import ScreenPreview from '../components/onboarding/ScreenPreview'
import ScreenProcessing from '../components/onboarding/ScreenProcessing'
import ScreenWelcomeHome from '../components/onboarding/ScreenWelcomeHome'
import ScreenDietGoal from '../components/onboarding/ScreenDietGoal'

const INITIAL_ANSWERS = {
  goals: [],       // multi-select; first item saved as `goal` in DB
  experience: '',
  trainingDays: 0,
  priorities: [],
  height: '',
  currentWeight: '',
  targetWeight: '',
  age: '',
  gender: '',
  dietGoal: '',
  activityLevel: '',
}

const SCREEN_MAP = {
  welcome:     ScreenWelcome,
  goal:        ScreenGoal,
  experience:  ScreenExperience,
  frequency:   ScreenFrequency,
  priorities:  ScreenPriorities,
  stats:       ScreenBodyStats,
  preview:     ScreenPreview,
  diet_goal:   ScreenDietGoal,
  processing:  ScreenProcessing,
  welcomehome: ScreenWelcomeHome,
}

export default function Onboarding() {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState(INITIAL_ANSWERS)
  const [animKey, setAnimKey] = useState(0)

  const currentStep = STEPS[stepIndex]
  const showProgress = PROGRESS_SCREENS.includes(currentStep)
  const progressIndex = PROGRESS_SCREENS.indexOf(currentStep) + 1
  const progressTotal = PROGRESS_SCREENS.length

  function goNext() {
    setAnimKey(k => k + 1)
    setStepIndex(i => Math.min(i + 1, STEPS.length - 1))
  }

  function goBack() {
    setAnimKey(k => k + 1)
    setStepIndex(i => Math.max(i - 1, 0))
  }

  function updateAnswer(key, value) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  const CurrentScreen = SCREEN_MAP[currentStep]

  return (
    <div style={{
      minHeight: '100dvh',
      backgroundColor: 'var(--bg-primary)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflowX: 'hidden',
    }}>
      {showProgress && (
        <OnboardingProgress current={progressIndex} total={progressTotal} />
      )}

      <div
        key={animKey}
        className="ob-enter"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '0 20px',
          maxWidth: 480,
          width: '100%',
          margin: '0 auto',
        }}
      >
        {CurrentScreen && (
          <CurrentScreen
            answers={answers}
            onNext={goNext}
            onBack={goBack}
            updateAnswer={updateAnswer}
            stepIndex={stepIndex}
          />
        )}
      </div>
    </div>
  )
}
