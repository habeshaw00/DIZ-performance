
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserProfile, UserRole } from './types';
import LoginView from './views/LoginView';
import ChangePasscodeView from './views/ChangePasscodeView';
import UserAgreementView from './views/UserAgreementView';
import EmailLinkView from './views/EmailLinkView';
import StaffDashboard from './views/StaffDashboard';
import ManagerDashboard from './views/ManagerDashboard';
import AdminKPIManagement from './views/AdminKPIManagement';
import AdminApprovals from './views/AdminApprovals';
import AdminSuggestions from './views/AdminSuggestions';
import AdminUserManagement from './views/AdminUserManagement';
import ZoneIdeasView from './views/ZoneIdeasView';
import StrategicLogView from './views/StrategicLogView';
import CommunicationCenter from './views/CommunicationCenter';
import InboxView from './views/InboxView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

interface AuthContextType {
  user: UserProfile | null;
  login: (u: UserProfile) => void;
  logout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};

const ProtectedRoute: React.FC<{ children: React.ReactNode; roles?: UserRole[] }> = ({ children, roles }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" state={{ from: location }} />;
  if (!user.passcodeSet && location.pathname !== '/change-passcode') return <Navigate to="/change-passcode" />;
  if (user.passcodeSet && !user.agreementAccepted && location.pathname !== '/agreement') return <Navigate to="/agreement" />;
  if (user.agreementAccepted && !user.emailLinked && location.pathname !== '/link-email') return <Navigate to="/link-email" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;

  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, darkMode, mobileMenuOpen, setMobileMenuOpen } = useAuth();
  const location = useLocation();
  const isSetupRoute = user && (!user.passcodeSet || !user.agreementAccepted || !user.emailLinked);
  
  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className={`flex flex-col md:flex-row min-h-screen ${darkMode ? 'bg-transparent text-white' : 'bg-gray-100 text-gray-900'}`}>
        {user && !isSetupRoute && <Sidebar />}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {user && !isSetupRoute && <Header />}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 content-overlay custom-scrollbar">
            <Routes>
              <Route path="/login" element={<LoginView />} />
              <Route path="/change-passcode" element={<ProtectedRoute><ChangePasscodeView /></ProtectedRoute>} />
              <Route path="/agreement" element={<ProtectedRoute><UserAgreementView /></ProtectedRoute>} />
              <Route path="/link-email" element={<ProtectedRoute><EmailLinkView /></ProtectedRoute>} />
              <Route path="/" element={
                <ProtectedRoute>
                  {user?.role === UserRole.STAFF ? <StaffDashboard /> : <ManagerDashboard />}
                </ProtectedRoute>
              } />
              <Route path="/inbox" element={<ProtectedRoute><InboxView /></ProtectedRoute>} />
              <Route path="/ideas" element={<ProtectedRoute><ZoneIdeasView /></ProtectedRoute>} />
              <Route path="/memos" element={<ProtectedRoute><StrategicLogView /></ProtectedRoute>} />
              <Route path="/communications" element={<ProtectedRoute roles={[UserRole.MANAGER, UserRole.CSM]}><CommunicationCenter /></ProtectedRoute>} />
              <Route path="/kpis" element={<ProtectedRoute roles={[UserRole.MANAGER, UserRole.CSM]}><AdminKPIManagement /></ProtectedRoute>} />
              <Route path="/approvals" element={<ProtectedRoute roles={[UserRole.MANAGER, UserRole.CSM]}><AdminApprovals /></ProtectedRoute>} />
              <Route path="/requests" element={<ProtectedRoute><AdminSuggestions /></ProtectedRoute>} />
              <Route path="/suggestions" element={<Navigate to="/requests" />} />
              <Route path="/users" element={<ProtectedRoute roles={[UserRole.MANAGER, UserRole.CSM]}><AdminUserManagement /></ProtectedRoute>} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('dukem_auth_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [darkMode, setDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const login = (u: UserProfile) => {
    setUser(u);
    localStorage.setItem('dukem_auth_user', JSON.stringify(u));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dukem_auth_user');
  };

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <AuthContext.Provider value={{ user, login, logout, darkMode, toggleDarkMode, mobileMenuOpen, setMobileMenuOpen }}>
      <Router>
        <AppContent />
      </Router>
    </AuthContext.Provider>
  );
};

export default App;
