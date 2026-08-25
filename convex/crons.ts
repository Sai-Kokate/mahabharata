/* ============================================================================
   Scheduled work. One job: reclaim rooms the players walked away from.

   Nothing here is load-bearing for a game in progress — if the sweep never
   ran, the only cost would be dead rows.
   ========================================================================== */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sweep abandoned rooms",
  { hours: 6 },
  internal.avalon.sweepAbandonedRooms,
  {},
);

export default crons;
