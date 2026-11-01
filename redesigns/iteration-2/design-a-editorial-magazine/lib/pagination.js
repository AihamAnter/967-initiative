// Fetch all rows even when Supabase enforces a per-response row limit.
// Callers provide a deterministic order (ending in the unique primary key).
//
// The first page reports the exact count and the server's effective page size,
// so the remaining pages are requested in parallel instead of one after another
// (the old sequential loop added one database round trip per 500 rows to TTFB).
// If any parallel page comes back short, we keep only the contiguous prefix and
// continue sequentially from there, so a lower response cap never truncates.
export async function fetchAllRows(query, pageSize = 500, maxParallel = 6) {
  const read = async offset => {
    const {data, error, count} = await query().range(offset, offset + pageSize - 1);
    if (error) throw Object.assign(new Error(error.message),{code:error.code});
    return {data: data || [], count};
  };
  const first = await read(0);
  const rows = [...first.data];
  if (!first.data.length) return rows;
  const total = Number.isInteger(first.count) && first.count >= 0 ? first.count : null;
  if (total !== null && rows.length >= total) return rows;

  let offset = rows.length;
  if (total !== null) {
    const step = first.data.length;
    const offsets = [];
    for (let next = offset; next < total; next += step) offsets.push(next);
    for (let start = 0; start < offsets.length; start += maxParallel) {
      const batch = offsets.slice(start, start + maxParallel);
      const pages = await Promise.all(batch.map(read));
      for (let index = 0; index < pages.length; index++) {
        const expected = Math.min(step, total - batch[index]);
        rows.push(...pages[index].data);
        offset = batch[index] + pages[index].data.length;
        if (pages[index].data.length < expected) return continueSequentially(read, rows, offset, total);
      }
    }
    return rows;
  }
  return continueSequentially(read, rows, offset, total);
}

async function continueSequentially(read, rows, offset, total) {
  for (;;) {
    if (total !== null && offset >= total) return rows;
    const {data, count} = await read(offset);
    if (!data.length) return rows;
    rows.push(...data);
    offset += data.length;
    // Supabase's exact count avoids a final empty round-trip while still
    // handling installations whose response cap is below our requested size.
    if (Number.isInteger(count) && count >= 0 && offset >= count) return rows;
  }
}
