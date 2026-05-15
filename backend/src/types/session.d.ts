import 'express-session'

declare module 'express-session' {
    interface SessionData {
        userId?: string;
        role?: string;
        // User.sessionVersion at sign-in; a bumped version signs the session out
        version?: number;
    }
}
