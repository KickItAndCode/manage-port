/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as admin from "../admin.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as documentFolders from "../documentFolders.js";
import type * as documents from "../documents.js";
import type * as leaseUtilitySettings from "../leaseUtilitySettings.js";
import type * as leases from "../leases.js";
import type * as listingJobs from "../listingJobs.js";
import type * as listingPublications from "../listingPublications.js";
import type * as migrate from "../migrate.js";
import type * as platformTokens from "../platformTokens.js";
import type * as properties from "../properties.js";
import type * as propertyImages from "../propertyImages.js";
import type * as storage from "../storage.js";
import type * as units from "../units.js";
import type * as userSettings from "../userSettings.js";
import type * as utilityAnalytics from "../utilityAnalytics.js";
import type * as utilityBills from "../utilityBills.js";
import type * as utilityCharges from "../utilityCharges.js";
import type * as utilityInsights from "../utilityInsights.js";
import type * as utilityPayments from "../utilityPayments.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  crons: typeof crons;
  dashboard: typeof dashboard;
  documentFolders: typeof documentFolders;
  documents: typeof documents;
  leaseUtilitySettings: typeof leaseUtilitySettings;
  leases: typeof leases;
  listingJobs: typeof listingJobs;
  listingPublications: typeof listingPublications;
  migrate: typeof migrate;
  platformTokens: typeof platformTokens;
  properties: typeof properties;
  propertyImages: typeof propertyImages;
  storage: typeof storage;
  units: typeof units;
  userSettings: typeof userSettings;
  utilityAnalytics: typeof utilityAnalytics;
  utilityBills: typeof utilityBills;
  utilityCharges: typeof utilityCharges;
  utilityInsights: typeof utilityInsights;
  utilityPayments: typeof utilityPayments;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
