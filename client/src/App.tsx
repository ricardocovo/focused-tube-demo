import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProfilesPage from './pages/ProfilesPage';
import ProfileEditPage from './pages/ProfileEditPage';
import SubscriptionPickerPage from './pages/SubscriptionPickerPage';
import CommunityPage from './pages/CommunityPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Dashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profiles"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfilesPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profiles/:id/edit"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <ProfileEditPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profiles/:profileId/subscriptions"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <SubscriptionPickerPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/community"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <CommunityPage />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;
