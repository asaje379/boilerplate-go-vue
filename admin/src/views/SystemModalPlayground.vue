<script setup lang="ts">
import { h, ref } from 'vue'
import { useAlert, useConfirm, useModal } from '@/composables'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const status = ref('No modal interaction yet')

const { alert } = useAlert()
const { confirm, confirmDelete } = useConfirm()
const { closeModal, openModal, updateModal } = useModal()

function openBasicModal() {
  openModal({
    actions: [
      { label: 'Close', onClick: () => closeModal(), variant: 'outline' },
      {
        label: 'Primary action',
        onClick: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500))
          status.value = 'Primary modal action completed'
        },
      },
    ],
    description: 'A shared application modal opened through useModal.',
    render: () =>
      h('p', { class: 'text-sm text-muted-foreground' }, 'This content is rendered dynamically.'),
    title: 'Global modal',
  })
}

function openUpdatableModal() {
  const step = ref(1)
  const note = ref('')

  const renderStep = () =>
    h('div', { class: 'space-y-4' }, [
      h('p', { class: 'text-sm text-muted-foreground' }, `Current step: ${step.value}`),
      h(Input, {
        modelValue: note.value,
        'onUpdate:modelValue': (value: string | number) => {
          note.value = String(value)
        },
        placeholder: 'Type a note to keep while modal updates',
      }),
    ])

  openModal({
    actions: [
      { label: 'Close', onClick: () => closeModal(), variant: 'outline' },
      {
        closeOnClick: false,
        label: 'Next step',
        onClick: () => {
          step.value += 1
          updateModal({
            description: `You are now on step ${step.value}. The current note is preserved.`,
            render: renderStep,
            title: `Update modal - step ${step.value}`,
          })
          status.value = `Modal updated to step ${step.value}`
        },
      },
    ],
    description: 'You can update this modal in place without reopening it.',
    render: renderStep,
    title: 'Update modal - step 1',
  })
}

async function openAlertDemo() {
  await alert({
    acknowledgeLabel: 'Understood',
    description: 'Alerts are lightweight informational dialogs built on the same host.',
    title: 'Alert example',
  })

  status.value = 'Alert acknowledged'
}

async function openConfirmDemo() {
  const confirmed = await confirm({
    description: 'Do you want to publish this version now?',
    title: 'Publish version',
  })

  status.value = confirmed ? 'Simple confirm accepted' : 'Simple confirm cancelled'
}

async function openCriticalConfirmDemo() {
  const confirmed = await confirm({
    confirmLabel: 'Delete workspace',
    description: 'This requires typing the exact confirmation string.',
    textToConfirm: 'DELETE',
    title: 'Critical confirmation',
    variant: 'destructive',
  })

  status.value = confirmed ? 'Critical confirm accepted' : 'Critical confirm cancelled'
}

async function openDeleteHelperDemo() {
  const confirmed = await confirmDelete('workspace', {
    textToConfirm: 'DELETE',
  })

  status.value = confirmed ? 'confirmDelete accepted' : 'confirmDelete cancelled'
}
</script>

<template>
  <section class="space-y-6">
    <Card class="border-border/60 bg-card/90">
      <CardHeader>
        <CardTitle>SystemModalPlayground</CardTitle>
        <CardDescription>
          Playground for the global modal host, updateModal, useConfirm, and useAlert.
        </CardDescription>
      </CardHeader>
    </Card>

    <Card class="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle>Modal flows</CardTitle>
        <CardDescription
          >Each button opens the same shared modal instance teleported to body.</CardDescription
        >
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <Button type="button" variant="outline" @click="openBasicModal">Open basic modal</Button>
        <Button type="button" variant="outline" @click="openUpdatableModal"
          >Open update modal</Button
        >
        <Button type="button" variant="outline" @click="openAlertDemo">Open alert</Button>
        <Button type="button" variant="outline" @click="openConfirmDemo">Open confirm</Button>
        <Button type="button" variant="outline" @click="openCriticalConfirmDemo"
          >Open critical confirm</Button
        >
        <Button type="button" variant="outline" @click="openDeleteHelperDemo"
          >Open confirmDelete</Button
        >
      </CardContent>
    </Card>

    <Card class="border-border/60 bg-card/85">
      <CardHeader>
        <CardTitle>Last result</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          class="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground"
        >
          {{ status }}
        </div>
      </CardContent>
    </Card>
  </section>
</template>
