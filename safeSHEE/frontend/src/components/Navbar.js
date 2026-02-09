import React, { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Navbar(){
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  function doLogout(){ logout(); navigate('/login'); }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/dashboard" className="brand">safeSHEE</Link>
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {user.role === 'admin' && <Link to="/admin">Admin</Link>}
            <button className="btn-ghost" onClick={doLogout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
