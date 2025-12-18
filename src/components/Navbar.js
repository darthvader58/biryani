import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/navbar.css';

const Navbar = ({ user }) => {
    return (
        <nav className="navbar glass">
            <div className="nav-container">
                <Link to="/" className="nav-logo">
                    <div className="logo-icon">
                        <img src="/logo.png" alt="ForMath Logo" width="28" height="28" />
                    </div>
                    <span className="logo-text">ForMath</span>
                </Link>
                
                <div className="nav-links">
                    <Link to="/" className="nav-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M10,20V14H14V20H19V12H22L12,3L2,12H5V20H10Z" />
                        </svg>
                        Home
                    </Link>
                    {user && (
                        <Link to="/dashboard" className="nav-link">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22,21H2V3H4V19H6V10H10V19H12V6H16V19H18V14H22V21Z" />
                            </svg>
                            Dashboard
                        </Link>
                    )}
                    {user ? (
                        <div className="user-menu glass">
                            <img src={user.picture} alt={user.name} className="user-avatar" />
                            <div className="user-info">
                                <span className="user-name">{user.name}</span>
                                <span className="user-email">{user.email}</span>
                            </div>
                            <Link to="/signin" className="logout-btn">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                                </svg>
                            </Link>
                        </div>
                    ) : (
                        <Link to="/signin" className="signin-btn primary-btn">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M10,17V14H3V10H10V7L15,12L10,17M10,2H19A2,2 0 0,1 21,4V20A2,2 0 0,1 19,22H10A2,2 0 0,1 8,20V18H10V20H19V4H10V6H8V4A2,2 0 0,1 10,2Z" />
                            </svg>
                            Sign In
                        </Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;