import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "../../db/prisma.js";
import { config } from "../../config.js";
import { HttpError } from "../../lib/http-error.js";
import { escapeHtml, sendMail } from "../../lib/mailer.js";
import type { InviteMemberInput } from "../administration/team/team.schema.js";
import { findUserIdByEmail } from "../users/users.service.js";
import type { AcceptInvitationInput } from "./invitations.schema.js";

export const INVITATION_TTL_DAYS = 7;
const TEAM_ROLES = ['admin', 'worker'];

type InvitationRecord = {
    id: number
    email: string
    name: string
    role: string
    expiresAt: Date
    acceptedAt: Date | null
    createdAt: Date
    invitedBy?: { name: string } | null
}

// The raw token only travels in the e-mail link, the database keeps its hash
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const expiry = () => new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);
const roleLabel = (role: string) => role === 'admin' ? 'administrator' : 'specialist';

export const invitationLink = (token: string) => `${config.appUrl}/invite/${token}`;

function toInvitationDto(invitation: InvitationRecord) {
    return {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        createdAt: invitation.createdAt.toISOString(),
        expiresAt: invitation.expiresAt.toISOString(),
        expired: invitation.expiresAt.getTime() <= Date.now(),
        invitedBy: invitation.invitedBy?.name ?? null
    };
}

async function findUserByEmail(email: string) {
    const id = await findUserIdByEmail(email);
    return id ? prisma.user.findUnique({ where: { id } }) : null;
}

export function invitationMail(input: { name: string, email: string, role: string, inviter: string | null, token: string, expiresAt: Date }) {
    const link = invitationLink(input.token);
    const who = input.inviter ? `${input.inviter} has invited you` : 'You have been invited';
    const until = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bratislava' }).format(input.expiresAt);
    const text = [
        `Hi ${input.name},`,
        '',
        `${who} to join the Booking team as ${roleLabel(input.role)}.`,
        `Accept the invitation and choose your password here: ${link}`,
        '',
        `The link is valid until ${until}. If you were not expecting this e-mail, you can ignore it.`
    ].join('\n');
    const html = `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;padding:32px">
        <tr><td>
          <p style="margin:0 0 4px;font-size:12px;font-weight:bold;letter-spacing:2px;color:#2563eb;text-transform:uppercase">Booking</p>
          <h1 style="margin:0 0 16px;font-size:22px">You're invited to the team</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:22px">Hi ${escapeHtml(input.name)},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:22px">${escapeHtml(who)} to join the Booking team as <strong>${roleLabel(input.role)}</strong>.</p>
          <p style="margin:0 0 24px"><a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">Accept invitation</a></p>
          <p style="margin:0 0 8px;font-size:13px;line-height:20px;color:#475569">Or open this link: <a href="${escapeHtml(link)}" style="color:#2563eb;word-break:break-all">${escapeHtml(link)}</a></p>
          <p style="margin:0;font-size:13px;line-height:20px;color:#475569">The link is valid until ${until}. If you were not expecting this e-mail, you can ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
    return { to: input.email, subject: 'You have been invited to the Booking team', text, html };
}

async function inviterName(inviterId: string | null) {
    if (!inviterId) return null;
    return (await prisma.user.findUnique({ where: { id: inviterId }, select: { name: true } }))?.name ?? null;
}

async function send(mail: Parameters<typeof invitationMail>[0]) {
    try {
        await sendMail(invitationMail(mail));
    } catch (error) {
        console.error('Invitation e-mail failed', error);
        throw new HttpError(502, 'The invitation e-mail could not be sent. Please try again later');
    }
}

export async function listInvitations() {
    const invitations = await prisma.invitation.findMany({
        where: { acceptedAt: null },
        include: { invitedBy: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
    });
    return invitations.map(toInvitationDto);
}

export async function inviteMember(data: InviteMemberInput, inviterId: string | null) {
    const existing = await findUserByEmail(data.email);
    if (existing && TEAM_ROLES.includes(existing.role)) {
        throw new HttpError(409, 'This person is already a member of the team');
    }

    const token = newToken();
    const invitation = await prisma.invitation.create({
        data: { email: data.email, name: data.name, role: data.role, tokenHash: hashToken(token), expiresAt: expiry(), invitedById: inviterId },
        include: { invitedBy: { select: { name: true } } }
    });
    try {
        await send({ ...invitation, inviter: invitation.invitedBy?.name ?? null, token });
    } catch (error) {
        await prisma.invitation.delete({ where: { id: invitation.id } }).catch(() => {});
        throw error;
    }

    // Only once the new e-mail is out, an earlier pending invitation of the same address stops working
    // (only older ones: a second invite sent at the same moment keeps its own working link)
    await prisma.invitation.deleteMany({ where: { email: data.email, acceptedAt: null, id: { lt: invitation.id } } });
    return toInvitationDto(invitation);
}

export async function resendInvitation(id: number, inviterId: string | null) {
    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.acceptedAt) {
        throw new HttpError(404, 'Invitation not found');
    }

    // The old link keeps working if the new e-mail cannot be sent
    const token = newToken();
    const expiresAt = expiry();
    await send({ ...invitation, inviter: await inviterName(inviterId ?? invitation.invitedById), token, expiresAt });
    // Accepted or revoked while the e-mail was on its way: the new link stays unusable
    const updated = await prisma.invitation.updateMany({
        where: { id, acceptedAt: null },
        data: { tokenHash: hashToken(token), expiresAt, ...(inviterId ? { invitedById: inviterId } : {}) }
    });
    if (updated.count === 0) {
        throw new HttpError(404, 'Invitation not found');
    }
    const invitationNow = await prisma.invitation.findUniqueOrThrow({ where: { id }, include: { invitedBy: { select: { name: true } } } });
    return toInvitationDto(invitationNow);
}

export async function revokeInvitation(id: number) {
    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation || invitation.acceptedAt) {
        throw new HttpError(404, 'Invitation not found');
    }
    await prisma.invitation.delete({ where: { id } });
    return { id };
}

async function findUsableInvitation(token: string) {
    const invitation = await prisma.invitation.findUnique({
        where: { tokenHash: hashToken(token) },
        include: { invitedBy: { select: { name: true } } }
    });
    if (!invitation) throw new HttpError(404, 'This invitation link is not valid');
    if (invitation.acceptedAt) throw new HttpError(410, 'This invitation has already been used. Please sign in');
    if (invitation.expiresAt.getTime() <= Date.now()) throw new HttpError(410, 'This invitation has expired. Ask your administrator to send a new one');
    return invitation;
}

// What the accept page shows before the person sets a password
export async function getInvitation(token: string) {
    const invitation = await findUsableInvitation(token);
    const existing = await findUserByEmail(invitation.email);
    return { ...toInvitationDto(invitation), hasAccount: Boolean(existing) };
}

export async function acceptInvitation(token: string, data: AcceptInvitationInput) {
    const invitation = await findUsableInvitation(token);
    const password = await bcrypt.hash(data.password, 10);

    return prisma.$transaction(async (tx) => {
        // Claim the invitation first so the same link cannot be used twice in parallel
        const claimed = await tx.invitation.updateMany({
            where: { id: invitation.id, acceptedAt: null },
            data: { acceptedAt: new Date() }
        });
        if (claimed.count === 0) throw new HttpError(410, 'This invitation has already been used. Please sign in');

        const existingId = await findUserIdByEmail(invitation.email, tx);
        const existing = existingId ? await tx.user.findUnique({ where: { id: existingId } }) : null;
        if (existing && TEAM_ROLES.includes(existing.role)) {
            throw new HttpError(409, 'This person is already a member of the team. Please sign in');
        }

        // The link proves access to the mailbox, so an existing customer account is promoted and gets the new password.
        // Everyone signed in to that account until now is signed out: registration is not verified, so an old session
        // may belong to someone who registered the address before the real owner was invited.
        const user = existing
            ? await tx.user.update({
                where: { id: existing.id },
                data: { name: data.name, password, role: invitation.role, active: true, sessionVersion: { increment: 1 } }
            })
            : await tx.user.create({ data: { email: invitation.email, name: data.name, password, role: invitation.role } });

        await tx.invitation.deleteMany({ where: { email: invitation.email, acceptedAt: null } });
        return { id: user.id, email: user.email, name: user.name, role: user.role, sessionVersion: user.sessionVersion };
    });
}
