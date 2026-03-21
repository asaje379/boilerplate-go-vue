<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import type { FormSelectOption } from "@/types";
import type { User } from "@/types/user";
import { h, ref } from "vue";
import { storeToRefs } from "pinia";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import {
  AppForm,
  DataTable,
  FormCheckbox,
  FormInput,
  FormPassword,
  FormSelect,
  type DataTableLoadParams,
} from "@/components/system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usersApi } from "@/services/api/users.api";
import { supportedLocales } from "@/lib/i18n";
import { useRealtimeStore } from "@/stores/realtime";

const roleOptions: FormSelectOption[] = [
  { label: "Admin", value: "admin" },
  { label: "User", value: "user" },
];

const localeOptions: FormSelectOption[] = supportedLocales.map((locale) => ({
  label: locale.toUpperCase(),
  value: locale,
}));

const users = ref<User[]>([]);
const total = ref(0);
const isDialogOpen = ref(false);
const editingUser = ref<User | null>(null);
const realtime = useRealtimeStore();
const { connectedUsersCount, isConnected: isRealtimeConnected } = storeToRefs(realtime);

const createSchema = toTypedSchema(
  z.object({
    email: z.string().email("Email is invalid"),
    mustChangePassword: z.boolean().optional().default(true),
    name: z.string().min(2, "Name is required"),
    password: z.string().min(8, "Minimum 8 characters"),
    preferredLocale: z.enum(["fr", "en"]),
    role: z.enum(["admin", "user"]),
  }),
);

const updateSchema = toTypedSchema(
  z.object({
    email: z.string().email("Email is invalid"),
    name: z.string().min(2, "Name is required"),
    preferredLocale: z.enum(["fr", "en"]),
    role: z.enum(["admin", "user"]),
  }),
);

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => h(Badge, { variant: "secondary" }, () => row.original.role),
  },
  {
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) =>
      h(Badge, { variant: row.original.isActive ? "default" : "outline" }, () =>
        row.original.isActive ? "Active" : "Inactive",
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => openEditDialog(row.original),
          },
          () => "Edit",
        ),
        h(
          Button,
          {
            size: "sm",
            variant: row.original.isActive ? "destructive" : "outline",
            onClick: () => toggleActive(row.original),
          },
          () => (row.original.isActive ? "Disable" : "Reactivate"),
        ),
      ]),
  },
];

async function loadUsers(params: DataTableLoadParams) {
  const sorting = params.sorting[0];
  const response = await usersApi.list({
    limit: params.pageSize,
    page: params.page,
    search: params.search,
    sortBy: sorting?.id,
    sortOrder: sorting?.desc ? "desc" : "asc",
  });

  users.value = response.items;
  total.value = response.meta.total;

  return {
    rows: response.items,
    total: response.meta.total,
  };
}

function openCreateDialog() {
  editingUser.value = null;
  isDialogOpen.value = true;
}

function openEditDialog(user: User) {
  editingUser.value = user;
  isDialogOpen.value = true;
}

async function handleUserSubmit(values: unknown) {
  if (editingUser.value) {
    await submitUpdate(values);
    return;
  }

  await submitCreate(values);
}

function handleInvalidSubmit(payload: unknown) {
  console.error("UsersView create/update form invalid submit", payload);
  toast.error("Form validation blocked submission. Check the browser console.");
}

async function toggleActive(user: User) {
  try {
    if (user.isActive) {
      await usersApi.deactivate(user.id);
      toast.success("User disabled.");
    } else {
      await usersApi.reactivate(user.id);
      toast.success("User reactivated.");
    }
    await loadUsers({ filters: {}, page: 1, pageSize: 10, search: "", sorting: [] });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update user status");
  }
}

async function submitCreate(values: unknown) {
  try {
    await usersApi.create(values as Parameters<typeof usersApi.create>[0]);
    toast.success("User created.");
    isDialogOpen.value = false;
    await loadUsers({ filters: {}, page: 1, pageSize: 10, search: "", sorting: [] });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to create user");
  }
}

async function submitUpdate(values: unknown) {
  if (!editingUser.value) {
    return;
  }

  try {
    await usersApi.update(editingUser.value.id, values as Parameters<typeof usersApi.update>[1]);
    toast.success("User updated.");
    isDialogOpen.value = false;
    await loadUsers({ filters: {}, page: 1, pageSize: 10, search: "", sorting: [] });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update user");
  }
}
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle class="flex items-center gap-2">
            <span>Users</span>
            <Badge variant="outline">
              {{ isRealtimeConnected ? `${connectedUsersCount ?? 0} connected now` : "Realtime offline" }}
            </Badge>
          </CardTitle>
          <CardDescription>Manage application users, roles, and activation state.</CardDescription>
        </div>
        <Button @click="openCreateDialog">Create user</Button>
      </CardHeader>
      <CardContent>
        <DataTable
          :columns="columns"
          :load-data="loadUsers"
          :data="users"
          storage-key="users-management"
          search-placeholder="Search users..."
        />
      </CardContent>
    </Card>

    <Dialog :open="isDialogOpen" @update:open="(value) => (isDialogOpen = value)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingUser ? "Edit user" : "Create user" }}</DialogTitle>
          <DialogDescription>
            {{ editingUser ? "Update the user profile and role." : "Create a new user account." }}
          </DialogDescription>
        </DialogHeader>

        <AppForm
          :initial-values="
            editingUser
              ? {
                  email: editingUser.email,
                  name: editingUser.name,
                  preferredLocale: editingUser.preferredLocale,
                  role: editingUser.role,
                }
              : {
                  email: '',
                  mustChangePassword: true,
                  name: '',
                  password: '',
                  preferredLocale: 'fr',
                  role: 'user',
                }
          "
          :validation-schema="editingUser ? updateSchema : createSchema"
          @invalid-submit="handleInvalidSubmit"
          @submit="handleUserSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput name="name" label="Name" placeholder="Jane Doe" />
              <FormInput name="email" label="Email" placeholder="jane@example.com" />
              <FormPassword
                v-if="!editingUser"
                name="password"
                label="Password"
                placeholder="At least 8 characters"
              />
              <FormCheckbox
                v-if="!editingUser"
                name="mustChangePassword"
                label="Require password change on first login"
                description="The user will be redirected to update their password after signing in."
              />
              <FormSelect
                name="preferredLocale"
                label="Preferred locale"
                :options="localeOptions"
                placeholder="Select a locale"
              />
              <FormSelect
                name="role"
                label="Role"
                :options="roleOptions"
                placeholder="Select a role"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? "Saving…" : editingUser ? "Save changes" : "Create user" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </DialogContent>
    </Dialog>
  </section>
</template>
