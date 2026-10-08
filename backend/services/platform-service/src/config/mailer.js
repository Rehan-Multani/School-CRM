import nodemailer from 'nodemailer';
import { env } from './env.js';

export function isSmtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

function transporter() {
  return nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: Number(env.smtp.port) === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });
}

export async function sendSchoolWelcomeEmail({ to, schoolName, password, loginUrl }) {
  const subject = `${schoolName} — your School Admin login`;
  const text = [
    `Welcome to ${schoolName}.`,
    '',
    'Your School Admin portal login:',
    `Email: ${to}`,
    `Password: ${password}`,
    `Login: ${loginUrl}`,
    '',
    'After login, choose a subscription plan to unlock the rest of the portal.',
    'Please change this password after you sign in.',
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:8px">${schoolName}</h2>
      <p>Your School Admin account is ready.</p>
      <p><strong>Email:</strong> ${to}<br/><strong>Password:</strong> ${password}</p>
      <p><a href="${loginUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px">Open School Admin login</a></p>
      <p style="color:#64748b;font-size:13px">After login, choose a subscription plan to unlock the rest of the portal.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    if (env.nodeEnv !== 'production') {
      console.log(`[dev email] To: ${to}\n${text}`);
    }
    return false;
  }

  await transporter().sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text,
    html,
  });

  return true;
}

export async function sendSchoolResetEmail({ to, schoolName, resetUrl }) {
  const subject = `${schoolName} — reset your School Admin password`;
  const text = [
    `We received a request to reset the School Admin password for ${schoolName}.`,
    '',
    'Open this link to choose a new password (valid for 30 minutes):',
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:8px">${schoolName}</h2>
      <p>We received a request to reset your School Admin password.</p>
      <p><a href="${resetUrl}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px">Reset password</a></p>
      <p style="color:#64748b;font-size:13px">This link expires in 30 minutes. If you did not request it, ignore this email.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    if (env.nodeEnv !== 'production') {
      console.log(`[dev email] To: ${to}\n${text}`);
    }
    return false;
  }

  await transporter().sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text,
    html,
  });

  return true;
}

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/**
 * Password-reset OTP by email (teacher / principal / transport manager).
 * Returns true when handed to the SMTP server, false when SMTP is not
 * configured (the code is then printed to the dev console, never in production).
 * Throws on an SMTP failure so the caller can log it.
 */
export async function sendPasswordResetOtpEmail({ to, name, otp, minutes = 5 }) {
  const subject = 'Your School Sarthi password reset OTP';
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const text = [
    greeting,
    '',
    `Your OTP to reset your password is ${otp}.`,
    `It is valid for ${minutes} minutes. Do not share it with anyone.`,
    '',
    'If you did not request this, you can ignore this email — your password stays unchanged.',
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:8px">Password reset</h2>
      <p>${escapeHtml(greeting)}</p>
      <p>Use this OTP to reset your School Sarthi password:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:16px 0">${escapeHtml(otp)}</p>
      <p style="color:#64748b;font-size:13px">It is valid for ${escapeHtml(minutes)} minutes. Do not share it with anyone. If you did not request this, ignore this email — your password stays unchanged.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    if (env.nodeEnv !== 'production') {
      console.log(`[dev email] To: ${to}\n${text}`);
    }
    return false;
  }

  await transporter().sendMail({
    from: env.smtp.from || env.smtp.user,
    to,
    subject,
    text,
    html,
  });
  return true;
}
