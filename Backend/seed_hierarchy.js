const { pool, query } = require('./config/db');

const hierarchy = [
  {
    zone: 'ZONE 1',
    acps: [
      {
        name: 'ACP PIMPRI',
        stations: ['pimpri ps', 'Chinchwad ps', 'Nigadi ps']
      },
      {
        name: 'ACP SANGAWI',
        stations: ['Sant tukaram nagar ps', 'Dapodi ps', 'Sangawi ps']
      }
    ]
  },
  {
    zone: 'ZONE 2',
    acps: [
      {
        name: 'ACP WAKAD',
        stations: ['Wakad ps', 'Kalewadi ps', 'Ravet ps']
      },
      {
        name: 'ACP HINJEWADI',
        stations: ['Hinjewadi ps', 'Bawdhan ps']
      }
    ]
  },
  {
    zone: 'ZONE 3',
    acps: [
      {
        name: 'ACP BHOSARI MIDC',
        stations: ['Bhosari MIDC ps', 'Dighi ps', 'Bhosari ps']
      },
      {
        name: 'ACP CHAKAN',
        stations: ['Chakan south ps', 'Chakan North ps', 'Alandi ps']
      }
    ]
  },
  {
    zone: 'ZONE 4',
    acps: [
      {
        name: 'ACP DEHU ROAD',
        stations: ['Dehu Road ps', 'shirgoan ps', 'Chikhali ps']
      },
      {
        name: 'ACP MHALUNGE MIDC',
        stations: ['MHALUNGE north ps', 'MHALUNGE south ps']
      }
    ]
  }
];

async function seed() {
  console.log('Starting seed...');
  for (const z of hierarchy) {
    // Upsert zone
    let zRes = await query('SELECT id FROM zones WHERE name ILIKE $1', [z.zone]);
    let zoneId;
    if (zRes.rows.length === 0) {
      zRes = await query('INSERT INTO zones (name) VALUES ($1) RETURNING id', [z.zone]);
      zoneId = zRes.rows[0].id;
      console.log(`Inserted Zone: ${z.zone}`);
    } else {
      zoneId = zRes.rows[0].id;
      console.log(`Found Zone: ${z.zone}`);
    }

    for (const a of z.acps) {
      // Upsert ACP
      let aRes = await query('SELECT id FROM acp_areas WHERE name ILIKE $1 AND zone_id = $2', [a.name, zoneId]);
      let acpId;
      if (aRes.rows.length === 0) {
        aRes = await query('INSERT INTO acp_areas (name, zone_id) VALUES ($1, $2) RETURNING id', [a.name, zoneId]);
        acpId = aRes.rows[0].id;
        console.log(`  Inserted ACP: ${a.name}`);
      } else {
        acpId = aRes.rows[0].id;
        console.log(`  Found ACP: ${a.name}`);
      }

      for (const ps of a.stations) {
        // Upsert Police Station
        let psRes = await query('SELECT id FROM police_stations WHERE name ILIKE $1 AND acp_area_id = $2 AND zone_id = $3', [ps, acpId, zoneId]);
        if (psRes.rows.length === 0) {
          await query('INSERT INTO police_stations (name, acp_area_id, zone_id) VALUES ($1, $2, $3)', [ps, acpId, zoneId]);
          console.log(`    Inserted PS: ${ps}`);
        } else {
          console.log(`    Found PS: ${ps}`);
        }
      }
    }
  }
  console.log('Seed completed successfully!');
  pool.end();
}

seed().catch(err => {
  console.error(err);
  pool.end();
});
