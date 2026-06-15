import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import AuthRoute from './components/AuthRoute'
import GymOwnerRoute from './components/GymOwnerRoute'
import ConsumerLayout from './components/ConsumerLayout'
import TrainerLayout from './components/TrainerLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RoleSelect from './pages/RoleSelect'
import Onboarding from './pages/Onboarding'
import Home from './pages/Home'
import Workout from './pages/Workout'
import Diet from './pages/Diet'
import Progress from './pages/Progress'
import Community from './pages/Community'
import FormCoach from './pages/FormCoach'
import BecomeGymOwner from './pages/gym/BecomeGymOwner'
import GymOnboarding from './pages/gym/GymOnboarding'
import MyGym from './pages/MyGym'
import GymDashboard from './pages/gym/GymDashboard'
import GymMembers from './pages/gym/GymMembers'
import GymMemberDetail from './pages/gym/GymMemberDetail'
import GymImport from './pages/GymImport'
import GymPayments from './pages/gym/GymPayments'
import GymSchedule from './pages/gym/GymSchedule'
import GymAnnouncements from './pages/GymAnnouncements'
import GymTrainers from './pages/gym/GymTrainers'
import GymSettings from './pages/gym/GymSettings'
import GymCheckin from './pages/gym/GymCheckin'
import GymInsights from './pages/gym/GymInsights'
import GymComingSoon from './pages/GymComingSoon'
import ExerciseLibrary from './pages/ExerciseLibrary'
import ExerciseDetail from './pages/ExerciseDetail'
import LiveSession from './pages/LiveSession'
import WorkoutSummary from './pages/WorkoutSummary'
import BecomeTrainer from './pages/BecomeTrainer'
import TrainerDashboard from './pages/TrainerDashboard'
import TrainerClientDetail from './pages/TrainerClientDetail'
import MyTrainer from './pages/MyTrainer'
import TrainerTemplates from './pages/TrainerTemplates'
import TrainerTemplateBuilder from './pages/TrainerTemplateBuilder'
import TrainerAssignPlan from './pages/TrainerAssignPlan'
import TrainerClients from './pages/TrainerClients'
import TrainerChatPage from './pages/TrainerChatPage'
import ClientChatPage from './pages/ClientChatPage'
import TrainerSettings from './pages/TrainerSettings'
import TrainerDietBuilder from './pages/TrainerDietBuilder'
import UserPlanBuilder from './pages/UserPlanBuilder'
import Settings from './pages/Settings'
import Chat from './pages/Chat'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* DEV PREVIEW — remove before shipping */}
          <Route path="/preview-exercise" element={<ExerciseDetail />} />

          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"        element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup"       element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/role-select"  element={<AuthRoute><RoleSelect /></AuthRoute>} />
          <Route path="/onboarding"   element={<AuthRoute><Onboarding /></AuthRoute>} />

          {/* Consumer routes — share BottomNav via ConsumerLayout */}
          <Route element={<ProtectedRoute><ConsumerLayout /></ProtectedRoute>}>
            <Route path="/home"                           element={<Home />} />
            <Route path="/workout"                        element={<Workout />} />
            <Route path="/workout/plans/new"              element={<UserPlanBuilder />} />
            <Route path="/workout/plans/:planId/edit"     element={<UserPlanBuilder />} />
            <Route path="/exercise-library"               element={<ExerciseLibrary />} />
            <Route path="/exercise/:name"                 element={<ExerciseDetail />} />
            <Route path="/diet"                           element={<Diet />} />
            <Route path="/progress"                       element={<Progress />} />
            <Route path="/community"                      element={<Community />} />
            <Route path="/form-coach"                     element={<FormCoach />} />
            <Route path="/my-gym"                         element={<MyGym />} />
            <Route path="/my-trainer"                     element={<MyTrainer />} />
            <Route path="/client/chat"                    element={<ClientChatPage />} />
            <Route path="/chat"                           element={<Chat />} />
            <Route path="/settings"                       element={<Settings />} />
          </Route>

          {/* Full-screen consumer routes — no BottomNav */}
          <Route path="/workout/live"
            element={<ProtectedRoute><LiveSession /></ProtectedRoute>}
          />
          <Route path="/workout/summary"
            element={<ProtectedRoute><WorkoutSummary /></ProtectedRoute>}
          />

          {/* Gym owner flow */}
          <Route path="/become-gym-owner" element={<ProtectedRoute><BecomeGymOwner /></ProtectedRoute>} />
          <Route path="/gym-onboarding"   element={<AuthRoute><GymOnboarding /></AuthRoute>} />
          <Route path="/gym/dashboard"    element={<GymOwnerRoute><GymDashboard /></GymOwnerRoute>} />
          <Route path="/gym/members"             element={<GymOwnerRoute><GymMembers /></GymOwnerRoute>} />
          <Route path="/gym/members/:memberId"   element={<GymOwnerRoute><GymMemberDetail /></GymOwnerRoute>} />
          <Route path="/gym/import"              element={<GymOwnerRoute><GymImport /></GymOwnerRoute>} />
          <Route path="/gym/payments"     element={<GymOwnerRoute><GymPayments /></GymOwnerRoute>} />
          <Route path="/gym/schedule"     element={<GymOwnerRoute><GymSchedule /></GymOwnerRoute>} />
          <Route path="/gym/announcements" element={<GymOwnerRoute><GymAnnouncements /></GymOwnerRoute>} />
          <Route path="/gym/trainers"     element={<GymOwnerRoute><GymTrainers /></GymOwnerRoute>} />
          <Route path="/gym/settings"     element={<GymOwnerRoute><GymSettings /></GymOwnerRoute>} />
          <Route path="/gym/checkin"      element={<GymOwnerRoute><GymCheckin /></GymOwnerRoute>} />
          <Route path="/gym/checkins"     element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />
          <Route path="/gym/insights"     element={<GymOwnerRoute><GymInsights /></GymOwnerRoute>} />
          <Route path="/gym/profile"      element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />

          {/* Trainer routes — shared nav via TrainerLayout */}
          <Route path="/become-trainer" element={<AuthRoute><BecomeTrainer /></AuthRoute>} />
          <Route element={<ProtectedRoute><TrainerLayout /></ProtectedRoute>}>
            <Route path="/trainer/dashboard"        element={<TrainerDashboard />} />
            <Route path="/trainer/clients"          element={<TrainerClients />} />
            <Route path="/trainer/client/:clientId" element={<TrainerClientDetail />} />
            <Route path="/trainer/templates"        element={<TrainerTemplates />} />
            <Route path="/trainer/assign-plan"      element={<TrainerAssignPlan />} />
            <Route path="/trainer/settings"         element={<TrainerSettings />} />
            <Route path="/trainer/chat"             element={<TrainerChatPage />} />
            <Route path="/trainer/chat/:convoId"    element={<TrainerChatPage />} />
            <Route path="/trainer/exercise-library" element={<ExerciseLibrary />} />
            <Route path="/trainer/exercise/:name"   element={<ExerciseDetail />} />
          </Route>

          {/* Full-screen trainer editors — no nav */}
          <Route path="/trainer/templates/new"                   element={<ProtectedRoute><TrainerTemplateBuilder /></ProtectedRoute>} />
          <Route path="/trainer/templates/:templateId/edit"      element={<ProtectedRoute><TrainerTemplateBuilder /></ProtectedRoute>} />
          <Route path="/trainer/diet-templates/new"              element={<ProtectedRoute><TrainerDietBuilder /></ProtectedRoute>} />
          <Route path="/trainer/diet-templates/:templateId/edit" element={<ProtectedRoute><TrainerDietBuilder /></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
