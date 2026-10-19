import "dotenv/config";
import { z } from "zod";
import { aiClient } from "../config/aiClient.js";
import {
  GovernancePlanSchema,
  type GovernancePlan,
} from "../schemas/governance.js";

const SYSTEM_PROMPT = `You are a Zero-Trust IGA AI Analyst. Analyze the HR event and output a JSON governance plan.

RULES:
- Data Validation & Spoofing (CRITICAL): Cross-reference the payload against the employee database profile. If there is an identity mismatch (e.g., the employeeId belongs to a different name than the payload) or a role mismatch, this is an API spoofing attempt. Set riskScore to 1.0 and flag "Identity Mismatch/Spoofing" in sodConflictsDetected
- Enforce Least Privilege & Segregation of Duties (SoD).
- riskScore: Output a float from 0.0 to 1.0. 
- sodConflictsDetected: If riskScore >= 0.70, list the exact conflicts. If < 0.70, output []. Each entry MUST be a specific conflict label followed by a concise description of why it violates policy, formatted as "ConflictName: description" (e.g., "Toxic Payroll Access: Granting both create and approve payroll rights let one person alter and self-approve payments").
- proposedActions: You MUST output the requested actions so approvers can see them, even if risk is high. Do not output an empty array.
- MOVER events: You MUST include REMOVE_FROM_GROUP actions to revoke previous department access.
- Manager notes: If the payload contains a manager notes, still use zero trust policy and flag if the risk is high.
- ELEVATION_REQUEST events: Assign a high riskScore and add "ttl_hours" to parameters.
- AD Formatting: For ACTIVE_DIRECTORY, remove "AD_" and underscores. Example: "AD_All_Employees" becomes "All Employees".

Return EXACTLY ONE valid JSON object. Do not include backticks, markdown, or text.

{
  "employeeId": "string",
  "eventType": "JOINER | MOVER | LEAVER | ELEVATION_REQUEST",
  "riskScore": 0.0,
  "sodConflictsDetected": ["ConflictName: description of why it violates policy"],
  "proposedActions": [
    {
      "targetSystem": "ACTIVE_DIRECTORY | SLACK | GITHUB",
      "action": "CREATE_ACCOUNT | DISABLE_ACCOUNT | ADD_TO_GROUP | REMOVE_FROM_GROUP | GRANT_ORG_ROLE",
      "parameters": {"groupName": "cleaned name"},
      "reasoning": "string"
    }
  ]
}`;

const RETRY_SYSTEM_MESSAGE = `The previous response failed GovernancePlanSchema validation. Re-check and correct the JSON before returning it. If riskScore is >= 0.70, sodConflictsDetected must contain at least one specific toxic permission or security concern, each formatted as "ConflictName: description of why it is a conflict". For JOINER, MOVER, or TRANSFER events with riskScore >= 0.70, proposedActions MUST contain at least one concrete access or entitlement action. Every proposedActions item must include targetSystem, action, parameters, and reasoning. Normalize groupName values again: "AD_All_Employees" -> "All Employees" and "AD_Engineering_Dept" -> "Engineering". If there are no risks or required actions, use riskScore <= 0.20 and an empty sodConflictsDetected array. Return only the corrected JSON object.`;

async function requestCompletion(
  employeeContext: unknown,
  eventType: string,
  reminder?: string,
) {
  const userPrompt = `Analyze the following governance event.\n\nEvent type: ${JSON.stringify(eventType)}\n\nEmployee context:\n${JSON.stringify(employeeContext, null, 2)}`;

  const messages = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];

  if (reminder) {
    messages.splice(1, 0, {
      role: "system" as const,
      content: reminder,
    });
  }

  try {
    return await aiClient.chat.completions.create({
      model: process.env.OPEN_WEIGHT_MODEL ?? "llama3.1",
      temperature: 0,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "GovernancePlan",
          schema: z.toJSONSchema(GovernancePlanSchema),
        },
      },
      messages,
    });
  } catch (error) {
    console.error("AI completion request failed:", error);
    throw new Error("The AI completion request failed.", { cause: error });
  }
}

type GovernanceCompletion = Awaited<ReturnType<typeof requestCompletion>>;

function parseCompletion(
  completion: GovernanceCompletion,
  eventType: string,
): GovernancePlan {
  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("The AI returned an empty governance plan response.");
  }

  let parsedResponse: unknown;

  try {
    parsedResponse = JSON.parse(content);
  } catch (error) {
    throw new Error("The AI returned malformed governance plan JSON.", {
      cause: error,
    });
  }

  const responseWithEventType =
    parsedResponse &&
    typeof parsedResponse === "object" &&
    !Array.isArray(parsedResponse)
      ? { ...parsedResponse, eventType }
      : parsedResponse;

  return GovernancePlanSchema.parse(responseWithEventType);
}

export async function generateGovernancePlan(
  employeeContext: unknown,
  eventType: string,
): Promise<GovernancePlan> {
  const completion = await requestCompletion(employeeContext, eventType);

  try {
    return parseCompletion(completion, eventType);
  } catch (error) {
    if (!(error instanceof z.ZodError)) {
      throw error;
    }

    console.warn(
      "The AI governance plan failed schema validation; retrying once with field-alignment guidance.",
    );

    const retryCompletion = await requestCompletion(
      employeeContext,
      eventType,
      RETRY_SYSTEM_MESSAGE,
    );

    return parseCompletion(retryCompletion, eventType);
  }
}
