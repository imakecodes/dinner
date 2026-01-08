import cron from 'node-cron';
import { prisma } from '@/lib/prisma';

export function startReplenishmentJob() {
    // Run every minute: */5 * * * *
    // Adjust timing as needed
    cron.schedule('*/5 * * * *', async () => {
        console.log('[Cron] Running replenishment check...');

        try {
            // Find all pantry items that:
            // 1. Are out of stock
            // 2. Have replenishmentRule = 'ALWAYS'
            const itemsToReplenish = await prisma.pantryItem.findMany({
                where: {
                    inStock: false,
                    replenishmentRule: 'ALWAYS'
                },
                include: {
                    shoppingItem: true
                }
            });

            console.log(`[Cron] Found ${itemsToReplenish.length} candidates for replenishment.`);

            for (const item of itemsToReplenish) {
                // If the item already has a linked shopping list item that is UNCHECKED, we are good.
                // If it has NO shopping list item, create one.
                // If it has a CHECKED shopping list item, maybe the user bought it but didn't update pantry? 
                // For now, let's aggressively ensure it's on the list as UNCHECKED if it's ALWAYS replenish.
                // But to avoid annoyance, only if it's NOT checked. If it's checked, user might be in store.

                // Actually, if it's checked, it means "bought". If pantry is still empty, maybe we shouldn't uncheck it immediately?
                // Let's stick to: Ensure there is a shopping item. If none exists, create.

                if (!item.shoppingItemId) {
                    console.log(`[Cron] Creating shopping item for ${item.name}`);

                    // Use transaction to ensure consistency
                    await prisma.$transaction(async (tx) => {
                        const shoppingItem = await tx.shoppingItem.upsert({
                            where: {
                                name_kitchenId: {
                                    name: item.name,
                                    kitchenId: item.kitchenId
                                }
                            },
                            create: {
                                name: item.name,
                                kitchenId: item.kitchenId,
                                quantity: item.unitDetails || '1', // Default to package size if available
                                unit: item.unit,
                                checked: false
                            },
                            update: {
                                // If it already exists (e.g. unlinked manually?), ensure it's updated?
                                // Let's just update ID linking if needed logic happens below
                            }
                        });

                        await tx.pantryItem.update({
                            where: { id: item.id },
                            data: { shoppingItemId: shoppingItem.id }
                        });
                    });
                }
            }
        } catch (error) {
            console.error('[Cron] Error running replenishment job:', error);
        }
    });
}
