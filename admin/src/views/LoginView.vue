<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useRouter } from "vue-router";
import { AppForm, FormInput, FormPassword } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

const router = useRouter();
const session = useSessionStore();

const validationSchema = toTypedSchema(
  z.object({
    email: z.string().email("Email is invalid"),
    password: z.string().min(1, "Password is required"),
  }),
);

const initialValues = {
  email: "",
  password: "",
};

async function handleSubmit(values: unknown) {
  const payload = values as { email: string; password: string };

  const wait = () => new Promise((resolve) => setTimeout(resolve, 2000));

  await wait();

  try {
    const result = await session.login(payload);

    if (result.requiresOtp) {
      toast.success("OTP sent to your email address.");
      await router.push({ name: "verify-otp" });
      return;
    }

    if (session.requiresPasswordChange) {
      toast.success("Signed in. Please change your password to continue.");
      await router.push({ name: "force-password-change" });
      return;
    }

    toast.success("Welcome back.");
    await router.push({ name: "home" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to login");
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-md border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">Sign in</CardTitle>
        <CardDescription>Use your email and password to sign in to your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm
          :initial-values="initialValues"
          :validation-schema="validationSchema"
          @submit="handleSubmit"
        >
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput name="email" label="Email" placeholder="you@example.com" />
              <FormPassword name="password" label="Password" placeholder="Enter your password" />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? "Signing in…" : "Continue" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
