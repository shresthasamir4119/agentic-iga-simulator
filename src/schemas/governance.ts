import { z } from "zod";

export const ProvisioningActionSchema = z.object({
  targetSystem: z.enum(["ACTIVE_DIRECTORY", "SLACK", "GITHUB"]),
  action: z.enum([
    "CREATE_ACCOUNT",
    "DISABLE_ACCOUNT",
    "ADD_TO_GROUP",
    "REMOVE_FROM_GROUP",
    "GRANT_ORG_ROLE",
  ]),
  parameters: z.record(z.string(), z.any()),
  reasoning: z.string(),
});

export const GovernancePlanSchema = z.object({
  employeeId: z.string(),
  riskScore: z.number(),
  sodConflictsDetected: z.array(z.string()),
  proposedActions: z.array(ProvisioningActionSchema),
});

export type ProvisioningAction = z.infer<typeof ProvisioningActionSchema>;
export type GovernancePlan = z.infer<typeof GovernancePlanSchema>;
