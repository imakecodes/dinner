import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';


// Use globalThis to avoid "Cannot find name 'global'" error in standard environment
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// DATABASE_URL configurada no Docker ou .env
// Ex MySQL: "mysql://user:pass@host:3306/db"
// Ex SQLite: "file:/app/data/dev.db"
const createPrismaClient = () => {
  // During build/CI, DATABASE_URL may not be set. Return a stub client.
  // The adapter requires valid config, so we create one that will fail at runtime
  // but allows the build to complete.
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set - using placeholder adapter for build');
    const placeholderAdapter = new PrismaMariaDb({
      host: 'localhost',
      port: 3306,
      user: 'placeholder',
      password: 'placeholder',
      database: 'placeholder',
      connectionLimit: 1
    });
    return new PrismaClient({ adapter: placeholderAdapter });
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
    // Fallback with placeholder adapter
    const placeholderAdapter = new PrismaMariaDb({
      host: 'localhost',
      port: 3306,
      user: 'placeholder',
      password: 'placeholder',
      database: 'placeholder',
      connectionLimit: 1
    });
    return new PrismaClient({ adapter: placeholderAdapter });
  }
};

export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;