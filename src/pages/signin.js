import React, { useState, useEffect } from 'react';
import { googleLogout, useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';

function Signin() {
    const [user, setUser] = useState(null); // Change the initial state to null
    const [profile, setProfile] = useState(null); // Change the initial state to null

    const { login, loaded } = useGoogleLogin({
        onSuccess: (codeResponse) => setUser(codeResponse),
        onError: (error) => console.log('Login Failed:', error),
    });

    useEffect(() => {
        if (user) {
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
                    setProfile(res.data);
                })
                .catch((err) => console.log('API Request Error:', err));
        }
    }, [user]);

    const logOut = () => {
        googleLogout();
        setUser(null); // Reset user state
        setProfile(null);
    };

    return (
        <div>
            <h2>React Google Login</h2>
            <br />
            <br />
            {profile ? (
                <div>
                    <img src={profile.picture} alt="user image" />
                    <h3>User Logged in</h3>
                    <p>Name: {profile.name}</p>
                    <p>Email Address: {profile.email}</p>
                    <br />
                    <br />
                    <button onClick={logOut}>Log out</button>
                </div>
            ) : (
                <button onClick={() => login()} disabled={!loaded}>
                    Sign in with Google 🚀
                </button>
            )}
        </div>
    );
}

export default Signin;