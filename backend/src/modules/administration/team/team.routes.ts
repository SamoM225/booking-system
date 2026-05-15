import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { parseId } from '../../../lib/parse-id.js';
import { userOf } from '../../../middleware/auth.js';
import { inviteMember, listInvitations, resendInvitation, revokeInvitation } from '../../invitations/invitations.service.js';
import { inviteMemberSchema, updateMemberSchema } from './team.schema.js';
import { getMembers, updateMember } from './team.service.js';

export const teamRouter = Router();

teamRouter.get('/', async (req, res) => {
    res.json(await getMembers());
});

// Sends an e-mail with a one-time link, the person sets their own password (see modules/invitations)
teamRouter.post('/invite', validateBody(inviteMemberSchema), async (req, res) => {
    res.status(201).json(await inviteMember(req.body, userOf(res)?.id ?? null));
});

teamRouter.get('/invitations', async (req, res) => {
    res.json(await listInvitations());
});

teamRouter.post('/invitations/:id/resend', async (req, res) => {
    res.json(await resendInvitation(parseId(req.params.id), userOf(res)?.id ?? null));
});

teamRouter.delete('/invitations/:id', async (req, res) => {
    res.json(await revokeInvitation(parseId(req.params.id)));
});

teamRouter.put('/:id', validateBody(updateMemberSchema), async (req, res) => {
    res.json(await updateMember(String(req.params.id), req.body));
});
