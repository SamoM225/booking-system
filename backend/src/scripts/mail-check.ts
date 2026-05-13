// Sends a test e-mail through the configured SMTP server and, for the local Mailpit, checks it arrived:
// npm run mail:check -- you@example.com   (inbox: http://localhost:8025)
import { config } from '../config.js';
import { sendMail } from '../lib/mailer.js';

const to = process.argv[2] || 'test@booking.local';
const subject = `Booking mail check ${new Date().toISOString()}`;

await sendMail({
    to,
    subject,
    text: 'If you can read this, e-mails from the booking app are delivered.',
    html: '<p>If you can read this, e-mails from the booking app are <strong>delivered</strong>.</p>',
});
console.log(`Sent "${subject}" to ${to} via ${config.mail.host}:${config.mail.port}`);

// Mailpit exposes its inbox over HTTP on 8025; any other SMTP server is only checked for accepting the mail
const mailpit = `http://${config.mail.host}:8025/api/v1/search?query=${encodeURIComponent(`subject:"${subject}"`)}`;
try {
    const result = await (await fetch(mailpit)).json() as { messages_count?: number };
    if (!result.messages_count) {
        console.error('Mailpit did not receive the e-mail');
        process.exit(1);
    }
    console.log('Mailpit received it: http://localhost:8025');
} catch {
    console.log('No Mailpit API found, the SMTP server accepted the e-mail');
}
process.exit(0);
