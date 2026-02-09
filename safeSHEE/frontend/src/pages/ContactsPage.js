import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function ContactsPage() {
  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    relationship: '',
    is_primary: false
  });

  useEffect(() => {
    if (!user) navigate('/login');
    fetchContacts();
  }, [user, token, navigate]);

  async function fetchContacts() {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/contacts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      setContacts(data.contacts || []);
      setError('');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching contacts:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      phone: '',
      relationship: '',
      is_primary: false
    });
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      setError('Name and phone required');
      return;
    }

    try {
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `http://localhost:5000/contacts/${editingId}`
        : 'http://localhost:5000/contacts';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      await fetchContacts();
      resetForm();
      setError('');
    } catch (err) {
      setError(err.message);
      console.error('Submit error:', err);
    }
  }

  async function handleEdit(contact) {
    setFormData({
      name: contact.name,
      phone: contact.phone,
      relationship: contact.relationship,
      is_primary: contact.is_primary === 1
    });
    setEditingId(contact.id);
    setShowForm(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this contact?')) return;

    try {
      const response = await fetch(`http://localhost:5000/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await fetchContacts();
    } catch (err) {
      setError(err.message);
      console.error('Delete error:', err);
    }
  }

  async function handleSetPrimary(id) {
    try {
      const response = await fetch(`http://localhost:5000/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_primary: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      await fetchContacts();
    } catch (err) {
      setError(err.message);
      console.error('Error setting primary:', err);
    }
  }

  return (
    <div className="contacts-page-container">
      <header className="contacts-header">
        <h1>📞 Emergency Contacts</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? '✕ Cancel' : '+ Add Contact'}
        </button>
      </header>

      {error && (
        <div className="error-message" style={{ color: '#ff1744', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {showForm && (
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div className="form-group">
            <label>Relationship</label>
            <input
              type="text"
              value={formData.relationship}
              onChange={e => setFormData({ ...formData, relationship: e.target.value })}
              placeholder="Friend, Family, etc."
            />
          </div>

          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="primary"
              checked={formData.is_primary}
              onChange={e => setFormData({ ...formData, is_primary: e.target.checked })}
            />
            <label htmlFor="primary">Set as primary contact</label>
          </div>

          <div className="button-group">
            <button type="submit" className="btn-primary">
              {editingId ? '✏️ Update' : '➕ Add'} Contact
            </button>
            <button type="button" className="btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p>Loading contacts...</p>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <p>No emergency contacts yet.</p>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            Add your first contact
          </button>
        </div>
      ) : (
        <div className="contacts-grid">
          {contacts.map(contact => (
            <div key={contact.id} className={`contact-card ${contact.is_primary ? 'primary' : ''}`}>
              {contact.is_primary && (
                <div className="primary-badge">⭐ PRIMARY</div>
              )}
              <div className="contact-info">
                <h3>{contact.name}</h3>
                <p className="relationship">{contact.relationship || 'Contact'}</p>
              </div>

              <div className="contact-actions">
                <a href={`tel:${contact.phone}`} className="btn-action btn-call">
                  📞 Call
                </a>
                <a href={`sms:${contact.phone}`} className="btn-action btn-sms">
                  💬 SMS
                </a>
              </div>

              <div className="contact-buttons">
                {!contact.is_primary && (
                  <button
                    className="btn-small btn-primary"
                    onClick={() => handleSetPrimary(contact.id)}
                    title="Set as primary contact"
                  >
                    Set Primary
                  </button>
                )}
                <button
                  className="btn-small btn-edit"
                  onClick={() => handleEdit(contact)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn-small btn-delete"
                  onClick={() => handleDelete(contact.id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .contacts-page-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
        }

        .contacts-header {
          background: white;
          padding: 20px;
          borderRadius: 8px;
          marginBottom: 20px;
          display: flex;
          justifyContent: space-between;
          alignItems: center;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .contacts-header h1 {
          margin: 0;
          color: #333;
        }

        .contact-form {
          background: white;
          padding: 20px;
          borderRadius: 8px;
          marginBottom: 20px;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          marginBottom: 16px;
        }

        .form-group label {
          display: block;
          marginBottom: 6px;
          fontWeight: bold;
          color: #333;
        }

        .form-group input[type="text"],
        .form-group input[type="tel"] {
          width: 100%;
          padding: 10px;
          borderRadius: 4px;
          border: 1px solid #ddd;
          fontSize: 1em;
          boxSizing: border-box;
        }

        .form-group.checkbox {
          display: flex;
          alignItems: center;
          gap: 10px;
          marginBottom: 16px;
        }

        .form-group.checkbox input {
          margin: 0;
          cursor: pointer;
        }

        .form-group.checkbox label {
          margin: 0;
          cursor: pointer;
          fontWeight: normal;
        }

        .button-group {
          display: flex;
          gap: 10px;
          marginTop: 20px;
        }

        .btn-primary, .btn-secondary, .btn-small {
          padding: 10px 20px;
          borderRadius: 4px;
          border: none;
          cursor: pointer;
          fontWeight: bold;
          transition: all 0.3s;
        }

        .btn-primary {
          background: #667eea;
          color: white;
          flex: 1;
        }

        .btn-primary:hover {
          background: #5568d3;
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
          flex: 1;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-small {
          padding: 6px 12px;
          fontSize: 0.9em;
          flex: 1;
        }

        .btn-edit {
          background: #2196F3;
          color: white;
        }

        .btn-edit:hover {
          background: #1976D2;
        }

        .btn-delete {
          background: #f44336;
          color: white;
        }

        .btn-delete:hover {
          background: #da190b;
        }

        .empty-state {
          background: white;
          padding: 40px;
          borderRadius: 8px;
          textAlign: center;
          color: #666;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .contacts-grid {
          display: grid;
          gridTemplateColumns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .contact-card {
          background: white;
          borderRadius: 8px;
          padding: 16px;
          boxShadow: 0 2px 8px rgba(0,0,0,0.1);
          transition: all 0.3s;
          position: relative;
          border-left: 4px solid #667eea;
        }

        .contact-card.primary {
          border-left-color: #ffc107;
          backgroundColor: #fffef5;
        }

        .contact-card:hover {
          boxShadow: 0 4px 16px rgba(0,0,0,0.15);
          transform: translateY(-2px);
        }

        .primary-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          backgroundColor: #ffc107;
          color: #333;
          padding: 4px 8px;
          borderRadius: 12px;
          fontSize: 0.8em;
          fontWeight: bold;
        }

        .contact-info {
          marginBottom: 12px;
        }

        .contact-info h3 {
          margin: 0 0 4px 0;
          color: #333;
          fontSize: 1.1em;
        }

        .relationship {
          color: #666;
          fontSize: 0.9em;
          margin: 0;
        }

        .contact-actions {
          display: flex;
          gap: 10px;
          marginBottom: 12px;
        }

        .btn-action {
          flex: 1;
          padding: 8px 12px;
          borderRadius: 4px;
          border: none;
          textDecoration: none;
          cursor: pointer;
          fontSize: 0.9em;
          fontWeight: bold;
          transition: all 0.3s;
          textAlign: center;
          display: flex;
          alignItems: center;
          justifyContent: center;
          gap: 4px;
        }

        .btn-call {
          background: #4CAF50;
          color: white;
        }

        .btn-call:hover {
          background: #388E3C;
          textDecoration: none;
        }

        .btn-sms {
          background: #2196F3;
          color: white;
        }

        .btn-sms:hover {
          background: #1976D2;
          textDecoration: none;
        }

        .contact-buttons {
          display: flex;
          gap: 8px;
          flexWrap: wrap;
        }

        .error-message {
          backgroundColor: #ffe6e6;
          border: 1px solid #ff1744;
          padding: 12px;
          borderRadius: 4px;
        }
      `}</style>
    </div>
  );
}

export default ContactsPage;
