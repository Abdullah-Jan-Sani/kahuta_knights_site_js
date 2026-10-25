'use strict';
const path = require('path');

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july',
  'august', 'september', 'october', 'november', 'december'];

const pad = (n, width = 2) => String(n).padStart(width, '0');

/** Python: datetime.now().strftime("%Y%m%d_%H%M%S") (+ "%f" microseconds when withMicro). */
function filenameTimestamp(d = new Date(), withMicro = false) {
  const base = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  return withMicro ? base + pad(d.getMilliseconds(), 3) + '000' : base;
}

/** Python: datetime.now().isoformat(timespec="seconds") (local time, no zone). */
function isoSeconds(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Strict local date builder; returns null when the date doesn't exist (e.g. 31 Feb). */
function buildDate(y, m, d, hh = 0, mm = 0, ss = 0) {
  const date = new Date(y, m - 1, d, hh, mm, ss);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

/** Python: datetime.strptime(s, "%Y-%m-%d") — returns Date or null. */
function parseIsoDate(str) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(str).trim());
  return m ? buildDate(+m[1], +m[2], +m[3]) : null;
}

/** Python: datetime.strptime("<day> <month> <year>", "%d %B %Y") — month name is case-insensitive. */
function parseEventDate(day, month, year) {
  const m = /^\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/.exec(`${day} ${month} ${year}`);
  if (!m) return null;
  const monthIdx = MONTHS.indexOf(m[2].toLowerCase());
  return monthIdx < 0 ? null : buildDate(+m[3], monthIdx + 1, +m[1]);
}

/** Python: int(str) for plain integers, else null. */
function parseIntStrict(value) {
  const s = String(value).trim();
  return /^[+-]?\d+$/.test(s) ? Number(s) : null;
}

function fileExtension(filename) {
  const i = String(filename).lastIndexOf('.');
  return i < 0 ? '' : filename.slice(i + 1).toLowerCase();
}

const hasAllowedExtension = (filename, allowed) =>
  String(filename).includes('.') && allowed.has(fileExtension(filename));

/** Port of werkzeug.utils.secure_filename. */
function secureFilename(filename) {
  let name = String(filename).normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  name = name.replace(/\//g, ' ');
  name = name.split(/\s+/).filter(Boolean).join('_');
  name = name.replace(/[^A-Za-z0-9_.-]/g, '').replace(/^[._]+|[._]+$/g, '');
  if (process.platform === 'win32' && name) {
    const reserved = ['CON', 'AUX', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3', 'PRN', 'NUL'];
    if (reserved.includes(name.split('.')[0].toUpperCase())) name = `_${name}`;
  }
  return name;
}

const safeBasename = (filename) => path.basename(String(filename || ''));

function getInitials(name) {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  const first = (s) => Array.from(s)[0] || '';
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  return (first(parts[0]) + first(parts[parts.length - 1])).toUpperCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** request.form.get(key, default).strip() equivalent. */
function formValue(req, key, fallback = '') {
  let v = req.body ? req.body[key] : undefined;
  if (Array.isArray(v)) v = v[0];
  return v === undefined || v === null ? fallback : String(v);
}
const formTrim = (req, key, fallback = '') => formValue(req, key, fallback).trim();

/** request.files.get(name) equivalent (multer memory storage, upload.any()). */
function uploadedFile(req, fieldname) {
  return (req.files || []).find((f) => f.fieldname === fieldname && f.originalname) || null;
}

module.exports = {
  filenameTimestamp, isoSeconds, parseIsoDate, parseEventDate, parseIntStrict,
  hasAllowedExtension, secureFilename, safeBasename, getInitials, escapeHtml,
  formValue, formTrim, uploadedFile,
};
