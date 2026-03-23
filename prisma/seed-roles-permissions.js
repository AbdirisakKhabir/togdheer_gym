/**
 * Seed script for Roles and Permissions.
 * Run: node prisma/seed-roles-permissions.js
 * Or: npx prisma db push && node prisma/seed-roles-permissions.js
 */
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const DEFAULT_PERMISSIONS = [
  { code: "members:view", name: "View Members", description: "View members list" },
  { code: "members:view:male", name: "View Male Members", description: "View male members only" },
  { code: "members:view:female", name: "View Female Members", description: "View female members only" },
  { code: "members:create", name: "Create Members", description: "Add new members" },
  { code: "members:edit", name: "Edit Members", description: "Edit member details" },
  { code: "members:delete", name: "Delete Members", description: "Delete members" },
  { code: "payments:view", name: "View Payments", description: "View payments" },
  { code: "payments:create", name: "Create Payments", description: "Record payments" },
  { code: "users:view", name: "View Users", description: "View users list" },
  { code: "users:create", name: "Create Users", description: "Add new users" },
  { code: "users:edit", name: "Edit Users", description: "Edit user roles" },
  { code: "users:delete", name: "Delete Users", description: "Delete users" },
  { code: "reports:view", name: "View Reports", description: "View reports" },
  { code: "expenses:view", name: "View Expenses", description: "View expenses" },
  { code: "expenses:create", name: "Create Expenses", description: "Add expenses" },
  { code: "expenses:edit", name: "Edit Expenses", description: "Edit expenses" },
  { code: "expenses:delete", name: "Delete Expenses", description: "Delete expenses" },
  { code: "settings:manage", name: "Manage Settings", description: "Manage roles and permissions" },
];

const DEFAULT_ROLES = [
  {
    name: "admin",
    description: "Full access to all features",
    permissionCodes: DEFAULT_PERMISSIONS.map((p) => p.code),
  },
  {
    name: "male_user",
    description: "Can access male members only",
    permissionCodes: [
      "members:view:male",
      "members:create",
      "members:edit",
      "payments:view",
      "payments:create",
      "reports:view",
      "expenses:view",
    ],
  },
  {
    name: "female_user",
    description: "Can access female members only",
    permissionCodes: [
      "members:view:female",
      "members:create",
      "members:edit",
      "payments:view",
      "payments:create",
      "reports:view",
      "expenses:view",
    ],
  },
  {
    name: "manager",
    description: "Manage members, payments, reports, and expenses",
    permissionCodes: [
      "members:view", "members:create", "members:edit", "members:delete",
      "payments:view", "payments:create",
      "users:view",
      "reports:view",
      "expenses:view", "expenses:create", "expenses:edit", "expenses:delete",
    ],
  },
  {
    name: "staff",
    description: "Basic access - members and payments",
    permissionCodes: [
      "members:view", "members:create", "members:edit",
      "payments:view", "payments:create",
      "reports:view",
      "expenses:view",
    ],
  },
];

async function main() {
  console.log("Seeding permissions...");
  for (const p of DEFAULT_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, description: p.description },
      create: p,
    });
  }
  console.log(`Created/updated ${DEFAULT_PERMISSIONS.length} permissions`);

  console.log("Seeding roles...");
  const allPerms = await prisma.permission.findMany();
  const permByCode = Object.fromEntries(allPerms.map((p) => [p.code, p.id]));

  for (const r of DEFAULT_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description },
    });

    const permIds = r.permissionCodes
      .map((c) => permByCode[c])
      .filter(Boolean);
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: permIds.map((pid) => ({ roleId: role.id, permissionId: pid })),
        skipDuplicates: true,
      });
    }
    console.log(`  - ${r.name}: ${permIds.length} permissions`);
  }
  console.log("Seed completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
