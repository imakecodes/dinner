import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import mariadb from 'mariadb';


// Use globalThis to avoid "Cannot find name 'global'" error in standard environment
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// DATABASE_URL configurada no Docker ou .env
// Ex MySQL: "mysql://user:pass@host:3306/db"
// Ex SQLite: "file:/app/data/dev.db"
const createPrismaClient = () => {
  // Avoid creating connection in build environment if env var is missing
  if (!process.env.DATABASE_URL) {
    return new PrismaClient({
      datasourceUrl: 'file:./dummy.db'
    } as any);
  }

  try {
    // Fix protocol for mariadb driver
    // Use URL object to append connection options
    const url = new URL(process.env.DATABASE_URL.replace('mysql://', 'mariadb://'));

    // Explicit pool configuration to avoid timeouts in Dev environment
    // Setting both camelCase (Driver standard) and snake_case (Prisma standard) to be safe
    url.searchParams.set('connectionLimit', '5');
    url.searchParams.set('connection_limit', '5');

    url.searchParams.set('idleTimeout', '60');

    url.searchParams.set('acquireTimeout', '30000'); // 30s
    url.searchParams.set('pool_timeout', '30');      // 30s

    url.searchParams.set('connectTimeout', '20000'); // 20s
    url.searchParams.set('connect_timeout', '20');   // 20s

    console.log('Prisma initializing MariaDB Pool with options:', url.searchParams.toString());

    const pool = mariadb.createPool(url.toString());

    const adapter = new PrismaMariaDb(pool as any);

    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch (error) {
    console.error("Failed to initialize Prisma Client with Adapter:", error);
    return new PrismaClient({
      datasourceUrl: 'file:./dummy.db'
    } as any);
  }
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;