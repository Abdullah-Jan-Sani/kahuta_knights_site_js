'use strict';
const fs = require('fs');
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

// Load .env (Node >= 20.12). Real environment variables win over the file.
try {
  process.loadEnvFile(path.join(BASE_DIR, '.env'));
} catch (err) {
  if (err.code !== 'ENOENT') console.warn('Could not read .env:', err.message);
}

const env = process.env;

const config = {
  BASE_DIR,
  SECRET_KEY: env.SECRET_KEY || 'default-fallback-key',
  ADMIN_PASSWORD: env.ADMIN_PASSWORD, // undefined => admin login is impossible
  ADMIN_EMAIL: env.ADMIN_EMAIL || 'abdullahjan.siraj@gmail.com',
  WHATSAPP_GROUP_LINK: env.WHATSAPP_GROUP_LINK || '#',

  MAIL: {
    host: 'smtp.gmail.com',
    port: 587,
    username: env.GMAIL_USER || 'abdullahjan.siraj@gmail.com',
    password: env.GMAIL_PASSWORD,
  },

  STATIC_DIR: path.join(BASE_DIR, 'static'),
  TEMPLATES_DIR: path.join(BASE_DIR, 'templates'),
  UPLOAD_FOLDER: path.join(BASE_DIR, 'static', 'uploads'),

  TEAM_DATA_FILE: path.join(BASE_DIR, 'team_registrations.csv'),
  EVENT_DATA_FILE: path.join(BASE_DIR, 'event_registrations.csv'),
  RANKINGS_FILE: path.join(BASE_DIR, 'rankings.json'),
  EVENTS_FILE: path.join(BASE_DIR, 'events.json'),
  TEAM_MEMBERS_FILE: path.join(BASE_DIR, 'team_members.json'),
  SETTINGS_FILE: path.join(BASE_DIR, 'settings.json'),

  ONSPOT_ENTRY_FEE: 500,

  ALLOWED_EXTENSIONS: new Set(['pdf', 'doc', 'docx', 'xls', 'csv', 'jpg', 'jpeg', 'png', 'gif']),
  ALLOWED_POSTER_EXTENSIONS: new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']),
  MAX_CONTENT_LENGTH: 15 * 1024 * 1024, // 15 MB max upload

  TEAM_CSV_FIELDS: ['Timestamp', 'Full Name', 'Phone', 'Email', 'Age', 'Weight', 'Status'],
  EVENT_CSV_FIELDS: ['Timestamp', 'Full Name', 'Phone', 'Team Name', 'Email', 'Age', 'Weight', 'Screenshot File'],
};

fs.mkdirSync(config.UPLOAD_FOLDER, { recursive: true });

module.exports = config;
