import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Login(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setError('');
    try{
      const { user } = await login({ email, password });
      // Role-based routing
      if (user.role === 'police') {
        navigate('/police');
      } else {
        navigate('/user');
      }
    }catch(err){ 
      setError(err.message || 'Login failed');
      console.error('Login error:', err);
    }
  }

  return (
    <div className="auth-card">
      <h2>Welcome back</h2>
      {error && <div className="error-message" style={{color:'#ff1744', marginBottom:12}}>{error}</div>}
      <form onSubmit={submit}>
        <label>Email</label>
        <input 
          type="email" 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          required 
          disabled={isLoading}
        />
        <label>Password</label>
        <input 
          type="password" 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          required 
          disabled={isLoading}
        />
        <button className="btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      <p style={{marginTop:12}}>Don't have an account? <Link to="/register">Register</Link></p>
    </div>
  );
}

export default Login;

