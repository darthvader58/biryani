import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/dashboard.css';

const SparkLine = ({ data }) => {
    if (!data || data.length < 2) {
        return <div className="spark-empty">Not enough data yet</div>;
    }
    const w = 400;
    const h = 72;
    const mn = Math.min(...data);
    const mx = Math.max(...data);
    const pts = data.map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - mn) / (mx - mn || 1)) * h;
        return [x, y];
    });
    const d = 'M' + pts.map((p) => p.join(',')).join(' L');
    const fill = d + ` L${w},${h} L0,${h} Z`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 72, overflow: 'visible' }}>
            <defs>
                <linearGradient id="spk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1db954" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#1db954" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={fill} fill="url(#spk)" />
            <path d={d} fill="none" stroke="#1db954" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
};

const errorBadge = (errorType) => {
    const t = (errorType || '').toLowerCase();
    if (t.includes('no_error') || t.includes('no error')) return { cls: 'rb-ok', label: '✓ Correct' };
    if (t.includes('computational') || t.includes('calculation')) return { cls: 'rb-err', label: 'Calc Error' };
    if (t.includes('conceptual')) return { cls: 'rb-warn', label: 'Conceptual' };
    return { cls: 'rb-info', label: errorType || 'Unknown' };
};

const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Dashboard = ({ user }) => {
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState(null);
    const [topicPerformance, setTopicPerformance] = useState([]);
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUserRecords = useCallback(async () => {
        try {
            const response = await axios.get(`/api/dashboard/${user.email}`);
            const data = response.data;
            setRecords(data.problems || []);
            setStats(data.stats || {});

            const topicData = (data.analytics || []).map((item) => ({
                topic: item.topic,
                accuracy: item.total_problems > 0
                    ? Number(((item.total_problems - item.conceptual_errors - item.computational_errors) / item.total_problems * 100).toFixed(1))
                    : 0,
                count: item.total_problems,
            }));
            setTopicPerformance(topicData);

            const recentProblems = (data.problems || []).slice(0, 10).reverse();
            setProgressData(recentProblems.map((p) => Number(((p.confidence_score || 0) * 100).toFixed(0))));

            setLoading(false);
        } catch (err) {
            try {
                const legacyResponse = await axios.get(`/userFeedback/${user.email}/`);
                setRecords(legacyResponse.data.results || []);
                setStats({
                    total_problems: (legacyResponse.data.numConceptual || 0) + (legacyResponse.data.numComputational || 0),
                    conceptual_errors: legacyResponse.data.numConceptual || 0,
                    computational_errors: legacyResponse.data.numComputational || 0,
                    correct_solutions: 0,
                    avg_confidence: 0,
                });
                setLoading(false);
            } catch (legacyErr) {
                setError('Failed to load your records. Please try again later.');
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchUserRecords();
        else setLoading(false);
    }, [user, fetchUserRecords]);

    if (!user) {
        return (
            <div className="page">
                <div className="auth-prompt">
                    <h2 className="auth-prompt-title">Your Dashboard</h2>
                    <p className="auth-prompt-sub">Sign in to track your progress across all topics.</p>
                    <Link to="/signin" className="btn btn-primary">Sign In</Link>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="page">
                <div className="results-loading">
                    <div className="spinner spinner-lg" />
                    <div className="results-loading-title">Loading your dashboard…</div>
                </div>
            </div>
        );
    }

    const totalProblems = stats?.total_problems || 0;
    const correct = stats?.correct_solutions || 0;
    const conceptual = stats?.conceptual_errors || 0;
    const computational = stats?.computational_errors || 0;
    const avgConfidence = stats?.avg_confidence ? Math.round(stats.avg_confidence * 100) : 0;
    const accuracy = totalProblems > 0 ? Math.round((correct / totalProblems) * 100) : 0;

    const statCards = [
        { value: totalProblems, label: 'Problems Solved', delta: totalProblems > 0 ? `${correct} correct` : 'Start your first one' },
        { value: `${accuracy}%`, label: 'Accuracy', delta: `${correct} / ${totalProblems || 0}` },
        { value: `${avgConfidence}%`, label: 'Avg Confidence', delta: 'GPT-4 rating' },
        { value: conceptual + computational, label: 'Errors Caught', delta: `${conceptual} conceptual · ${computational} calc` },
    ];

    return (
        <div className="page page-wide">
            <div className="dashboard-head">
                <span className="eyebrow">Dashboard</span>
                <h1 className="page-title">Welcome back, {user.name?.split(' ')[0] || 'there'}</h1>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Stat tiles */}
            <div className="stats-grid">
                {statCards.map((s, i) => (
                    <div key={i} className="card stat-card">
                        <div className="stat-val">{s.value}</div>
                        <div className="stat-lbl">{s.label}</div>
                        <div className="stat-delta">{s.delta}</div>
                    </div>
                ))}
            </div>

            {/* Charts row */}
            <div className="chart-grid">
                <div className="card">
                    <div className="chart-title">Confidence Trend · Last 10 Problems</div>
                    <SparkLine data={progressData} />
                    <div className="spark-foot">
                        <span>Oldest</span>
                        <span>Most Recent</span>
                    </div>
                </div>

                <div className="card">
                    <div className="chart-title">Topic Accuracy</div>
                    {topicPerformance.length === 0 ? (
                        <div className="empty-state">No topics analyzed yet.</div>
                    ) : (
                        topicPerformance.map((t, i) => (
                            <div key={i} className="topic-row">
                                <div className="topic-info">
                                    <span>{t.topic || 'Unknown'}</span>
                                    <span style={{ fontFamily: 'var(--font-mono)' }}>{t.accuracy}%</span>
                                </div>
                                <div className="topic-track">
                                    <div className="topic-fill" style={{ width: `${t.accuracy}%`, opacity: 0.5 + i * 0.08 }} />
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Recent table */}
            <div className="card">
                <div className="recent-head">Recent Problems</div>
                {records.length === 0 ? (
                    <div className="empty-records">
                        <p>No problems analyzed yet.</p>
                        <Link to="/" className="btn btn-primary">Start Analyzing</Link>
                    </div>
                ) : (
                    <table className="r-table">
                        <thead>
                            <tr>
                                <th>Problem</th>
                                <th>Topic</th>
                                <th>Result</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.slice(0, 10).map((record, i) => {
                                const badge = errorBadge(record.errortype || record.error_type);
                                return (
                                    <tr key={record.id || i}>
                                        <td title={record.problemstatement || record.problem_statement}>
                                            {record.problemstatement || record.problem_statement || '—'}
                                        </td>
                                        <td>{record.topic || '—'}</td>
                                        <td>
                                            <span className={`result-badge ${badge.cls}`} style={{ fontSize: 10 }}>{badge.label}</span>
                                        </td>
                                        <td style={{ fontSize: 11 }}>{formatDate(record.timerecorded || record.created_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="results-actions">
                <Link to="/" className="btn btn-primary">Analyze New Problem</Link>
            </div>
        </div>
    );
};

export default Dashboard;
