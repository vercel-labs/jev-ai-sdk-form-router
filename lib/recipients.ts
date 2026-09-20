import "server-only";
import type { DestinationId } from "./examples";

/** Every registered destination has an inbox or an explicit unconfigured value. */
export type RecipientMap = Readonly<Record<DestinationId, string | null>>;

/**
 * Server-owned receiving inboxes, keyed by the registry's destination IDs.
 * @remarks Replace null with a valid email address to configure a destination.
 * All destinations for a form must be configured before delivery is offered.
 * Addresses are never passed to the browser or either routing model.
 */
export const routingRecipients: RecipientMap = {
  billing_invoices: null,
  billing_refunds: null,
  contact_triage: null,
  engineering_triage: null,
  enterprise_procurement: null,
  enterprise_solutions: null,
  frontend_accessibility: null,
  frontend_interface: null,
  general_inquiries: null,
  growth_integrations: null,
  growth_sales: null,
  identity_authentication: null,
  infrastructure_reliability: null,
  platform_api: null,
  platform_integrations: null,
  sales_triage: null,
  startup_onboarding: null,
  startup_technical: null,
  support_access: null,
  support_technical: null,
};
