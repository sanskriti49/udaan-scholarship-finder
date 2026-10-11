import { up as quarantine } from "./004-quarantine-unverified-samples.js";

export const id="005-quarantine-original-feed-paths";

// Older imports stored snapshots at the invented /api/schemes URL, while
// later cleanup normalized displayed links to the homepage. Repair installations
// where 004 ran before both historical forms were recognized. Idempotent:
// already archived records and real HTTP JSON snapshots are unaffected.
export async function up(ctx) {return quarantine(ctx);}
