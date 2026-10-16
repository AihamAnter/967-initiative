// Fetch all rows even when Supabase enforces a per-response row limit.
// Callers provide a deterministic order (ending in the unique primary key).
export async function fetchAllRows(query, pageSize = 500) {
  const rows = [];
  for (let offset = 0; ; ) {
    const {data, error} = await query().range(offset, offset + pageSize - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) return rows;
    rows.push(...data);
    offset += data.length;
  }
}
