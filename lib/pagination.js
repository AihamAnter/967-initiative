// Fetch all rows even when Supabase enforces a per-response row limit.
// Callers provide a deterministic order (ending in the unique primary key).
export async function fetchAllRows(query, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; ) {
    const {data, error, count} = await query().range(offset, offset + pageSize - 1);
    if (error) throw Object.assign(new Error(error.message),{code:error.code});
    if (!data?.length) return rows;
    rows.push(...data);
    offset += data.length;
    // Supabase's exact count avoids a final empty round-trip while still
    // handling installations whose response cap is below our requested size.
    if (Number.isInteger(count) && count >= 0 && offset >= count) return rows;
  }
}
