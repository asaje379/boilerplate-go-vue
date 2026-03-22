<script setup lang="ts">
import type { ColumnDef } from "@tanstack/vue-table";
import type { FormSelectOption } from "@/types";
import type { User } from "@/types/user";
import { h, ref } from "vue";
import { useI18n } from "vue-i18n";
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

type UsersTableInstance = {
  reload: () => Promise<void>;
};

const { t } = useI18n();

const roleOptions: FormSelectOption[] = [
  { label: t("users.roles.admin"), value: "admin" },
  { label: t("users.roles.user"), value: "user" },
];

const localeOptions: FormSelectOption[] = supportedLocales.map((locale) => ({
  label: locale.toUpperCase(),
  value: locale,
}));

const users = ref<User[]>([]);
const total = ref(0);
const isDialogOpen = ref(false);
const editingUser = ref<User | null>(null);
const usersTableRef = ref<UsersTableInstance | null>(null);
const realtime = useRealtimeStore();
const { connectedUsersCount, isConnected: isRealtimeConnected } = storeToRefs(realtime);

const createSchema = toTypedSchema(
  z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    mustChangePassword: z.boolean().optional().default(true),
    name: z.string().min(2, t("auth.validation.nameRequired")),
    password: z.string().min(8, t("auth.validation.min8")),
    preferredLocale: z.enum(["fr", "en"]),
    role: z.enum(["admin", "user"]),
  }),
);

const updateSchema = toTypedSchema(
  z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    name: z.string().min(2, t("auth.validation.nameRequired")),
    preferredLocale: z.enum(["fr", "en"]),
    role: z.enum(["admin", "user"]),
  }),
);

const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: t("users.columns.name"),
  },
  {
    accessorKey: "email",
    header: t("users.columns.email"),
  },
  {
    accessorKey: "role",
    header: t("users.columns.role"),
    cell: ({ row }) => h(Badge, { variant: "secondary" }, () => row.original.role),
  },
  {
    accessorKey: "isActive",
    header: t("users.columns.status"),
    cell: ({ row }) =>
      h(Badge, { variant: row.original.isActive ? "default" : "outline" }, () =>
        row.original.isActive ? t("users.status.active") : t("users.status.inactive"),
      ),
  },
  {
    id: "actions",
    header: t("users.columns.actions"),
    cell: ({ row }) =>
      h("div", { class: "flex items-center gap-2" }, [
        h(
          Button,
          {
            size: "sm",
            variant: "outline",
            onClick: () => openEditDialog(row.original),
          },
          () => t("users.actions.edit"),
        ),
        h(
          Button,
          {
            size: "sm",
            variant: row.original.isActive ? "destructive" : "outline",
            onClick: () => toggleActive(row.original),
          },
          () =>
            row.original.isActive ? t("users.actions.disable") : t("users.actions.reactivate"),
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
  toast.error(t("users.toast.validationError"));
}

async function toggleActive(user: User) {
  try {
    if (user.isActive) {
      await usersApi.deactivate(user.id);
      toast.success(t("users.toast.disabled"));
    } else {
      await usersApi.reactivate(user.id);
      toast.success(t("users.toast.reactivated"));
    }
    await usersTableRef.value?.reload();
  } catch {
    return;
  }
}

async function submitCreate(values: unknown) {
  try {
    await usersApi.create(values as Parameters<typeof usersApi.create>[0]);
    toast.success(t("users.toast.created"));
    isDialogOpen.value = false;
    await usersTableRef.value?.reload();
  } catch {
    return;
  }
}

async function submitUpdate(values: unknown) {
  if (!editingUser.value) {
    return;
  }

  try {
    await usersApi.update(editingUser.value.id, values as Parameters<typeof usersApi.update>[1]);
    toast.success(t("users.toast.updated"));
    isDialogOpen.value = false;
    await usersTableRef.value?.reload();
  } catch {
    return;
  }
}
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle class="flex items-center gap-2">
            <span>{{ $t("users.title") }}</span>
            <Badge variant="outline">
              {{
                isRealtimeConnected
                  ? $t("users.connectedNow", { count: connectedUsersCount ?? 0 })
                  : $t("users.realtimeOffline")
              }}
            </Badge>
          </CardTitle>
          <CardDescription>{{ $t("users.description") }}</CardDescription>
        </div>
        <Button @click="openCreateDialog">{{ $t("users.createUser") }}</Button>
      </CardHeader>
      <CardContent>
        <DataTable
          ref="usersTableRef"
          :columns="columns"
          :load-data="loadUsers"
          :data="users"
          storage-key="users-management"
          :search-placeholder="$t('users.searchPlaceholder')"
        />
      </CardContent>
    </Card>

    <Dialog :open="isDialogOpen" @update:open="(value) => (isDialogOpen = value)">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{
            editingUser ? $t("users.dialog.editTitle") : $t("users.dialog.createTitle")
          }}</DialogTitle>
          <DialogDescription>
            {{
              editingUser
                ? $t("users.dialog.editDescription")
                : $t("users.dialog.createDescription")
            }}
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
              <FormInput
                name="name"
                :label="$t('users.form.nameLabel')"
                :placeholder="$t('users.form.namePlaceholder')"
              />
              <FormInput
                name="email"
                :label="$t('users.form.emailLabel')"
                :placeholder="$t('users.form.emailPlaceholder')"
              />
              <FormPassword
                v-if="!editingUser"
                name="password"
                :label="$t('users.form.passwordLabel')"
                :placeholder="$t('users.form.passwordPlaceholder')"
              />
              <FormCheckbox
                v-if="!editingUser"
                name="mustChangePassword"
                :label="$t('users.form.mustChangePassword')"
                :description="$t('users.form.mustChangePasswordDescription')"
              />
              <FormSelect
                name="preferredLocale"
                :label="$t('users.form.localeLabel')"
                :options="localeOptions"
                :placeholder="$t('users.form.localePlaceholder')"
              />
              <FormSelect
                name="role"
                :label="$t('users.form.roleLabel')"
                :options="roleOptions"
                :placeholder="$t('users.form.rolePlaceholder')"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{
                  isSubmitting
                    ? $t("users.form.submitting")
                    : editingUser
                      ? $t("users.form.submitSave")
                      : $t("users.form.submitCreate")
                }}
              </Button>
            </div>
          </template>
        </AppForm>
      </DialogContent>
    </Dialog>
  </section>
</template>
