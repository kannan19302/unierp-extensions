/**
 * Pagination helpers ported from `unierp-app-healthcare/src/pagination.util.ts`
 * (E26). Kept as pure functions so extension routes can page in-memory record
 * sets exactly as the archived Prisma-backed service did.
 */

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
}

/**
 * Build pagination skip/take values.
 */
export function buildPaginationValues(
  params: PaginationParams,
): { skip: number; take: number } {
  const page = params.page || 1;
  const limit = params.limit || 25;
  const skip = (page - 1) * limit;
  return { skip, take: limit };
}

/**
 * Build a sort key from a sort param string.
 * Handles multi-field sorting (e.g., "name,-createdAt").
 */
export function buildOrderBy(
  sort?: string,
): Array<Record<string, "asc" | "desc">> {
  if (!sort) return [{ createdAt: "desc" }];
  const fields = sort.split(",");
  return fields.map((field) => {
    const desc = field.startsWith("-");
    const key = desc ? field.substring(1) : field;
    return { [key]: desc ? "desc" : "asc" };
  });
}

/**
 * Wrap data with pagination meta.
 */
export function paginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  const page = params.page || 1;
  const limit = params.limit || 25;
  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Apply search/order/skip/take to an in-memory record list, mirroring the
 * archived Prisma `findMany` semantics for the Patient model.
 */
export function pageRecords<T extends Record<string, unknown>>(
  records: T[],
  params: PaginationParams,
  searchableFields: string[],
): PaginatedResult<T> {
  let filtered = records;
  if (params.search) {
    const needle = params.search.toLowerCase();
    filtered = records.filter((r) =>
      searchableFields.some(
        (field) => String(r[field] ?? "").toLowerCase().includes(needle),
      ),
    );
  }

  const orderBy = buildOrderBy(params.sort);
  const [first] = orderBy;
  if (first) {
    const [key, dir] = Object.entries(first)[0] ?? [];
    if (key && dir) {
      filtered = [...filtered].sort((a, b) => {
        const av = a[key] ?? "";
        const bv = b[key] ?? "";
        const cmp = String(av).localeCompare(String(bv));
        return dir === "asc" ? cmp : -cmp;
      });
    }
  }

  const { skip, take } = buildPaginationValues(params);
  return paginatedResult(filtered.slice(skip, skip + take), filtered.length, params);
}
