import type { InjectionKey, ShallowRef } from 'vue'
import type { ModalAction, ModalOptions, ModalRenderContent } from '@/types'
import { computed, inject, provide, shallowReactive, shallowRef } from 'vue'

interface ModalState {
  actions: ModalAction[]
  content: ShallowRef<ModalOptions['content'] | null>
  contentClass: string | undefined
  contentProps: Record<string, unknown>
  description: string | undefined
  isOpen: boolean
  onClose: (() => void) | undefined
  render: ShallowRef<ModalRenderContent | null>
  showCloseButton: boolean
  title: string | undefined
}

export interface ModalController {
  closeModal: () => void
  openModal: (options: ModalOptions) => void
  updateModal: (options: Partial<ModalOptions>) => void
  state: ModalState
}

const modalKey: InjectionKey<ModalController> = Symbol('modal')

function createModalState(): ModalState {
  return shallowReactive({
    actions: [],
    content: shallowRef<ModalOptions['content'] | null>(null),
    contentClass: undefined,
    contentProps: {},
    description: undefined,
    isOpen: false,
    onClose: undefined,
    render: shallowRef<ModalRenderContent | null>(null),
    showCloseButton: true,
    title: undefined,
  }) as ModalState
}

export function provideModal() {
  const state = createModalState()

  function openModal(options: ModalOptions) {
    state.actions = options.actions ?? []
    state.content.value = options.content ?? null
    state.contentClass = options.contentClass
    state.contentProps = options.contentProps ?? {}
    state.description = options.description
    state.showCloseButton = options.showCloseButton ?? true
    state.onClose = options.onClose
    state.render.value = options.render ?? null
    state.title = options.title
    state.isOpen = true
  }

  function updateModal(options: Partial<ModalOptions>) {
    if (options.actions !== undefined) {
      state.actions = options.actions
    }

    if (options.content !== undefined) {
      state.content.value = options.content
    }

    if (options.contentClass !== undefined) {
      state.contentClass = options.contentClass
    }

    if (options.contentProps !== undefined) {
      state.contentProps = options.contentProps
    }

    if (options.description !== undefined) {
      state.description = options.description
    }

    if (options.onClose !== undefined) {
      state.onClose = options.onClose
    }

    if (options.render !== undefined) {
      state.render.value = options.render
    }

    if (options.showCloseButton !== undefined) {
      state.showCloseButton = options.showCloseButton
    }

    if (options.title !== undefined) {
      state.title = options.title
    }
  }

  function closeModal() {
    state.onClose?.()
    state.isOpen = false
    state.actions = []
    state.content.value = null
    state.contentClass = undefined
    state.contentProps = {}
    state.description = undefined
    state.onClose = undefined
    state.render.value = null
    state.title = undefined
  }

  const controller: ModalController = {
    closeModal,
    openModal,
    updateModal,
    state,
  }

  provide(modalKey, controller)

  return controller
}

export function useModal() {
  const modal = inject(modalKey)

  if (!modal) {
    throw new Error('useModal must be used within a modal provider.')
  }

  return {
    closeModal: modal.closeModal,
    isOpen: computed(() => modal.state.isOpen),
    openModal: modal.openModal,
    state: modal.state,
    updateModal: modal.updateModal,
  }
}
