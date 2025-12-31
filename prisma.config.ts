import { defineConfig } from 'prisma/config';

export default defineConfig({
    datasources: [
        {
            provider: 'mysql',
            url: process.env.DATABASE_URL,
        },
    ],
});
