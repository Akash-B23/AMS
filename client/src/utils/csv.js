function parseCsvWithHeaders(text, requiredHeaders) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], error: "CSV is empty" };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const indices = {};
  for (const col of requiredHeaders) {
    const idx = header.indexOf(col);
    if (idx === -1) {
      return {
        rows: [],
        error: `CSV must have ${requiredHeaders.join(", ")} columns`,
      };
    }
    indices[col] = idx;
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const row = {};
    for (const col of requiredHeaders) {
      row[col] = cols[indices[col]] ?? "";
    }
    rows.push(row);
  }

  return { rows };
}

export function parseMaintenanceCsv(text) {
  const parsed = parseCsvWithHeaders(text, [
    "block_name",
    "flat_number",
    "maintenance_amount",
  ]);
  if (parsed.error) {
    return parsed;
  }

  const rows = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const raw = parsed.rows[i];
    const blockName = raw.block_name;
    const flatNumber = raw.flat_number;
    const amount = Number.parseFloat(raw.maintenance_amount);

    if (!blockName || !flatNumber) {
      return {
        rows: [],
        error: `Row ${i + 2} is missing block_name or flat_number`,
      };
    }
    if (Number.isNaN(amount) || amount <= 0) {
      return {
        rows: [],
        error: `Row ${i + 2} has invalid maintenance_amount`,
      };
    }

    rows.push({
      blockName,
      flatNumber,
      maintenanceAmountRupees: amount,
    });
  }

  return { rows };
}

export function parseAmenitiesCsv(text) {
  const parsed = parseCsvWithHeaders(text, ["name", "description"]);
  if (parsed.error) {
    return parsed;
  }

  const rows = [];
  for (let i = 0; i < parsed.rows.length; i++) {
    const raw = parsed.rows[i];
    if (!raw.name) {
      return { rows: [], error: `Row ${i + 2} is missing name` };
    }
    rows.push({
      name: raw.name,
      description: raw.description || null,
    });
  }

  return { rows };
}
