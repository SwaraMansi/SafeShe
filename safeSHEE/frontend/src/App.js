import React, { useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PoliceDashboard from './pages/PoliceDashboard';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import HeatmapDashboard from './pages/HeatmapDashboard';
import ReportPage from './pages/ReportPage';
import ContactsPage from './pages/ContactsPage';
import { AuthContext } from './context/AuthContext';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    console.error('🔴 React Error Caught:', error);
    console.error('Error Info:', errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px 20px',
          color: '#ffffff',
          background: '#b00020',
          minHeight: '100vh',
          fontFamily: 'Arial, sans-serif',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <h2>⚠️ Application Error</h2>
          <p style={{maxWidth: '500px', fontSize: '14px', lineHeight: '1.6'}}>
            {this.state.error?.message || 'Something went wrong'}
          </p>
          <p style={{fontSize: '12px', opacity: 0.8}}>
            {this.state.error?.stack && this.state.error.stack.split('\n').slice(0, 3).join(' | ')}
          </p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              background: '#ffffff',
              color: '#b00020',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              marginTop: '20px'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, adminOnly, policeOnly }){
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/user" replace />;
  if (policeOnly && user.role !== 'police') return <Navigate to="/user" replace />;
  return children;
}

function AppContent() {
  const { user } = useContext(AuthContext);
  
  useEffect(() => {
    console.log('🔍 App loaded - User:', user ? user.email : 'Not authenticated');
  }, [user]);

  return (
    <div className="app-root">
      <main className="app-main">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/user" element={<ProtectedRoute><UserDashboard /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute adminOnly={true}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/police" element={<ProtectedRoute policeOnly={true}><PoliceDashboard /></ProtectedRoute>} />
          <Route path="/police/analytics" element={<ProtectedRoute policeOnly={true}><AnalyticsDashboard /></ProtectedRoute>} />
          <Route path="/police/heatmap" element={<ProtectedRoute policeOnly={true}><HeatmapDashboard /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportPage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
          {/* Fallback for unknown routes */}
          <Route path="*" element={<div style={{padding: '20px', color: '#e8e8e8'}}>Loading...</div>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App(){
  return (
    <ErrorBoundary>
      <Router>
        <AppContent />
      </Router>
    </ErrorBoundary>
  );
}
