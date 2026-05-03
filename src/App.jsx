import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import AuthRoute from './components/AuthRoute'
import GymOwnerRoute from './components/GymOwnerRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Workout from './pages/Workout'
import Diet from './pages/Diet'
import Progress from './pages/Progress'
import Community from './pages/Community'
import FormCoach from './pages/FormCoach'
import BecomeGymOwner from './pages/BecomeGymOwner'
import GymOnboarding from './pages/GymOnboarding'
import GymDashboard from './pages/GymDashboard'

const protected_ = (Page) => (
  <ProtectedRoute><Page /></ProtectedRoute>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"      element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup"     element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/onboarding" element={<AuthRoute><Onboarding /></AuthRoute>} />
          <Route path="/home"       element={protected_(Home)} />
          <Route path="/workout"    element={protected_(Workout)} />
          <Route path="/diet"       element={protected_(Diet)} />
          <Route path="/progress"   element={protected_(Progress)} />
          <Route path="/community"  element={protected_(Community)} />
          <Route path="/form-coach" element={protected_(FormCoach)} />
          <Route path="/become-gym-owner" element={protected_(BecomeGymOwner)} />
          <Route path="/gym-onboarding"   element={protected_(GymOnboarding)} />
          <Route path="/gym/dashboard"    element={<GymOwnerRoute><GymDashboard /></GymOwnerRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
