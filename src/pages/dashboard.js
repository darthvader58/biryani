import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import '../styles/dashboard.css';

const Dashboard = ({ user }) => {
    const [records, setRecords] = useState([]);
    const [stats, setStats] = useState(null);
    // eslint-disable-next-line no-unused-vars
    const [analytics, setAnalytics] = useState([]);
    const [topicPerformance, setTopicPerformance] = useState([]);
    const [progressData, setProgressData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchUserRecords = useCallback(async () => {
        try {
            // Use relative URL for API calls
            const response = await axios.get(`/api/dashboard/${user.email}`);
            const data = response.data;
            
            setRecords(data.problems || []);
            setAnalytics(data.analytics || []);
            setStats(data.stats || {});
            
            // Process topic performance data
            const topicData = data.analytics.map(item => ({
                topic: item.topic,
                accuracy: item.total_problems > 0 ? 
                    ((item.total_problems - item.conceptual_errors - item.computational_errors) / item.total_problems * 100).toFixed(1) : 0,
                total: item.total_problems,
                errors: item.conceptual_errors + item.computational_errors
            }));
            setTopicPerformance(topicData);
            
            // Process progress data (last 10 problems)
            const recentProblems = data.problems.slice(0, 10).reverse();
            const progressChart = recentProblems.map((problem, index) => ({
                problem: index + 1,
                confidence: (problem.confidence_score * 100).toFixed(1),
                correct: problem.error_type === 'no_error' ? 100 : 0
            }));
            setProgressData(progressChart);
            
            setLoading(false);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            // Fallback to legacy endpoint with relative URL
            try {
                const legacyResponse = await axios.get(`/userFeedback/${user.email}/`);
                setRecords(legacyResponse.data.results || []);
                setStats({
                    total_problems: (legacyResponse.data.numConceptual || 0) + (legacyResponse.data.numComputational || 0),
                    conceptual_errors: legacyResponse.data.numConceptual || 0,
                    computational_errors: legacyResponse.data.numComputational || 0,
                    correct_solutions: 0,
                    avg_confidence: 0
                });
                setLoading(false);
            } catch (legacyErr) {
                console.error('Error fetching legacy records:', legacyErr);
                setError('Failed to load your records. Please try again later.');
                setLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            fetchUserRecords();
        } else {
            setLoading(false);
        }
    }, [user, fetchUserRecords]);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getErrorBadgeClass = (errorType) => {
        if (errorType?.includes('no error')) return 'no-error';
        if (errorType?.includes('conceptual')) return 'conceptual';
        return 'calculation';
    };

    if (!user) {
        return (
            <div className="dashboard-container">
                <div className="not-signed-in">
                    <h2>Please Sign In</h2>
                    <p>You need to sign in to view your dashboard</p>
                    <a href="/signin" className="signin-link">Go to Sign In</a>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading your dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-header">
                <h1>Your Dashboard</h1>
                <p>Welcome back, {user.name}!</p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {stats && (
                <div className="stats-section">
                    <h2>Your Performance Overview</h2>
                    <div className="stats-grid">
                        <div className="stat-card total">
                            <div className="stat-value">{stats.total_problems || 0}</div>
                            <div className="stat-label">Total Problems</div>
                        </div>
                        <div className="stat-card correct">
                            <div className="stat-value">{stats.correct_solutions || 0}</div>
                            <div className="stat-label">Correct Solutions</div>
                            <div className="stat-percent">
                                {stats.total_problems > 0 ? 
                                    ((stats.correct_solutions / stats.total_problems) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="stat-card conceptual">
                            <div className="stat-value">{stats.conceptual_errors || 0}</div>
                            <div className="stat-label">Conceptual Errors</div>
                            <div className="stat-percent">
                                {stats.total_problems > 0 ? 
                                    ((stats.conceptual_errors / stats.total_problems) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="stat-card calculation">
                            <div className="stat-value">{stats.computational_errors || 0}</div>
                            <div className="stat-label">Computational Errors</div>
                            <div className="stat-percent">
                                {stats.total_problems > 0 ? 
                                    ((stats.computational_errors / stats.total_problems) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="stat-card confidence">
                            <div className="stat-value">
                                {stats.avg_confidence ? (stats.avg_confidence * 100).toFixed(1) : 0}%
                            </div>
                            <div className="stat-label">Avg Confidence</div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="charts-section">
                        {/* Error Distribution Pie Chart */}
                        {stats.total_problems > 0 && (
                            <div className="chart-container">
                                <h3>Error Distribution</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Correct', value: stats.correct_solutions || 0, color: '#4CAF50' },
                                                { name: 'Conceptual Errors', value: stats.conceptual_errors || 0, color: '#FF9800' },
                                                { name: 'Computational Errors', value: stats.computational_errors || 0, color: '#F44336' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={70}
                                            innerRadius={0}
                                            dataKey="value"
                                            label={({ name, percent }) => 
                                                percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''
                                            }
                                            labelLine={true}
                                        >
                                            {[
                                                { name: 'Correct', value: stats.correct_solutions || 0, color: '#4CAF50' },
                                                { name: 'Conceptual Errors', value: stats.conceptual_errors || 0, color: '#FF9800' },
                                                { name: 'Computational Errors', value: stats.computational_errors || 0, color: '#F44336' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Topic Performance */}
                        {topicPerformance.length > 0 && (
                            <div className="chart-container">
                                <h3>Performance by Topic</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={topicPerformance}>
                                        <CartesianGrid 
                                            strokeDasharray="3 3" 
                                            stroke="var(--glass-border)" 
                                        />
                                        <XAxis 
                                            dataKey="topic" 
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                            axisLine={{ stroke: 'var(--glass-border)' }}
                                        />
                                        <YAxis 
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                            axisLine={{ stroke: 'var(--glass-border)' }}
                                            label={{ 
                                                value: 'Accuracy %', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { textAnchor: 'middle', fill: 'var(--text-primary)' }
                                            }}
                                        />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'var(--glass-bg)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                color: 'var(--text-primary)',
                                                backdropFilter: 'blur(20px)'
                                            }}
                                        />
                                        <Bar 
                                            dataKey="accuracy" 
                                            fill="#2196F3" 
                                            name="Accuracy %" 
                                            radius={[4, 4, 0, 0]}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Progress Over Time */}
                        {progressData.length > 0 && (
                            <div className="chart-container">
                                <h3>Recent Progress</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={progressData}>
                                        <CartesianGrid 
                                            strokeDasharray="3 3" 
                                            stroke="var(--glass-border)" 
                                        />
                                        <XAxis 
                                            dataKey="problem" 
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                            axisLine={{ stroke: 'var(--glass-border)' }}
                                            label={{ 
                                                value: 'Problem #', 
                                                position: 'insideBottomLeft', 
                                                offset: 0,
                                                style: { textAnchor: 'middle', fill: 'var(--text-primary)' }
                                            }}
                                        />
                                        <YAxis 
                                            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
                                            axisLine={{ stroke: 'var(--glass-border)' }}
                                            label={{ 
                                                value: 'Percentage', 
                                                angle: -90, 
                                                position: 'insideLeft',
                                                style: { textAnchor: 'middle', fill: 'var(--text-primary)' }
                                            }}
                                        />
                                        <Tooltip 
                                            contentStyle={{
                                                backgroundColor: 'var(--glass-bg)',
                                                border: '1px solid var(--glass-border)',
                                                borderRadius: '12px',
                                                color: 'var(--text-primary)',
                                                backdropFilter: 'blur(20px)'
                                            }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="confidence" 
                                            stroke="#4CAF50" 
                                            name="Confidence %" 
                                            strokeWidth={3}
                                            dot={{ fill: '#4CAF50', strokeWidth: 2, r: 5 }}
                                            activeDot={{ r: 7, fill: '#4CAF50', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="correct" 
                                            stroke="#2196F3" 
                                            name="Correct %" 
                                            strokeWidth={3}
                                            dot={{ fill: '#2196F3', strokeWidth: 2, r: 5 }}
                                            activeDot={{ r: 7, fill: '#2196F3', stroke: '#fff', strokeWidth: 2 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="records-section">
                <h2>Problem History</h2>
                {records.length === 0 ? (
                    <div className="no-records">
                        <p>No problems analyzed yet</p>
                        <a href="/" className="start-btn">Start Analyzing</a>
                    </div>
                ) : (
                    <div className="records-list">
                        {records.map((record, index) => (
                            <div key={record.id || index} className="record-card">
                                <div className="record-header">
                                    <span className="record-number">#{records.length - index}</span>
                                    <span className={`error-badge ${getErrorBadgeClass(record.errortype)}`}>
                                        {record.errortype || 'Unknown'}
                                    </span>
                                </div>
                                <div className="record-body">
                                    <div className="problem-statement">
                                        <strong>Problem:</strong> {record.problemstatement || 'N/A'}
                                    </div>
                                    <div className="record-date">
                                        <small>{formatDate(record.timerecorded)}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="dashboard-actions">
                <a href="/" className="action-btn primary">
                    Analyze New Problem
                </a>
            </div>
        </div>
    );
};

export default Dashboard;