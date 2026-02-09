/**
 * AI-Powered Analytics Dashboard
 * Real-time insights into incident patterns and trends
 * Police-only access
 */

import React, { useEffect, useState } from 'react';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const AnalyticsDashboard = () => {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [timeTrends, setTimeTrends] = useState(null);
  const [riskDistribution, setRiskDistribution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshTime, setRefreshTime] = useState(new Date());

  // Role check
  useEffect(() => {
    if (!user || user.role !== 'police') {
      navigate('/');
    }
  }, [user, navigate]);

  // Fetch analytics data
  const fetchAnalytics = async () => {
    try {
      setError('');
      const baseURL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

      // Fetch all analytics in parallel
      const [summaryRes, categoryRes, trendsRes, riskRes] = await Promise.all([
        fetch(`${baseURL}/analytics/summary`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseURL}/analytics/category-distribution`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseURL}/analytics/time-trends`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${baseURL}/analytics/risk-distribution`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }

      if (categoryRes.ok) {
        const data = await categoryRes.json();
        setCategoryData(data.categories || []);
      }

      if (trendsRes.ok) {
        setTimeTrends(await trendsRes.json());
      }

      if (riskRes.ok) {
        const dist = await riskRes.json();
        // Transform for pie chart
        const pieData = [
          { name: 'Low Risk', value: dist.low, fill: '#10b981' },
          { name: 'Medium Risk', value: dist.medium, fill: '#f59e0b' },
          { name: 'High Risk', value: dist.high, fill: '#ef4444' }
        ];
        setRiskDistribution(pieData);
      }

      setRefreshTime(new Date());
    } catch (err) {
      setError(`Failed to fetch analytics: ${err.message}`);
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchAnalytics();
    }
  }, [token]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchAnalytics();
    }, 30000);

    return () => clearInterval(interval);
  }, [token]);

  if (!user || user.role !== 'police') {
    return <div style={{ padding: '20px', color: '#ef4444' }}>Unauthorized</div>;
  }

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1400px',
      margin: '0 auto',
      backgroundColor: '#0f172a',
      color: '#fff',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 'bold',
          marginBottom: '8px'
        }}>📊 AI Analytics Dashboard</h1>
        <p style={{
          color: '#9ca3af',
          marginBottom: '8px',
          fontSize: '14px'
        }}>Real-time insights into incident patterns and AI predictions</p>
        <p style={{
          color: '#6b7280',
          fontSize: '12px'
        }}>Last updated: {refreshTime.toLocaleTimeString()}</p>
      </div>

      {/* Error message */}
      {error && (
        <div style={{
          marginBottom: '20px',
          padding: '12px',
          backgroundColor: '#7f1d1d',
          border: '1px solid #dc2626',
          borderRadius: '4px',
          color: '#fecaca'
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '32px'
      }}>
        <KPICard
          title="Total Reports"
          value={summary?.totalReports || 0}
          icon="📋"
          color="#3b82f6"
        />
        <KPICard
          title="Active Cases"
          value={summary?.activeReports || 0}
          icon="🚨"
          color="#ef4444"
        />
        <KPICard
          title="Resolved"
          value={summary?.resolvedReports || 0}
          icon="✅"
          color="#10b981"
        />
        <KPICard
          title="High-Risk"
          value={summary?.highRiskReports || 0}
          icon="⚠️"
          color="#f59e0b"
        />
        <KPICard
          title="Avg Response (hrs)"
          value={summary?.avgResponseTimeHours || 0}
          icon="⏱️"
          color="#8b5cf6"
        />
        <KPICard
          title="Resolution Rate"
          value={`${summary?.resolutionRate || 0}%`}
          icon="📈"
          color="#06b6d4"
        />
      </div>

      {/* Charts Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Category Distribution Bar Chart */}
        {categoryData.length > 0 && (
          <ChartCard title="Incidents by Category">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="category"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '4px'
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Risk Distribution Pie Chart */}
        {riskDistribution && (
          <ChartCard title="Risk Level Distribution">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        )}
      </div>

      {/* Time Trends */}
      {timeTrends && timeTrends.daily.length > 0 && (
        <ChartCard title="7-Day Trend">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={timeTrends.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="date"
                stroke="#9ca3af"
                style={{ fontSize: '12px' }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151'
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#8b5cf6"
                dot={{ fill: '#8b5cf6' }}
                strokeWidth={2}
                name="Reports"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Hourly Distribution */}
      {timeTrends && timeTrends.hourly.length > 0 && (
        <ChartCard title="24-Hour Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeTrends.hourly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="hour"
                stroke="#9ca3af"
                label={{ value: 'Hour of Day', position: 'insideBottomRight', offset: -5 }}
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151'
                }}
                formatter={(value) => `${value} incidents`}
              />
              <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Refresh Button */}
      <div style={{ textAlign: 'center', marginTop: '32px' }}>
        <button
          onClick={fetchAnalytics}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
        >
          🔄 Refresh Analytics
        </button>
      </div>
    </div>
  );
};

/**
 * KPI Card Component
 */
const KPICard = ({ title, value, icon, color }) => (
  <div style={{
    padding: '20px',
    backgroundColor: '#1e293b',
    border: `2px solid ${color}`,
    borderRadius: '8px',
    textAlign: 'center'
  }}>
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '8px' }}>
      {title}
    </div>
    <div style={{ fontSize: '28px', fontWeight: 'bold', color: color }}>
      {typeof value === 'number' && value.toLocaleString()}
      {typeof value === 'string' && value}
    </div>
  </div>
);

/**
 * Chart Card Wrapper
 */
const ChartCard = ({ title, children }) => (
  <div style={{
    padding: '20px',
    backgroundColor: '#1e293b',
    border: '1px solid #374151',
    borderRadius: '8px',
    gridColumn: 'span 1'
  }}>
    <h2 style={{
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '16px',
      color: '#f1f5f9'
    }}>
      {title}
    </h2>
    {children}
  </div>
);

export default AnalyticsDashboard;
