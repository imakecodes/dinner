// scripts/run-poe-snapshot.ts
import { runWeeklyPoeSnapshot } from '@/lib/poe-snapshot-service';

async function main() {
  await runWeeklyPoeSnapshot();
  console.log('snapshot ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
