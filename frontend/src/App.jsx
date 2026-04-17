import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OnboardingPage from './pages/OnboardingPage';
import DashboardPage from './pages/DashboardPage';
import TopicSelectPage from './pages/TopicSelectPage';
import InterviewPage from './pages/InterviewPage';
// import FeedbackPage from './pages/FeedbackPage';
// import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';

const Protect = ({ children }) => (
  <ProtectedRoute>{children}</ProtectedRoute>
);

function App() {
  return (
    <Routes>
      <Route path="/login"      element={<LoginPage />} />
      <Route path="/register"   element={<RegisterPage />} />

      <Route path="/onboarding" element={<Protect><OnboardingPage /></Protect>} />
      <Route path="/dashboard"  element={<Protect><DashboardPage /></Protect>} />
      <Route path="/topics"     element={<Protect><TopicSelectPage /></Protect>} />
      <Route path="/interview"  element={<Protect><InterviewPage /></Protect>} />
      {/* <Route path="/feedback"   element={<Protect><FeedbackPage /></Protect>} /> */}
      {/* <Route path="/progress"   element={<Protect><ProgressPage /></Protect>} /> */}
      <Route path="/settings"   element={<Protect><SettingsPage /></Protect>} />

      <Route path="/"           element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;