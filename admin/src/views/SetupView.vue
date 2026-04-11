<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { AppForm, FormInput, FormPassword, FormSelect, PhoneInput } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supportedLocales } from "@/lib/i18n";
import { isValidWhatsAppPhone } from "@/lib/phone";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const localeOptions = supportedLocales.map((locale) => ({
  label: locale.toUpperCase(),
  value: locale,
}));

const validationSchema = toTypedSchema(
  z
    .object({
      email: z.string().email(t("auth.validation.emailInvalid")),
      name: z.string().min(2, t("auth.validation.nameRequired")),
      password: z.string().min(8, t("auth.validation.min8")),
      confirmPassword: z.string().min(8, t("auth.validation.min8")),
      preferredLocale: z.enum(["fr", "en"]),
      whatsAppPhone: z.string().max(32).optional().refine(isValidWhatsAppPhone, t("auth.validation.whatsAppPhoneInvalid")),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: t("auth.validation.passwordsMustMatch"),
      path: ["confirmPassword"],
    }),
);

const initialValues = {
  email: "",
  name: "",
  password: "",
  confirmPassword: "",
  preferredLocale: "fr",
  whatsAppPhone: "",
};

async function handleSubmit(values: unknown) {
  const payload = values as {
    email: string;
    name: string;
    password: string;
    preferredLocale: "fr" | "en";
    whatsAppPhone?: string;
  };

  try {
    await session.bootstrapFirstAdmin(payload);
    toast.success(t("auth.setup.success"));
    await router.replace({ name: "home" });
  } catch {
    return;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-xl border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">{{ $t("auth.setup.title") }}</CardTitle>
        <CardDescription>
          {{ $t("auth.setup.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting, setFieldValue, values }">
            <div class="space-y-4">
              <FormInput
                name="name"
                :label="$t('auth.setup.nameLabel')"
                :placeholder="$t('auth.setup.namePlaceholder')"
              />
              <FormInput
                name="email"
                :label="$t('auth.setup.emailLabel')"
                :placeholder="$t('auth.setup.emailPlaceholder')"
              />
              <FormPassword
                name="password"
                :label="$t('auth.setup.passwordLabel')"
                :placeholder="$t('auth.setup.passwordPlaceholder')"
              />
              <FormPassword
                name="confirmPassword"
                :label="$t('auth.setup.confirmPasswordLabel')"
                :placeholder="$t('auth.setup.confirmPasswordPlaceholder')"
              />
              <FormSelect
                name="preferredLocale"
                :label="$t('auth.setup.localeLabel')"
                :options="localeOptions"
                :placeholder="$t('auth.setup.localePlaceholder')"
              />
              <PhoneInput
                :label="$t('auth.setup.whatsAppPhoneLabel')"
                :model-value="String(values.whatsAppPhone ?? '')"
                :placeholder="$t('auth.setup.whatsAppPhonePlaceholder')"
                @update:model-value="(value) => setFieldValue('whatsAppPhone', value)"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? $t("auth.setup.submitting") : $t("auth.setup.submit") }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
