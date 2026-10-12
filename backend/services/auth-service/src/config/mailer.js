import nodemailer from 'nodemailer';
import { env } from './env.js';

const escapeHtml = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function isSmtpConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.pass);
}

/**
 * Super Admin sign-in OTP. Returns true when handed to SMTP, false when SMTP is
 * not configured (the code is then printed to the dev console — never in
 * production). Throws on an SMTP failure.
 */
export async function sendLoginOtpEmail({ to, name, otp, minutes }) {
  const subject = 'Your School CRM Super Admin sign-in code';
  const greeting = name ? `Hello ${name},` : 'Hello,';
  const text = [
    greeting,
    '',
    `Your Super Admin sign-in OTP is ${otp}.`,
    `It is valid for ${minutes} minutes. Do not share it with anyone.`,
    '',
    'If you did not try to sign in, change your password immediately.',
  ].join('\n');

  const html = `
    <div style="font-family:Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin-bottom:8px">Super Admin sign-in</h2>
      <p>${escapeHtml(greeting)}</p>
      <p>Use this OTP to finish signing in to the School CRM console:</p>
      <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:16px 0">${escapeHtml(otp)}</p>
      <p style="color:#64748b;font-size:13px">It is valid for ${escapeHtml(minutes)} minutes. Do not share it with anyone. If you did not try to sign in, change your password immediately.</p>
    </div>
  `;

  if (!isSmtpConfigured()) {
    if (env.nodeEnv !== 'production' && env.nodeEnv !== 'test') {
      console.log(`[dev email] To: ${to}\n${text}`);
    }
    return false;
  }

  await nodemailer
    .createTransport({
      host: env.smtp.host,
      port: env.smtp.port,
      secure: Number(env.smtp.port) === 465,
      auth: { user: env.smtp.user, pass: env.smtp.pass },
    })
    .sendMail({ from: env.smtp.from || env.smtp.user, to, subject, text, html });
  return true;
}
