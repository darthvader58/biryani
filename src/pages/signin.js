import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import { useHistory, Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/signin.css';

function Signin({ onLogin, currentUser }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(currentUser);
    const history = useHistory();

    const login = useGoogleLogin({
        onSuccess: (codeResponse) => setUser(codeResponse),
        onError: (err) => alert('Login failed: ' + JSON.stringify(err)),
    });

    useEffect(() => {
        if (!user) return;
        axios
            .get('https://www.googleapis.com/oauth2/v1/userinfo', {
                params: { access_token: user.access_token },
                headers: { Authorization: `Bearer ${user.access_token}`, Accept: 'application/json' },
            })
            .then((res) => {
                setProfile(res.data);
                onLogin(res.data);
                setTimeout(() => history.push('/'), 800);
            })
            .catch((err) => alert('Failed to get user info: ' + err.message));
    }, [user, onLogin, history]);

    const logOut = () => {
        googleLogout();
        setUser(null);
        setProfile(null);
        onLogin(null);
        history.push('/');
    };

    const handleDemoLogin = () => {
        const demoUser = {
            id: 'demo123',
            name: 'Demo User',
            email: 'demo@example.com',
            picture: '',
        };
        setProfile(demoUser);
        onLogin(demoUser);
    };

    return (
        <div className="signin-wrap">
            <div className="signin-card">
                <div className="signin-header">
                    <img src="/logo.png" alt="ForMath" className="signin-mark" />
                    {profile ? (
                        <>
                            <div className="signin-title">Welcome, {profile.name?.split(' ')[0] || 'there'}</div>
                            <div className="signin-sub">{profile.email}</div>
                        </>
                    ) : (
                        <>
                            <div className="signin-title">Sign in to ForMath</div>
                            <div className="signin-sub">
                                Analyze your math homework with AI. Track your improvement over time.
                            </div>
                        </>
                    )}
                </div>

                {profile ? (
                    <div className="profile-section">
                        {profile.picture && (
                            <img src={profile.picture} alt={profile.name} className="profile-avatar" />
                        )}
                        <div className="signin-actions">
                            <Link to="/" className="btn btn-primary btn-lg">Go to Home</Link>
                            <button onClick={logOut} className="btn btn-ghost">Log out</button>
                        </div>
                    </div>
                ) : (
                    <>
                        <button onClick={() => login()} className="goog-btn">
                            <svg width="17" height="17" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Continue with Google
                        </button>

                        {!process.env.REACT_APP_GOOGLE_CLIENT_ID && (
                            <div className="signin-warning">
                                <strong>Google OAuth not configured.</strong>
                                <p>Set <code>REACT_APP_GOOGLE_CLIENT_ID</code> in your environment.</p>
                                <button onClick={handleDemoLogin} className="btn btn-secondary btn-sm" style={{ marginTop: 10 }}>
                                    Use Demo Login
                                </button>
                            </div>
                        )}

                        <p className="signin-fineprint">
                            By continuing, you agree to our Terms of Service and Privacy Policy.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

export default Signin;
