import { Router } from 'express';
import { validateBody } from '../../../middleware/body-middleware.js';
import { inviteMemberSchema, updateMemberSchema } from './team.schema.js';
import { getMembers, inviteMember, updateMember } from './team.service.js';

export const teamRouter = Router();

teamRouter.get('/', async (req, res) => {
    res.json(await getMembers());
});

// Invite logic is up to you, see inviteMember in team.service.ts
teamRouter.post('/invite', validateBody(inviteMemberSchema), async (req, res) => {
    res.status(201).json(await inviteMember(req.body));
});

teamRouter.put('/:id', validateBody(updateMemberSchema), async (req, res) => {
    res.json(await updateMember(String(req.params.id), req.body));
});
