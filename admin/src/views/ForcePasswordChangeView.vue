<script setup lang="ts">
import { toTypedSchema } from "@vee-validate/zod";
import { toast } from "vue-sonner";
import { z } from "zod";
import { useRouter } from "vue-router";
import { AppForm, FormPassword } from "@/components/system";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionStore } from "@/stores/session";

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
    await session.changePassword(values as { currentPassword: string; newPassword: string });
    toast.success("Password updated.");
    await router.replace({ name: "home" });
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Unable to update password");
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-lg border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">Change your password</CardTitle>
        <CardDescription>
          For security reasons, you must update your password before accessing the application.
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
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? "Updating…" : "Change password and continue" }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
