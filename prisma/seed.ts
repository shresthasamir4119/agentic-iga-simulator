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
    lastName: "Smith",
    email: "bob.smith@example.com",
    department: "Sales",
    title: "Account Executive",
    status: "ACTIVE" as const,
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    firstName: "Charlie",
    lastName: "Vance",
    email: "charlie.vance@example.com",
    department: "Operations",
    title: "Systems Admin",
    status: "TERMINATED" as const,
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
