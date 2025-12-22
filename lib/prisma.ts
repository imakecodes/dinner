import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// O DATABASE_URL deve ser configurado no .env ou no Docker
// Ex: DATABASE_URL="file:./dev.db" para SQLite ou "mysql://user:pass@host:3306/db" para MySQL
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
