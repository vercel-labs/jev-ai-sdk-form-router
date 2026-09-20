"use server";

import { processSubmission } from "@/lib/submission";
import type { SubmissionResult } from "@/lib/submission";

/**
 * Handles a form submission without exposing provider credentials to the browser.
 * @param formData - Registered string fields, an `example` ID, a UUID `submissionId`,
 * and optional `sendEmail`, where only `"true"` requests delivery.
 * @returns Routing, preview, and delivery status or validation, configuration, or routing errors.
 * @throws {Error} When email rendering or payload preparation fails in the submission workflow.
 * @remarks Generate a UUID for every new submission, including preview-only requests.
 * Send retries within that operation reuse the UUID for idempotency.
 */
export const submitForm = async (
  formData: FormData
): Promise<SubmissionResult> => await processSubmission(formData);
