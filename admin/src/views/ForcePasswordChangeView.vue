<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { getApiErrorMessage } from "@/services/http/error-messages";
import { AppForm, FormPassword } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const initialValues = {
  confirmPassword: "",
  currentPassword: "",
  newPassword: "",
};

const validationSchema = toTypedSchema(
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
    await session.changePassword(values as { currentPassword: string; newPassword: string });
    toast.success(t("auth.forcePasswordChange.success"));
    await router.replace({ name: "home" });
  } catch (error) {
    toast.error(getApiErrorMessage(error, "auth.forcePasswordChange.errorDefault"));
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-lg border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">{{ $t("auth.forcePasswordChange.title") }}</CardTitle>
        <CardDescription>
          {{ $t("auth.forcePasswordChange.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormPassword
                name="currentPassword"
                :label="$t('auth.forcePasswordChange.currentPasswordLabel')"
                :placeholder="$t('auth.forcePasswordChange.currentPasswordPlaceholder')"
                autocomplete="current-password"
              />
              <FormPassword
                name="newPassword"
                :label="$t('auth.forcePasswordChange.newPasswordLabel')"
                :placeholder="$t('auth.forcePasswordChange.newPasswordPlaceholder')"
                autocomplete="new-password"
              />
              <FormPassword
                name="confirmPassword"
                :label="$t('auth.forcePasswordChange.confirmPasswordLabel')"
                :placeholder="$t('auth.forcePasswordChange.confirmPasswordPlaceholder')"
                autocomplete="new-password"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{
                  isSubmitting
                    ? $t("auth.forcePasswordChange.submitting")
                    : $t("auth.forcePasswordChange.submit")
                }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
