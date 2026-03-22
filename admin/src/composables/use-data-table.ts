/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  ColumnDef,
  ColumnOrderState,
  SortingState,
  Updater,
  VisibilityState,
} from "@tanstack/vue-table";
import { computed, onMounted, ref, watch, type Ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from "@tanstack/vue-table";
import { getApiErrorMessage } from "@/services/http/error-messages";
import type {
  DataTableFilterValue,
  DataTableFilterValues,
  DataTableLoadParams,
  DataTableLoadResult,
} from "@/types/data-table";

export interface UseDataTableOptions<TData extends Record<string, any>> {
  applyFilters?: (rows: TData[], filters: DataTableFilterValues) => TData[];
  columns: ColumnDef<TData, any>[];
  data: Ref<TData[]>;
  filterValues: Ref<DataTableFilterValues>;
  initialPageSize: number;
  loadData?: (params: DataTableLoadParams) => Promise<DataTableLoadResult<TData>>;
  queryKeyPrefix?: string;
  rowId?: (row: TData, index: number) => string;
  searchKeys: string[];
  storageKey: string;
  syncUrl: boolean;
}

export function useDataTable<TData extends Record<string, any>>(
  options: UseDataTableOptions<TData>,
) {
  const route = useRoute();
  const router = useRouter();

  const isLoading = ref(false);
  const errorMessage = ref("");
  const searchInput = ref("");
  const search = ref("");
  const sorting = ref<SortingState>([]);
  const columnVisibility = ref<VisibilityState>({});
  const columnOrder = ref<ColumnOrderState>([]);
  const pagination = ref({ pageIndex: 0, pageSize: options.initialPageSize });
  const serverRows = ref<TData[]>([]);
  const serverTotal = ref(0);
  const hydrated = ref(false);

  const storageName = computed(() => `datatable:${options.storageKey}`);
  const queryPrefix = computed(
    () => (options.queryKeyPrefix ?? options.storageKey.replace(/[^a-zA-Z0-9]/g, "")) || "dt",
  );
  const isServerMode = computed(() => Boolean(options.loadData));

  function resolveUpdater<T>(updater: Updater<T>, previous: T): T {
    return typeof updater === "function" ? (updater as (value: T) => T)(previous) : updater;
  }

  function encodeFilters(values: DataTableFilterValues) {
    return Object.fromEntries(
      Object.entries(values)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .map(([key, value]) => [key, Array.isArray(value) ? value.join("|") : String(value)]),
    );
  }

  function parseStoredState() {
    if (typeof window === "undefined") {
      return null;
    }

    const raw = window.localStorage.getItem(storageName.value);

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as {
        columnOrder?: ColumnOrderState;
        columnVisibility?: VisibilityState;
        filters?: DataTableFilterValues;
        pageIndex?: number;
        pageSize?: number;
        search?: string;
        sorting?: SortingState;
      };
    } catch {
      return null;
    }
  }

  function parseSorting(raw: unknown) {
    if (typeof raw !== "string" || !raw) {
      return [] as SortingState;
    }

    return raw
      .split(",")
      .filter(Boolean)
      .map((entry) => {
        const [id, direction] = entry.split(":");
        return { desc: direction === "desc", id };
      })
      .filter((item): item is { desc: boolean; id: string } => Boolean(item.id));
  }

  function readUrlState() {
    const prefix = queryPrefix.value;
    const query = route.query;
    const filtersFromUrl: DataTableFilterValues = {};

    for (const [key, value] of Object.entries(query)) {
      if (!key.startsWith(`${prefix}F_`) || typeof value !== "string") {
        continue;
      }

      filtersFromUrl[key.replace(`${prefix}F_`, "")] = value.includes("|")
        ? value.split("|")
        : value;
    }

    return {
      columnOrder:
        typeof query[`${prefix}Order`] === "string" && query[`${prefix}Order`]
          ? String(query[`${prefix}Order`]).split(",").filter(Boolean)
          : undefined,
      columnVisibility:
        typeof query[`${prefix}Hidden`] === "string" && query[`${prefix}Hidden`]
          ? Object.fromEntries(
              String(query[`${prefix}Hidden`])
                .split(",")
                .filter(Boolean)
                .map((id) => [id, false]),
            )
          : undefined,
      filters: filtersFromUrl,
      pageIndex:
        typeof query[`${prefix}Page`] === "string"
          ? Math.max(Number(query[`${prefix}Page`]) - 1, 0)
          : undefined,
      pageSize:
        typeof query[`${prefix}PageSize`] === "string"
          ? Number(query[`${prefix}PageSize`])
          : undefined,
      search: typeof query[`${prefix}Q`] === "string" ? String(query[`${prefix}Q`]) : undefined,
      sorting: parseSorting(query[`${prefix}Sort`]),
    };
  }

  function applyInitialState() {
    const stored = parseStoredState();
    const fromUrl = options.syncUrl ? readUrlState() : null;

    const initialSearch = fromUrl?.search ?? stored?.search ?? "";
    search.value = initialSearch;
    searchInput.value = initialSearch;
    options.filterValues.value = {
      ...(stored?.filters ?? options.filterValues.value),
      ...fromUrl?.filters,
    };
    sorting.value = fromUrl?.sorting?.length ? fromUrl.sorting : (stored?.sorting ?? []);
    columnVisibility.value = fromUrl?.columnVisibility ?? stored?.columnVisibility ?? {};
    columnOrder.value = fromUrl?.columnOrder ?? stored?.columnOrder ?? [];
    pagination.value = {
      pageIndex: fromUrl?.pageIndex ?? stored?.pageIndex ?? 0,
      pageSize: fromUrl?.pageSize ?? stored?.pageSize ?? options.initialPageSize,
    };
  }

  function persistState() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(
        storageName.value,
        JSON.stringify({
          columnOrder: columnOrder.value,
          columnVisibility: columnVisibility.value,
          filters: options.filterValues.value,
          pageIndex: pagination.value.pageIndex,
          pageSize: pagination.value.pageSize,
          search: search.value,
          sorting: sorting.value,
        }),
      );
    }

    if (!options.syncUrl) {
      return;
    }

    const prefix = queryPrefix.value;
    const nextQuery = { ...route.query } as Record<string, string | string[]>;

    for (const key of Object.keys(nextQuery)) {
      if (key.startsWith(prefix)) {
        delete nextQuery[key];
      }
    }

    if (search.value) {
      nextQuery[`${prefix}Q`] = search.value;
    }

    if (pagination.value.pageIndex > 0) {
      nextQuery[`${prefix}Page`] = String(pagination.value.pageIndex + 1);
    }

    if (pagination.value.pageSize !== options.initialPageSize) {
      nextQuery[`${prefix}PageSize`] = String(pagination.value.pageSize);
    }

    if (sorting.value.length) {
      nextQuery[`${prefix}Sort`] = sorting.value
        .map((item) => `${item.id}:${item.desc ? "desc" : "asc"}`)
        .join(",");
    }

    const hidden = Object.entries(columnVisibility.value)
      .filter(([, visible]) => visible === false)
      .map(([id]) => id);

    if (hidden.length) {
      nextQuery[`${prefix}Hidden`] = hidden.join(",");
    }

    if (columnOrder.value.length) {
      nextQuery[`${prefix}Order`] = columnOrder.value.join(",");
    }

    for (const [key, value] of Object.entries(encodeFilters(options.filterValues.value))) {
      nextQuery[`${prefix}F_${key}`] = value;
    }

    router.replace({ query: nextQuery });
  }

  const clientRows = computed(() => {
    let rows = [...options.data.value];

    if (search.value && options.searchKeys.length) {
      const needle = search.value.toLowerCase().trim();
      rows = rows.filter((row) =>
        options.searchKeys.some((key) =>
          String(row[key] ?? "")
            .toLowerCase()
            .includes(needle),
        ),
      );
    }

    if (options.applyFilters) {
      rows = options.applyFilters(rows, options.filterValues.value);
    }

    return rows;
  });

  const pageCount = computed(() => {
    const total = isServerMode.value ? serverTotal.value : clientRows.value.length;
    return Math.max(Math.ceil(total / pagination.value.pageSize), 1);
  });

  const table = useVueTable({
    get columns() {
      return options.columns;
    },
    get data() {
      return (isServerMode.value ? serverRows.value : clientRows.value) as TData[];
    },
    getCoreRowModel: getCoreRowModel(),
    ...(options.loadData
      ? {}
      : {
          getPaginationRowModel: getPaginationRowModel(),
          getSortedRowModel: getSortedRowModel(),
        }),
    getRowId: options.rowId,
    get pageCount() {
      return pageCount.value;
    },
    manualPagination: isServerMode.value,
    manualSorting: isServerMode.value,
    onColumnOrderChange: (updater) => {
      columnOrder.value = resolveUpdater(updater, columnOrder.value);
    },
    onColumnVisibilityChange: (updater) => {
      columnVisibility.value = resolveUpdater(updater, columnVisibility.value);
    },
    onPaginationChange: (updater) => {
      pagination.value = resolveUpdater(updater, pagination.value);
    },
    onSortingChange: (updater) => {
      sorting.value = resolveUpdater(updater, sorting.value);
      pagination.value = { ...pagination.value, pageIndex: 0 };
    },
    state: {
      get columnOrder() {
        return columnOrder.value;
      },
      get columnVisibility() {
        return columnVisibility.value;
      },
      get pagination() {
        return pagination.value;
      },
      get sorting() {
        return sorting.value;
      },
    },
  });

  const rows = computed(() => table.getRowModel().rows);
  const totalRows = computed(() =>
    isServerMode.value ? serverTotal.value : clientRows.value.length,
  );
  const totalPages = computed(() =>
    Math.max(Math.ceil(totalRows.value / pagination.value.pageSize), 1),
  );
  const pageButtons = computed(() => {
    const current = pagination.value.pageIndex + 1;
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages.value, start + 4);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  });
  const visibleColumns = computed(() =>
    table.getAllLeafColumns().filter((column) => column.getCanHide()),
  );

  async function loadServerRows() {
    if (!options.loadData) {
      return;
    }

    isLoading.value = true;
    errorMessage.value = "";

    try {
      const result = await options.loadData({
        filters: options.filterValues.value,
        page: pagination.value.pageIndex + 1,
        pageSize: pagination.value.pageSize,
        search: search.value,
        sorting: sorting.value,
      });

      serverRows.value = result.rows;
      serverTotal.value = result.total;
    } catch (error) {
      errorMessage.value = getApiErrorMessage(error, "common.dataTable.loadError");
      serverRows.value = [];
      serverTotal.value = 0;
    } finally {
      isLoading.value = false;
    }
  }

  function setPage(page: number) {
    pagination.value = {
      ...pagination.value,
      pageIndex: Math.min(Math.max(page - 1, 0), totalPages.value - 1),
    };
  }

  function setFilter(key: string, value: DataTableFilterValue) {
    options.filterValues.value = {
      ...options.filterValues.value,
      [key]: value,
    };
    pagination.value = { ...pagination.value, pageIndex: 0 };
  }

  function resetFilters() {
    options.filterValues.value = {};
    pagination.value = { ...pagination.value, pageIndex: 0 };
  }

  function moveColumn(columnId: string, direction: "left" | "right") {
    const source = columnOrder.value.length
      ? [...columnOrder.value]
      : table.getAllLeafColumns().map((column) => column.id);
    const index = source.indexOf(columnId);

    if (index === -1) {
      return;
    }

    const targetIndex = direction === "left" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= source.length) {
      return;
    }

    const [column] = source.splice(index, 1);

    if (!column) {
      return;
    }

    source.splice(targetIndex, 0, column);
    columnOrder.value = source;
  }

  function setPageSize(value: unknown) {
    pagination.value = {
      pageIndex: 0,
      pageSize: Number(value ?? options.initialPageSize),
    };
  }

  onMounted(() => {
    applyInitialState();
    hydrated.value = true;
  });

  watch(
    options.data,
    () => {
      if (!isServerMode.value) {
        errorMessage.value = "";
      }
    },
    { deep: true },
  );

  watch(search, () => {
    pagination.value = { ...pagination.value, pageIndex: 0 };
  });

  watch(
    [hydrated, search, options.filterValues, sorting, pagination, columnVisibility, columnOrder],
    async () => {
      if (!hydrated.value) {
        return;
      }

      persistState();

      if (isServerMode.value) {
        await loadServerRows();
      }
    },
    { deep: true, immediate: true },
  );

  return {
    columnOrder,
    errorMessage,
    filterValues: options.filterValues,
    hydrated,
    isLoading,
    isServerMode,
    moveColumn,
    pageButtons,
    pagination,
    resetFilters,
    rows,
    search,
    searchInput,
    setFilter,
    setPage,
    setPageSize,
    sorting,
    table,
    totalPages,
    totalRows,
    visibleColumns,
  };
}
