'use strict';
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { DEFAULT_EVENTS, DEFAULT_RANKINGS, DEFAULT_SETTINGS, clone } = require('./defaults');
const { readCsvRows, writeCsvRows } = require('./csv');
const { parseEventDate, parseIsoDate, getInitials, safeBasename } = require('./utils');

// ---------- JSON helpers (atomic writes, same formatting as Python's indent=2) ----------

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(file, data) {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmp, file);
}

const isFile = (p) => fs.existsSync(p) && fs.statSync(p).isFile();

// ---------- Team members ----------

function loadTeamMembers() {
  return isFile(config.TEAM_MEMBERS_FILE) ? readJson(config.TEAM_MEMBERS_FILE) : [];
}

function saveTeamMembers(members) {
  writeJson(config.TEAM_MEMBERS_FILE, members);
}

function appendApprovedMember(fullName, weightClass) {
  const members = loadTeamMembers();

  // Skip duplicates by name
  if (members.some((m) => String(m.name || '').toLowerCase() === fullName.toLowerCase())) return;

  const formattedWeight = weightClass && !weightClass.toLowerCase().includes('class')
    ? `${weightClass}kg Class`
    : weightClass;

  members.push({
    name: fullName,
    weight_class: formattedWeight || 'Member',
    initials: getInitials(fullName),
    note: 'Official Team Member',
    photo_filename: '',
  });
  saveTeamMembers(members);
}

// ---------- Rankings ----------

function saveRankings(data) {
  writeJson(config.RANKINGS_FILE, data);
}

function loadRankings() {
  if (!isFile(config.RANKINGS_FILE)) {
    const defaults = clone(DEFAULT_RANKINGS);
    saveRankings(defaults);
    return defaults;
  }
  const data = readJson(config.RANKINGS_FILE);

  let changed = false;
  for (const category of data) {
    for (const key of ['rows', 'left_rows']) {
      for (const entry of category[key] || []) {
        if (!('move' in entry) && 'arrow' in entry) {
          entry.move = entry.arrow;
          delete entry.arrow;
          changed = true;
        }
        if (!('move' in entry)) {
          entry.move = 'none';
          changed = true;
        }
      }
    }
  }
  if (changed) saveRankings(data);
  return data;
}

// ---------- Events ----------

function saveEvents(data) {
  writeJson(config.EVENTS_FILE, data);
}

/** Upcoming first (soonest first), then Completed (most recent first). */
function eventSortKey(event) {
  const completed = (event.status || 'Upcoming') === 'Completed';
  const date = parseEventDate(event.day ?? '1', event.month ?? 'January', event.year ?? '1970');
  const ts = date ? date.getTime() : 0;
  return completed ? [1, -ts] : [0, ts];
}

function loadEvents() {
  let data;
  if (!isFile(config.EVENTS_FILE)) {
    data = clone(DEFAULT_EVENTS);
    saveEvents(data);
  } else {
    data = readJson(config.EVENTS_FILE);
  }
  return data
    .map((event) => ({ event, key: eventSortKey(event) }))
    .sort((a, b) => a.key[0] - b.key[0] || a.key[1] - b.key[1]) // Array.sort is stable
    .map((x) => x.event);
}

function findNearestTournament(events) {
  return events.find((e) => e.status === 'Upcoming' && e.event_type === 'tournament') || null;
}

// ---------- Settings (registration deadline) ----------

function saveSettings(data) {
  writeJson(config.SETTINGS_FILE, data);
}

function loadSettings() {
  if (!isFile(config.SETTINGS_FILE)) {
    saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...(readJson(config.SETTINGS_FILE) || {}) };
}

/** Deadline = end of the configured day (local time), or null if unset/invalid. */
function getRegistrationDeadline() {
  const str = String(loadSettings().registration_deadline || '').trim();
  if (!str) return null;
  const date = parseIsoDate(str);
  if (!date) return null;
  date.setHours(23, 59, 59, 0);
  return date;
}

function registrationIsClosed() {
  const deadline = getRegistrationDeadline();
  return deadline !== null && new Date() > deadline;
}

// ---------- Registrations (CSV) ----------

function readTeamRegistrations() {
  return readCsvRows(config.TEAM_DATA_FILE);
}

function readEventRegistrations() {
  return readCsvRows(config.EVENT_DATA_FILE);
}

function writeTeamRegistrations(rows) {
  writeCsvRows(config.TEAM_DATA_FILE, config.TEAM_CSV_FIELDS, rows);
}

function saveTeamRegistration(row) {
  const rows = readTeamRegistrations();
  for (const existing of rows) if (!existing.Status) existing.Status = 'Pending';
  if (!row.Status) row.Status = 'Pending';
  rows.push(row);
  writeTeamRegistrations(rows);
}

// ---------- Uploaded files ----------

function saveUploadedBuffer(storedFilename, buffer) {
  fs.writeFileSync(path.join(config.UPLOAD_FOLDER, storedFilename), buffer);
}

function deleteUploadedFile(filename) {
  if (!filename) return;
  const target = path.join(config.UPLOAD_FOLDER, safeBasename(filename));
  try {
    if (isFile(target)) fs.unlinkSync(target);
  } catch (_) { /* ignore, same as the Python version */ }
}

module.exports = {
  loadTeamMembers, saveTeamMembers, appendApprovedMember,
  loadRankings, saveRankings,
  loadEvents, saveEvents, findNearestTournament,
  loadSettings, saveSettings, getRegistrationDeadline, registrationIsClosed,
  readTeamRegistrations, readEventRegistrations, writeTeamRegistrations, saveTeamRegistration,
  saveUploadedBuffer, deleteUploadedFile,
};
