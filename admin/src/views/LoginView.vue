<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { AppForm, FormInput, FormPassword } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const validationSchema = toTypedSchema(
  z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    password: z.string().min(1, t("auth.validation.passwordRequired")),
  }),
);

const initialValues = {
  email: "",
  password: "",
};

async function handleSubmit(values: unknown) {
  const payload = values as { email: string; password: string };

  try {
    const result = await session.login(payload);

    if (result.requiresOtp) {
      toast.success(t("auth.login.successOtp"));
      await router.push({ name: "verify-otp" });
      return;
    }

    if (session.requiresPasswordChange) {
      toast.success(t("auth.login.successPasswordChange"));
      await router.push({ name: "force-password-change" });
      return;
    }

    toast.success(t("auth.login.successWelcome"));
    await router.push({ name: "home" });
  } catch {
    return;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-md border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">{{ $t("auth.login.title") }}</CardTitle>
        <CardDescription>{{ $t("auth.login.description") }}</CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput
                name="email"
                :label="$t('auth.login.emailLabel')"
                :placeholder="$t('auth.login.emailPlaceholder')"
                autocomplete="email"
              />
              <FormPassword
                name="password"
                :label="$t('auth.login.passwordLabel')"
                :placeholder="$t('auth.login.passwordPlaceholder')"
                autocomplete="current-password"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? $t("auth.login.submitting") : $t("auth.login.submit") }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
