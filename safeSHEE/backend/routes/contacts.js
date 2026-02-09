const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get all emergency contacts for user
router.get('/', authMiddleware, (req, res) => {
  const user_id = req.user.id;

  db.all(
    'SELECT * FROM emergency_contacts WHERE user_id = ? ORDER BY is_primary DESC, name ASC',
    [user_id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json({ contacts: rows || [] });
    }
  );
});

// Get primary emergency contact
router.get('/primary', authMiddleware, (req, res) => {
  const user_id = req.user.id;

  db.get(
    'SELECT * FROM emergency_contacts WHERE user_id = ? AND is_primary = 1',
    [user_id],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      res.json({ contact: row || null });
    }
  );
});

// Create new emergency contact
router.post('/', authMiddleware, (req, res) => {
  const { name, phone, relationship, is_primary } = req.body;
  const user_id = req.user.id;

  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone required' });
  }

  // If marking as primary, remove primary flag from others
  if (is_primary) {
    db.run(
      'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ?',
      [user_id]
    );
  }

  const stmt = db.prepare(
    'INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary) VALUES (?,?,?,?,?)'
  );

  stmt.run(user_id, name, phone, relationship || '', is_primary ? 1 : 0, function (err) {
    if (err) {
      return res.status(500).json({ message: 'DB error', error: err.message });
    }
    const contact = {
      id: this.lastID,
      user_id,
      name,
      phone,
      relationship: relationship || '',
      is_primary: is_primary ? 1 : 0
    };
    console.log(`📞 Emergency contact created for user ${user_id}`);
    res.status(201).json({ message: 'Contact created', contact });
  });

  stmt.finalize();
});

// Update emergency contact
router.put('/:id', authMiddleware, (req, res) => {
  const { name, phone, relationship, is_primary } = req.body;
  const contactId = req.params.id;
  const user_id = req.user.id;

  // Verify ownership
  db.get(
    'SELECT user_id FROM emergency_contacts WHERE id = ?',
    [contactId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      if (row.user_id !== user_id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      // If marking as primary, remove primary flag from others
      if (is_primary) {
        db.run(
          'UPDATE emergency_contacts SET is_primary = 0 WHERE user_id = ? AND id != ?',
          [user_id, contactId]
        );
      }

      const updates = [];
      const values = [];
      
      if (name !== undefined) {
        updates.push('name = ?');
        values.push(name);
      }
      if (phone !== undefined) {
        updates.push('phone = ?');
        values.push(phone);
      }
      if (relationship !== undefined) {
        updates.push('relationship = ?');
        values.push(relationship);
      }
      if (is_primary !== undefined) {
        updates.push('is_primary = ?');
        values.push(is_primary ? 1 : 0);
      }

      if (updates.length === 0) {
        return res.json({ message: 'No updates provided' });
      }

      values.push(contactId);

      const query = `UPDATE emergency_contacts SET ${updates.join(', ')} WHERE id = ?`;
      db.run(query, values, function (err) {
        if (err) {
          return res.status(500).json({ message: 'DB error', error: err.message });
        }
        res.json({ message: 'Contact updated' });
      });
    }
  );
});

// Delete emergency contact
router.delete('/:id', authMiddleware, (req, res) => {
  const contactId = req.params.id;
  const user_id = req.user.id;

  // Verify ownership
  db.get(
    'SELECT user_id FROM emergency_contacts WHERE id = ?',
    [contactId],
    (err, row) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      if (!row) {
        return res.status(404).json({ message: 'Contact not found' });
      }
      if (row.user_id !== user_id) {
        return res.status(403).json({ message: 'Unauthorized' });
      }

      db.run(
        'DELETE FROM emergency_contacts WHERE id = ?',
        [contactId],
        function (err) {
          if (err) {
            return res.status(500).json({ message: 'DB error', error: err.message });
          }
          console.log(`🗑️ Emergency contact ${contactId} deleted`);
          res.json({ message: 'Contact deleted' });
        }
      );
    }
  );
});

module.exports = router;
