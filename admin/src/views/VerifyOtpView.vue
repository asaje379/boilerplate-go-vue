<script setup lang="ts">
import { computed } from "vue";
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useRouter } from "vue-router";
import { AppForm, FormInput } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

const router = useRouter();
const session = useSessionStore();

const challenge = computed(() => session.otpChallenge);

const validationSchema = toTypedSchema(
  z.object({
    otp: z.string().length(6, "OTP must contain 6 digits"),
  }),
);

const initialValues = {
  otp: "",
};

async function handleSubmit(values: unknown) {
  if (!challenge.value) {
    toast.error("No active OTP challenge.");
    await router.replace({ name: "login" });
    return;
  }

  try {
    await session.verifyOtp({ email: challenge.value.email, otp: (values as { otp: string }).otp });
    if (session.requiresPasswordChange) {
      toast.success("Signed in. Please change your password to continue.");
      await router.replace({ name: "force-password-change" });
      return;
    }

    toast.success("Welcome back.");
    await router.replace({ name: "home" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to verify OTP");
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-md border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">Verify OTP</CardTitle>
        <CardDescription>
          Enter the 6-digit code sent to
          <span class="font-medium">{{ challenge?.email || "your email" }}</span
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
              <FormInput name="otp" label="OTP code" placeholder="123456" />
              <Button type="submit" class="w-full" :disabled="isSubmitting || !challenge">
                {{ isSubmitting ? "Verifying…" : "Verify and sign in" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
