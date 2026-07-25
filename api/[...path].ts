// Catches every /api/* request not already matched by a more specific file
// in this directory (save-signed-document.ts, send-signature-invitation.js)
// and forwards it to the Express app defined in server.ts — that app's own
// internal routing (app.post("/api/drive/upload", ...), etc.) then matches
// the real endpoint from req.url, which Vercel preserves in full for
// catch-all dynamic API routes.
export { default } from "../server";
