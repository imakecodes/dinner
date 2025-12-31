import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';

// Use globalThis to avoid "Cannot find name 'global'" error in standard environment
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// DATABASE_URL configurada no Docker ou .env
// Ex MySQL: "mysql://user:pass@host:3306/db"
// Ex SQLite: "file:/app/data/dev.db"

const createPrismaClient = () => {
  // Avoid creating connection in build environment if env var is missing or dummy
  if (!process.env.DATABASE_URL) {
    return new PrismaClient({
      datasourceUrl: 'file:./dummy.db'
    } as any);
  }

  try {
    const connectionUrl = process.env.DATABASE_URL.replace('mysql://', 'mariadb://');
    console.log('Prisma initializing with URL:', connectionUrl.replace(/:[^:@]*@/, ':****@'));
    const pool = mariadb.createPool(connectionUrl);
    const adapter = new PrismaMariaDb(pool as any);

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (e) {
    console.error("Failed to initialize Prisma adapter, falling back to default client:", e);
    return new PrismaClient({
      datasourceUrl: 'file:./dummy.db'
    } as any);
  }
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;