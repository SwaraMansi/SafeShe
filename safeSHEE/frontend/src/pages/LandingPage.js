import React, { useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../styles/LandingPage.css';

function LandingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (user) {
      if (user.role === 'police') {
        navigate('/police');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/user');
      }
    }
  }, [user, navigate]);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-logo">
            <span className="logo-icon">🛡️</span>
            <span className="logo-text">safeSHEE</span>
          </div>
          <ul className="nav-menu">
            <li><a href="#home" onClick={() => scrollToSection('home')}>Home</a></li>
            <li><a href="#features" onClick={() => scrollToSection('features')}>Features</a></li>
            <li><a href="#how-it-works" onClick={() => scrollToSection('how-it-works')}>How It Works</a></li>
            <li><a href="#contact" onClick={() => scrollToSection('contact')}>Contact</a></li>
          </ul>
          <div className="nav-buttons">
            <Link to="/login" className="nav-btn login-btn">Login</Link>
            <Link to="/register" className="nav-btn signup-btn">Sign Up</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Your Safety, <span className="highlight">Our Priority</span>
            </h1>
            <p className="hero-subtitle">
              Real-time emergency alerts, AI-powered risk detection, and instant police coordination. 
              Stay safe with safeSHEE.
            </p>
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Live Support</span>
              </div>
              <div className="stat">
                <span className="stat-number">&lt;100ms</span>
                <span className="stat-label">Alert Response</span>
              </div>
              <div className="stat">
                <span className="stat-number">AI</span>
                <span className="stat-label">Risk Prediction</span>
              </div>
            </div>
            <div className="hero-buttons">
              <Link to="/register" className="btn btn-primary">Get Started Now</Link>
              <button className="btn btn-secondary" onClick={() => scrollToSection('features')}>
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-illustration">
              <div className="phone-frame">
                <div className="phone-screen">
                  <div className="app-header">safeSHEE</div>
                  <div className="app-content">
                    <div className="sos-button-demo">SOS</div>
                    <div className="map-demo"></div>
                    <div className="alert-demo">Alert Active</div>
                  </div>
                </div>
              </div>
              <div className="floating-icons">
                <div className="icon-badge location">📍</div>
                <div className="icon-badge alert">🚨</div>
                <div className="icon-badge shield">🛡️</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features">
        <div className="section-header">
          <h2>Powerful Features</h2>
          <p>Everything you need to stay safe</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">🆘</div>
            <h3>One-Tap SOS</h3>
            <p>Instantly trigger emergency alerts with your location shared to authorities in real-time.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📍</div>
            <h3>Live Location Tracking</h3>
            <p>Real-time GPS tracking with automatic updates every 5 seconds during active alerts.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎤</div>
            <h3>Voice Distress Detection</h3>
            <p>AI-powered voice recognition detects keywords like "help" and triggers silent SOS automatically.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🤝</div>
            <h3>Emergency Contacts</h3>
            <p>Manage trusted contacts who receive instant SMS notifications when you need help.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🔴</div>
            <h3>Red Zone Detection</h3>
            <p>Get alerted when entering high-risk areas based on historical incident data.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Police Integration</h3>
            <p>Real-time dashboard for law enforcement with analytics and case management tools.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📸</div>
            <h3>Auto Evidence Capture</h3>
            <p>Automatic photo capture when SOS is triggered for evidence documentation.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🧠</div>
            <h3>AI Risk Prediction</h3>
            <p>Machine learning algorithm predicts incident severity and prioritizes cases.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🗺️</div>
            <h3>Crime Heatmap</h3>
            <p>Visual representation of high-risk areas and incident hotspots in your region.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="how-it-works">
        <div className="section-header">
          <h2>How It Works</h2>
          <p>Simple and effective emergency response</p>
        </div>

        <div className="steps-container">
          <div className="step">
            <div className="step-number">1</div>
            <h3>Register</h3>
            <p>Create your account with email and password. Add your emergency contacts.</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">2</div>
            <h3>Setup</h3>
            <p>Enable location permissions and configure your safety preferences.</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">3</div>
            <h3>Alert</h3>
            <p>Tap SOS or use voice/gesture detection to trigger emergency alert instantly.</p>
          </div>

          <div className="step-arrow">→</div>

          <div className="step">
            <div className="step-number">4</div>
            <h3>Response</h3>
            <p>Police receive real-time notification. Share location. Stay safe.</p>
          </div>
        </div>
      </section>

      {/* Key Benefits Section */}
      <section className="benefits">
        <div className="section-header">
          <h2>Why Choose safeSHEE?</h2>
          <p>The most trusted safety platform</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-item">
            <div className="benefit-icon">⚡</div>
            <h3>Ultra-Fast Response</h3>
            <p>Real-time WebSocket alerts reach police in under 100 milliseconds</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">🔒</div>
            <h3>Privacy Protected</h3>
            <p>End-to-end encryption and secure JWT authentication</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">🌍</div>
            <h3>Global Coverage</h3>
            <p>Works everywhere with internet connectivity</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">📱</div>
            <h3>Mobile First</h3>
            <p>Optimized for smartphones with offline capabilities</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">🎯</div>
            <h3>Accurate Prediction</h3>
            <p>AI-powered risk scoring with 90%+ accuracy</p>
          </div>

          <div className="benefit-item">
            <div className="benefit-icon">👮</div>
            <h3>Official Integration</h3>
            <p>Direct integration with law enforcement authorities</p>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials">
        <div className="section-header">
          <h2>What Users Say</h2>
          <p>Real stories from real users</p>
        </div>

        <div className="testimonials-grid">
          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="testimonial-text">
              "safeSHEE saved my life. When I was in trouble, I just tapped the SOS button and help arrived within minutes!"
            </p>
            <p className="testimonial-author">- Priya M., Delhi</p>
          </div>

          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="testimonial-text">
              "As a police officer, this platform has revolutionized how we respond to emergencies. Real-time tracking is incredible."
            </p>
            <p className="testimonial-author">- Officer Rahul S., Mumbai Police</p>
          </div>

          <div className="testimonial-card">
            <div className="stars">⭐⭐⭐⭐⭐</div>
            <p className="testimonial-text">
              "The red zone detection feature alerted me before I entered an unsafe area. Very impressed with the AI technology."
            </p>
            <p className="testimonial-author">- Anjali K., Bangalore</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Stay Safe?</h2>
          <p>Join thousands of users who trust safeSHEE for their safety</p>
          <div className="cta-buttons">
            <Link to="/register" className="btn btn-primary btn-large">Create Your Account</Link>
            <Link to="/login" className="btn btn-secondary btn-large">Already Registered? Login</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>safeSHEE</h3>
            <p>Empowering women with real-time safety solutions</p>
          </div>

          <div className="footer-section">
            <h4>Quick Links</h4>
            <ul>
              <li><a href="#home">Home</a></li>
              <li><a href="#features">Features</a></li>
              <li><a href="#how-it-works">How It Works</a></li>
              <li><Link to="/login">Login</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Support</h4>
            <ul>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#help">Help Center</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
              <li><a href="#terms">Terms of Service</a></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Follow Us</h4>
            <div className="social-links">
              <a href="#facebook">Facebook</a>
              <a href="#twitter">Twitter</a>
              <a href="#instagram">Instagram</a>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <p>&copy; 2026 safeSHEE. All rights reserved. | Designed for your safety</p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
