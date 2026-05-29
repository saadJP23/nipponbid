
const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠  Email not configured — set EMAIL_USER / EMAIL_PASS in .env');
    return null;
  }
  transporter = nodemailer.createTransport({
    host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

async function sendEmail(to, subject, html) {
  const t = getTransporter();
  if (!t) return;
  try {
    await t.sendMail({
      from: process.env.EMAIL_FROM || `"NipponBid" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('📧 Email send error:', err.message);
  }
}

const emailBase = (body) => `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0a0a0a;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#111;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">
  <div style="background:#E11D2C;padding:24px 32px;">
    <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:-0.5px;">NipponBid</h1>
    <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Japan's Premier Car Auction Platform</p>
  </div>
  <div style="padding:32px;">${body}</div>
  <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.05);color:rgba(255,255,255,0.25);font-size:11px;">
    NipponBid — Shin Chuo K.K. Platform
  </div>
</div></body></html>`;

const p = (text) => `<p style="color:rgba(255,255,255,0.75);font-size:14px;line-height:1.7;margin:0 0 16px;">${text}</p>`;
const h = (text) => `<h2 style="color:#fff;font-size:18px;margin:0 0 16px;">${text}</h2>`;
const carBox = (car) => `
<div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;border:1px solid rgba(255,255,255,0.06);">
  <p style="margin:0 0 8px;color:#fff;font-size:15px;font-weight:bold;">${car.make} ${car.model} ${car.year || ''}</p>
  <p style="margin:0;color:rgba(255,255,255,0.4);font-size:12px;">Chassis: ${car.chassis || '—'} &nbsp;|&nbsp; Lot: ${car.lot_number || '—'} &nbsp;|&nbsp; ${car.auction_house || ''}</p>
</div>`;
const btn = (url, label) => `<a href="${url}" style="display:inline-block;background:#E11D2C;color:#fff;padding:12px 28px;border-radius:100px;text-decoration:none;font-size:14px;font-weight:600;margin-top:8px;">${label}</a>`;

module.exports = {
  sendEmail,

  bidReceived: (to, userName, car, amount) =>
    sendEmail(to, `Bid Submitted — ${car.make} ${car.model}`, emailBase(
      h('Bid Submitted Successfully') +
      p(`Hi ${userName}, your bid of <strong style="color:#E11D2C;">¥${Number(amount).toLocaleString()}</strong> has been received.`) +
      carBox(car) +
      p('Our team will represent you at the auction. You\'ll be notified of the result by end of auction day.')
    )),

  bidWon: (to, userName, car, amount, siteUrl) =>
    sendEmail(to, `🎉 Congratulations! You won — ${car.make} ${car.model}`, emailBase(
      h('You Won the Bid!') +
      p(`Hi ${userName}, congratulations! Your bid of <strong style="color:#E11D2C;">¥${Number(amount).toLocaleString()}</strong> was successful.`) +
      carBox(car) +
      p('Our team will be in touch regarding payment and shipping details. Check your purchase dashboard for updates.') +
      btn(`${siteUrl}/my-japan-purchases`, 'View My Purchase')
    )),

  bidLost: (to, userName, car) =>
    sendEmail(to, `Bid Update — ${car.make} ${car.model}`, emailBase(
      h('Bid Unsuccessful') +
      p(`Hi ${userName}, unfortunately your bid on the <strong>${car.make} ${car.model}</strong> was not successful this time.`) +
      carBox(car) +
      p('Don\'t give up — new stock is added every day. Browse the latest listings below.') +
      btn(`${siteUrl}/japanese-auctions`, 'Browse New Listings')
    )),

  documentUploaded: (to, userName, car, docName, siteUrl) =>
    sendEmail(to, `New Document — ${car.make} ${car.model}`, emailBase(
      h('A New Document Is Available') +
      p(`Hi ${userName}, a new document <strong>"${docName}"</strong> has been uploaded to your purchase.`) +
      carBox(car) +
      p('Log in to view and download your document.') +
      btn(`${siteUrl}/my-japan-purchases`, 'View Documents')
    )),

  purchaseUpdated: (to, userName, car, updateMsg, siteUrl) =>
    sendEmail(to, `Purchase Update — ${car.make} ${car.model}`, emailBase(
      h('Your Purchase Has Been Updated') +
      p(`Hi ${userName}, there is a new update on your purchase:`) +
      `<div style="background:#1a1a1a;border-left:3px solid #E11D2C;border-radius:4px;padding:12px 16px;margin:12px 0;color:rgba(255,255,255,0.75);font-size:14px;">${updateMsg}</div>` +
      carBox(car) +
      btn(`${siteUrl}/my-japan-purchases`, 'View Purchase')
    )),
};
