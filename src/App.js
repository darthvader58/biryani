import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/home';
import Signin from './pages/signin';
import Dashboard from './pages/dashboard';
import NotFound from './pages/notFound';
import './App.css';

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
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          background: '#000000', 
          color: '#ffffff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <h1 style={{ color: '#ff4500' }}>Something went wrong</h1>
          <p>Error: {this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} style={{
            background: '#1db954',
            color: '#000',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '20px',
            cursor: 'pointer',
            marginTop: '20px'
          }}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  
  // Debug: Check if Google Client ID is loaded
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  console.log('App.js loaded - Environment check:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Google Client ID:', googleClientId);
  console.log('All env vars:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP')));
  
  if (!googleClientId) {
    console.error('REACT_APP_GOOGLE_CLIENT_ID is not defined in environment variables');
  }

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('formath_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error loading user:', e);
      }
    }
  }, []);

  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    if (userData) {
      localStorage.setItem('formath_user', JSON.stringify(userData));
    } else {
      localStorage.removeItem('formath_user');
    }
  };

  // Don't render GoogleOAuthProvider if clientId is missing
  if (!googleClientId) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center', 
        background: '#000000', 
        color: '#ffffff',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h1 style={{ color: '#1db954', marginBottom: '20px' }}>ForMath - Debug Mode</h1>
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '20px',
          borderRadius: '8px',
          maxWidth: '600px'
        }}>
          <h2 style={{ color: '#ff4500' }}>Environment Variables Missing</h2>
          <p>Google OAuth Client ID is not configured.</p>
          <p>Environment: {process.env.NODE_ENV}</p>
          <p>Available REACT_APP vars: {Object.keys(process.env).filter(key => key.startsWith('REACT_APP')).join(', ') || 'None'}</p>
          <p style={{ fontSize: '14px', marginTop: '20px' }}>
            Add environment variables in Vercel dashboard and redeploy.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <Router>
          <div className="App">
            <Navbar user={user} />
            <div className="content">
              <Switch>
                <Route exact path="/">
                  <Home user={user} />
                </Route>
                <Route path="/signin">
                  <Signin onLogin={handleLogin} currentUser={user} />
                </Route>
                <Route path="/dashboard">
                  <Dashboard user={user} />
                </Route>
                <Route path="*">
                  <NotFound />
                </Route>
              </Switch>
            </div>
            <Footer />
          </div>
        </Router>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  );
}

export default App;