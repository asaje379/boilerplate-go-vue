<script setup lang="ts">
import type { DateRange } from 'reka-ui'
import type { DateValue } from 'reka-ui'
import { toTypedSchema } from '@vee-validate/zod'
import { CheckCircle2, Layers3, Search } from 'lucide-vue-next'
import { h, ref } from 'vue'
import { z } from 'zod'
import { useAlert, useConfirm, useModal } from '@/composables'
import {
  AppForm,
  FileUpload,
  FormCheckbox,
  FormDatePicker,
  FormInput,
  FormMultiSelect,
  FormPassword,
  FormSelect,
  FormSwitch,
  RichTextEditor,
  SearchInput,
  type FormMultiSelectOption,
  type FormSelectOption,
} from '@/components/system'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const roleOptions: FormSelectOption[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
]

const stackOptions: FormMultiSelectOption[] = [
  { label: 'Vue', value: 'vue' },
  { label: 'Tailwind', value: 'tailwind' },
  { label: 'shadcn-vue', value: 'shadcn-vue' },
  { label: 'VeeValidate', value: 'vee-validate' },
  { label: 'Pinia', value: 'pinia' },
]

const standaloneSearch = ref('')
const standaloneInput = ref('')
const standaloneArea = ref('')
const standaloneRole = ref<string | null>('editor')
const standaloneTags = ref<string[]>(['vue', 'tailwind'])
const standalonePassword = ref('')
const standaloneCheckbox = ref<boolean | null>(true)
const standaloneSwitch = ref<boolean | null>(false)
const standaloneDate = ref<DateValue | null>(null)
const standaloneRange = ref<DateRange | null>(null)
const standaloneCover = ref<File | string | null>(null)
const standaloneGallery = ref<Array<File | string>>([])
const standaloneContent = ref('<p>Compose a richer admin experience here.</p>')
const searchValue = ref('')
const submittedValues = ref<Record<string, unknown> | null>(null)
const confirmResult = ref('No confirmation yet')
const alertResult = ref('No alert opened yet')
const { closeModal, openModal } = useModal()
const { confirm } = useConfirm()
const { alert } = useAlert()

const validationSchema = toTypedSchema(
  z.object({
    company: z.string().min(2, 'Company is required'),
    description: z.string().min(10, 'Add a longer description'),
    email: z.string().email('Email is invalid'),
    password: z.string().min(8, 'Minimum 8 characters'),
    period: z.object({
      start: z.any(),
      end: z.any(),
    }),
    publishAt: z.any(),
    heroImage: z.any().nullable(),
    role: z.string().min(1, 'Role is required'),
    stack: z.array(z.string()).min(2, 'Pick at least two technologies'),
    gallery: z.array(z.any()).optional(),
    terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) }),
    updates: z.boolean(),
    content: z.string().min(20, 'Write a longer content block'),
  }),
)

const initialValues: Record<string, unknown> = {
  company: 'Blueprint Studio',
  description: 'Admin starter focused on reusable system components.',
  email: 'team@blueprint.app',
  gallery: [],
  heroImage: null,
  password: '',
  period: null,
  publishAt: null,
  role: 'editor',
  stack: ['vue', 'shadcn-vue'],
  terms: false,
  updates: true,
  content:
    '<p>This validated editor is ready for article bodies, email templates, or CMS pages.</p>',
}

async function handleSubmit(values: unknown) {
  await new Promise((resolve) => setTimeout(resolve, 900))
  submittedValues.value = values as Record<string, unknown>
}

async function mockUpload(file: File) {
  await new Promise((resolve) => setTimeout(resolve, 1200))
  return file
}

function openPlaygroundModal() {
  openModal({
    actions: [
      {
        label: 'Close',
        onClick: () => closeModal(),
        variant: 'outline',
      },
    ],
    render: () =>
      h('div', { class: 'space-y-2 text-sm text-muted-foreground' }, [
        h('p', 'This modal is controlled globally through useModal.'),
        h('p', 'You can update its title, content, and actions from anywhere in the app.'),
      ]),
    description: 'Global dialog driven by provide/inject and rendered through the shared host.',
    title: 'System modal demo',
  })
}

async function openConfirmDemo() {
  const confirmed = await confirm({
    confirmLabel: 'Delete project',
    description: 'This example requires typing the confirmation string before continuing.',
    textToConfirm: 'DELETE',
    title: 'Confirm destructive action',
    variant: 'destructive',
  })

  confirmResult.value = confirmed ? 'Action confirmed' : 'Action cancelled'
}

async function openSimpleConfirmDemo() {
  const confirmed = await confirm({
    confirmLabel: 'Publish',
    description: 'This is a regular confirmation flow without typed text.',
    title: 'Publish changes',
  })

  confirmResult.value = confirmed ? 'Publish confirmed' : 'Publish cancelled'
}

async function openAlertDemo() {
  await alert({
    acknowledgeLabel: 'Got it',
    description:
      'This is a lightweight informational modal built on top of the same global dialog.',
    title: 'Alert demo',
  })

  alertResult.value = 'Alert acknowledged'
}
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader class="space-y-3">
        <div class="flex items-center gap-3">
          <div
            class="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground"
          >
            <Layers3 class="size-5" />
          </div>
          <div>
            <CardTitle class="text-3xl sm:text-4xl">SystemFormPlayground</CardTitle>
            <CardDescription class="text-base leading-7">
              Une page de reference pour visualiser tous les composants systeme et tester leur usage
              en mode standalone ou avec vee-validate.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
    </Card>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(340px,0.9fr)]">
      <div class="space-y-6">
        <Card class="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle>Standalone components</CardTitle>
            <CardDescription>
              Utilisation directe avec `v-model`, sans couche de validation externe.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid gap-5 md:grid-cols-2">
            <SearchInput
              v-model="standaloneSearch"
              placeholder="Search users..."
              @search="(value) => (searchValue = value)"
            />

            <FormInput v-model="standaloneInput" label="Project name" placeholder="Admin Console" />

            <FormInput
              v-model="standaloneArea"
              label="Summary"
              textarea
              placeholder="Describe your admin module..."
              class="md:col-span-2"
            />

            <FormPassword
              v-model="standalonePassword"
              label="Master password"
              placeholder="Enter a strong password"
            />

            <FormSelect
              v-model="standaloneRole"
              label="Role"
              placeholder="Select a role"
              :options="roleOptions"
            />

            <FormMultiSelect
              v-model="standaloneTags"
              label="Stack"
              placeholder="Pick technologies"
              :options="stackOptions"
              class="md:col-span-2"
            />

            <FormDatePicker v-model="standaloneDate" label="Publish at" />

            <FormDatePicker
              v-model="standaloneRange"
              label="Campaign period"
              range
              :number-of-months="2"
            />

            <FileUpload
              v-model="standaloneCover"
              label="Cover image"
              description="Single-file upload with preview and async loading state."
              accept="image/*"
              :upload="mockUpload"
              class="md:col-span-2"
            />

            <FileUpload
              v-model="standaloneGallery"
              label="Gallery"
              description="Multiple upload mode with removable items."
              accept="image/*"
              multiple
              :upload="mockUpload"
              class="md:col-span-2"
            />

            <RichTextEditor
              v-model="standaloneContent"
              label="Article body"
              placeholder="Write content, then insert an image by URL..."
              class="md:col-span-2"
            />

            <FormCheckbox
              v-model="standaloneCheckbox"
              label="Enable beta access"
              description="Gives access to in-progress admin modules."
              class="md:col-span-2"
            />

            <FormSwitch
              v-model="standaloneSwitch"
              label="Realtime notifications"
              description="Streams live dashboard activity to operators."
              class="md:col-span-2"
            />
          </CardContent>
        </Card>

        <Card class="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle>Validated form</CardTitle>
            <CardDescription>
              Demonstration d'un formulaire complet base sur `AppForm` et les wrappers vee-validate.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppForm
              :initial-values="initialValues"
              :validation-schema="validationSchema"
              @submit="handleSubmit"
            >
              <div class="grid gap-5 md:grid-cols-2">
                <FormInput name="company" label="Company" placeholder="Blueprint Studio" />
                <FormInput name="email" label="Email" placeholder="team@blueprint.app" />

                <FormPassword
                  name="password"
                  label="Password"
                  placeholder="Create a strong password"
                />
                <FormSelect
                  name="role"
                  label="Role"
                  placeholder="Select a role"
                  :options="roleOptions"
                />

                <FormInput name="description" label="Description" textarea class="md:col-span-2" />

                <FormMultiSelect
                  name="stack"
                  label="Stack"
                  placeholder="Choose at least two"
                  :options="stackOptions"
                  class="md:col-span-2"
                />

                <FileUpload
                  name="heroImage"
                  label="Hero image"
                  description="Validated file input ready for media upload flows."
                  accept="image/*"
                  :upload="mockUpload"
                  class="md:col-span-2"
                />

                <FileUpload
                  name="gallery"
                  label="Gallery"
                  description="Multiple validated upload example."
                  accept="image/*"
                  multiple
                  :upload="mockUpload"
                  class="md:col-span-2"
                />

                <RichTextEditor
                  name="content"
                  label="Content"
                  placeholder="Write the long-form content here..."
                  class="md:col-span-2"
                />

                <FormDatePicker name="publishAt" label="Publish date" />
                <FormDatePicker name="period" label="Period" range :number-of-months="2" />

                <FormCheckbox
                  name="terms"
                  label="Accept terms"
                  description="Required before saving this playground example."
                  class="md:col-span-2"
                />

                <FormSwitch
                  name="updates"
                  label="Receive product updates"
                  description="Sends release notes and system alerts."
                  class="md:col-span-2"
                />

                <div class="md:col-span-2 flex justify-end">
                  <Button type="submit">Submit example</Button>
                </div>
              </div>
            </AppForm>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-6">
        <Card class="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle>Live state</CardTitle>
            <CardDescription
              >Les composants standalone mettent a jour cet apercu en direct.</CardDescription
            >
          </CardHeader>
          <CardContent class="space-y-4 text-sm">
            <div class="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p class="mb-2 flex items-center gap-2 font-medium">
                <Search class="size-4" /> Debounced search
              </p>
              <p class="text-muted-foreground">{{ searchValue || 'No search emitted yet' }}</p>
            </div>

            <Button type="button" variant="outline" class="w-full" @click="openPlaygroundModal">
              Open global modal
            </Button>

            <Button type="button" variant="outline" class="w-full" @click="openConfirmDemo">
              Open confirm modal
            </Button>

            <Button type="button" variant="outline" class="w-full" @click="openSimpleConfirmDemo">
              Open simple confirm
            </Button>

            <Button type="button" variant="outline" class="w-full" @click="openAlertDemo">
              Open alert modal
            </Button>

            <div
              class="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground"
            >
              {{ confirmResult }}
            </div>

            <div
              class="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground"
            >
              {{ alertResult }}
            </div>

            <pre
              class="bg-background text-foreground overflow-auto rounded-2xl border border-border/60 p-4 text-xs leading-6"
              >{{
                JSON.stringify(
                  {
                    standaloneInput,
                    standaloneArea,
                    standaloneRole,
                    standaloneTags,
                    standaloneCover,
                    standaloneGallery,
                    standaloneContent,
                    standaloneCheckbox,
                    standaloneSwitch,
                  },
                  null,
                  2,
                )
              }}</pre
            >
          </CardContent>
        </Card>

        <Card class="border-border/60 bg-card/85">
          <CardHeader>
            <CardTitle>Last submit</CardTitle>
            <CardDescription
              >Le bouton de submit utilise aussi ton bouton avec loading async.</CardDescription
            >
          </CardHeader>
          <CardContent>
            <div v-if="submittedValues" class="space-y-3">
              <p class="flex items-center gap-2 text-sm font-medium text-primary">
                <CheckCircle2 class="size-4" /> Form submitted successfully
              </p>
              <pre
                class="bg-background text-foreground overflow-auto rounded-2xl border border-border/60 p-4 text-xs leading-6"
                >{{ JSON.stringify(submittedValues, null, 2) }}</pre
              >
            </div>
            <p v-else class="text-muted-foreground text-sm">
              Submit the validated form to inspect the payload here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
