/**
 * Scheduled background jobs.
 *
 * This file was previously empty — every line commented out — while two
 * notification generators sat in the codebase with no callers. The result was
 * a Notifications settings page, a notification centre in the sidebar and a
 * notifications table that between them never produced a single alert.
 *
 * Both jobs run against Convex only. Nothing here depends on an external API,
 * an email provider or a message queue, so they work with the credentials the
 * project already has.
 *
 * Times are UTC. Early morning was chosen so a landlord opening the app during
 * their working day sees alerts generated for that day rather than yesterday's.
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Leases expiring within 60 days. Escalates through info, warning and error as
// the date approaches, so a renewal cannot quietly pass its deadline.
crons.daily(
  "notify expiring leases",
  { hourUTC: 7, minuteUTC: 0 },
  internal.leases.notifyExpiringLeasesForAllUsers
);

// Overdue utility bills and months with no reading recorded.
crons.daily(
  "notify utility reminders",
  { hourUTC: 7, minuteUTC: 15 },
  internal.utilityInsights.notifyUtilityRemindersForAllUsers
);

export default crons;
