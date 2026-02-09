import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Register(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const { register, isLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  async function submit(e){
    e.preventDefault();
    setError('');
    if (!name || !email || !password) {
      setError('All fields required');
      return;
    }
    try{
      const { user } = await register({ name, email, password, role });
      // Role-based routing
      if (user.role === 'police') {
        navigate('/police');
      } else {
        navigate('/user');
      }
    }catch(err){ 
      setError(err.message || 'Registration failed');
      console.error('Registration error:', err);
    }
  }

  return (
    <div className="auth-card">
      <h2>Create account</h2>
      {error && <div className="error-message" style={{color:'#ff1744', marginBottom:12}}>{error}</div>}
      <form onSubmit={submit}>
        <label>Name</label>
        <input 
          value={name} 
          onChange={e=>setName(e.target.value)} 
          required 
          disabled={isLoading}
        />
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
        <label>Account Type</label>
        <select 
          value={role} 
          onChange={e=>setRole(e.target.value)} 
          disabled={isLoading}
          style={{padding:'8px', borderRadius:'4px', border:'1px solid #ccc', width:'100%'}}
        >
          <option value="user">Regular User</option>
          <option value="police">Police Officer</option>
        </select>
        <button className="btn-primary" type="submit" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Register'}
        </button>
      </form>
    </div>
  );
}

export default Register;
