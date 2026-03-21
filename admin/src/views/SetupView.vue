<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useRouter } from 'vue-router'
import { AppForm, FormInput, FormPassword, FormSelect } from '@/components/system'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { supportedLocales } from '@/lib/i18n'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()

const localeOptions = supportedLocales.map((locale) => ({
  label: locale.toUpperCase(),
  value: locale,
}))

const validationSchema = toTypedSchema(
  z
    .object({
      email: z.string().email('Email is invalid'),
      name: z.string().min(2, 'Name is required'),
      password: z.string().min(8, 'Minimum 8 characters'),
      confirmPassword: z.string().min(8, 'Minimum 8 characters'),
      preferredLocale: z.enum(['fr', 'en']),
    })
    .refine((values) => values.password === values.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    }),
)

const initialValues = {
  email: '',
  name: '',
  password: '',
  confirmPassword: '',
  preferredLocale: 'fr',
}

async function handleSubmit(values: unknown) {
  const payload = values as {
    email: string
    name: string
    password: string
    preferredLocale: 'fr' | 'en'
  }

  try {
    await session.bootstrapFirstAdmin(payload)
    toast.success('First administrator created successfully.')
    await router.replace({ name: 'home' })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Unable to initialize application')
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card class="w-full max-w-xl border-border/60 bg-card/95">
      <CardHeader class="space-y-2">
        <CardTitle class="text-2xl">Initialize application</CardTitle>
        <CardDescription>
          Create the first administrator account to finish the initial setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AppForm :initial-values="initialValues" :validation-schema="validationSchema" @submit="handleSubmit">
          <template #default="{ isSubmitting }">
            <div class="space-y-4">
              <FormInput name="name" label="Full name" placeholder="Jane Doe" />
              <FormInput name="email" label="Email" placeholder="admin@example.com" />
              <FormPassword name="password" label="Password" placeholder="Choose a strong password" />
              <FormPassword name="confirmPassword" label="Confirm password" placeholder="Repeat your password" />
              <FormSelect
                name="preferredLocale"
                label="Preferred locale"
                :options="localeOptions"
                placeholder="Select a locale"
              />
              <Button type="submit" class="w-full" :disabled="isSubmitting">
                {{ isSubmitting ? 'Creating administrator…' : 'Create first administrator' }}
              </Button>
            </div>
          </template>
        </AppForm>
      </CardContent>
    </Card>
  </div>
</template>
