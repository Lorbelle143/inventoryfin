import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import LandingPage from "./LandingPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import Dashboard from "./Dashboard";
import ChartsPage from "./ChartsPage";
import StatisticsPage from "./StatisticsPage";
import EarningsPage from "./EarningsPage";
import SettingsPage from "./SettingsPage";
import TermsPage from "./TermsPage";
import PrivacyPage from "./PrivacyPage";

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function Protected(Page: () => JSX.Element) {
  return (
    <ProtectedRoute>
      <Page />
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard"  element={Protected(Dashboard)} />
          <Route path="/charts"     element={Protected(ChartsPage)} />
          <Route path="/statistics" element={Protected(StatisticsPage)} />
          <Route path="/earnings"   element={Protected(EarningsPage)} />
          <Route path="/settings"   element={Protected(SettingsPage)} />
          <Route path="/terms"   element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
