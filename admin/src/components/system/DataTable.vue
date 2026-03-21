<script setup lang="ts" generic="TData extends Record<string, unknown>">
import type { HTMLAttributes } from 'vue'
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, toRef } from 'vue'
import { FlexRender } from '@tanstack/vue-table'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Inbox,
} from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { useDataTable } from '@/composables/use-data-table'
import SearchInput from './SearchInput.vue'
import type {
  DataTableFilterValues,
  DataTableLoadParams,
  DataTableLoadResult,
} from '@/types/data-table'

const props = withDefaults(
  defineProps<{
    applyFilters?: (rows: TData[], filters: DataTableFilterValues) => TData[]
    class?: HTMLAttributes['class']
    columns: ColumnDef<TData, unknown>[]
    data?: TData[]
    emptyDescription?: string
    emptyTitle?: string
    filterValues?: DataTableFilterValues
    initialPageSize?: number
    loadData?: (params: DataTableLoadParams) => Promise<DataTableLoadResult<TData>>
    pageSizeOptions?: number[]
    queryKeyPrefix?: string
    rowId?: (row: TData, index: number) => string
    searchKeys?: string[]
    searchPlaceholder?: string
    storageKey: string
    syncUrl?: boolean
  }>(),
  {
    data: () => [],
    emptyDescription: 'Adjust your search or filters, or create a new record.',
    emptyTitle: 'No results',
    filterValues: () => ({}),
    initialPageSize: 10,
    pageSizeOptions: () => [10, 20, 50, 100],
    queryKeyPrefix: undefined,
    rowId: undefined,
    searchKeys: () => [],
    searchPlaceholder: 'Search...',
    syncUrl: true,
  },
)

const emit = defineEmits<{
  'update:filterValues': [payload: DataTableFilterValues]
}>()

const filterValuesModel = computed({
  get: () => props.filterValues,
  set: (value) => emit('update:filterValues', value),
})

const state = useDataTable<TData>({
  applyFilters: props.applyFilters,
  columns: props.columns,
  data: toRef(() => props.data),
  filterValues: filterValuesModel,
  initialPageSize: props.initialPageSize,
  loadData: props.loadData,
  queryKeyPrefix: props.queryKeyPrefix,
  rowId: props.rowId,
  searchKeys: props.searchKeys,
  storageKey: props.storageKey,
  syncUrl: props.syncUrl,
})

const {
  errorMessage,
  filterValues: tableFilterValues,
  isLoading,
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
  table,
  totalPages,
  totalRows,
  visibleColumns,
} = state

function sortIcon(column: ReturnType<typeof state.table.getAllLeafColumns>[number]) {
  const current = column.getIsSorted()

  if (current === 'asc') {
    return ArrowUp
  }

  if (current === 'desc') {
    return ArrowDown
  }

  return ArrowUpDown
}
</script>

<template>
  <div :class="cn('space-y-4', props.class)">
    <div
      class="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          v-model="searchInput"
          class="w-full max-w-sm"
          :placeholder="searchPlaceholder"
          @search="(value) => (search = value)"
        />

        <div class="flex flex-wrap gap-2">
          <slot
            name="filters"
            :filters="tableFilterValues"
            :is-loading="isLoading"
            :reset-filters="resetFilters"
            :set-filter="setFilter"
          />
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <slot name="actions" :selected-count="rows.length" />

        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button type="button" variant="outline">
              <Columns3 class="size-4" />
              Columns
              <ChevronDown class="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-72 p-2">
            <div class="mb-2 px-2">
              <p class="text-sm font-medium">Columns</p>
              <p class="text-muted-foreground text-xs">Toggle visibility and reorder columns.</p>
            </div>

            <div class="space-y-1">
              <div
                v-for="(column, index) in visibleColumns"
                :key="column.id"
                class="flex items-center gap-2 rounded-lg px-2 py-1.5"
              >
                <input
                  :id="`column-${column.id}`"
                  type="checkbox"
                  class="accent-primary"
                  :checked="column.getIsVisible()"
                  @change="column.toggleVisibility(($event.target as HTMLInputElement).checked)"
                />
                <label :for="`column-${column.id}`" class="flex-1 truncate text-sm">{{
                  column.id
                }}</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :disabled="index === 0"
                  @click="moveColumn(column.id, 'left')"
                >
                  <ChevronLeft class="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  :disabled="index === visibleColumns.length - 1"
                  @click="moveColumn(column.id, 'right')"
                >
                  <ChevronRight class="size-4" />
                </Button>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div class="rounded-2xl border border-border/60 bg-card/80">
      <Table>
        <TableHeader>
          <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <TableHead v-for="header in headerGroup.headers" :key="header.id">
              <div v-if="!header.isPlaceholder" class="flex items-center gap-2">
                <Button
                  v-if="header.column.getCanSort()"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="h-auto px-0 py-0 font-medium"
                  @click="header.column.getToggleSortingHandler()?.($event)"
                >
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                  <component :is="sortIcon(header.column)" class="size-4" />
                </Button>
                <FlexRender
                  v-else
                  :render="header.column.columnDef.header"
                  :props="header.getContext()"
                />
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="index in pagination.pageSize" :key="`skeleton-${index}`">
              <TableCell
                v-for="column in table.getVisibleLeafColumns()"
                :key="`${column.id}-${index}`"
              >
                <Skeleton class="h-5 w-full max-w-[180px]" />
              </TableCell>
            </TableRow>
          </template>

          <template v-else-if="rows.length">
            <TableRow v-for="row in rows" :key="row.id">
              <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </TableCell>
            </TableRow>
          </template>

          <TableEmpty v-else :colspan="table.getVisibleLeafColumns().length || 1">
            <slot name="empty" :error="errorMessage">
              <div class="space-y-3 text-center">
                <div
                  class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
                >
                  <Inbox class="size-5" />
                </div>
                <div>
                  <p class="font-medium">{{ errorMessage || emptyTitle }}</p>
                  <p class="text-muted-foreground text-sm">
                    {{ errorMessage || emptyDescription }}
                  </p>
                </div>
              </div>
            </slot>
          </TableEmpty>
        </TableBody>
      </Table>
    </div>

    <div
      class="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="text-muted-foreground text-sm">
        Showing <span class="text-foreground font-medium">{{ rows.length }}</span> of
        <span class="text-foreground font-medium">{{ totalRows }}</span> results
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-2 text-sm">
          <span class="text-muted-foreground">Rows per page</span>
          <Select :model-value="String(pagination.pageSize)" @update:model-value="setPageSize">
            <SelectTrigger class="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="size in pageSizeOptions" :key="size" :value="String(size)">{{
                size
              }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="pagination.pageIndex === 0"
            @click="setPage(1)"
          >
            <ChevronLeft class="size-4" />
            <span class="sr-only">First page</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="pagination.pageIndex === 0"
            @click="setPage(pagination.pageIndex)"
          >
            <ArrowUp class="size-4 rotate-[-90deg]" />
            <span class="sr-only">Previous page</span>
          </Button>
          <Button
            v-for="page in pageButtons"
            :key="page"
            type="button"
            :variant="page === pagination.pageIndex + 1 ? 'default' : 'outline'"
            size="sm"
            class="min-w-9"
            @click="setPage(page)"
          >
            {{ page }}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="pagination.pageIndex >= totalPages - 1"
            @click="setPage(pagination.pageIndex + 2)"
          >
            <ArrowUp class="size-4 rotate-90" />
            <span class="sr-only">Next page</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            :disabled="pagination.pageIndex >= totalPages - 1"
            @click="setPage(totalPages)"
          >
            <ChevronRight class="size-4" />
            <span class="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
