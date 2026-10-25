'use strict';
const crypto = require('crypto');
const config = require('../config');
const data = require('../data');
const { flash } = require('../flash');
const { urlFor } = require('../router');
const { approvedEmail, rejectedEmail, waitingListEmail } = require('../mailer');
const {
  formValue, formTrim, uploadedFile, hasAllowedExtension, secureFilename,
  filenameTimestamp, parseIsoDate, parseIntStrict,
} = require('../utils');

const sameSecret = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};

const adminTab = (tab) => ({ active: 'admin', admin_tab: tab });

function registerAdminRoutes(route, { mailer }) {
  // ======================================================================
  // AUTH
  // ======================================================================

  route.get('admin_access', '/admin/access', adminAccess);
  route.post('admin_access', '/admin/access', adminAccess);

  function adminAccess(req, res) {
    const queryTarget = req.query && req.query.target;
    let target = String((Array.isArray(queryTarget) ? queryTarget[0] : queryTarget) || 'events');

    if (req.method === 'POST') {
      const password = formValue(req, 'password');
      target = formValue(req, 'target', 'events');
      if (config.ADMIN_PASSWORD !== undefined && sameSecret(password, config.ADMIN_PASSWORD)) {
        req.session.admin_authenticated = true;
        if (target === 'team' || target === 'admin_team_registration') return res.redirect(urlFor('admin_team_registration'));
        if (target === 'rankings' || target === 'admin_rankings') return res.redirect(urlFor('admin_rankings'));
        if (target === 'events' || target === 'admin_events') return res.redirect(urlFor('admin_events'));
        // Default landing page (includes the main "Admin Panel" entry point)
        return res.redirect(urlFor('admin_event_registration'));
      }
      flash(req, 'Incorrect password. Please try again.', 'error');
    } else if (req.session.admin_authenticated) {
      flash(req, 'Please re-enter the admin password to continue.', 'error');
    }

    return res.render('admin_access.html', { active: 'admin', target });
  }

  route.get('admin_logout', '/admin/logout', (req, res) => {
    delete req.session.admin_authenticated;
    flash(req, 'Logged out.', 'success');
    res.redirect(urlFor('home'));
  });

  // ======================================================================
  // REGISTRATION REVIEW
  // ======================================================================

  route.get('admin_team_registration', '/admin/team_registration', { auth: true }, (req, res) => {
    const rows = data.readTeamRegistrations();
    res.render('admin_registration.html', {
      ...adminTab('team_registration'),
      page_title: 'Team Registration Requests',
      page_heading: 'Team Registration Review',
      rows,
      columns: rows.length ? Object.keys(rows[0]) : config.TEAM_CSV_FIELDS,
      note: 'Review and manage applications from individuals applying to join Kahuta Knights.',
    });
  });

  route.get('admin_event_registration', '/admin/event_registration', { auth: true }, (req, res) => {
    const rows = data.readEventRegistrations();
    res.render('admin_registration.html', {
      ...adminTab('event_registration'),
      page_title: 'Event Payment Verification',
      page_heading: 'Event Registration Verification',
      rows,
      columns: rows.length ? Object.keys(rows[0]) : config.EVENT_CSV_FIELDS,
      note: 'Review submitted tournament payments and participant details.',
    });
  });

  /**
   * Shared by the dashboard POST route and the one-click email GET route.
   * `msg` holds the flash texts, which differ slightly between the two entry points.
   */
  async function applyTeamAction(req, res, msg) {
    const rowIndex = Number(req.params.row_index);
    const action = req.params.action;
    const back = () => res.redirect(urlFor('admin_team_registration'));

    const rows = data.readTeamRegistrations();
    if (!(rowIndex >= 0 && rowIndex < rows.length)) {
      flash(req, msg.notFound, 'error');
      return back();
    }
    for (const row of rows) if (!row.Status) row.Status = 'Pending';

    const row = rows[rowIndex];
    const email = (row.Email ?? '').trim();
    const name = (row['Full Name'] ?? 'Applicant').trim();
    const weight = (row.Weight ?? '').trim();

    const sendOrWarn = async (subject, html, failurePrefix) => {
      if (!email) return;
      try {
        await mailer.send({ to: email, subject, html });
      } catch (err) {
        flash(req, `${failurePrefix}: ${err.message}`, 'warning');
      }
    };

    if (action === 'approve') {
      row.Status = 'Approved';
      data.appendApprovedMember(name, weight); // add to the public roster
      data.writeTeamRegistrations(rows);        // persist before the slow email call

      let whatsappLink = config.WHATSAPP_GROUP_LINK;
      if (whatsappLink && !whatsappLink.startsWith('http')) whatsappLink = `https://${whatsappLink}`;
      await sendOrWarn(
        'Welcome to Kahuta Knights! Team Application Approved',
        approvedEmail(name, whatsappLink),
        'Approved status saved, but email notification failed',
      );
      flash(req, msg.approve(name), 'success');
    } else if (action === 'reject') {
      row.Status = 'Rejected';
      data.writeTeamRegistrations(rows);
      flash(req, msg.reject(name), 'error');
      await sendOrWarn(
        'Update on your Kahuta Knights Application',
        rejectedEmail(name),
        'Rejected status saved, but email notification to applicant failed',
      );
    } else if (action === 'waiting_list') {
      row.Status = 'Waiting List';
      data.writeTeamRegistrations(rows);
      flash(req, msg.waiting(name), 'info');
      await sendOrWarn(
        'Your Kahuta Knights Application - Waiting List Status',
        waitingListEmail(name),
        'Waiting list status saved, but email notification to applicant failed',
      );
    } else {
      flash(req, msg.invalid, 'error');
      data.writeTeamRegistrations(rows);
    }
    return back();
  }

  // Dashboard buttons (POST)
  route.post('admin_team_registration_action', '/admin/team_registration/:row_index(\\d+)/:action', { auth: true },
    (req, res) => applyTeamAction(req, res, {
      notFound: 'Team registration not found.',
      approve: (n) => `${n} approved, added to the roster, and sent the WhatsApp invite!`,
      reject: () => 'Team registration rejected.',
      waiting: (n) => `${n} added to waiting list and notified via email.`,
      invalid: 'Invalid action.',
    }));

  // One-click links inside the admin notification email (GET)
  route.get('admin_email_action', '/admin/team_registration/email_action/:row_index(\\d+)/:action', { auth: true },
    (req, res) => applyTeamAction(req, res, {
      notFound: 'Team registration record not found.',
      approve: (n) => `Approved ${n}'s team application and sent WhatsApp invite.`,
      reject: (n) => `Rejected ${n}'s team application.`,
      waiting: (n) => `Added ${n} to waiting list and sent notification email.`,
      invalid: 'Invalid action provided.',
    }));

  // ======================================================================
  // RANKINGS MANAGEMENT
  // ======================================================================

  const sideKey = (side) => (side === 'right' ? 'rows' : 'left_rows');
  const toRankings = () => urlFor('admin_rankings');

  route.get('admin_rankings', '/admin/rankings', { auth: true }, (req, res) => {
    res.render('admin_rankings.html', { active: 'admin', admin_tab: 'rankings', rankings: data.loadRankings() });
  });

  route.post('admin_rankings_add_category', '/admin/rankings/category/add', { auth: true }, (req, res) => {
    const name = formTrim(req, 'category_name');
    if (!name) {
      flash(req, 'Category name is required.', 'error');
      return res.redirect(toRankings());
    }
    const rankings = data.loadRankings();
    rankings.push({ name, rows: [], left_rows: [] });
    data.saveRankings(rankings);
    flash(req, `Added category "${name}".`, 'success');
    return res.redirect(toRankings());
  });

  route.post('admin_rankings_delete_category', '/admin/rankings/category/:cat_index(\\d+)/delete', { auth: true }, (req, res) => {
    const catIndex = Number(req.params.cat_index);
    const rankings = data.loadRankings();
    if (catIndex >= 0 && catIndex < rankings.length) {
      const [removed] = rankings.splice(catIndex, 1);
      data.saveRankings(rankings);
      flash(req, `Deleted category "${removed.name}".`, 'success');
    } else {
      flash(req, 'Category not found.', 'error');
    }
    res.redirect(toRankings());
  });

  route.post('admin_rankings_add_row', '/admin/rankings/:cat_index(\\d+)/:side/add', { auth: true }, (req, res) => {
    const catIndex = Number(req.params.cat_index);
    const key = sideKey(req.params.side);
    const rankStr = formTrim(req, 'rank');
    const name = formTrim(req, 'name');
    const move = formTrim(req, 'move', 'none');

    const rankings = data.loadRankings();
    if (!(catIndex >= 0 && catIndex < rankings.length)) {
      flash(req, 'Category not found.', 'error');
      return res.redirect(toRankings());
    }
    if (!name || !rankStr) {
      flash(req, 'Rank and name are required.', 'error');
      return res.redirect(toRankings());
    }
    const rank = parseIntStrict(rankStr);
    if (rank === null) {
      flash(req, 'Rank must be a number.', 'error');
      return res.redirect(toRankings());
    }

    const list = rankings[catIndex][key] || (rankings[catIndex][key] = []);
    list.push({ rank, name, move });
    list.sort((a, b) => a.rank - b.rank);
    data.saveRankings(rankings);
    flash(req, 'Wrestler added.', 'success');
    return res.redirect(toRankings());
  });

  route.post('admin_rankings_edit_row', '/admin/rankings/:cat_index(\\d+)/:side/:row_index(\\d+)/edit', { auth: true }, (req, res) => {
    const catIndex = Number(req.params.cat_index);
    const rowIndex = Number(req.params.row_index);
    const key = sideKey(req.params.side);
    const rankStr = formTrim(req, 'rank');
    const name = formTrim(req, 'name');
    const move = formTrim(req, 'move', 'none');

    const rankings = data.loadRankings();
    const list = rankings[catIndex] && (rankings[catIndex][key] || []);
    if (!list || !(rowIndex >= 0 && rowIndex < list.length)) {
      flash(req, 'Entry not found.', 'error');
      return res.redirect(toRankings());
    }
    if (!name || !rankStr) {
      flash(req, 'Rank and name are required.', 'error');
      return res.redirect(toRankings());
    }
    const rank = parseIntStrict(rankStr);
    if (rank === null) {
      flash(req, 'Rank must be a number.', 'error');
      return res.redirect(toRankings());
    }

    Object.assign(list[rowIndex], { rank, name, move });
    list.sort((a, b) => a.rank - b.rank);
    data.saveRankings(rankings);
    flash(req, 'Ranking updated.', 'success');
    return res.redirect(toRankings());
  });

  route.post('admin_rankings_delete_row', '/admin/rankings/:cat_index(\\d+)/:side/:row_index(\\d+)/delete', { auth: true }, (req, res) => {
    const catIndex = Number(req.params.cat_index);
    const rowIndex = Number(req.params.row_index);
    const key = sideKey(req.params.side);
    const rankings = data.loadRankings();
    const list = rankings[catIndex] && (rankings[catIndex][key] || []);
    if (list && rowIndex >= 0 && rowIndex < list.length) {
      const [removed] = list.splice(rowIndex, 1);
      data.saveRankings(rankings);
      flash(req, `Removed "${removed.name}".`, 'success');
    } else {
      flash(req, 'Entry not found.', 'error');
    }
    res.redirect(toRankings());
  });

  // ======================================================================
  // EVENTS MANAGEMENT
  // ======================================================================

  const toEvents = () => urlFor('admin_events');

  function storePoster(file) {
    const stored = `poster_${filenameTimestamp(new Date(), true)}_${secureFilename(file.originalname)}`;
    data.saveUploadedBuffer(stored, file.buffer);
    return stored;
  }

  route.get('admin_events', '/admin/events', { auth: true }, (req, res) => {
    const settings = data.loadSettings();
    res.render('admin_events.html', {
      active: 'admin',
      admin_tab: 'events',
      events: data.loadEvents(),
      registration_deadline: settings.registration_deadline || '',
      onspot_fee: config.ONSPOT_ENTRY_FEE,
    });
  });

  route.post('admin_set_registration_deadline', '/admin/events/registration_deadline', { auth: true }, (req, res) => {
    const deadline = formTrim(req, 'registration_deadline');
    if (deadline && !parseIsoDate(deadline)) {
      flash(req, 'Invalid date format. Please pick a date.', 'error');
      return res.redirect(toEvents());
    }
    const settings = data.loadSettings();
    settings.registration_deadline = deadline;
    data.saveSettings(settings);

    flash(
      req,
      deadline
        ? `Registration deadline set to ${deadline}.`
        : 'Registration deadline cleared. Online registration is open.',
      'success',
    );
    return res.redirect(toEvents());
  });

  route.post('admin_events_add', '/admin/events/add', { auth: true, multipart: true }, (req, res) => {
    const eventType = formValue(req, 'event_type', 'tournament');
    const day = formTrim(req, 'day');
    const month = formTrim(req, 'month');
    const year = formTrim(req, 'year');
    const title = formTrim(req, 'title');
    const location = formTrim(req, 'location');
    const description = formTrim(req, 'description');
    const status = formValue(req, 'status', 'Upcoming');

    if (!(day && month && year && title)) {
      flash(req, 'Day, month, year, and title are required.', 'error');
      return res.redirect(toEvents());
    }

    let posterFilename = '';
    const poster = uploadedFile(req, 'poster');
    if (poster) {
      if (!hasAllowedExtension(poster.originalname, config.ALLOWED_POSTER_EXTENSIONS)) {
        flash(req, 'Poster must be an image file (jpg, png, gif, webp).', 'error');
        return res.redirect(toEvents());
      }
      posterFilename = storePoster(poster);
    }

    const videoLinks = { youtube: '', tiktok: '', instagram: '' };
    if (eventType === 'super_fight') {
      videoLinks.youtube = formTrim(req, 'youtube_link');
      videoLinks.tiktok = formTrim(req, 'tiktok_link');
      videoLinks.instagram = formTrim(req, 'instagram_link');
    }

    const events = data.loadEvents();
    events.push({
      day, month, year, title, location, description, status,
      event_type: eventType,
      poster_filename: posterFilename,
      video_links: videoLinks,
    });
    data.saveEvents(events);
    flash(req, `Added event "${title}".`, 'success');
    return res.redirect(toEvents());
  });

  route.post('admin_events_edit', '/admin/events/:event_index(\\d+)/edit', { auth: true, multipart: true }, (req, res) => {
    const index = Number(req.params.event_index);
    const events = data.loadEvents();
    if (!(index >= 0 && index < events.length)) {
      flash(req, 'Event not found.', 'error');
      return res.redirect(toEvents());
    }

    const event = events[index];
    event.event_type = formValue(req, 'event_type', event.event_type || 'tournament');
    event.day = formTrim(req, 'day') || event.day || '';
    event.month = formTrim(req, 'month') || event.month || '';
    event.year = formTrim(req, 'year') || event.year || '';
    event.title = formTrim(req, 'title') || event.title || '';
    event.location = formTrim(req, 'location');
    event.description = formTrim(req, 'description');
    event.status = formValue(req, 'status', event.status || 'Upcoming');

    const poster = uploadedFile(req, 'poster');
    if (poster) {
      if (!hasAllowedExtension(poster.originalname, config.ALLOWED_POSTER_EXTENSIONS)) {
        flash(req, 'Poster must be an image file (jpg, png, gif, webp).', 'error');
        return res.redirect(toEvents());
      }
      data.deleteUploadedFile(event.poster_filename);
      event.poster_filename = storePoster(poster);
    }

    event.video_links = event.event_type === 'super_fight'
      ? {
        youtube: formTrim(req, 'youtube_link'),
        tiktok: formTrim(req, 'tiktok_link'),
        instagram: formTrim(req, 'instagram_link'),
      }
      : { youtube: '', tiktok: '', instagram: '' };

    data.saveEvents(events);
    flash(req, 'Event updated.', 'success');
    return res.redirect(toEvents());
  });

  route.post('admin_events_delete', '/admin/events/:event_index(\\d+)/delete', { auth: true }, (req, res) => {
    const index = Number(req.params.event_index);
    const events = data.loadEvents();
    if (index >= 0 && index < events.length) {
      const [removed] = events.splice(index, 1);
      data.deleteUploadedFile(removed.poster_filename);
      data.saveEvents(events);
      flash(req, `Deleted event "${removed.title}".`, 'success');
    } else {
      flash(req, 'Event not found.', 'error');
    }
    res.redirect(toEvents());
  });
}

module.exports = { registerAdminRoutes };
