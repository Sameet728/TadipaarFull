export const downloadCSV = (data, filename = "tadipaar_export.csv") => {
  if (!data || data.length === 0) {
    alert("No data to export");
    return;
  }
  const headers = Object.keys(data[0]);
  const rows = data.map((row) =>
    headers
      .map((h) => {
        const v = row[h] ?? "";
        const s = String(v).replace(/"/g, '""');
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s}"`
          : s;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const criminalsToCSV = (criminals) =>
  criminals.map((c) => ({
    Name: c.name,
    LoginID: c.loginId || c.login_id,
    Phone: c.phone || "",
    CaseNumber: c.caseNumber || c.case_number || "",
    Section: c.externmentSection || c.externment_section || "",
    PeriodFrom: c.periodFrom || c.period_from || "",
    PeriodTill: c.periodTill || c.period_till || "",
    PoliceStation: c.policeStation || c.police_station || "",
    ACPArea: c.acpArea || c.acp_area || "",
    Zone: c.zone || "",
    TotalCheckins: c.stats?.totalCheckins ?? "",
    Compliant: c.stats?.compliantCount ?? "",
    NonCompliant: c.stats?.nonCompliantCount ?? "",
    LastCheckin: c.stats?.lastCheckin
      ? new Date(c.stats.lastCheckin).toLocaleString("en-IN")
      : "Never",
    MissedDays: c.stats?.missedCheckinDays ?? "",
    EnteredRedZone: c.stats?.enteredRestrictedArea ? "YES" : "NO",
  }));

export const checkinsToCSV = (checkins) =>
  checkins.map((c) => ({
    Name: c.criminal_name || "",
    LoginID: c.login_id || "",
    CaseNumber: c.case_number || "",
    Status: c.status || "",
    CheckInTime: c.checked_in_at
      ? new Date(c.checked_in_at).toLocaleString("en-IN")
      : "",
    Latitude: c.latitude || "",
    Longitude: c.longitude || "",
    ViolationReason: c.violation_reason || "",
    PoliceStation: c.police_station || "",
    ACPArea: c.acp_area || "",
    Zone: c.zone || "",
  }));
