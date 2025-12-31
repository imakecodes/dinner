import { defineConfig } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        // Use process.env directly with fallback for CI/build environments
        // where DATABASE_URL may not be set during prisma generate
        url: process.env.DATABASE_URL || 'mysql://placeholder:placeholder@localhost:3306/placeholder',
    },
});
