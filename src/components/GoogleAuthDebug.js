import React from 'react';

const GoogleAuthDebug = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    
    return (
        <div style={{ 
            background: '#1a1a1b', 
            color: '#d7dadc', 
            padding: '20px', 
            margin: '20px', 
            borderRadius: '8px',
            border: '1px solid #343536'
        }}>
            <h3>Google OAuth Debug Info</h3>
            <p><strong>Client ID:</strong> {clientId ? `${clientId.substring(0, 20)}...` : 'NOT FOUND'}</p>
            <p><strong>Status:</strong> {clientId ? '✅ Configured' : '❌ Missing'}</p>
            
            {!clientId && (
                <div style={{ background: '#ff4757', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
                    <strong>Error:</strong> Google Client ID not found!
                    <br />
                    <small>Make sure REACT_APP_GOOGLE_CLIENT_ID is set in your .env file</small>
                </div>
            )}
            
            <details style={{ marginTop: '15px' }}>
                <summary style={{ cursor: 'pointer', color: '#ff4500' }}>Setup Instructions</summary>
                <ol style={{ marginTop: '10px', fontSize: '14px' }}>
                    <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#ff4500' }}>Google Cloud Console</a></li>
                    <li>Create a new project or select existing one</li>
                    <li>Enable Google+ API</li>
                    <li>Create OAuth 2.0 credentials</li>
                    <li>Add http://localhost:3000 to authorized origins</li>
                    <li>Copy Client ID to .env file as REACT_APP_GOOGLE_CLIENT_ID</li>
                    <li>Restart the development server</li>
                </ol>
            </details>
        </div>
    );
};

export default GoogleAuthDebug;