'use strict';

const CORE_MEMBERS = [
  {
    name: 'Abdullah Jan Sani',
    role: 'Founder & Head Coach',
    initials: 'AJ',
    bio: 'Founded Kahuta Knights and leads training, trials, and tournament strategy.',
    weight_class: 'Core Team',
    note: 'Founded Kahuta Knights and leads training, trials, and tournament strategy.',
  },
  {
    name: 'M.Zain Ijaz',
    role: 'Founder & Head Coach',
    initials: 'ZI',
    bio: 'Founded Kahuta Knights and leads training, trials, and tournament strategy.',
    weight_class: 'Core Team',
    note: 'Founded Kahuta Knights and leads training, trials, and tournament strategy.',
  },
];

const DEFAULT_EVENTS = [
  {
    day: '14',
    month: 'August',
    year: '2026',
    title: ' Armwrestling Championship ',
    location: 'International fitness Tycon Gym, Motor Chowk, Kahuta, Punjab',
    description: 'Open Tournment organized by Kahuta Knights at Nationals.',
    status: 'Upcoming',
    event_type: 'tournament',
    poster_filename: '',
    video_links: { youtube: '', tiktok: '', instagram: '' },
  },
];

const r = (rank, name) => ({ rank, name });

const DEFAULT_RANKINGS = [
  {
    name: '-60kg Class',
    rows: [r(1, 'Zain Ijaz'), r(2, 'Ayan'), r(3, 'Farhan'), r(4, 'Meeshan Ali')],
    left_rows: [r(1, 'Zain Ijaz'), r(2, 'Meeshan Ali'), r(3, 'Farhan'), r(4, 'Ahad')],
  },
  {
    name: '-70kg Class',
    rows: [r(1, 'Abdullah Jan '), r(2, 'Sajjad Khan'), r(3, 'Hamid'), r(4, 'Zain Ijaz')],
    left_rows: [r(1, 'Sajjad Khan'), r(2, 'Shahwaiz'), r(3, 'Abdullah Khan'), r(4, 'Abdullah Jan')],
  },
  {
    name: 'Open Class',
    rows: [r(1, 'Hamza Khan'), r(2, 'Sajjad Khan'), r(3, 'Abdull Rehman'), r(4, 'Shehzad Khan')],
    left_rows: [r(1, 'Abdull Rehman'), r(2, 'Shamas Hashmi'), r(3, 'Shehzad Khan'), r(4, 'Sajjad Khan')],
  },
];

const DEFAULT_SETTINGS = {
  registration_deadline: '', // '' means no deadline set / registration always open
};

const clone = (v) => JSON.parse(JSON.stringify(v));

module.exports = { CORE_MEMBERS, DEFAULT_EVENTS, DEFAULT_RANKINGS, DEFAULT_SETTINGS, clone };
