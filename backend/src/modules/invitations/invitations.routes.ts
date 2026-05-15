import { Router } from 'express';
import { signIn } from '../../middleware/auth.js';
import { validateBody } from '../../middleware/body-middleware.js';
import { acceptInvitationSchema } from './invitations.schema.js';
import { acceptInvitation, getInvitation } from './invitations.service.js';

// Public part of the invite flow: the link from the e-mail. Admin endpoints live under /admin/team.
export const invitationsRouter = Router();

invitationsRouter.get('/:token', async (req, res) => {
    res.json(await getInvitation(String(req.params.token)));
});

invitationsRouter.post('/:token/accept', validateBody(acceptInvitationSchema), async (req, res) => {
    const { sessionVersion, ...user } = await acceptInvitation(String(req.params.token), req.body);
    // Signed in right away, like after a login. The account exists either way, so a session problem is not an error.
    try {
        await signIn(req, { ...user, sessionVersion });
    } catch (error) {
        console.error('Sign-in after accepting an invitation failed', error);
        return res.status(201).json({ message: 'Invitation accepted. Please sign in', user, signedIn: false });
    }
    res.status(201).json({ message: 'Invitation accepted', user, signedIn: true });
});
