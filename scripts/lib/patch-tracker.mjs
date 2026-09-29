/**
 * Patch embeddedTracker lines in js/data.js.
 * Only rows whose seed pageStatus is still needs_seo or seo_in_progress are rewritten.
 */

const OPEN_STATUS = /pageStatus:\s*"(needs_seo|seo_in_progress)"/;

export function patchTrackerSource(source, updates) {
  const pending = new Map(updates.map((update) => [update.id, update]));
  const lines = source.split("\n");
  const next = lines.map((line) => {
    const idMatch = line.match(/id:\s*"([^"]+)"/);
    if (!idMatch || !pending.has(idMatch[1])) return line;
    const update = pending.get(idMatch[1]);
    pending.delete(idMatch[1]);
    return patchLine(line, update);
  });
  if (pending.size) {
    throw new Error(`Tracker rows not found: ${[...pending.keys()].join(", ")}`);
  }
  return next.join("\n");
}

function patchLine(line, update) {
  if (!OPEN_STATUS.test(line)) return line;
  let next = line.replace(OPEN_STATUS, `pageStatus: "${update.to || "seo_done"}"`);
  const details = update.details || {};
  if (details.seoOwner && !next.includes("seoOwner:")) {
    next = next.replace(/details:\s*\{\s*/, `details: { seoOwner: ${JSON.stringify(details.seoOwner)}, stagedAt: ${JSON.stringify(details.stagedAt)}, `);
  } else if (details.stagedAt && !next.includes("stagedAt:")) {
    next = next.replace(/details:\s*\{\s*/, `details: { stagedAt: ${JSON.stringify(details.stagedAt)}, `);
  }
  if (!next.includes("details:") && (details.seoOwner || details.stagedAt)) {
    const fields = [];
    if (details.seoOwner) fields.push(`seoOwner: ${JSON.stringify(details.seoOwner)}`);
    if (details.stagedAt) fields.push(`stagedAt: ${JSON.stringify(details.stagedAt)}`);
    next = next.replace(/\}\s*,?\s*$/, `, details: { ${fields.join(", ")} } },`);
  }
  return next;
}
