import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial baseline research data...');
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('ResearchBenchmark2026!', salt);

  // Seed baseline user
  const user = await prisma.user.upsert({
    where: { username: 'benchmark_user' },
    update: {},
    create: {
      username: 'benchmark_user',
      passwordHash,
      phoneNumber: '+15550199000',
    },
  });

  // Seed 10 virtual users for multi-user tests
  for (let i = 1; i <= 20; i++) {
    const uname = `benchmark_user_${i}`;
    await prisma.user.upsert({
      where: { username: uname },
      update: {},
      create: {
        username: uname,
        passwordHash,
        phoneNumber: `+155501990${i < 10 ? '0' + i : i}`,
      },
    });
  }

  console.log(`Seeding complete. Baseline user created: ${user.username}`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
