// Promote an existing user to admin: npm run admin:make -- user@example.com
import { setAdmin } from '../modules/users/users.service.js';

const email = process.argv[2];
if (!email) {
    console.error('Usage: npm run admin:make -- <email>');
    process.exit(1);
}

const user = await setAdmin(email);
console.log(`${user.email} is now an admin`);
process.exit(0);
