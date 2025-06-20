/**
 * Scheduled background jobs for listing management
 * TODO: Enable when platform APIs are connected
 */

import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Background jobs will be enabled when platform APIs are integrated:

// Process pending listing publications every 5 minutes
// Refresh expiring tokens daily at 2 AM  
// Sync listing status with platforms every 4 hours
// Clean up old invalid tokens weekly

export default crons;