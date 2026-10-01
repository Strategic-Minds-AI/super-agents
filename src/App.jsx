import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import AgentCommandCenter from '@/pages/AgentCommandCenter';
import AgentChatPage from '@/pages/AgentChatPage';
import DomainRegistry from '@/pages/DomainRegistry';
import AutonomousMission from '@/pages/AutonomousMission';
import MetaArchitect from '@/pages/MetaArchitect';
import MissionControl from '@/pages/MissionControl';
import SystemFactory from '@/pages/SystemFactory';
import BatchOperations from '@/pages/BatchOperations';
import WebsiteFactory from '@/pages/WebsiteFactory';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/" element={<AgentCommandCenter />} />
        <Route path="/agents/:agentName" element={<AgentChatPage />} />
        <Route path="/domains" element={<DomainRegistry />} />
        <Route path="/mission" element={<AutonomousMission />} />
        <Route path="/architect" element={<MetaArchitect />} />
        <Route path="/mission-control" element={<MissionControl />} />
        <Route path="/factory" element={<SystemFactory />} />
        <Route path="/batch" element={<BatchOperations />} />
        <Route path="/website-factory" element={<WebsiteFactory />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App