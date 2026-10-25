'use strict';
const config = require('../config');
const { CORE_MEMBERS } = require('../defaults');
const data = require('../data');

function registerPublicRoutes(route) {
  route.get('home', '/', (req, res) => {
    const events = data.loadEvents();
    const settings = data.loadSettings();
    res.render('home.html', {
      active: 'home',
      core_members: CORE_MEMBERS,
      team_members: data.loadTeamMembers(),
      events,
      nearest_tournament: data.findNearestTournament(events),
      registration_closed: data.registrationIsClosed(),
      registration_deadline: settings.registration_deadline || '',
      onspot_fee: config.ONSPOT_ENTRY_FEE,
    });
  });

  route.get('events', '/events', (req, res) => {
    const events = data.loadEvents();
    const settings = data.loadSettings();
    res.render('events.html', {
      active: 'events',
      events,
      nearest_tournament: data.findNearestTournament(events),
      is_admin: Boolean(req.session.admin_authenticated),
      registration_closed: data.registrationIsClosed(),
      registration_deadline: settings.registration_deadline || '',
      onspot_fee: config.ONSPOT_ENTRY_FEE,
    });
  });

  route.get('rankings', '/rankings', (req, res) => {
    res.render('rankings.html', {
      active: 'rankings',
      rankings: data.loadRankings(),
      is_admin: Boolean(req.session.admin_authenticated),
    });
  });

  route.get('team', '/team', (req, res) => {
    res.render('team.html', { active: 'team', team_members: data.loadTeamMembers() });
  });

  route.get('contact', '/contact', (req, res) => {
    res.render('contact.html', { active: 'contact' });
  });

  route.get('register', '/register', (req, res) => {
    res.render('register.html', {
      active: 'register',
      form_type: 'team',
      page_title: 'Join The Team',
      page_description: 'Fill in your details to join Kahuta Knights.',
      submit_label: 'Join Now',
    });
  });

  route.get('register_event', '/register-event', (req, res) => {
    const settings = data.loadSettings();
    res.render('register.html', {
      active: 'register',
      form_type: 'event',
      page_title: 'Event Registration',
      page_description: 'Sign up for the tournament and upload your registration fee proof.',
      submit_label: 'Register for Event',
      registration_closed: data.registrationIsClosed(),
      registration_deadline: settings.registration_deadline || '',
      onspot_fee: config.ONSPOT_ENTRY_FEE,
    });
  });
}

module.exports = { registerPublicRoutes };
