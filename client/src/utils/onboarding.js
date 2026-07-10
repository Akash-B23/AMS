export function slugify(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseFlatCsv(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], error: "CSV is empty" };
  }

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const blockIdx = header.indexOf("block_name");
  const flatIdx = header.indexOf("flat_number");
  const floorIdx = header.indexOf("floor");

  if (blockIdx === -1 || flatIdx === -1) {
    return {
      rows: [],
      error: "CSV must have block_name and flat_number columns",
    };
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const blockName = cols[blockIdx];
    const flatNumber = cols[flatIdx];
    if (!blockName || !flatNumber) {
      return { rows: [], error: `Row ${i + 1} is missing block_name or flat_number` };
    }
    const row = { blockName, flatNumber };
    if (floorIdx !== -1 && cols[floorIdx]) {
      const floor = Number.parseInt(cols[floorIdx], 10);
      if (!Number.isNaN(floor)) {
        row.floor = floor;
      }
    }
    rows.push(row);
  }

  return { rows };
}

export function rupeesToPaise(rupees) {
  const value = Number.parseFloat(rupees);
  if (Number.isNaN(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 100);
}

export function paiseToRupees(paise) {
  if (paise == null) {
    return "";
  }
  return (paise / 100).toFixed(2);
}
