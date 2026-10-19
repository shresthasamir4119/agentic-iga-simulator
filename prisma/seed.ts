import { prisma } from "../src/config/prisma.js";

const employees = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    firstName: "Alice",
    lastName: "Chen",
    email: "alice.chen@example.com",
    department: "Engineering",
    title: "Junior Frontend Engineer",
    status: "ACTIVE" as const,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    firstName: "Bob",
    lastName: "Martinez",
    email: "bob.martinez@example.com",
    department: "Engineering",
    title: "Senior Software Engineer",
    status: "ACTIVE" as const,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    firstName: "Carol",
    lastName: "Danvers",
    email: "carol.danvers@example.com",
    department: "DevOps",
    title: "Site Reliability Engineer",
    status: "ACTIVE" as const,
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    firstName: "Charlie",
    lastName: "Davis",
    email: "charlie.davis@example.com",
    department: "Sales",
    title: "Account Executive",
    status: "TERMINATED" as const,
  },
  {
    id: "55555555-5555-4555-8555-555555555555",
    firstName: "Elena",
    lastName: "Rostova",
    email: "elena.rostova@example.com",
    department: "External Audit",
    title: "Security Consultant",
    status: "ACTIVE" as const,
  },
];

async function seed(): Promise<void> {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.provisioningRequest.deleteMany(),
    prisma.employee.deleteMany(),
  ]);

  await prisma.employee.createMany({ data: employees });

  console.log(`Seeded ${employees.length} employees.`);
}

seed()
  .catch((error: unknown) => {
    console.error("Database seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
