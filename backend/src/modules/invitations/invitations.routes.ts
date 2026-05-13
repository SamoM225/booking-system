import { Router } from 'express';
import { validateBody } from '../../middleware/body-middleware.js';
import { acceptInvitationSchema } from './invitations.schema.js';
import { acceptInvitation, getInvitation } from './invitations.service.js';

// Public part of the invite flow: the link from the e-mail. Admin endpoints live under /admin/team.
export const invitationsRouter = Router();

invitationsRouter.get('/:token', async (req, res) => {
    res.json(await getInvitation(String(req.params.token)));
});

invitationsRouter.post('/:token/accept', validateBody(acceptInvitationSchema), async (req, res) => {
    const user = await acceptInvitation(String(req.params.token), req.body);
    // Signed in right away, like after a login
    req.session.userId = user.id;
    req.session.role = user.role;
    res.status(201).json({ message: 'Invitation accepted', user });
});
