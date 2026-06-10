import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      passwordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Sara John',
      passwordHash,
      role: Role.USER,
    },
  });

  // A freshly provisioned admin: logs in with the temporary password, then is
  // forced to set a new one on first login. Reset on every seed so the
  // first-login flow is reproducible (idempotent demo state).
  await prisma.user.upsert({
    where: { email: 'new-admin@example.com' },
    update: { passwordHash, mustChangePassword: true },
    create: {
      email: 'new-admin@example.com',
      name: 'New Admin',
      passwordHash,
      role: Role.ADMIN,
      mustChangePassword: true,
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    'Seed complete: admin@example.com / user@example.com / new-admin@example.com (Password123)',
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
