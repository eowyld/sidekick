import { z } from "zod";

export const ALPHA_TESTER_STATUSES = [
  "Artiste indépendant",
  "Professionnel de l'industrie musicale",
  "Proche",
  "Etudiant",
  "Développeur",
] as const;

const requiredTextField = z.string().trim().min(1, "required").max(120, "too_long");

export const waitlistPayloadSchema = z.object({
  lastName: requiredTextField,
  firstName: requiredTextField,
  email: z.string().trim().email("invalid_email").max(320, "too_long"),
  status: z.enum(ALPHA_TESTER_STATUSES),
});

export type WaitlistPayload = z.infer<typeof waitlistPayloadSchema>;

export function normalizeWaitlistPayload(payload: WaitlistPayload): WaitlistPayload {
  return {
    lastName: payload.lastName.trim(),
    firstName: payload.firstName.trim(),
    email: payload.email.trim().toLowerCase(),
    status: payload.status,
  };
}
