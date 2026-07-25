// Explicit target for the vercel.json rewrite (filesystem-based catch-all
// routes like [...path].ts proved unreliable for nested /api/* paths on this
// project — matched single-segment paths like /api/scan but not /api/drive/
// upload). An explicit rewrite in vercel.json is more predictable.
export { default } from "../server";
