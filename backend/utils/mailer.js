const nodemailer = require('nodemailer');

// Gmail SMTP via an App Password (a normal account password will not work —
// generate one at https://myaccount.google.com/apppasswords with 2FA enabled).
// Set SMTP_USER / SMTP_PASS in .env. Without them the server still runs and
// prints codes to the console in development, so you can test without email.
const HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const PORT = Number(process.env.SMTP_PORT || 465);
const USER = process.env.SMTP_USER || '';
const PASS = (process.env.SMTP_PASS || '').replace(/\s+/g, ''); // Google shows app passwords in 4-char groups
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Wardrobe Manager';

let transporter = null;

function isConfigured() {
  return Boolean(USER && PASS);
}

function getTransporter() {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      secure: PORT === 465, // 465 = implicit TLS, 587 = STARTTLS
      auth: { user: USER, pass: PASS },
    });
  }
  return transporter;
}

// Verifies SMTP credentials once at boot so a bad app password shows up in the
// logs immediately instead of on the first user signup.
async function verifyMailer() {
  if (!isConfigured()) {
    console.warn('✉️  SMTP not configured (SMTP_USER / SMTP_PASS missing) — OTP codes will be logged to the console.');
    return false;
  }
  try {
    await getTransporter().verify();
    console.log(`✉️  SMTP ready (${USER})`);
    return true;
  } catch (err) {
    console.error('✉️  SMTP verification failed:', err.message);
    return false;
  }
}

async function sendMail({ to, subject, html, text }) {
  const tx = getTransporter();

  if (!tx) {
    // Dev fallback: no credentials, so surface the mail in the terminal.
    console.log('\n──────── EMAIL (not sent, SMTP unconfigured) ────────');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(text || html);
    console.log('────────────────────────────────────────────────────\n');
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email service is not configured');
    }
    return { mocked: true };
  }

  return tx.sendMail({ from: `"${FROM_NAME}" <${USER}>`, to, subject, html, text });
}

// ---------------------------------------------------------------- templates

const wrap = (heading, intro, code, footer) => `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:24px;background:#F6F5F1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #111111;border-radius:16px;">
      <tr>
        <td style="padding:32px 28px;">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:1.4px;text-transform:uppercase;color:#8A8A85;">Wardrobe Manager</p>
          <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#111111;">${heading}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4A4A46;">${intro}</p>
          <div style="text-align:center;margin:0 0 24px;">
            <div style="display:inline-block;padding:16px 28px;background:#F6F5F1;border:1px solid #111111;border-radius:12px;font-size:32px;font-weight:700;letter-spacing:10px;color:#111111;">${code}</div>
          </div>
          <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#8A8A85;">${footer}</p>
          <p style="margin:0;font-size:13px;line-height:1.6;color:#8A8A85;">If you didn't request this, you can safely ignore this email.</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

async function sendVerificationCode(to, name, code, minutes) {
  const greeting = name ? `Hi ${name}, welcome!` : 'Welcome!';
  return sendMail({
    to,
    subject: `${code} is your Wardrobe Manager verification code`,
    text: `${greeting}\n\nYour verification code is ${code}. It expires in ${minutes} minutes.`,
    html: wrap(
      'Verify your email',
      `${greeting} Enter this code in the app to finish setting up your account.`,
      code,
      `This code expires in ${minutes} minutes.`
    ),
  });
}

async function sendResetCode(to, name, code, minutes) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return sendMail({
    to,
    subject: `${code} is your Wardrobe Manager password reset code`,
    text: `${greeting}\n\nYour password reset code is ${code}. It expires in ${minutes} minutes.`,
    html: wrap(
      'Reset your password',
      `${greeting} enter this code in the app to choose a new password.`,
      code,
      `This code expires in ${minutes} minutes. Your current password stays active until you set a new one.`
    ),
  });
}

module.exports = { sendMail, sendVerificationCode, sendResetCode, verifyMailer, isConfigured };
