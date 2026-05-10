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
import MyGym from './pages/MyGym'
import GymDashboard from './pages/GymDashboard'
import GymMembers from './pages/GymMembers'
import GymMemberDetail from './pages/GymMemberDetail'
import GymImport from './pages/GymImport'
import GymPayments from './pages/GymPayments'
import GymSchedule from './pages/GymSchedule'
import GymAnnouncements from './pages/GymAnnouncements'
import GymTrainers from './pages/GymTrainers'
import GymSettings from './pages/GymSettings'
import GymComingSoon from './pages/GymComingSoon'

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
          <Route path="/my-gym"     element={protected_(MyGym)} />
          <Route path="/become-gym-owner" element={protected_(BecomeGymOwner)} />
          <Route path="/gym-onboarding"   element={protected_(GymOnboarding)} />
          <Route path="/gym/dashboard"    element={<GymOwnerRoute><GymDashboard /></GymOwnerRoute>} />
          <Route path="/gym/members"             element={<GymOwnerRoute><GymMembers /></GymOwnerRoute>} />
          <Route path="/gym/members/:memberId"   element={<GymOwnerRoute><GymMemberDetail /></GymOwnerRoute>} />
          <Route path="/gym/import"              element={<GymOwnerRoute><GymImport /></GymOwnerRoute>} />
          <Route path="/gym/payments"     element={<GymOwnerRoute><GymPayments /></GymOwnerRoute>} />
          <Route path="/gym/schedule"      element={<GymOwnerRoute><GymSchedule /></GymOwnerRoute>} />
          <Route path="/gym/announcements" element={<GymOwnerRoute><GymAnnouncements /></GymOwnerRoute>} />
          <Route path="/gym/trainers"      element={<GymOwnerRoute><GymTrainers /></GymOwnerRoute>} />
          <Route path="/gym/settings"      element={<GymOwnerRoute><GymSettings /></GymOwnerRoute>} />
          <Route path="/gym/checkins"     element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />
          <Route path="/gym/insights"     element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />
          <Route path="/gym/profile"      element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
