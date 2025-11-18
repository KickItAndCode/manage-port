## Next Phase Plan – ManagePort

**Status**: Phase 3 In Progress  
**Last Updated**: January 27, 2025  
**See `docs/CURRENT_STATUS.md` for latest status**

### Vision
Deliver a landlord-first workspace that feels simple, predictable, and fast. Every interaction should:  
1. Use unified components with consistent spacing, typography, and states.  
2. Keep multi-tenant utility tracking understandable at a glance.  
3. Surface the right action (add bill, approve lease, upload doc) without digging through menus.

### Product Principles
- **Clarity over knobs**: progressive disclosure, opinionated defaults, fewer long forms.
- **One component system**: every form, select, card, table, and badge shares the same tokens.
- **Trust the math**: utility and payment calculations are inspectable, auditable, and reversible.
- **Mobile parity**: phone/tablet flows must be as capable as desktop.

---

## Phase 0 – Enablement (1 sprint)
| Goal | Key Tasks | Notes |
| --- | --- | --- |
| Inventory & deprecate duplicate components | Generate catalog of current inputs/selects/tables from `src/components` and screens; tag owners | Use findings from `docs/FORM_DESIGN_SYSTEM_AUDIT.md` as baseline. |
| Define design tokens + component API | Finalize typography scale, spacing, state colors, interactive tokens; codify in `src/styles/tokens.ts` and Tailwind config | Include skeleton, toast, badge variants for future reuse. |
| Adopt engineering guardrails | Add Storybook/Chromatic (or similar) to lock styling, introduce visual regression CI, and document usage guidelines in `/docs/ui/` | Sets foundation for later phases. |

Deliverable: “UI System Starter Kit” doc + tokenized component library published in the repo.

### Task Breakdown
- Audit all existing inputs/selects/tables in `src/components` and flag duplicates per screen.
- Catalog usage per major view (properties, leases, utilities, payments) with component owners.
- Define the design token source (`src/styles/tokens.ts`, Tailwind config) covering typography, spacing, state colors, badges, skeletons, and toasts.
- Document the token system and usage guidelines under `docs/ui/`.
- Install Storybook (or similar) plus visual-regression CI (Chromatic/Playwright screenshots).
- Add contribution rules/checklists that enforce using the shared component library.

---

## Phase 1 – Unified Interaction Layer (2 sprints)
| Workstream | Description | Success Metrics |
| --- | --- | --- |
| **Form & Input Library** | Replace bespoke selects, labels, textareas with shared primitives (Select, FormField, FormGrid, FormActions). Migrate highest-traffic workflows (LeaseForm, UtilityBillForm, PropertyForm) first. | 100% of forms in these pages use new primitives; Lighthouse accessibility ≥ 95. |
| **Responsive Data Surfaces** | Ship new responsive table/card system for properties, leases, utilities, payments. Ensure keyboard + touch parity, column configs, and skeleton loaders. | All index pages render in <1s CLS, card mode passes mobile usability tests. |
| **Navigation & Quick Actions Simplification** | Simplify sidebar, add surface-level quick actions (“Add property”, “Log bill”, “Upload doc”), and ensure empty/error states use shared patterns. | <2 clicks to reach any CRUD flow; quick actions used by ≥50% pilot landlords. |

Deliverable: Consistent UI across top workflows, reduced CSS variance, improved first-time-user comprehension.

### Task Breakdown
- Build shared primitives: `Select`, `FormField`, `FormGrid`, `FormActions`, responsive table/card, skeleton loader, toast, status badge.
- Migrate `LeaseForm`, `UtilityBillForm`, and `PropertyForm` to the new primitives, confirming Lighthouse accessibility ≥ 95.
- Replace data tables on properties, leases, utilities, and payments pages with the responsive table/card component.
- Refresh navigation (sidebar simplification, quick-action panel, unified empty/error states) using the shared tokens.
- Instrument analytics to capture quick-action usage and CRUD click depth for baseline metrics.

---

## Phase 2 – Utility Simplicity & Trust (2–3 sprints)
| Workstream | Description | Key Outputs |
| --- | --- | --- |
| **Utility Responsibility Snapshot** | Redesign utility settings UI with pill-based percentages, validation chips, and auto-balancing; highlight owner share. | Split overview widget embedded in property + lease detail views. |
| **Charge Pipeline Hardening** | Build inspectable charge ledger: each bill shows calculation steps, responsible leases, and adjustments; allow “convert to historical” and back inline (leveraging `noTenantCharges`). | New “Utility Ledger” component + audit trail stored in Convex. |
| **Insights & Alerts** | Add monthly deltas, anomaly detection (spikes), and scheduled reminders (overdue bills, missing readings). Integrate notification preferences once Phase 1 UI is stable. | Alert opt-in page + digest summary in dashboard. |

Deliverable: Landlords can explain every charge, edit responsibilities safely, and trust notifications for outliers.

### Task Breakdown
- Design and implement the Utility Responsibility Snapshot with pill-based percentages, validation chips, and owner-share highlighting.
- Embed the snapshot widget inside property and lease detail views.
- Build the Utility Ledger view showing calculation steps, responsible leases, adjustments, and inline “mark historical” toggles (backed by Convex audit data).
- Extend Convex mutations/queries to log ledger entries and expose historical APIs.
- Implement anomaly detection plus reminder jobs (overdue bills, missing readings) and create a notification-preferences UI.
- Surface insights/alerts through new dashboard summary cards.

---

## Phase 3 – Experience Deepening (3+ sprints, parallel tracks)
| Track | Initiatives | Dependencies |
| --- | --- | --- |
| **Documents & Activity** | Finish document manager (drag/drop, previews, tagging), add property/lease timelines that log uploads, status changes, bulk operations. | Requires unified components + responsive cards. |
| **Actionable Dashboards** | Rework dashboard to emphasize KPIs (occupancy, rent collected, utility spend by property), include quick filters and contextual quick actions. | Needs new analytics queries + card components. |
| **Communication & Automation** | Layer real-time notifications (lease expiring, overdue balances, doc approvals) and email/SMS digests; ensure preferences stored per user. | Relies on Phase 2 alert system. |

Deliverable: A cohesive control center where documents, metrics, and alerts live together.

### Task Breakdown
- Complete the document manager (drag/drop uploads, previews, tagging, entity linking) using unified components.
- Add property/lease activity timelines powered by audit events (uploads, status changes, bulk ops).
- Redesign the dashboard with KPI cards, quick filters, and contextual quick actions fed by new analytics queries.
- Build a notification center that supports real-time alerts plus email/SMS digests with subscription management.
- Verify all new experiences (documents, dashboard, notifications) consume the Phase 1 component library.

---

## Phase 4 – Scale & Observability (ongoing)
- **Testing**: Expand Playwright coverage for core flows, add contract tests around Convex functions, and include utility math fixtures.  
- **Performance**: Instrument dashboards with Web Vitals, ensure ISR/SSR strategy is documented, and add profiling for heavy tables.  
- **Data exports & APIs**: Provide CSV export for utilities/properties, plus webhooks for integrations (accounting, listings).  
- **Localization & Accessibility**: Prep copy for translation, audit ARIA labels, and add RTL support in component library.

### Task Breakdown
- Extend Playwright to cover property/lease/utility CRUD, ledger workflows, and document uploads.
- Add contract tests for Convex functions plus deterministic fixtures for utility math verification.
- Instrument Web Vitals and profiling on heavy pages; document ISR/SSR usage patterns.
- Build CSV export + webhook endpoints for properties/utilities and publish the API contract.
- Begin localization prep (string extraction, RTL smoke tests) alongside a full accessibility audit and fixes.

---

### Implementation Notes
- Reference `docs/UTILITY_BILLS_SOLUTION.md` for the existing `noTenantCharges` logic; Phase 2 extends that foundation.  
- `docs/archive/legacy_planning_archive.md` holds the historical backlog if we need to reintroduce any ideas.  
- All new work should default to the shared UI system; ad-hoc components are disallowed unless the design system updates first.

### Success Metrics
1. **Time-to-task**: New users can create a property, assign leases, and log utilities in <10 minutes without training.  
2. **Consistency**: 0 custom form elements outside the shared primitives.  
3. **Utility confidence**: <2% of bills marked “needs review”; manual adjustments drop by 50%.  
4. **Engagement**: Quick actions and alerts drive a 30% increase in weekly active landlord sessions.  
5. **Quality**: Visual regression suite passes 100% before deploy; Lighthouse accessibility ≥ 95 across top routes.

