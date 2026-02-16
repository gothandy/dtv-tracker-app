require('dotenv').config();
const { recordsRepository } = require('../dist/services/repositories/records-repository');
const { profilesRepository } = require('../dist/services/repositories/profiles-repository');
const { safeParseLookupId } = require('../dist/services/data-layer');
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(
  process.env.HOME || process.env.USERPROFILE || '',
  'Dean Trail Volunteers',
  'Members - Documents',
  'General',
  'Volunteer Tracking',
  'Member Benefits.csv'
);

const EXECUTE = process.argv.includes('--execute');

function parseCSV(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const headers = lines[0].split(',');
  return lines.slice(1).map(line => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') { inQuotes = !inQuotes; continue; }
      if (ch === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += ch;
    }
    values.push(current.trim());
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = values[i] || ''; });
    return row;
  });
}

function parseBPWDate(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T10:00:00.000Z`;
}

function getFacebookStatus(value) {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === 'yes') return 'Accepted';
  if (v === 'no' || v === 'no fb') return 'Declined';
  if (v === 'invited') return 'Invited';
  return null;
}

function getParkingStatus(value) {
  if (!value) return null;
  if (/\d/.test(value)) return 'Accepted';
  return 'Declined';
}

async function importBenefits() {
  console.log(EXECUTE ? '*** EXECUTE MODE — will create records ***\n' : '*** DRY RUN — pass --execute to create records ***\n');

  if (!recordsRepository.available) {
    console.error('Records list not configured (RECORDS_LIST_GUID not set)');
    process.exit(1);
  }

  const [allProfiles, allRecords] = await Promise.all([
    profilesRepository.getAll(),
    recordsRepository.getAll()
  ]);
  console.log(`Loaded ${allProfiles.length} profiles, ${allRecords.length} existing records\n`);

  // Build profile lookup maps (case-insensitive)
  const byTitle = new Map();
  const byMatchName = new Map();
  for (const p of allProfiles) {
    if (p.Title) byTitle.set(p.Title.toLowerCase(), p);
    if (p.MatchName) byMatchName.set(p.MatchName.toLowerCase(), p);
  }

  // Build existing records set for quick lookup
  const existingSet = new Set();
  for (const r of allRecords) {
    const pid = safeParseLookupId(String(r.ProfileLookupId));
    if (pid !== undefined && r.Type) {
      existingSet.add(`${pid}:${r.Type}`);
    }
  }

  // Parse CSV
  const csvText = fs.readFileSync(CSV_PATH, 'utf-8');
  const rows = parseCSV(csvText).filter(r => r.Member);
  console.log(`Parsed ${rows.length} CSV rows with names\n`);

  const now = new Date().toISOString();
  let created = 0;
  let skippedExisting = 0;
  let skippedBlank = 0;
  let unmatched = [];

  for (const row of rows) {
    const name = row.Member;
    const nameLower = name.toLowerCase();
    const profile = byTitle.get(nameLower) || byMatchName.get(nameLower);

    if (!profile) {
      unmatched.push(name);
      continue;
    }

    const pid = profile.ID;
    const records = [];

    // 1. Bike Park Wales
    const bpwDate = parseBPWDate(row.BikeParkWales);
    if (bpwDate) {
      records.push({ Type: 'Bike Park Wales', Status: 'Accepted', Date: bpwDate });
    } else if (row.BikeParkWales) {
      console.log(`  [WARN] ${name}: unparseable BikeParkWales value "${row.BikeParkWales}"`);
    }

    // 2. Parking Permit
    const carReg = row.CarReg1;
    if (carReg) {
      const parkingStatus = getParkingStatus(carReg);
      records.push({ Type: 'Parking Permit', Status: parkingStatus, Date: now });
    }

    // 3. Facebook Group
    const fbStatus = getFacebookStatus(row.AddedToFacebookGroup);
    if (fbStatus) {
      records.push({ Type: 'Facebook Group', Status: fbStatus, Date: now });
    }

    for (const rec of records) {
      const key = `${pid}:${rec.Type}`;
      if (existingSet.has(key)) {
        console.log(`  [SKIP] ${name} — ${rec.Type} already exists`);
        skippedExisting++;
        continue;
      }

      if (EXECUTE) {
        const id = await recordsRepository.create({ ProfileLookupId: pid, ...rec });
        console.log(`  [CREATED] ${name} — ${rec.Type}: ${rec.Status} (ID: ${id})`);
      } else {
        console.log(`  [WOULD CREATE] ${name} — ${rec.Type}: ${rec.Status} (Date: ${rec.Date})`);
      }
      existingSet.add(key);
      created++;
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Created: ${created}`);
  console.log(`Skipped (existing): ${skippedExisting}`);
  if (unmatched.length > 0) {
    console.log(`Unmatched profiles (${unmatched.length}): ${unmatched.join(', ')}`);
  }
  if (!EXECUTE && created > 0) {
    console.log('\nRun with --execute to create these records.');
  }
}

importBenefits().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
