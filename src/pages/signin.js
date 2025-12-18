import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import { useHistory } from 'react-router-dom';
import '../styles/signin.css';

function Signin({ onLogin, currentUser }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(currentUser);
    const history = useHistory();

    // Debug: Check if Google Client ID is loaded
    useEffect(() => {
        console.log('Google Client ID:', process.env.REACT_APP_GOOGLE_CLIENT_ID);
        if (!process.env.REACT_APP_GOOGLE_CLIENT_ID) {
            console.error('Google Client ID not found in environment variables');
        }
    }, []);

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => {
            console.log('Login Success:', codeResponse);
            setUser(codeResponse);
        },
        onError: (error) => {
            console.error('Login Failed:', error);
            alert('Login failed: ' + JSON.stringify(error));
        },
    });

    useEffect(() => {
        if (user) {
            console.log('Fetching user info with token:', user.access_token);
            axios
                .get(`https://www.googleapis.com/oauth2/v1/userinfo`, {
                    params: {
                        access_token: user.access_token,
                    },
                    headers: {
                        Authorization: `Bearer ${user.access_token}`,
                        Accept: 'application/json',
                    },
                })
                .then((res) => {
                    console.log('User info received:', res.data);
                    setProfile(res.data);
                    onLogin(res.data);
                    setTimeout(() => history.push('/'), 1000);
                })
                .catch((err) => {
                    console.error('API Request Error:', err);
                    alert('Failed to get user info: ' + err.message);
                });
        }
    }, [user, onLogin, history]);

    const logOut = () => {
        googleLogout();
        setUser(null);
        setProfile(null);
        onLogin(null);
        history.push('/');
    };

    return (
        <div className="signin-container">
            <div className="signin-card">
                {profile ? (
                    <div className="profile-section">
                        <img src={profile.picture} alt="user" className="profile-image" />
                        <h2>Welcome!</h2>
                        <p className="profile-name">{profile.name}</p>
                        <p className="profile-email">{profile.email}</p>
                        <div className="profile-actions">
                            <button onClick={logOut} className="logout-btn">
                                Log out
                            </button>
                            <a href="/" className="home-link">
                                Go to Home
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="login-section">
                        <h1>Welcome to ForMath</h1>
                        <p className="tagline">Step-by-Step Problem Solving Analysis Helper</p>
                        <p className="description">
                            Sign in with Google to start analyzing your math work and tracking your progress
                        </p>
                        <button onClick={() => login()} className="google-signin-btn">
                            <svg className="google-icon" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                            Sign in with Google
                        </button>
                        
                        {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                            <div style={{ 
                                marginTop: '20px', 
                                padding: '15px', 
                                background: '#ff4757', 
                                borderRadius: '8px',
                                fontSize: '14px'
                            }}>
                                <strong>⚠️ Google OAuth Not Configured</strong>
                                <p style={{ margin: '8px 0 0 0' }}>
                                    Please add your Google Client ID to the .env file:
                                    <br />
                                    <code style={{ background: '#000', padding: '2px 4px', borderRadius: '3px' }}>
                                        REACT_APP_GOOGLE_CLIENT_ID=your_client_id_here
                                    </code>
                                </p>
                                <p style={{ margin: '8px 0 0 0', fontSize: '12px' }}>
                                    See GOOGLE_OAUTH_SETUP.md for detailed instructions.
                                </p>
                                <button 
                                    onClick={() => {
                                        // Demo login for testing
                                        const demoUser = {
                                            id: 'demo123',
                                            name: 'Demo User',
                                            email: 'demo@example.com',
                                            picture: 'https://via.placeholder.com/100x100/ff4500/ffffff?text=DU'
                                        };
                                        setProfile(demoUser);
                                        onLogin(demoUser);
                                    }}
                                    style={{
                                        marginTop: '10px',
                                        padding: '8px 16px',
                                        background: '#272729',
                                        color: '#d7dadc',
                                        border: '1px solid #343536',
                                        borderRadius: '16px',
                                        cursor: 'pointer',
                                        fontSize: '12px'
                                    }}
                                >
                                    Use Demo Login (for testing)
                                </button>
                            </div>
                        )}
                        
                        {process.env.NODE_ENV === 'development' && process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                            <div style={{ marginTop: '20px', fontSize: '12px', color: '#818384' }}>
                                <p>Happy Learning</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Signin;