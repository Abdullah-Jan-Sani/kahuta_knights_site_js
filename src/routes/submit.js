'use strict';
const config = require('../config');
const data = require('../data');
const { appendCsvRow } = require('../csv');
const { flash } = require('../flash');
const { urlFor, externalUrlFor } = require('../router');
const { newRequestEmail } = require('../mailer');
const {
  formTrim, uploadedFile, hasAllowedExtension, secureFilename, filenameTimestamp, isoSeconds,
} = require('../utils');

function registerSubmitRoutes(route, { mailer }) {
  route.post('submit', '/submit', { multipart: true }, async (req, res) => {
    const formType = formTrim(req, 'form_type', 'team') || 'team';
    const fullName = formTrim(req, 'full_name');
    const phone = formTrim(req, 'phone');
    const email = formTrim(req, 'email');
    const teamName = formTrim(req, 'team_name');
    const age = formTrim(req, 'age');
    const weight = formTrim(req, 'weight');
    const screenshot = uploadedFile(req, 'screenshot');
    const backTo = () => res.redirect(urlFor(formType === 'event' ? 'register_event' : 'register'));

    if (formType === 'event' && data.registrationIsClosed()) {
      flash(req, `Online registration has closed. On-spot entry is now available for Rs. ${config.ONSPOT_ENTRY_FEE}.`, 'error');
      return res.redirect(urlFor('register_event'));
    }

    const errors = [];
    if (!fullName) errors.push('Full name is required.');
    if (!phone) errors.push('Phone number is required.');
    if (formType === 'team' && !email) errors.push('Email is required for team registration.');
    if (formType === 'event') {
      if (!teamName) errors.push('Team name is required for event registration.');
      if (!email) errors.push('Email is required for event registration.');
      if (!screenshot) errors.push('Registration fee screenshot is required.');
      else if (!hasAllowedExtension(screenshot.originalname, config.ALLOWED_EXTENSIONS)) {
        errors.push('Screenshot file type not allowed.');
      }
    }
    if (errors.length) {
      errors.forEach((msg) => flash(req, msg, 'error'));
      return backTo();
    }

    let storedFilename = '';
    if (formType === 'event') {
      storedFilename = `${filenameTimestamp()}_${secureFilename(screenshot.originalname)}`;
      data.saveUploadedBuffer(storedFilename, screenshot.buffer);
    }

    if (formType === 'team') {
      const rowIndex = data.readTeamRegistrations().length;

      data.saveTeamRegistration({
        Timestamp: isoSeconds(),
        'Full Name': fullName,
        Phone: phone,
        Email: email,
        Age: age,
        Weight: weight,
      });

      const link = (action) => externalUrlFor(req, 'admin_email_action', { row_index: rowIndex, action });
      try {
        await mailer.send({
          to: config.ADMIN_EMAIL,
          subject: `New Team Join Request: ${fullName}`,
          html: newRequestEmail({
            fullName, email, phone, age, weight,
            approveUrl: link('approve'),
            waitingListUrl: link('waiting_list'),
            rejectUrl: link('reject'),
          }),
        });
      } catch (err) {
        flash(req, `Submission saved, but email notification failed: ${err.message}`, 'warning');
      }
    } else {
      appendCsvRow(config.EVENT_DATA_FILE, config.EVENT_CSV_FIELDS, [
        isoSeconds(), fullName, phone, teamName, email, age, weight, storedFilename,
      ]);
    }

    flash(req, 'Registration submitted successfully!', 'success');
    return backTo();
  });
}

module.exports = { registerSubmitRoutes };
