import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Navbar from './components/Navbar';
import Home from './pages/home';
import Signin from './pages/signin';
import Dashboard from './pages/dashboard';
import NotFound from './pages/notFound';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  
  // Debug: Check if Google Client ID is loaded
  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  console.log('Google Client ID in App.js:', googleClientId);
  
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
      <Router>
        <div className="App">
          <Navbar user={user} />
          <div className="content">
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              background: '#1a1a1b', 
              color: '#d7dadc',
              margin: '20px',
              borderRadius: '8px',
              border: '1px solid #343536'
            }}>
              <h2 style={{ color: '#ff4500' }}>Configuration Required</h2>
              <p>Google OAuth Client ID is missing.</p>
              <p>Please add <code>REACT_APP_GOOGLE_CLIENT_ID</code> to your .env file and restart the server.</p>
              <p style={{ fontSize: '14px', color: '#818384', marginTop: '20px' }}>
                See GOOGLE_OAUTH_SETUP.md for detailed setup instructions.
              </p>
            </div>
          </div>
        </div>
      </Router>
    );
  }

  return (
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
        </div>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;