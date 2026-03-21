<script setup lang="ts">
import type { ColumnDef } from '@tanstack/vue-table'
import { computed, h, ref } from 'vue'
import DataTable from '@/components/system/DataTable.vue'
import type { DataTableLoadParams, DataTableLoadResult } from '@/components/system'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface UserRow extends Record<string, unknown> {
  email: string
  id: string
  name: string
  role: string
  status: 'active' | 'invited' | 'suspended'
}

const roleFilter = ref<string | null>(null)
const serverRoleFilter = ref<string | null>(null)

const users: UserRow[] = [
  { id: '1', name: 'Salem Affa', email: 'salem@blueprint.app', role: 'admin', status: 'active' },
  { id: '2', name: 'Lina Carter', email: 'lina@blueprint.app', role: 'editor', status: 'invited' },
  { id: '3', name: 'Marco Bell', email: 'marco@blueprint.app', role: 'viewer', status: 'active' },
  { id: '4', name: 'Nina Young', email: 'nina@blueprint.app', role: 'editor', status: 'suspended' },
  { id: '5', name: 'Owen Diaz', email: 'owen@blueprint.app', role: 'admin', status: 'active' },
  { id: '6', name: 'Ava Stone', email: 'ava@blueprint.app', role: 'viewer', status: 'invited' },
  { id: '7', name: 'Hugo Lee', email: 'hugo@blueprint.app', role: 'editor', status: 'active' },
  { id: '8', name: 'Emma Park', email: 'emma@blueprint.app', role: 'admin', status: 'suspended' },
  { id: '9', name: 'Theo Miles', email: 'theo@blueprint.app', role: 'viewer', status: 'active' },
  { id: '10', name: 'Jade West', email: 'jade@blueprint.app', role: 'editor', status: 'active' },
  { id: '11', name: 'Iris Moon', email: 'iris@blueprint.app', role: 'admin', status: 'invited' },
  { id: '12', name: 'Noah Reed', email: 'noah@blueprint.app', role: 'viewer', status: 'active' },
]

const columns: ColumnDef<UserRow>[] = [
  {
    accessorKey: 'name',
    cell: ({ row }) => h('div', { class: 'font-medium' }, row.original.name),
    header: 'Name',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
  },
  {
    accessorKey: 'status',
    cell: ({ row }) =>
      h(
        Badge,
        { variant: row.original.status === 'active' ? 'default' : 'secondary' },
        () => row.original.status,
      ),
    header: 'Status',
  },
]

const clientFilters = computed(() => (roleFilter.value ? { role: roleFilter.value } : {}))
const serverFilters = computed(() =>
  serverRoleFilter.value ? { role: serverRoleFilter.value } : {},
)

function applyRoleFilter(rows: UserRow[], filters: Record<string, unknown>) {
  if (!filters.role || typeof filters.role !== 'string') {
    return rows
  }

  return rows.filter((row) => row.role === filters.role)
}

async function loadUsers(params: DataTableLoadParams): Promise<DataTableLoadResult<UserRow>> {
  await new Promise((resolve) => setTimeout(resolve, 600))

  let rows = [...users]

  if (params.search) {
    const search = params.search.toLowerCase()
    rows = rows.filter(
      (row) => row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search),
    )
  }

  rows = applyRoleFilter(rows, params.filters)

  if (params.sorting.length) {
    const sort = params.sorting[0]

    if (sort) {
      rows.sort((a, b) => {
        const left = String(a[sort.id as keyof UserRow] ?? '')
        const right = String(b[sort.id as keyof UserRow] ?? '')
        return sort.desc ? right.localeCompare(left) : left.localeCompare(right)
      })
    }
  }

  const total = rows.length
  const start = (params.page - 1) * params.pageSize
  const paged = rows.slice(start, start + params.pageSize)

  return { rows: paged, total }
}
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>SystemDataTablePlayground</CardTitle>
        <CardDescription>
          Client-side and server-side examples with search, filters, pagination, sorting,
          persistence, URL sync, column visibility, and reordering.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle>Client-side DataTable</CardTitle>
        <CardDescription>
          Uses local data, client filtering, client sorting, and persisted state.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          storage-key="users-client"
          :columns="columns"
          :data="users"
          :filter-values="clientFilters"
          :apply-filters="applyRoleFilter"
          :search-keys="['name', 'email', 'role', 'status']"
          search-placeholder="Search users locally"
        >
          <template #filters>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                :variant="!roleFilter ? 'default' : 'outline'"
                @click="roleFilter = null"
                >All roles</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="roleFilter === 'admin' ? 'default' : 'outline'"
                @click="roleFilter = 'admin'"
                >Admins</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="roleFilter === 'editor' ? 'default' : 'outline'"
                @click="roleFilter = 'editor'"
                >Editors</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="roleFilter === 'viewer' ? 'default' : 'outline'"
                @click="roleFilter = 'viewer'"
                >Viewers</Button
              >
            </div>
          </template>
        </DataTable>
      </CardContent>
    </Card>

    <Card class="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle>Server-side DataTable</CardTitle>
        <CardDescription>
          Uses an async loader and switches automatically to manual pagination and sorting.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable
          storage-key="users-server"
          :columns="columns"
          :load-data="loadUsers"
          :filter-values="serverFilters"
          :search-keys="['name', 'email']"
          search-placeholder="Search users remotely"
        >
          <template #filters>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                :variant="!serverRoleFilter ? 'default' : 'outline'"
                @click="serverRoleFilter = null"
                >All roles</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="serverRoleFilter === 'admin' ? 'default' : 'outline'"
                @click="serverRoleFilter = 'admin'"
                >Admins</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="serverRoleFilter === 'editor' ? 'default' : 'outline'"
                @click="serverRoleFilter = 'editor'"
                >Editors</Button
              >
              <Button
                type="button"
                size="sm"
                :variant="serverRoleFilter === 'viewer' ? 'default' : 'outline'"
                @click="serverRoleFilter = 'viewer'"
                >Viewers</Button
              >
            </div>
          </template>
        </DataTable>
      </CardContent>
    </Card>
  </section>
</template>
