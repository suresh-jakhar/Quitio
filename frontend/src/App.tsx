import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HomePage from './pages/HomePage';
import SmartArrangePage from './pages/SmartArrangePage';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route
            path="/smart-arrange"
            element={
              <ProtectedRoute>
                <SmartArrangePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
