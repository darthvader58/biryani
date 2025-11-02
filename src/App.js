import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Signin from './pages/Signin';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import './App.css';

function App() {
  const [user, setUser] = useState(null);

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

  return (
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
  );
}

export default App;