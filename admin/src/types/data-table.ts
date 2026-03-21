import type { SortingState } from '@tanstack/vue-table'

export type DataTableFilterValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Array<string | number | boolean>

export type DataTableFilterValues = Record<string, DataTableFilterValue>

export interface DataTableLoadParams {
  filters: DataTableFilterValues
  page: number
  pageSize: number
  search: string
  sorting: SortingState
}

export interface DataTableLoadResult<TData> {
  rows: TData[]
  total: number
}
