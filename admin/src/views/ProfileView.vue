<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { AppForm, FormInput, FormPassword, FormSelect, FormSwitch } from "@/components/system";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedLocales } from "@/lib/i18n";
import { filesApi } from "@/services/api/files.api";
import { useSessionStore } from "@/stores/session";

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
    email: z.string().email("Email is invalid"),
    name: z.string().min(2, "Name is required"),
    preferredLocale: z.enum(["fr", "en"]),
  }),
);

const passwordValidationSchema = toTypedSchema(
  z
    .object({
      confirmPassword: z.string().min(8, "Minimum 8 characters"),
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z.string().min(8, "Minimum 8 characters"),
    })
    .refine((values) => values.currentPassword !== values.newPassword, {
      message: "New password must be different from current password",
      path: ["newPassword"],
    })
    .refine((values) => values.newPassword === values.confirmPassword, {
      message: "Passwords do not match",
      path: ["confirmPassword"],
    }),
);

async function handleSubmit(values: unknown) {
  try {
    await session.updateCurrentProfile(
      values as { email: string; name: string; preferredLocale: "fr" | "en" },
    );
    toast.success("Profile updated.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update profile");
  }
}

async function handlePasswordSubmit(values: unknown) {
  try {
    await session.changePassword(values as { currentPassword: string; newPassword: string });
    toast.success("Password updated.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update password");
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
    toast.success("Avatar updated.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update avatar");
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
    toast.success("Avatar removed.");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to remove avatar");
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
      enabled ? "Two-factor authentication enabled." : "Two-factor authentication disabled.",
    );
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update security settings");
  } finally {
    isUpdatingSecurity.value = false;
  }
}
</script>

<template>
  <section class="space-y-6">
    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Avatar</CardTitle>
        <CardDescription>Upload a profile picture or remove the current one.</CardDescription>
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
            {{ isUploadingAvatar ? "Uploading…" : "Change avatar" }}
          </Button>
          <Button
            v-if="currentUser?.profilePhotoFileId"
            type="button"
            variant="ghost"
            :disabled="isRemovingAvatar"
            @click="removeAvatar"
          >
            {{ isRemovingAvatar ? "Removing…" : "Remove avatar" }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Update your personal information and preferred locale.</CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="profileInitialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput name="name" label="Name" placeholder="Your full name" />
              <FormInput name="email" label="Email" placeholder="you@example.com" />
              <FormSelect
                name="preferredLocale"
                label="Preferred locale"
                :options="localeOptions"
                placeholder="Select a locale"
              />
              <Button type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? "Saving…" : "Save profile" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>

    <Card class="max-w-3xl border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription
          >Manage your password and two-factor authentication preference.</CardDescription
        >
      </CardHeader>
      <CardContent class="space-y-6">
        <FormSwitch
          label="Two-factor authentication"
          description="Require an email OTP during sign in for extra security."
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
                label="Current password"
                placeholder="Enter your current password"
              />
              <FormPassword
                name="newPassword"
                label="New password"
                placeholder="Enter your new password"
              />
              <FormPassword
                name="confirmPassword"
                label="Confirm new password"
                placeholder="Repeat your new password"
              />
              <Button type="submit" :disabled="isSubmitting">
                {{ isSubmitting ? "Updating…" : "Change password" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </section>
</template>
