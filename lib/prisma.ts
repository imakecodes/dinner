import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';


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
    // Parse the connection string to extract details
    const dbUrl = new URL(process.env.DATABASE_URL);

    // Extract connection details
    const host = dbUrl.hostname;
    const port = parseInt(dbUrl.port) || 3306;
    const user = decodeURIComponent(dbUrl.username);
    const password = decodeURIComponent(dbUrl.password);
    const database = dbUrl.pathname.slice(1); // Remove leading '/'

    console.log(`Prisma initializing MariaDB adapter to ${host}:${port}/${database}...`);

    // Per official Prisma docs: pass config directly to PrismaMariaDb, NOT a pool
    // https://www.prisma.io/docs/orm/overview/databases/mysql-mariadb
    const adapter = new PrismaMariaDb({
      host,
      port,
      user,
      password,
      database,
      connectionLimit: 5,
      idleTimeout: 60,
      acquireTimeout: 30000,
      connectTimeout: 20000,
      allowPublicKeyRetrieval: true
    });

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