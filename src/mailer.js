'use strict';
const config = require('./config');
const { escapeHtml: e } = require('./utils');

/** Same SMTP setup as the Flask-Mail config: Gmail, STARTTLS on 587. */
function createMailer() {
  const nodemailer = require('nodemailer'); // loaded lazily so route logic can be tested without SMTP deps
  const { host, port, username, password } = config.MAIL;
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    requireTLS: true,
    ...(username && password ? { auth: { user: username, pass: password } } : {}),
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
  });
  return {
    send: ({ to, subject, html }) => transporter.sendMail({ from: username, to, subject, html }),
  };
}

// ---------- Email bodies ----------

function approvedEmail(name, whatsappLink) {
  const link = e(whatsappLink);
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #ffffff; background-color: #121212; padding: 20px; border-radius: 8px;">
        <h2 style="color: #d4af37;">Congratulations, ${e(name)}!</h2>
        <p>Your application to join <strong>Kahuta Knights</strong> has been officially <strong>Approved</strong>.</p>
        <p>You have been added to our official team roster on the website!</p>

        <p><strong>Join Official WhatsApp Group:</strong></p>
        <div style="margin: 20px 0;">
            <a href="${link}"
               target="_blank"
               rel="noopener noreferrer"
               style="background-color: #25D366;
                      color: #ffffff;
                      padding: 14px 24px;
                      text-decoration: none;
                      border-radius: 6px;
                      font-weight: bold;
                      display: inline-block;
                      font-size: 16px;
                      text-align: center;">
                Join WhatsApp Group
            </a>
        </div>

        <p style="color: #aaaaaa; font-size: 13px; margin-top: 15px;">
            If the button above does not open on your phone, copy and paste this link into your browser:<br>
            <a href="${link}" style="color: #25D366; text-decoration: underline;">${link}</a>
        </p>
        <br>
        <p>Best regards,<br><strong>Kahuta Knights Management</strong></p>
    </div>
  `;
}

function rejectedEmail(name) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Hello ${e(name)},</h2>
        <p>Thank you for your interest in joining <strong>Kahuta Knights</strong>.</p>
        <p>After reviewing your submission, we regret to inform you that we are unable to accept your application at this time.</p>
        <p>We encourage you to keep training and apply again during our future recruitment drives.</p>
        <br>
        <p>Best regards,<br><strong>Kahuta Knights Management</strong></p>
    </div>
  `;
}

function waitingListEmail(name) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #ffffff; background-color: #121212; padding: 20px; border-radius: 8px;">
        <h2 style="color: #d4af37;">Hello ${e(name)},</h2>
        <p>Thank you for applying to join <strong>Kahuta Knights</strong>!</p>

        <p>We are pleased to inform you that we have received your application. After careful review of your profile, we would like to place your application on our <strong>Waiting List</strong>.</p>

        <h3 style="color: #d4af37; margin-top: 20px;">Next Steps Towards Team Membership</h3>
        <p>To proceed with your membership approval, we would like to invite you to visit our gym and participate in a <strong>practice session with our team leaders and members</strong> in your weight class. This practical evaluation will allow us to assess your skills, training level, and fit with the Kahuta Knights team.</p>

        <p><strong>What to expect:</strong></p>
        <ul style="margin-left: 20px;">
            <li>A training session with experienced team members from your weight class</li>
            <li>Evaluation of your technical skills and training progress</li>
            <li>Opportunity to connect with the team and understand our culture</li>
        </ul>

        <p style="margin-top: 15px;">Upon successful completion of the practice session, we will formally approve your application and welcome you as an official member of Kahuta Knights.</p>

        <p style="margin-top: 15px;">Please contact our management team to schedule your gym visit and practice session at your earliest convenience. We are excited to meet you and evaluate your potential!</p>

        <h3 style="color: #d4af37; margin-top: 20px;">Contact Information Wattsapp</h3>
        <p style="margin: 10px 0;">
            <strong>Abdullah Jan</strong><br>
            Phone: <strong>0344 8583226</strong>
        </p>
        <p style="margin: 10px 0;">
            <strong>M. Zain Ijaz</strong><br>
            Phone: <strong>0343 3408358</strong>
        </p>

        <br>
        <p>Best regards,<br><strong>Kahuta Knights Management</strong></p>
    </div>
  `;
}

function newRequestEmail({ fullName, email, phone, age, weight, approveUrl, waitingListUrl, rejectUrl }) {
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2 style="color: #333;">New Team Registration Request</h2>
        <p>A new athlete wants to join <strong>Kahuta Knights</strong>!</p>
        <hr>
        <p><strong>Full Name:</strong> ${e(fullName)}</p>
        <p><strong>Email:</strong> ${e(email)}</p>
        <p><strong>Phone:</strong> ${e(phone)}</p>
        <p><strong>Age:</strong> ${e(age)}</p>
        <p><strong>Weight Class:</strong> ${e(weight)}</p>
        <br>
        <div style="margin-top: 15px;">
            <a href="${e(approveUrl)}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Approve Application</a>
            <a href="${e(waitingListUrl)}" style="background-color: #ffc107; color: black; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; margin-right: 10px;">Waiting List</a>
            <a href="${e(rejectUrl)}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reject Application</a>
        </div>
    </div>
  `;
}

module.exports = { createMailer, approvedEmail, rejectedEmail, waitingListEmail, newRequestEmail };
