import { defineConfig, env } from 'prisma/config';

export default defineConfig({
    schema: 'prisma/schema.prisma',
    datasource: {
        url: typeof env === 'function' ? env('DATABASE_URL') : process.env.DATABASE_URL,
    },
});
