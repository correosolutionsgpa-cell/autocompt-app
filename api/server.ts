// Explicit target for the vercel.json rewrite (filesystem-based catch-all
// routes like [...path].ts proved unreliable for nested /api/* paths on this
// project — matched single-segment paths like /api/scan but not /api/drive/
// upload). An explicit rewrite in vercel.json is more predictable.
//
// The ".js" extension below is required, not optional: package.json sets
// "type": "module", so Vercel's Node runtime resolves this with strict ESM
// rules (extensionless relative imports throw ERR_MODULE_NOT_FOUND there),
// even though the local Vite/tsconfig "bundler" resolution tolerates it.
export { default } from "../server.js";
