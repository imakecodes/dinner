import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
import { startPoeSnapshotJob, startReplenishmentJob } from '@/lib/cron';
import { getPoeSnapshotCronSchedule, isPoeSnapshotCronEnabled, runWeeklyPoeSnapshot } from '@/lib/poe-snapshot-service';

jest.mock('node-cron', () => ({
  __esModule: true,
  default: {
    schedule: jest.fn(),
  },
}));

jest.mock('@/lib/prisma', () => ({
  prisma: {
    pantryItem: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    shoppingItem: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/poe-snapshot-service', () => ({
  getPoeSnapshotCronSchedule: jest.fn(() => '0 3 * * 1'),
  isPoeSnapshotCronEnabled: jest.fn(() => true),
  runWeeklyPoeSnapshot: jest.fn(),
}));

describe('lib/cron', () => {
  let scheduledJob: (() => Promise<void>) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    scheduledJob = undefined;

    (cron.schedule as jest.Mock).mockImplementation((pattern: string, fn: () => Promise<void>) => {
      scheduledJob = fn;
      return { stop: jest.fn() };
    });

    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn: any) => {
      const tx = {
        shoppingItem: { upsert: jest.fn().mockResolvedValue({ id: 's1' }) },
        pantryItem: { update: jest.fn().mockResolvedValue({ id: 'p1' }) },
      };
      return fn(tx);
    });
  });

  it('registers replenishment job with 5-minute cron', () => {
    startReplenishmentJob();
    expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
  });

  it('registers poe snapshot job with weekly cron schedule', () => {
    startPoeSnapshotJob();
    expect(isPoeSnapshotCronEnabled).toHaveBeenCalled();
    expect(getPoeSnapshotCronSchedule).toHaveBeenCalled();
    expect(cron.schedule).toHaveBeenCalledWith('0 3 * * 1', expect.any(Function));
  });

  it('runs snapshot job callback without throwing', async () => {
    startPoeSnapshotJob();
    await expect(scheduledJob?.()).resolves.toBeUndefined();
    expect(runWeeklyPoeSnapshot).toHaveBeenCalledTimes(1);
  });

  it('runs without creating shopping item when list is empty', async () => {
    startReplenishmentJob();
    await scheduledJob?.();

    expect(prisma.pantryItem.findMany).toHaveBeenCalledWith({
      where: {
        inStock: false,
        replenishmentRule: 'ALWAYS',
      },
      include: {
        shoppingItem: true,
      },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('creates and links shopping item for out-of-stock ALWAYS item without shoppingItemId', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'Orb of Alchemy',
        kitchenId: 'k1',
        shoppingItemId: null,
        unit: 'x',
        unitDetails: '20',
      },
    ]);

    startReplenishmentJob();
    await scheduledJob?.();

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('skips transaction when item already has shoppingItemId', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'p1',
        name: 'Orb of Alchemy',
        kitchenId: 'k1',
        shoppingItemId: 'existing',
        unit: 'x',
        unitDetails: '20',
      },
    ]);

    startReplenishmentJob();
    await scheduledJob?.();

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('handles runtime errors without throwing', async () => {
    (prisma.pantryItem.findMany as jest.Mock).mockRejectedValueOnce(new Error('db error'));

    startReplenishmentJob();
    await expect(scheduledJob?.()).resolves.toBeUndefined();
  });
});
