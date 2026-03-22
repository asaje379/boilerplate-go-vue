<script setup lang="ts">
import { computed } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { AppForm, FormInput } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const router = useRouter();
const session = useSessionStore();

const challenge = computed(() => session.otpChallenge);

const validationSchema = toTypedSchema(
  z.object({
    otp: z.string().length(6, t("auth.validation.otpLength")),
  }),
);

const initialValues = {
  otp: "",
};

async function handleSubmit(values: unknown) {
  if (!challenge.value) {
    toast.error(t("auth.otp.noChallenge"));
    await router.replace({ name: "login" });
    return;
  }

  try {
    await session.verifyOtp({ email: challenge.value.email, otp: (values as { otp: string }).otp });
    if (session.requiresPasswordChange) {
      toast.success(t("auth.otp.successPasswordChange"));
      await router.replace({ name: "force-password-change" });
      return;
    }

    toast.success(t("auth.otp.successWelcome"));
    await router.replace({ name: "home" });
  } catch {
    return;
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-md border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">{{ $t("auth.otp.title") }}</CardTitle>
        <CardDescription>
          {{ $t("auth.otp.description") }}
          <span class="font-medium">{{ challenge?.email || $t("auth.otp.yourEmail") }}</span
          >.
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
              <FormInput
                name="otp"
                :label="$t('auth.otp.otpLabel')"
                :placeholder="$t('auth.otp.otpPlaceholder')"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting || !challenge">
                {{ isSubmitting ? $t("auth.otp.submitting") : $t("auth.otp.submit") }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
