import React, { useState } from 'react';
import ReportForm from './ReportForm';
import Dashboard from './Dashboard';
import SOSButton from './SOSButton';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div className="App">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">✦</div>
        <div>
          <p className="eyebrow">Safety, support, and action</p>
          <h1>SafeSHEE</h1>
          <p className="app-tagline">A calmer way to get help when it matters.</p>
        </div>
        <div className="header-status"><span className="status-dot" /> Safety centre</div>
      </header>

      <div className="app-container">
        <nav className="nav-tabs" aria-label="Primary navigation">
          <button 
            type="button"
            className={`nav-button ${activeTab === 'home' ? 'active' : ''}`}
            onClick={() => setActiveTab('home')}
            aria-current={activeTab === 'home' ? 'page' : undefined}
          >
            <span aria-hidden="true">⌂</span> Home
          </button>
          <button 
            type="button"
            className={`nav-button ${activeTab === 'report' ? 'active' : ''}`}
            onClick={() => setActiveTab('report')}
            aria-current={activeTab === 'report' ? 'page' : undefined}
          >
            <span aria-hidden="true">＋</span> Report incident
          </button>
          <button 
            type="button"
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
            aria-current={activeTab === 'dashboard' ? 'page' : undefined}
          >
            <span aria-hidden="true">▦</span> Live dashboard
          </button>
        </nav>

        {activeTab === 'home' && (
          <>
            <div className="hero-section">
              <div className="hero-copy">
                <p className="eyebrow">You are not alone</p>
                <h2>Your safety comes first.</h2>
                <p>One calm place to alert trusted responders, share your location, and document what happened.</p>
              </div>
              <SOSButton />
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon" aria-hidden="true">◷</span>
                <div><h3>24/7</h3><p>Always available</p></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon" aria-hidden="true">⌖</span>
                <div><h3>Live</h3><p>Location sharing</p></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon" aria-hidden="true">!</span>
                <div><h3>Instant</h3><p>Emergency alerts</p></div>
              </div>
              <div className="stat-card">
                <span className="stat-icon" aria-hidden="true">◉</span>
                <div><h3>Connected</h3><p>Response dashboard</p></div>
              </div>
            </div>

            <div className="home-guidance">
              <div><span className="guidance-number">01</span><div><h3>Need urgent help?</h3><p>Press SOS once. We will prepare an alert and location for responders.</p></div></div>
              <div><span className="guidance-number">02</span><div><h3>Want to report safely?</h3><p>Document an incident privately. Location sharing is always optional.</p></div></div>
            </div>
          </>
        )}

        {activeTab === 'report' && (
          <ReportForm />
        )}

        {activeTab === 'dashboard' && (
          <Dashboard />
        )}
      </div>
    </div>
  );
}

export default App;
