import type { Component, MaybeRefOrGetter, VNodeChild } from 'vue'
import type { ButtonVariants } from '@/components/ui/button'

export type ModalRenderContent = () => VNodeChild

export interface ModalAction {
  class?: string
  closeOnClick?: boolean
  disabled?: MaybeRefOrGetter<boolean>
  key?: string
  label: string
  onClick?: () => void | Promise<void>
  variant?: ButtonVariants['variant']
}

export interface ModalOptions {
  actions?: ModalAction[]
  content?: Component
  contentClass?: string
  contentProps?: Record<string, unknown>
  description?: string
  onClose?: () => void
  render?: ModalRenderContent
  showCloseButton?: boolean
  title?: string
}
