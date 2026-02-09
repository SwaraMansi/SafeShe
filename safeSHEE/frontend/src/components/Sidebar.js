import React from 'react';
import { Link } from 'react-router-dom';

function Sidebar(){
  return (
    <aside className="sidebar">
      <div className="brand">safeSHEE</div>
      <nav className="side-nav">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/report">Report</Link>
        <Link to="/contacts">Contacts</Link>
        <Link to="/police">Police</Link>
      </nav>
    </aside>
  );
}

export default Sidebar;
