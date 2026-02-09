import React, { useEffect, useState } from 'react';
import { getContacts, saveContact, deleteContact } from '../mock/mockData';

function Contacts(){
  const [contacts, setContacts] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'', primary:false });

  useEffect(()=>{ refresh(); }, []);
  async function refresh(){ const data = await getContacts(); setContacts(data); }

  function edit(c){ setEditing(c.id); setForm(c); }
  function clear(){ setEditing(null); setForm({ name:'', phone:'', primary:false }); }

  async function submit(e){ e.preventDefault(); await saveContact(form); clear(); refresh(); }
  async function remove(id){ await deleteContact(id); refresh(); }

  return (
    <div className="contacts-page">
      <h2>Emergency Contacts</h2>
      <div className="admin-grid">
        <div className="panel">
          <form onSubmit={submit} className="contact-form">
            <label>Name</label>
            <input value={form.name} onChange={e=>setForm({...form, name:e.target.value})} required />
            <label>Phone</label>
            <input value={form.phone} onChange={e=>setForm({...form, phone:e.target.value})} required />
            <label><input type="checkbox" checked={form.primary} onChange={e=>setForm({...form, primary:e.target.checked})} /> Primary</label>
            <div style={{marginTop:8}}>
              <button className="btn-primary" type="submit">Save</button>
              <button type="button" className="btn-secondary" onClick={clear} style={{marginLeft:8}}>Clear</button>
            </div>
          </form>
        </div>
        <div className="panel">
          <h3>Saved Contacts</h3>
          <ul className="alerts-list">
            {contacts.map(c=> (
              <li key={c.id} className="alert-row">
                <div>
                  <strong>{c.name}</strong>
                  <div className="small">{c.phone} {c.primary && '• Primary'}</div>
                </div>
                <div>
                  <button className="btn-secondary" onClick={()=>edit(c)}>Edit</button>
                  <button className="btn-secondary" onClick={()=>remove(c.id)} style={{marginLeft:8}}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Contacts;
