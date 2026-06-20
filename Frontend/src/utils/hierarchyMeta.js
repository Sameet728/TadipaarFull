const normalizeOption = (item, type) => {
  const rawId =
    item?.id ??
    (type === 'zone' ? item?.zone_id ?? item?.zoneId : null) ??
    (type === 'acp' ? item?.acp_area_id ?? item?.acpAreaId : null) ??
    (type === 'ps' ? item?.police_station_id ?? item?.policeStationId : null);

  const rawName =
    item?.name ??
    (type === 'zone' ? item?.zone_name ?? item?.zoneName : null) ??
    (type === 'acp' ? item?.acp_area_name ?? item?.acpAreaName : null) ??
    (type === 'ps' ? item?.police_station_name ?? item?.policeStationName : null);

  if (rawId === undefined || rawId === null || rawId === '') return null;
  
  // Return everything but ensure id and name are standardized
  return { 
    ...item, 
    id: String(rawId), 
    name: String(rawName || `#${rawId}`) 
  };
};

export const dedupeById = (items = [], type = 'zone') =>
  Array.from(
    new Map(
      (items || [])
        .map((i) => normalizeOption(i, type))
        .filter(Boolean)
        .map((i) => [String(i.id), i])
    ).values()
  );

const flattenFromHierarchyTree = (tree = []) => {
  const zones = [];
  const acpAreas = [];
  const policeStations = [];

  for (const z of tree || []) {
    const zone = normalizeOption(z, 'zone');
    if (!zone) continue;
    zones.push(zone);

    const childrenAcp = z?.acpAreas || z?.acp_areas || [];
    for (const a of childrenAcp) {
      // Ensure the child ACP knows which Zone it belongs to
      const acp = normalizeOption({ ...a, zone_id: String(a.zone_id ?? zone.id) }, 'acp');
      if (!acp) continue;
      acpAreas.push(acp);

      const childrenPs = a?.policeStations || a?.police_stations || [];
      for (const ps of childrenPs) {
        // Ensure the PS knows which ACP and Zone it belongs to
        const station = normalizeOption(
          {
            ...ps,
            acp_area_id: String(ps.acp_area_id ?? acp.id),
            zone_id: String(ps.zone_id ?? zone.id),
          },
          'ps'
        );
        if (station) policeStations.push(station);
      }
    }
  }

  return { zones, acpAreas, policeStations };
};

export const parseHierarchyMeta = (data = {}) => {
  // Try direct arrays first
  const zones = dedupeById(data.zones || [], 'zone');
  const acpAreas = dedupeById(data.acp_areas || data.acpAreas || [], 'acp');
  const policeStations = dedupeById(data.police_stations || data.policeStations || [], 'ps');

  if (zones.length || acpAreas.length || policeStations.length) {
    return { zones, acpAreas, policeStations };
  }

  // Fallback to tree flattening
  const flattened = flattenFromHierarchyTree(data.hierarchy || []);
  return {
    zones: dedupeById(flattened.zones, 'zone'),
    acpAreas: dedupeById(flattened.acpAreas, 'acp'),
    policeStations: dedupeById(flattened.policeStations, 'ps'),
  };
};

export async function fetchHierarchyMeta(adminAPI) {
  try {
    const r = await adminAPI.get('/criminal/meta/zones-stations');
    let parsed = parseHierarchyMeta(r.data || {});
    if (!parsed.zones?.length) {
      const r2 = await adminAPI.get('/admin/hierarchy');
      parsed = parseHierarchyMeta(r2.data || {});
    }
    return parsed;
  } catch (e) {
    try {
      const r2 = await adminAPI.get('/admin/hierarchy');
      return parseHierarchyMeta(r2.data || {});
    } catch (err) {
      return { zones: [], acpAreas: [], policeStations: [] };
    }
  }
}