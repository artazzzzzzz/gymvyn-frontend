# Graph Report - .  (2026-06-13)

## Corpus Check
- 101 files · ~142,900 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 688 nodes · 1216 edges · 65 communities (55 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Diet & Food Tracking|Diet & Food Tracking]]
- [[_COMMUNITY_Auth & Route Guards|Auth & Route Guards]]
- [[_COMMUNITY_Project Config & Deps|Project Config & Deps]]
- [[_COMMUNITY_Trainer Client Detail|Trainer Client Detail]]
- [[_COMMUNITY_App Entry & MediaPipe|App Entry & MediaPipe]]
- [[_COMMUNITY_Gym Dashboard|Gym Dashboard]]
- [[_COMMUNITY_Trainer Dashboard|Trainer Dashboard]]
- [[_COMMUNITY_Home & Streak Tracking|Home & Streak Tracking]]
- [[_COMMUNITY_Gym Announcements|Gym Announcements]]
- [[_COMMUNITY_Exercise History & 1RM|Exercise History & 1RM]]
- [[_COMMUNITY_Gym Member Detail|Gym Member Detail]]
- [[_COMMUNITY_Route Protection Guards|Route Protection Guards]]
- [[_COMMUNITY_User Settings & Goals|User Settings & Goals]]
- [[_COMMUNITY_Form Coach & Exercises|Form Coach & Exercises]]
- [[_COMMUNITY_Signup Flow|Signup Flow]]
- [[_COMMUNITY_Consumer Navigation|Consumer Navigation]]
- [[_COMMUNITY_Gym Member Roster|Gym Member Roster]]
- [[_COMMUNITY_Workout Session|Workout Session]]
- [[_COMMUNITY_My Gym|My Gym]]
- [[_COMMUNITY_Trainer Chat|Trainer Chat]]
- [[_COMMUNITY_Workout Summary & PRs|Workout Summary & PRs]]
- [[_COMMUNITY_Add Member Modal|Add Member Modal]]
- [[_COMMUNITY_Form Coach Modal|Form Coach Modal]]
- [[_COMMUNITY_Gym Nav & Check-in|Gym Nav & Check-in]]
- [[_COMMUNITY_Exercise Database|Exercise Database]]
- [[_COMMUNITY_Gym Schedule|Gym Schedule]]
- [[_COMMUNITY_Live Workout Session|Live Workout Session]]
- [[_COMMUNITY_Login Flow|Login Flow]]
- [[_COMMUNITY_Form Fault Detection|Form Fault Detection]]
- [[_COMMUNITY_Social Icons Sprite|Social Icons Sprite]]
- [[_COMMUNITY_Gym Payments|Gym Payments]]
- [[_COMMUNITY_Gym Trainers & Payments|Gym Trainers & Payments]]
- [[_COMMUNITY_Exercise Picker|Exercise Picker]]
- [[_COMMUNITY_AI Chat Interface|AI Chat Interface]]
- [[_COMMUNITY_Community Social Feed|Community Social Feed]]
- [[_COMMUNITY_Gym Dummy Data|Gym Dummy Data]]
- [[_COMMUNITY_Gym Onboarding|Gym Onboarding]]
- [[_COMMUNITY_Become Trainer Flow|Become Trainer Flow]]
- [[_COMMUNITY_Form Angle Rules|Form Angle Rules]]
- [[_COMMUNITY_Form Feedback Overlay|Form Feedback Overlay]]
- [[_COMMUNITY_User Onboarding|User Onboarding]]
- [[_COMMUNITY_Trainer Diet Builder|Trainer Diet Builder]]
- [[_COMMUNITY_Trainer Settings|Trainer Settings]]
- [[_COMMUNITY_Attendance Calendar|Attendance Calendar]]
- [[_COMMUNITY_Trainer Client Tabs & API|Trainer Client Tabs & API]]
- [[_COMMUNITY_User Plan Builder|User Plan Builder]]
- [[_COMMUNITY_Pose Utilities|Pose Utilities]]
- [[_COMMUNITY_Exercise Search & Workout Tab|Exercise Search & Workout Tab]]
- [[_COMMUNITY_Brand Identity (Favicon)|Brand Identity (Favicon)]]
- [[_COMMUNITY_Hero Image Assets|Hero Image Assets]]
- [[_COMMUNITY_React Framework Assets|React Framework Assets]]
- [[_COMMUNITY_Churn Risk Card|Churn Risk Card]]
- [[_COMMUNITY_Class Type Chip|Class Type Chip]]
- [[_COMMUNITY_Day Selector|Day Selector]]
- [[_COMMUNITY_Payment Status Pill|Payment Status Pill]]
- [[_COMMUNITY_Vite Build Tool|Vite Build Tool]]

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 83 edges
2. `supabase` - 27 edges
3. `apiFetch()` - 24 edges
4. `getAvatarColor()` - 18 edges
5. `dietRequest()` - 14 edges
6. `getInitials()` - 13 edges
7. `MoreSheet()` - 10 edges
8. `GymBottomNav()` - 9 edges
9. `VoiceCoach` - 9 edges
10. `WorkoutSummary()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `FitForge Frontend Application` --conceptually_related_to--> `Vite + React Setup`  [INFERRED]
  index.html → README.md
- `PublicRoute()` --calls--> `useAuth()`  [EXTRACTED]
  src/components/PublicRoute.jsx → src/hooks/useAuth.jsx
- `BecomeGymOwner()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/gym/BecomeGymOwner.jsx → src/hooks/useAuth.jsx
- `GymDashboard()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/gym/GymDashboard.jsx → src/hooks/useAuth.jsx
- `GymMembers()` --calls--> `useAuth()`  [EXTRACTED]
  src/pages/gym/GymMembers.jsx → src/hooks/useAuth.jsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MediaPipe Pose Detection Pipeline** — mediapipe_camera_utils, mediapipe_drawing_utils, mediapipe_pose [INFERRED 0.90]

## Communities (65 total, 10 thin omitted)

### Community 0 - "Diet & Food Tracking"
Cohesion: 0.05
Nodes (33): BarcodeScanner(), AddFoodModal(), CameraTab(), DAY_NAMES, Diet(), formatDateLabel(), isSameDay(), MANUAL_UNITS (+25 more)

### Community 1 - "Auth & Route Guards"
Cohesion: 0.15
Nodes (15): AuthRoute(), GymOwnerRoute(), ProtectedRoute(), AuthContext, AuthProvider(), useAuth(), ChatWindow(), ClientChatPage() (+7 more)

### Community 2 - "Project Config & Deps"
Cohesion: 0.08
Nodes (23): devDependencies, autoprefixer, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, postcss (+15 more)

### Community 3 - "Trainer Client Detail"
Cohesion: 0.09
Nodes (8): AVATAR_PALETTE, C, CARD, initials(), MEAL_ICONS, nameColor(), SL, TrainerClientDetail()

### Community 4 - "App Entry & MediaPipe"
Cohesion: 0.10
Nodes (23): FitForge Frontend Application, index.html Entry Point, MediaPipe Camera Utils, MediaPipe Drawing Utils, MediaPipe Pose Library, dependencies, axios, graphify (+15 more)

### Community 5 - "Gym Dashboard"
Cohesion: 0.11
Nodes (11): card, formatDate(), getGreeting(), getInitials(), GymDashboard(), iconProps, MemberRow(), sectionLabel (+3 more)

### Community 6 - "Trainer Dashboard"
Cohesion: 0.12
Nodes (9): AVATAR_COLORS, C, ClientCard(), FILTER_TABS, getInitials(), getStatusFromClient(), lastActiveText(), statusDotColor() (+1 more)

### Community 7 - "Home & Streak Tracking"
Cohesion: 0.12
Nodes (7): useStreak(), getGreeting(), Home(), MEASURE_FIELDS, Progress(), TABS, getGymOccupancy()

### Community 8 - "Gym Announcements"
Cohesion: 0.13
Nodes (11): GymOwnerNav(), tabs, GymAnnouncements(), PostAnnouncementModal(), PRIORITY_OPTIONS, PRIORITY_STYLES, GymComingSoon(), TITLES (+3 more)

### Community 9 - "Exercise History & 1RM"
Cohesion: 0.14
Nodes (7): EXERCISE_INSTRUCTIONS, EMPTY, useExerciseHistory(), ExerciseDetail(), getCategory(), SECONDARY_MAP, TABS

### Community 10 - "Gym Member Detail"
Cohesion: 0.16
Nodes (14): AttendanceCalendar(), buildCalendar(), card, DAY_HEADERS, daysAgo(), daysBetween(), detailRow, formatDate() (+6 more)

### Community 11 - "Route Protection Guards"
Cohesion: 0.18
Nodes (4): PublicRoute(), BecomeGymOwner(), features, supabase

### Community 12 - "User Settings & Goals"
Cohesion: 0.16
Nodes (9): EQUIPMENT_OPTIONS, EXPERIENCE_LEVELS, GOALS, Settings(), daysAgo(), daysBetween(), formatMonthYear(), formatRelative() (+1 more)

### Community 13 - "Form Coach & Exercises"
Cohesion: 0.18
Nodes (11): LOCAL_EXERCISES, useExercises(), calcAngle(), FALLBACK_LIST, FormCoach(), getLandmarkAngles(), MEDIAPIPE_SCRIPTS, mockFeedback (+3 more)

### Community 15 - "Consumer Navigation"
Cohesion: 0.18
Nodes (9): BottomNav(), ConsumerLayout(), MENU_ITEMS, MoreSheet(), DAYS, DEFAULT_HOURS, DEFAULT_NOTIFICATIONS, GYM_TYPES (+1 more)

### Community 16 - "Gym Member Roster"
Cohesion: 0.16
Nodes (5): FILTERS, formatExpiry(), getInitials(), GymMembers(), MemberRow()

### Community 17 - "Workout Session"
Cohesion: 0.18
Nodes (6): useWorkoutHistory(), formatDate(), formatVolume(), formatVolumeShort(), SL, Workout()

### Community 18 - "My Gym"
Cohesion: 0.19
Nodes (12): JoinGymView(), mockAnnouncements, mockClasses, mockGym, mockOccupancy, MyGym(), occColor(), occLabel() (+4 more)

### Community 19 - "Trainer Chat"
Cohesion: 0.15
Nodes (5): AV_POOL, AvaCircle(), C, getAv(), TrainerChatPage()

### Community 20 - "Workout Summary & PRs"
Cohesion: 0.20
Nodes (9): computeMuscles(), computePRsFromSets(), computeVolume(), formatDateLabel(), formatDurationSec(), MOCK_STARTED_AT, mockExercises, MUSCLE_COLOURS (+1 more)

### Community 21 - "Add Member Modal"
Cohesion: 0.18
Nodes (8): AddMemberModal(), formatPhoneDisplay(), inrFormatter, ManualForm(), MEMBERSHIP_TYPES, todayISO(), addGymMember(), getGymTrainers()

### Community 22 - "Form Coach Modal"
Cohesion: 0.29
Nodes (10): fmtTime(), FormCoachModal(), INITIAL_SESSION, scoreColor(), scoreDot(), getFormRule(), hasFormDetection(), LOWER_MAP (+2 more)

### Community 23 - "Gym Nav & Check-in"
Cohesion: 0.20
Nodes (5): GymBottomNav(), GymCheckin(), GymInsights(), rankConfig, riskConfig

### Community 24 - "Exercise Database"
Cohesion: 0.23
Nodes (9): EQUIPMENT_TYPES, EXERCISE_DATABASE, EXERCISES_BY_EQUIPMENT, EXERCISES_BY_MUSCLE, getFormRule(), hasAIFormDetection(), MUSCLE_GROUPS, ExerciseLibrary() (+1 more)

### Community 25 - "Gym Schedule"
Cohesion: 0.20
Nodes (5): ClassCard(), formatTime(), getDayName(), GymSchedule(), TYPE_CONFIG

### Community 26 - "Live Workout Session"
Cohesion: 0.24
Nodes (9): useWorkoutSession(), ExerciseBlock(), formatElapsed(), formatMmSs(), LiveSession(), MUSCLE_COLOURS, muscleClass(), REST_PRESETS (+1 more)

### Community 29 - "Social Icons Sprite"
Cohesion: 0.39
Nodes (9): Social Media Icons, SVG Sprite Pattern, Bluesky Social Icon Symbol, Discord Icon Symbol, Documentation Icon Symbol, GitHub Icon Symbol, Social/User Icon Symbol, icons.svg SVG Sprite Sheet (+1 more)

### Community 30 - "Gym Payments"
Cohesion: 0.22
Nodes (6): card, FILTER_LABELS, FILTERS, GymPayments(), PLAN_OPTIONS, sectionLabel

### Community 31 - "Gym Trainers & Payments"
Cohesion: 0.42
Nodes (7): CollectModal(), PaymentRow(), formatSpecializations(), GymTrainers(), statusConfig, getAvatarColor(), getInitials()

### Community 32 - "Exercise Picker"
Cohesion: 0.29
Nodes (5): DIFFICULTY_COLORS, EQUIPMENT_ICONS, ExerciseLibrary(), MUSCLE_ICONS, TrainerTemplateBuilder()

### Community 33 - "AI Chat Interface"
Cohesion: 0.25
Nodes (4): Chat(), quickChips, sampleMessages, suggestions

### Community 34 - "Community Social Feed"
Cohesion: 0.25
Nodes (4): Community(), mockBuddies, mockLeaderboard, mockPosts

### Community 35 - "Gym Dummy Data"
Cohesion: 0.29
Nodes (6): DUMMY_HOURLY_OCCUPANCY, DUMMY_MEMBERS, DUMMY_PAYMENTS, DUMMY_REVENUE_SUMMARY, DUMMY_SCHEDULE, GYM_DUMMY_STATS

### Community 36 - "Gym Onboarding"
Cohesion: 0.29
Nodes (5): DEFAULT_HOURS, GYM_TYPES, GymOnboarding(), inputStyle, STARTER_PLANS

### Community 37 - "Become Trainer Flow"
Cohesion: 0.29
Nodes (3): BecomeTrainer(), EXPERIENCE_OPTIONS, SPECS

### Community 38 - "Form Angle Rules"
Cohesion: 0.29
Nodes (4): bicepCurl, exercises, pushup, squat

### Community 39 - "Form Feedback Overlay"
Cohesion: 0.40
Nodes (3): FormFeedbackOverlay(), FORM_FEEDBACK_RULES, SEVERITY

### Community 40 - "User Onboarding"
Cohesion: 0.33
Nodes (3): DAY_LABELS, Onboarding(), STEPS

### Community 41 - "Trainer Diet Builder"
Cohesion: 0.47
Nodes (5): DIET_TYPES, MEAL_TYPES, newFood(), newMeal(), TrainerDietBuilder()

### Community 43 - "Attendance Calendar"
Cohesion: 0.60
Nodes (4): AttendanceCalendar(), DAY_LABELS, hashString(), seededRandom()

### Community 44 - "Trainer Client Tabs & API"
Cohesion: 0.40
Nodes (5): DietTab(), PlansTab(), ProgressTab(), apiFetch(), finishWorkout()

### Community 45 - "User Plan Builder"
Cohesion: 0.60
Nodes (4): newDay(), newExercise(), newSet(), UserPlanBuilder()

### Community 47 - "Exercise Search & Workout Tab"
Cohesion: 0.50
Nodes (4): searchExercises(), getMondayOfWeek(), isoDate(), WorkoutsTab()

### Community 48 - "Brand Identity (Favicon)"
Cohesion: 0.67
Nodes (4): SVG Gaussian Blur Glow Effects, Lightning Bolt / Zigzag Shape, Purple Brand Color Scheme, FitForge Favicon SVG

### Community 49 - "Hero Image Assets"
Cohesion: 0.67
Nodes (3): Layered Card / Platform Design Concept, Hero PNG Image, Hero Section UI Element

### Community 50 - "React Framework Assets"
Cohesion: 0.67
Nodes (3): React Logo SVG, Iconify Logos Collection, React Framework

## Knowledge Gaps
- **155 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useAuth()` connect `Auth & Route Guards` to `Diet & Food Tracking`, `Trainer Client Detail`, `Gym Dashboard`, `Trainer Dashboard`, `Home & Streak Tracking`, `Gym Announcements`, `Exercise History & 1RM`, `Route Protection Guards`, `Form Coach & Exercises`, `Signup Flow`, `Gym Member Roster`, `Workout Session`, `My Gym`, `Trainer Chat`, `Workout Summary & PRs`, `Gym Schedule`, `Live Workout Session`, `Login Flow`, `Gym Payments`, `Exercise Picker`, `AI Chat Interface`, `Community Social Feed`, `Become Trainer Flow`, `User Onboarding`, `Trainer Diet Builder`, `Trainer Settings`, `Trainer Client Tabs & API`, `User Plan Builder`, `Exercise Search & Workout Tab`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `supabase` connect `Route Protection Guards` to `Auth & Route Guards`, `Gym Onboarding`, `Home & Streak Tracking`, `Gym Announcements`, `Exercise History & 1RM`, `User Onboarding`, `Trainer Settings`, `User Settings & Goals`, `Form Coach & Exercises`, `Signup Flow`, `Gym Member Roster`, `Workout Session`, `Workout Summary & PRs`, `Gym Schedule`, `Live Workout Session`, `Login Flow`, `Gym Payments`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `VoiceCoach` connect `Form Fault Detection` to `Form Coach & Exercises`, `Form Coach Modal`, `Form Feedback Overlay`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _156 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Diet & Food Tracking` be split into smaller, more focused modules?**
  _Cohesion score 0.052884615384615384 - nodes in this community are weakly interconnected._
- **Should `Auth & Route Guards` be split into smaller, more focused modules?**
  _Cohesion score 0.1471264367816092 - nodes in this community are weakly interconnected._
- **Should `Project Config & Deps` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._