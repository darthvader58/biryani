import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/notfound.css';

const NotFound = () => (
    <div className="page">
        <div className="nf">
            <div className="nf-code">404</div>
            <div className="nf-title">Page not found</div>
            <div className="nf-sub">
                This equation doesn't have a solution &mdash; or the page was moved.
            </div>
            <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
    </div>
);

export default NotFound;
