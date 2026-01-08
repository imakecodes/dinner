
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startReplenishmentJob } = await import('./lib/cron');
        startReplenishmentJob();
    }
}
