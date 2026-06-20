const fs = require('fs');
const path = require('path');

const DIVISIONS_DIR = path.join(__dirname, '../../Divisions');

let cachedDivisions = null;

const parseCoordinates = (coordText) => {
  return coordText
    .trim()
    .split(/\s+/)
    .map((line) => {
      const parts = line.split(',');
      if (parts.length >= 2) {
        return {
          lng: parseFloat(parts[0]),
          lat: parseFloat(parts[1])
        };
      }
      return null;
    })
    .filter(Boolean);
};

const extractPolygon = (kmlText) => {
  const coordMatch = kmlText.match(/<coordinates>([\s\S]*?)<\/coordinates>/);
  if (coordMatch && coordMatch[1]) {
    return parseCoordinates(coordMatch[1]);
  }
  return [];
};

const loadDivisions = () => {
  if (cachedDivisions !== null) {
    return cachedDivisions;
  }

  const divisions = [];
  try {
    if (fs.existsSync(DIVISIONS_DIR)) {
      const files = fs.readdirSync(DIVISIONS_DIR).filter(file => file.endsWith('.kml'));
      
      for (const file of files) {
        const filePath = path.join(DIVISIONS_DIR, file);
        const kmlContent = fs.readFileSync(filePath, 'utf-8');
        const name = file.replace('.kml', '');
        const polygon = extractPolygon(kmlContent);
        
        if (polygon.length > 0) {
          divisions.push({
            id: name,
            name: name,
            polygon: polygon
          });
        }
      }
    }
    cachedDivisions = divisions;
  } catch (err) {
    console.error('Error loading KML divisions:', err);
    cachedDivisions = [];
  }
  return cachedDivisions;
};

const getDivisions = () => {
  return loadDivisions();
};

const getDivisionByName = (name) => {
  const divisions = loadDivisions();
  return divisions.find(d => d.name === name || d.id === name) || null;
};

module.exports = {
  loadDivisions,
  getDivisions,
  getDivisionByName
};
