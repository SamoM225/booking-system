import nodemailer from 'nodemailer';
import { config } from '../config.js';

export interface Mail {
    to: string
    subject: string
    text: string
    html: string
}

// In memory mode (MAIL_TRANSPORT=memory) every sent mail lands here instead of an SMTP server
export const outbox: Mail[] = [];

const transport = config.mail.transport === 'memory'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: config.mail.host,
        port: config.mail.port,
        secure: config.mail.secure,
        ...(config.mail.user ? { auth: { user: config.mail.user, pass: config.mail.pass } } : {}),
    });

export async function sendMail(mail: Mail) {
    await transport.sendMail({ from: config.mail.from, ...mail });
    if (config.mail.transport === 'memory') outbox.push(mail);
}

export const escapeHtml = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
