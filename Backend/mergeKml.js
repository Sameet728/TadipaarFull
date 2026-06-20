const fs = require('fs');
const path = require('path');
const { DOMParser } = require('@xmldom/xmldom');
const { kml } = require('@tmcw/togeojson');
const turf = require('@turf/turf');
const tokml = require('tokml');

const DIVISIONS_DIR = path.join(__dirname, '../Divisions');

async function run() {
  const files = fs.readdirSync(DIVISIONS_DIR).filter(f => f.endsWith('.kml') && f !== 'PCMC.kml');
  
  if (files.length === 0) {
    console.log("No KML files found in Divisions directory.");
    return;
  }

  let mergedPolygon = null;

  for (const file of files) {
    const filePath = path.join(DIVISIONS_DIR, file);
    const xml = new DOMParser().parseFromString(fs.readFileSync(filePath, 'utf8'), 'text/xml');
    const geojson = kml(xml);
    
    // Extract polygons from this file
    const polygons = [];
    turf.geomEach(geojson, (geom) => {
      if (geom.type === 'Polygon' || geom.type === 'MultiPolygon') {
        polygons.push(turf.feature(geom));
      }
    });

    for (const poly of polygons) {
      if (!mergedPolygon) {
        mergedPolygon = poly;
      } else {
        // Union the current merged polygon with the new polygon to remove inner boundaries
        try {
          mergedPolygon = turf.union(turf.featureCollection([mergedPolygon, poly]));
        } catch (e) {
          console.error(`Error unioning polygon from ${file}: ${e.message}`);
        }
      }
    }
  }

  if (mergedPolygon) {
    mergedPolygon.properties = {
      name: 'PCMC',
      description: 'Outer boundary of all divisions (PCMC)'
    };
    
    const outKml = tokml(mergedPolygon);
    
    // Some KML files use simple names/descriptions.
    const outPath = path.join(DIVISIONS_DIR, 'PCMC.kml');
    fs.writeFileSync(outPath, outKml, 'utf8');
    console.log(`Successfully merged ${files.length} division files into PCMC.kml!`);
  } else {
    console.log("Failed to create merged polygon.");
  }
}

run();
