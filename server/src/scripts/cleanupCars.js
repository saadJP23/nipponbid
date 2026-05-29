

require('dotenv').config();
const db = require('../config/database');

async function getWeekStartCutoff() {
  const [[row]] = await db.query(
    `SELECT DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY) AS cutoff`
  );
  return row.cutoff;
}

async function cleanupOldCars(dryRun = false) {
  const cutoff = await getWeekStartCutoff();

  const [[{ total, purchased, deletable }]] = await db.query(`
    SELECT
      COUNT(*)                                                              AS total,
      SUM(pid IN (SELECT pid FROM japan_purchases))                     AS purchased,
      SUM(pid NOT IN (SELECT pid FROM japan_purchases))                 AS deletable
    FROM japan_cars
    WHERE auction_date < ?
  `, [cutoff]);

  const stats = {
    cutoff:    cutoff.toISOString ? cutoff.toISOString().slice(0, 10) : String(cutoff),
    total:     Number(total),
    purchased: Number(purchased),
    deletable: Number(deletable),
    deleted:   0,
    dry_run:   dryRun,
  };

  if (!dryRun && stats.deletable > 0) {
    const [result] = await db.query(`
      DELETE FROM japan_cars
      WHERE auction_date < ?
        AND pid NOT IN (SELECT pid FROM japan_purchases)
    `, [cutoff]);
    stats.deleted = result.affectedRows;
  }

  return stats;
}

if (require.main === module) {
  const dryRun = process.argv.includes('--dry-run');

  console.log(`\n🧹 NipponBid — Japan Car Cleanup`);
  if (dryRun) console.log('   ⚠  DRY RUN — no rows will be deleted\n');

  cleanupOldCars(dryRun)
    .then(stats => {
      console.log(`   Cutoff date : ${stats.cutoff} (start of current week)`);
      console.log(`   Old cars    : ${stats.total}`);
      console.log(`   Keep (purchased): ${stats.purchased}`);
      console.log(`   ${dryRun ? 'Would delete' : 'Deleted'}    : ${dryRun ? stats.deletable : stats.deleted}`);
      console.log(`\n✅ Done\n`);
      process.exit(0);
    })
    .catch(e => {
      console.error('💥 Cleanup failed:', e.message);
      process.exit(1);
    });
}

module.exports = { cleanupOldCars, getWeekStartCutoff };
