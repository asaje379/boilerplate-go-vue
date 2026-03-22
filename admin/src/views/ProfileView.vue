<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { getApiErrorMessage } from "@/services/http/error-messages";
import { AppForm, FormInput, FormPassword, FormSelect, FormSwitch } from "@/components/system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedLocales } from "@/lib/i18n";
import { filesApi } from "@/services/api/files.api";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const session = useSessionStore();
const { currentUser } = storeToRefs(session);
const avatarInputRef = ref<HTMLInputElement | null>(null);
const isUploadingAvatar = ref(false);
const isRemovingAvatar = ref(false);
const isUpdatingSecurity = ref(false);

const localeOptions = supportedLocales.map((locale) => ({
  label: locale.toUpperCase(),
  value: locale,
}));

const initials = computed(() => {
  const name = currentUser.value?.name?.trim() || "User";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
});

const profileInitialValues = computed(() => ({
  email: currentUser.value?.email || "",
  name: currentUser.value?.name || "",
  preferredLocale: currentUser.value?.preferredLocale || "fr",
}));

const passwordInitialValues = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

const validationSchema = toTypedSchema(
  z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    name: z.string().min(2, t("auth.validation.nameRequired")),
    preferredLocale: z.enum(["fr", "en"]),
  }),
);

const passwordValidationSchema = toTypedSchema(
  z
    .object({
      confirmPassword: z.string().min(8, t("auth.validation.min8")),
      currentPassword: z.string().min(1, t("auth.validation.currentPasswordRequired")),
      newPassword: z.string().min(8, t("auth.validation.min8")),
    })
    .refine((values) => values.currentPassword !== values.newPassword, {
      message: t("auth.validation.passwordsMustDiffer"),
      path: ["newPassword"],
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: t("auth.validation.passwordsMustMatch"),
      path: ["confirmPassword"],
    }),
);

async function handleSubmit(values: unknown) {
  try {
    await session.updateCurrentProfile(
      values as { email: string; name: string; preferredLocale: "fr" | "en" },
    );
    toast.success(t("profile.info.success"));
  } catch (error) {
    toast.error(getApiErrorMessage(error, "profile.info.errorDefault"));
  }
}

async function handlePasswordSubmit(values: unknown) {
  try {
    await session.changePassword(values as { currentPassword: string; newPassword: string });
    toast.success(t("profile.security.success"));
  } catch (error) {
    toast.error(getApiErrorMessage(error, "profile.security.errorDefault"));
  }
}

function openAvatarPicker() {
  avatarInputRef.value?.click();
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement | null;
  const file = input?.files?.[0];
  if (!file) {
    return;
  }

  isUploadingAvatar.value = true;

  try {
    const uploaded = await filesApi.upload(file, "private", "avatars");
    await session.updateCurrentProfilePhoto(uploaded.file.id);
    toast.success(t("profile.avatar.updated"));
  } catch (error) {
    toast.error(getApiErrorMessage(error, "profile.avatar.errorUpload"));
  } finally {
    isUploadingAvatar.value = false;
    if (input) {
      input.value = "";
    }
  }
}

async function removeAvatar() {
  isRemovingAvatar.value = true;

  try {
    await session.updateCurrentProfilePhoto(null);
    toast.success(t("profile.avatar.removed"));
  } catch (error) {
    toast.error(getApiErrorMessage(error, "profile.avatar.errorRemove"));
  } finally {
    isRemovingAvatar.value = false;
  }
}

async function updateTwoFactor(value: boolean | null) {
  isUpdatingSecurity.value = true;

  try {
    const enabled = value === true;
    await session.updateSecurity({ twoFactorEnabled: enabled });
    toast.success(
      enabled ? t("profile.security.twoFactorEnabled") : t("profile.security.twoFactorDisabled"),
    );
  } catch (error) {
    toast.error(getApiErrorMessage(error, "profile.security.twoFactorError"));
  } finally {
    isUpdatingSecurity.value = false;
  }
}
</script>

<template>
  <section class="space-y-6">
    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>{{ $t("profile.avatar.title") }}</CardTitle>
        <CardDescription>{{ $t("profile.avatar.description") }}</CardDescription>
      </CardHeader>
      <CardContent class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex items-center gap-4">
          <Avatar class="size-20">
            <AvatarImage
              v-if="currentUser?.profilePhotoUrl"
              :src="currentUser.profilePhotoUrl"
              :alt="currentUser?.name || 'Profile avatar'"
            />
            <AvatarFallback class="text-lg font-semibold">{{ initials }}</AvatarFallback>
          </Avatar>
          <div class="space-y-1">
            <p class="font-medium">{{ currentUser?.name || "User" }}</p>
            <p class="text-muted-foreground text-sm">{{ currentUser?.email }}</p>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <input
            ref="avatarInputRef"
            accept="image/*"
            class="hidden"
            type="file"
            @change="handleAvatarChange"
          />
          <Button
            type="button"
            variant="outline"
            :disabled="isUploadingAvatar"
            @click="openAvatarPicker"
          >
            {{ isUploadingAvatar ? $t("profile.avatar.changing") : $t("profile.avatar.change") }}
          </Button>
          <Button
            v-if="currentUser?.profilePhotoFileId"
            type="button"
            variant="ghost"
            :disabled="isRemovingAvatar"
            @click="removeAvatar"
          >
            {{ isRemovingAvatar ? $t("profile.avatar.removing") : $t("profile.avatar.remove") }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>{{ $t("profile.info.title") }}</CardTitle>
        <CardDescription>{{ $t("profile.info.description") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="profileInitialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput
                name="name"
                :label="$t('profile.info.nameLabel')"
                :placeholder="$t('profile.info.namePlaceholder')"
              />
              <FormInput
                name="email"
                :label="$t('profile.info.emailLabel')"
                :placeholder="$t('profile.info.emailPlaceholder')"
              />
              <FormSelect
                name="preferredLocale"
                :label="$t('profile.info.localeLabel')"
                :options="localeOptions"
                :placeholder="$t('profile.info.localePlaceholder')"
              />
              <Button type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? $t("profile.info.submitting") : $t("profile.info.submit") }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>

    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>{{ $t("profile.security.title") }}</CardTitle>
        <CardDescription>{{ $t("profile.security.description") }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <FormSwitch
          :label="$t('profile.security.twoFactorLabel')"
          :description="$t('profile.security.twoFactorDescription')"
          :disabled="isUpdatingSecurity"
          :model-value="currentUser?.twoFactorEnabled ?? false"
          @update:model-value="updateTwoFactor"
        />

        <AppForm
          :initial-values="passwordInitialValues"
          :validation-schema="passwordValidationSchema"
          @submit="handlePasswordSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormPassword
                name="currentPassword"
                :label="$t('profile.security.currentPasswordLabel')"
                :placeholder="$t('profile.security.currentPasswordPlaceholder')"
                autocomplete="current-password"
              />
              <FormPassword
                name="newPassword"
                :label="$t('profile.security.newPasswordLabel')"
                :placeholder="$t('profile.security.newPasswordPlaceholder')"
                autocomplete="new-password"
              />
              <FormPassword
                name="confirmPassword"
                :label="$t('profile.security.confirmPasswordLabel')"
                :placeholder="$t('profile.security.confirmPasswordPlaceholder')"
                autocomplete="new-password"
              />
              <Button type="submit" :disabled="isSubmitting">
                {{
                  isSubmitting ? $t("profile.security.submitting") : $t("profile.security.submit")
                }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </section>
</template>
