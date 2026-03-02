export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const isCronEnabled = process.env.ENABLE_REPLENISHMENT_CRON !== 'false';

        if (!isCronEnabled) {
            console.log('[Cron] Replenishment job disabled by ENABLE_REPLENISHMENT_CRON=false');
        } else {
            const { startReplenishmentJob } = await import('./lib/cron');
            startReplenishmentJob();
        }

        const { startPoeSnapshotJob } = await import('./lib/cron');
        startPoeSnapshotJob();
    }
}
