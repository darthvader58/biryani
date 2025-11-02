import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Navbar.css';

const Navbar = ({ user }) => {
    return (
        <nav className="navbar">
            <div className="nav-container">
                <Link to="/" className="nav-logo">
                    <span className="logo-icon">📐</span>
                    <span className="logo-text">ForMath</span>
                </Link>
                
                <div className="nav-links">
                    <Link to="/" className="nav-link">Home</Link>
                    {user && (
                        <Link to="/dashboard" className="nav-link">Dashboard</Link>
                    )}
                    {user ? (
                        <div className="user-menu">
                            <img src={user.picture} alt={user.name} className="user-avatar" />
                            <span className="user-name">{user.name}</span>
                            <Link to="/signin" className="nav-link logout">Logout</Link>
                        </div>
                    ) : (
                        <Link to="/signin" className="nav-link signin">Sign In</Link>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;