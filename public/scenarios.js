export const SCENARIOS = Object.freeze({
  scenario1: {
    employeeId: "11111111-1111-4111-8111-111111111111",
    eventType: "JOINER",
    expectedResult: "AI Risk Score < 0.20; Auto-Approved; adapters execute automatically; Green Audit Log entry.",
    hrPayload: {
      firstName: "Alice",
      lastName: "Chen",
      email: "alice.chen@example.com",
      department: "Engineering",
      title: "Junior Frontend Engineer",
      managerNotes: "Standard frontend dev onboarding.",
      requestedGroups: ["AD_All_Employees", "AD_Engineering_Dept", "Slack_General"]
    }
  },
  scenario2: {
    employeeId: "22222222-2222-4222-8222-222222222222",
    eventType: "MOVER",
    expectedResult: "AI Risk Score ~0.88; SoD Conflict Flagged; routed to Pending Approvals with expected actions displayed.",
    hrPayload: {
      firstName: "Bob",
      lastName: "Martinez",
      email: "bob.martinez@example.com",
      department: "Finance",
      title: "Senior Software Engineer",
      previousDepartment: "Engineering",
      targetDepartment: "Finance",
      managerNotes: "Bob transferred to Finance but needs to retain GitHub release manager rights.",
      requestedGroups: ["SAP_Billing_Execute", "GitHub_Release_Admins"]
    }
  },
  scenario3: {
    employeeId: "33333333-3333-4333-8333-333333333333",
    eventType: "MOVER",
    expectedResult: "AI Auto-Approve (Risk ~0.40); stage DevOps grants and revoke legacy Support tools.",
    hrPayload: {
      firstName: "Carol",
      lastName: "Danvers",
      email: "carol.danvers@example.com",
      department: "DevOps",
      title: "Site Reliability Engineer",
      previousDepartment: "Customer Support",
      targetDepartment: "DevOps",
      managerNotes: "Carol moved from Support to DevOps. Grant AWS Prod and revoke Zendesk.",
      requestedGroups: ["AD_DevOps_Team", "AWS_Production_Admins"],
      requestedRevocations: ["Zendesk"]
    }
  },
  scenario4: {
    employeeId: "44444444-4444-4444-8444-444444444444",
    eventType: "JOINER",
    expectedResult: "Hard-blocked by the Policy Veto Engine (HTTP 400); Red error toast banner; VETOED Audit Log entry.",
    hrPayload: {
      firstName: "Charlie",
      lastName: "Davis",
      email: "charlie.davis@example.com",
      department: "Sales",
      title: "Account Executive",
      priorStatus: "TERMINATED",
      managerNotes: "Re-hiring Charlie as a consultant.",
      requestedGroups: ["Salesforce_Full_Access", "Slack_General"]
    }
  },
  scenario5: {
    employeeId: "55555555-5555-4555-8555-555555555555",
    eventType: "ELEVATION_REQUEST",
    expectedResult: "AI Risk Score ~0.92; routed to Pending Approvals with time-bound entitlement parameters (ttl_hours: 4).",
    hrPayload: {
      firstName: "Elena",
      lastName: "Rostova",
      email: "elena.rostova@example.com",
      department: "External Audit",
      title: "Security Consultant",
      managerNotes: "Emergency break-glass access required for PII database incident investigation.",
      requestedGroups: ["DB_Prod_PII_ReadWrite", "AWS_CloudTrail_Auditor"],
      ttl_hours: 4
    }
  }
});
