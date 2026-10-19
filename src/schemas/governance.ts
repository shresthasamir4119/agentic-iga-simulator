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

export const GovernancePlanSchema = z
  .object({
    employeeId: z.string(),
    eventType: z.string().optional(),
    riskScore: z.number(),
    sodConflictsDetected: z.array(z.string()),
    proposedActions: z.array(ProvisioningActionSchema),
  })
  .superRefine((data, ctx) => {
    if (data.riskScore >= 0.7 && data.sodConflictsDetected.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["sodConflictsDetected"],
        message:
          "High risk score requires at least one explanatory entry in sodConflictsDetected",
      });
    }

    if (
      (data.eventType === "JOINER" ||
        data.eventType === "MOVER" ||
        data.eventType === "TRANSFER") &&
      data.riskScore >= 0.7 &&
      data.proposedActions.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["proposedActions"],
        message:
          "If eventType is JOINER, MOVER, or TRANSFER and riskScore >= 0.70, proposedActions MUST contain at least one action item representing the requested access.",
      });
    }
  });

export type ProvisioningAction = z.infer<typeof ProvisioningActionSchema>;
export type GovernancePlan = z.infer<typeof GovernancePlanSchema>;
