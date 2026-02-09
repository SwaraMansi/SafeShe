const path = require('path');
const { Pool } = require('pg');
const sqlite3 = require('sqlite3').verbose();

let db;
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
  // Production: Use PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  // Initialize tables
  pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user'
    );
  `).catch(err => console.error('Error creating users table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      type TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      status TEXT DEFAULT 'pending',
      risk_score INTEGER DEFAULT 0,
      predicted_risk_score INTEGER DEFAULT 0,
      ai_confidence REAL DEFAULT 0,
      image_path TEXT DEFAULT NULL
    );
  `).catch(err => console.error('Error creating reports table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS emergency_contacts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      name TEXT,
      phone TEXT,
      relationship TEXT,
      is_primary INTEGER DEFAULT 0
    );
  `).catch(err => console.error('Error creating emergency_contacts table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS sos_alerts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      status TEXT DEFAULT 'active'
    );
  `).catch(err => console.error('Error creating sos_alerts table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS sos_locations (
      id SERIAL PRIMARY KEY,
      alert_id INTEGER REFERENCES sos_alerts(id),
      latitude REAL,
      longitude REAL,
      timestamp INTEGER
    );
  `).catch(err => console.error('Error creating sos_locations table:', err));

  pool.query(`
    CREATE TABLE IF NOT EXISTS model_weights (
      id SERIAL PRIMARY KEY,
      feature_name TEXT UNIQUE,
      weight REAL,
      last_updated INTEGER,
      confidence REAL DEFAULT 0.5
    );
  `).catch(err => console.error('Error creating model_weights table:', err));

  db = pool;
} else {
  // Development: Use SQLite
  const dbPath = path.join(__dirname, 'safeshee.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT DEFAULT 'user'
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS reports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      type TEXT,
      description TEXT,
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      status TEXT DEFAULT 'pending',
      risk_score INTEGER DEFAULT 0,
      predicted_risk_score INTEGER DEFAULT 0,
      ai_confidence REAL DEFAULT 0,
      image_path TEXT DEFAULT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS emergency_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT,
      phone TEXT,
      relationship TEXT,
      is_primary INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sos_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      status TEXT DEFAULT 'active',
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sos_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id INTEGER,
      latitude REAL,
      longitude REAL,
      timestamp INTEGER,
      FOREIGN KEY(alert_id) REFERENCES sos_alerts(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS model_weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_name TEXT UNIQUE,
      weight REAL,
      last_updated INTEGER,
      confidence REAL DEFAULT 0.5
    )`);
  });
}

module.exports = db;
