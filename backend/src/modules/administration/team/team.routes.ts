import { Router } from 'express';
import type { RequestHandler } from 'express';
import { config } from '../../../config.js';
import { HttpError } from '../../../lib/http-error.js';
import { validateBody } from '../../../middleware/body-middleware.js';
import { parseId } from '../../../lib/parse-id.js';
import { userOf } from '../../../middleware/auth.js';
import { inviteMember, listInvitations, resendInvitation, revokeInvitation } from '../../invitations/invitations.service.js';
import { inviteMemberSchema, updateMemberSchema } from './team.schema.js';
import { getMembers, updateMember } from './team.service.js';

export const teamRouter = Router();

// The public demo must not send e-mails to addresses visitors type in
const noInvitationsInDemo: RequestHandler = (req, res, next) => {
    next(config.demoMode ? new HttpError(403, 'Invitations are turned off in the demo') : undefined);
};

teamRouter.get('/', async (req, res) => {
    res.json(await getMembers());
});

// Sends an e-mail with a one-time link, the person sets their own password (see modules/invitations)
teamRouter.post('/invite', noInvitationsInDemo, validateBody(inviteMemberSchema), async (req, res) => {
    res.status(201).json(await inviteMember(req.body, userOf(res)?.id ?? null));
});

teamRouter.get('/invitations', async (req, res) => {
    res.json(await listInvitations());
});

teamRouter.post('/invitations/:id/resend', noInvitationsInDemo, async (req, res) => {
    res.json(await resendInvitation(parseId(req.params.id), userOf(res)?.id ?? null));
});

teamRouter.delete('/invitations/:id', async (req, res) => {
    res.json(await revokeInvitation(parseId(req.params.id)));
});

teamRouter.put('/:id', validateBody(updateMemberSchema), async (req, res) => {
    res.json(await updateMember(String(req.params.id), req.body));
});
