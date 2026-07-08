import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import { ThemeProvider } from './contexts/ThemeContext'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import AuthRoute from './components/AuthRoute'
import GymOwnerRoute from './components/GymOwnerRoute'
import StaffRoute from './components/StaffRoute'
import ConsumerLayout from './components/ConsumerLayout'
import TrainerLayout from './components/TrainerLayout'
import StaffLayout from './layouts/StaffLayout'
import Login from './pages/Login'
import Signup from './pages/Signup'
import RoleSelect from './pages/RoleSelect'
import StaffOnboarding from './pages/StaffOnboarding'
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
import Classes from './pages/Classes'
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
import GymSupplements from './pages/gym/GymSupplements'
import GymExpenses from './pages/gym/GymExpenses'
import GymLockers from './pages/gym/GymLockers'
import GymStaff from './pages/gym/GymStaff'
import GymReports from './pages/gym/GymReports'
import GymEquipment from './pages/gym/GymEquipment'
import GymTrainerPayouts from './pages/gym/GymTrainerPayouts'
import GymChatPage from './pages/gym/GymChatPage'
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
import DirectDietPlanPage from './pages/trainer/DirectDietPlanPage'
import TrainerAIDietPlanEditor from './pages/TrainerAIDietPlanEditor'
import TrainerEarnings from './pages/trainer/TrainerEarnings'
import UserPlanBuilder from './pages/UserPlanBuilder'
import Settings from './pages/Settings'
import Chat from './pages/Chat'
import XPProfile from './pages/XPProfile'
import Leaderboard from './pages/Leaderboard'
import SupplementCatalog from './pages/SupplementCatalog'
import SupplementCart from './pages/SupplementCart'
import SupplementOrders from './pages/SupplementOrders'
import SupplementOrderDetail from './pages/SupplementOrderDetail'
import GymFeedPage from './pages/consumer/GymFeedPage'
import GymFeedOwnerPage from './pages/owner/GymFeedOwnerPage'
import TrainerGymFeedPage from './pages/trainer/TrainerGymFeedPage'
import { XPToastProvider } from './components/XPToast'
import { WorkoutSessionProvider } from './contexts/WorkoutSessionContext'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffSettings from './pages/staff/StaffSettings'
import StaffCheckin from './pages/staff/StaffCheckin'
import StaffMembers from './pages/staff/StaffMembers'
import StaffPayments from './pages/staff/StaffPayments'
import StaffSchedule from './pages/staff/StaffSchedule'
import StaffLockers from './pages/staff/StaffLockers'
import StaffSupplements from './pages/staff/StaffSupplements'
import StaffAnnouncements from './pages/staff/StaffAnnouncements'
import StaffFeedPage from './pages/staff/StaffFeedPage'
import StaffChatPage from './pages/staff/StaffChatPage'

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
      <AuthProvider>
        <WorkoutSessionProvider>
        <XPToastProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login"        element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/signup"       element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/role-select"       element={<AuthRoute><RoleSelect /></AuthRoute>} />
          <Route path="/onboarding"        element={<AuthRoute><Onboarding /></AuthRoute>} />
          <Route path="/stagv-onboarding"  element={<AuthRoute><StaffOnboarding /></AuthRoute>} />

          {/* Consumer routes — share BottomNav via ConsumerLayout */}
          <Route element={<ProtectedRoute><ConsumerLayout /></ProtectedRoute>}>
            <Route path="/home"                           element={<Home />} />
            <Route path="/workout"                        element={<Workout />} />
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
            <Route path="/xp"                             element={<XPProfile />} />
            <Route path="/leaderboard"                    element={<Leaderboard />} />
            <Route path="/my-gym/supplements"                element={<SupplementCatalog />} />
            <Route path="/my-gym/supplements/cart"           element={<SupplementCart />} />
            <Route path="/my-gym/orders"                     element={<SupplementOrders />} />
            <Route path="/my-gym/orders/:orderId"            element={<SupplementOrderDetail />} />
            <Route path="/my-gym/feed"                       element={<GymFeedPage />} />
          </Route>

          {/* Member class browse & booking */}
          <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />

          {/* Plan builder — full-screen, no BottomNav */}
          <Route path="/workout/plans/new"          element={<ProtectedRoute><UserPlanBuilder /></ProtectedRoute>} />
          <Route path="/workout/plans/:planId/edit" element={<ProtectedRoute><UserPlanBuilder /></ProtectedRoute>} />

          {/* Full-screen consumer routes — no BottomNav */}
          <Route path="/workout/live"
            element={<ProtectedRoute><LiveSession /></ProtectedRoute>}
          />
          <Route path="/workout/summary"
            element={<ProtectedRoute><WorkoutSummary /></ProtectedRoute>}
          />
          <Route path="/workout/summary/:workoutId"
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
          <Route path="/gym/supplements"  element={<GymOwnerRoute><GymSupplements /></GymOwnerRoute>} />
          <Route path="/gym/expenses"    element={<GymOwnerRoute><GymExpenses /></GymOwnerRoute>} />
          <Route path="/gym/lockers"    element={<GymOwnerRoute><GymLockers /></GymOwnerRoute>} />
          <Route path="/gym/staff"     element={<GymOwnerRoute><GymStaff /></GymOwnerRoute>} />
          <Route path="/gym/reports"   element={<GymOwnerRoute><GymReports /></GymOwnerRoute>} />
          <Route path="/gym/equipment" element={<GymOwnerRoute><GymEquipment /></GymOwnerRoute>} />
          <Route path="/gym/trainer-payouts" element={<GymOwnerRoute><GymTrainerPayouts /></GymOwnerRoute>} />
          <Route path="/gym/profile"      element={<GymOwnerRoute><GymComingSoon /></GymOwnerRoute>} />
          <Route path="/gym/feed"         element={<GymOwnerRoute><GymFeedOwnerPage /></GymOwnerRoute>} />
          <Route path="/gym/chat"         element={<GymOwnerRoute><GymChatPage /></GymOwnerRoute>} />

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
            <Route path="/trainer/feed"             element={<TrainerGymFeedPage />} />
            <Route path="/trainer/earnings"         element={<TrainerEarnings />} />
          </Route>

          {/* Staff routes */}
          <Route element={<StaffRoute><StaffLayout /></StaffRoute>}>
            <Route path="/staff/dashboard"      element={<StaffDashboard />} />
            <Route path="/staff/settings"       element={<StaffSettings />} />
            <Route path="/staff/checkin"        element={<StaffCheckin />} />
            <Route path="/staff/members"        element={<StaffMembers />} />
            <Route path="/staff/payments"       element={<StaffPayments />} />
            <Route path="/staff/schedule"       element={<StaffSchedule />} />
            <Route path="/staff/lockers"        element={<StaffLockers />} />
            <Route path="/staff/supplements"    element={<StaffSupplements />} />
            <Route path="/staff/announcements"  element={<StaffAnnouncements />} />
            <Route path="/staff/feed"           element={<StaffFeedPage />} />
            <Route path="/staff/chat"           element={<StaffChatPage />} />
          </Route>

          {/* Full-screen trainer editors — no nav */}
          <Route path="/trainer/templates/new"                   element={<ProtectedRoute><TrainerTemplateBuilder /></ProtectedRoute>} />
          <Route path="/trainer/templates/:templateId/edit"      element={<ProtectedRoute><TrainerTemplateBuilder /></ProtectedRoute>} />
          <Route path="/trainer/diet-templates/new"              element={<ProtectedRoute><TrainerDietBuilder /></ProtectedRoute>} />
          <Route path="/trainer/diet-templates/:templateId/edit" element={<ProtectedRoute><TrainerDietBuilder /></ProtectedRoute>} />
          <Route path="/trainer/client/:clientId/diet-plan/new"  element={<ProtectedRoute><DirectDietPlanPage /></ProtectedRoute>} />
          <Route path="/trainer/client/:clientId/ai-diet-plan/:planId" element={<ProtectedRoute><TrainerAIDietPlanEditor /></ProtectedRoute>} />
        </Routes>
        </XPToastProvider>
        </WorkoutSessionProvider>
      </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
