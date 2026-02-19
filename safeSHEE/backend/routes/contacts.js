const express = require('express');
const router = express.Router();
const db = require('../database');
const { authMiddleware } = require('../middleware/authMiddleware');
const smsService = require('../services/sms');
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
router.post('/', authMiddleware, (req, res) => {
  const { name, phone, relationship, is_primary } = req.body;
  const user_id = req.user.id;
  if (!name || !phone) {
    return res.status(400).json({ message: 'Name and phone required' });
  }
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
router.put('/:id', authMiddleware, (req, res) => {
  const { name, phone, relationship, is_primary } = req.body;
  const contactId = req.params.id;
  const user_id = req.user.id;
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
router.delete('/:id', authMiddleware, (req, res) => {
  const contactId = req.params.id;
  const user_id = req.user.id;
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

// Get mock SMS logs (for development/debugging)
router.get('/sms/logs', authMiddleware, (req, res) => {
  const logs = smsService.getMockSmsLog();
  res.json({ 
    sms_logs: logs,
    total: logs.length,
    provider: smsService.isTwilioConfigured() ? 'Twilio' : 'Mock SMS'
  });
});

// Clear mock SMS logs
router.post('/sms/logs/clear', authMiddleware, (req, res) => {
  smsService.clearMockSmsLog();
  res.json({ message: 'Mock SMS logs cleared' });
});

// Send notification to a contact (for red zone alerts or other emergencies)
router.post('/notify', authMiddleware, (req, res) => {
  const { contact_id, type, message, latitude, longitude } = req.body;
  const user_id = req.user.id;

  if (!contact_id || !type || !message) {
    return res.status(400).json({ message: 'Missing required fields: contact_id, type, message' });
  }

  // Verify the contact belongs to this user
  db.get(
    'SELECT * FROM emergency_contacts WHERE id = ? AND user_id = ?',
    [contact_id, user_id],
    async (err, contact) => {
      if (err) {
        return res.status(500).json({ message: 'DB error', error: err.message });
      }
      if (!contact) {
        return res.status(404).json({ message: 'Contact not found or unauthorized' });
      }

      try {
        // Format message based on alert type
        let fullMessage = message;
        
        if (type === 'red_zone_alert') {
          fullMessage = `🚩 RED ZONE ALERT 🚩\n\nUser: ${req.user.name}\n${message}`;
          if (latitude && longitude) {
            fullMessage += `\n\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        } else if (type === 'sos_alert') {
          fullMessage = `🚨 SOS EMERGENCY 🚨\n\nUser: ${req.user.name}\n${message}`;
          if (latitude && longitude) {
            fullMessage += `\n\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        }

        // Send SMS via Twilio
        const smsResult = await smsService.sendSMS(contact.phone, fullMessage);

        if (smsResult.success) {
          console.log(`✅ ${type} notification sent to ${contact.name} (${contact.phone})`);
          res.json({
            message: 'Notification sent successfully',
            type: type,
            contact: contact.name,
            provider: smsResult.provider,
            sms_id: smsResult.sid || smsResult.id
          });
        } else {
          console.error(`❌ Failed to send ${type} notification to ${contact.name}`);
          res.status(500).json({
            message: 'Failed to send notification',
            error: smsResult.error
          });
        }
      } catch (err) {
        console.error('Error sending notification:', err.message);
        res.status(500).json({
          message: 'Error sending notification',
          error: err.message
        });
      }
    }
  );
});

module.exports = router;
