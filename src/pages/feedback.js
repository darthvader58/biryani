import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/feedback.css';

function Feedback({ user }) {
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || '',
        type: 'general',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitStatus(null);
        try {
            const response = await fetch('/api/feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    timestamp: new Date().toISOString(),
                    userId: user?.id || null,
                }),
            });
            const data = await response.json();
            if (response.ok) {
                setSubmitStatus('success');
                setFormData({
                    name: user?.name || '',
                    email: user?.email || '',
                    type: 'general',
                    message: '',
                });
            } else {
                throw new Error(data.error || 'Failed to submit feedback');
            }
        } catch (err) {
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitStatus === 'success') {
        return (
            <div className="page" style={{ textAlign: 'center', paddingTop: 80 }}>
                <svg
                    width="48"
                    height="48"
                    viewBox="0 0 24 24"
                    fill="var(--green)"
                    style={{ margin: '0 auto 16px', display: 'block' }}
                >
                    <path d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                </svg>
                <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--t1)', marginBottom: 8 }}>
                    Thank you!
                </div>
                <div style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 28 }}>
                    Your feedback helps us improve ForMath.
                </div>
                <Link to="/" className="btn btn-primary">Back to Home</Link>
            </div>
        );
    }

    return (
        <div className="page" style={{ maxWidth: 640 }}>
            <div className="page-head">
                <span className="eyebrow">Feedback</span>
                <h1 className="page-title">Share your thoughts</h1>
                <p className="page-sub">
                    Help us make ForMath better for students everywhere.
                </p>
            </div>

            <form className="card card-lg feedback-form" onSubmit={handleSubmit}>
                <div className="form-grid-2">
                    <div className="form-row" style={{ marginTop: 0 }}>
                        <label className="form-label" htmlFor="fb-name">Name</label>
                        <input
                            id="fb-name"
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Your name"
                            className="form-input"
                        />
                    </div>
                    <div className="form-row" style={{ marginTop: 0 }}>
                        <label className="form-label" htmlFor="fb-email">Email</label>
                        <input
                            id="fb-email"
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            placeholder="you@example.com"
                            className="form-input"
                        />
                    </div>
                </div>

                <div className="form-row">
                    <label className="form-label" htmlFor="fb-type">Feedback Type</label>
                    <select
                        id="fb-type"
                        name="type"
                        value={formData.type}
                        onChange={handleChange}
                        required
                        className="form-input"
                    >
                        <option value="general">General Feedback</option>
                        <option value="bug">Bug Report</option>
                        <option value="feature">Feature Request</option>
                        <option value="improvement">Improvement Suggestion</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div className="form-row">
                    <label className="form-label" htmlFor="fb-message">Message</label>
                    <textarea
                        id="fb-message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        required
                        rows={6}
                        placeholder="Tell us about your experience, feature requests, or any issues…"
                        className="form-textarea"
                    />
                </div>

                {submitStatus === 'error' && (
                    <div className="error-message">
                        Sorry, there was an error submitting your feedback. Please try again.
                    </div>
                )}

                <div className="step-actions">
                    <button type="submit" className="btn btn-primary btn-lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <div className="spinner" /> Sending…
                            </>
                        ) : (
                            <>
                                Send Feedback
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                                </svg>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Feedback;
