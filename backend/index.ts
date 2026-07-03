// Entry for Vercel: it looks for the Express app in index.ts and expects a default export.
// src/server.ts (with listen) stays the entry for local development.
/// <reference path="./src/types/session.d.ts" />
import { createApp } from './src/app.js';

export default createApp();
