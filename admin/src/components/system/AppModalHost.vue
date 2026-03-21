<script setup lang="ts">
import { computed, defineComponent, ref, unref } from 'vue'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useModal } from '@/composables'
import { cn } from '@/lib/utils'

const modal = useModal()
const pendingActionKey = ref<string | null>(null)

const contentComponent = computed(() => modal.state.content.value)

const renderContent = computed(() => {
  if (!modal.state.render.value) {
    return null
  }

  return defineComponent({
    name: 'GlobalModalRenderFunction',
    setup() {
      return () => modal.state.render.value?.()
    },
  })
})

async function handleAction(index: number) {
  const action = modal.state.actions[index]

  if (!action || action.disabled) {
    return
  }

  const actionKey = action.key ?? String(index)
  pendingActionKey.value = actionKey

  try {
    await action.onClick?.()

    if (action.closeOnClick !== false) {
      modal.closeModal()
    }
  } finally {
    pendingActionKey.value = null
  }
}

function isActionDisabled(index: number) {
  const action = modal.state.actions[index]
  return Boolean(action ? unref(action.disabled) : false)
}
</script>

<template>
  <Dialog :open="modal.state.isOpen" @update:open="(open) => !open && modal.closeModal()">
    <DialogContent
      :class="cn('sm:max-w-xl', modal.state.contentClass)"
      :show-close-button="modal.state.showCloseButton"
    >
      <DialogHeader v-if="modal.state.title || modal.state.description">
        <DialogTitle v-if="modal.state.title">{{ modal.state.title }}</DialogTitle>
        <DialogDescription v-if="modal.state.description">{{
          modal.state.description
        }}</DialogDescription>
      </DialogHeader>

      <component :is="contentComponent" v-if="contentComponent" v-bind="modal.state.contentProps" />
      <component :is="renderContent" v-else-if="renderContent" />

      <DialogFooter v-if="modal.state.actions.length">
        <Button
          v-for="(action, index) in modal.state.actions"
          :key="action.key ?? action.label"
          :class="action.class"
          :disabled="isActionDisabled(index)"
          :loading="pendingActionKey === (action.key ?? String(index))"
          :variant="action.variant ?? 'default'"
          @click="handleAction(index)"
        >
          {{ action.label }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
