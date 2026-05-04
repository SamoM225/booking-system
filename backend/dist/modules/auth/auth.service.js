import { prisma } from '../../db/prisma.js';
export async function getUser(data) {
    return await prisma.user.findUnique({
        where: { email: data.email },
        select: {
            id: true,
            email: true,
            name: true,
            password: true,
        }
    });
}
export function logout(req, res) {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: "Error occurred while logging out" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
    });
}
//# sourceMappingURL=auth.service.js.map