'use strict';
const fs = require('fs');

/** Minimal RFC-4180 parser (quotes, escaped quotes, CRLF/LF, embedded newlines, BOM). */
function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const records = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;
  const endField = () => { row.push(field); field = ''; };
  const endRow = () => { endField(); records.push(row); row = []; };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; }
    else if (c === ',') { endField(); i++; }
    else if (c === '\r') { endRow(); i += text[i + 1] === '\n' ? 2 : 1; }
    else if (c === '\n') { endRow(); i++; }
    else { field += c; i++; }
  }
  if (field !== '' || row.length) endRow();
  return records;
}

/** csv.DictReader equivalent: first row = header, blank rows skipped. */
function readCsvRows(filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return [];
  const records = parseCsv(fs.readFileSync(filePath, 'utf-8'))
    .filter((r) => !(r.length === 1 && r[0] === ''));
  if (!records.length) return [];
  const [header, ...body] = records;
  return body.map((r) => {
    const obj = {};
    header.forEach((h, idx) => { obj[h] = r[idx] !== undefined ? r[idx] : ''; });
    return obj;
  });
}

const quote = (v) => {
  const s = String(v ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const line = (values) => values.map(quote).join(',') + '\r\n';

/** csv.DictWriter equivalent (header + rows, extra keys ignored, missing = ''). */
function writeCsvRows(filePath, fieldnames, rows) {
  const out = line(fieldnames) + rows.map((r) => line(fieldnames.map((f) => r[f]))).join('');
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, out, 'utf-8');
  fs.renameSync(tmp, filePath);
}

/** Append one row, writing the header first if the file is new. */
function appendCsvRow(filePath, headers, row) {
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  fs.appendFileSync(filePath, (exists ? '' : line(headers)) + line(row), 'utf-8');
}

module.exports = { parseCsv, readCsvRows, writeCsvRows, appendCsvRow };
