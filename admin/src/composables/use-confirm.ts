import { computed, defineComponent, h, ref } from 'vue'
import { useModal } from '@/composables/use-modal'
import { Input } from '@/components/ui/input'

export interface ConfirmOptions {
  cancelLabel?: string
  confirmLabel?: string
  description?: string
  textToConfirm?: string
  title?: string
  variant?: 'default' | 'destructive'
}

export interface ConfirmDeleteOptions extends Omit<
  ConfirmOptions,
  'confirmLabel' | 'title' | 'variant'
> {
  confirmLabel?: string
  title?: string
}

export function useConfirm() {
  const { closeModal, openModal } = useModal()

  function confirm(options: ConfirmOptions) {
    const typedText = ref('')
    let settled = false

    const ConfirmContent = options.textToConfirm
      ? defineComponent({
          name: 'ConfirmTextContent',
          setup() {
            return () =>
              h('div', { class: 'space-y-3' }, [
                h('p', { class: 'text-sm text-muted-foreground' }, [
                  'Type ',
                  h('span', { class: 'font-semibold text-foreground' }, options.textToConfirm),
                  ' to confirm this action.',
                ]),
                h(
                  'label',
                  { class: 'text-sm font-medium', for: 'confirm-text-input' },
                  'Confirmation text',
                ),
                h(Input, {
                  id: 'confirm-text-input',
                  modelValue: typedText.value,
                  'onUpdate:modelValue': (value: string | number) => {
                    typedText.value = String(value)
                  },
                  placeholder: options.textToConfirm,
                }),
              ])
          },
        })
      : undefined

    return new Promise<boolean>((resolve) => {
      openModal({
        actions: [
          {
            label: options.cancelLabel ?? 'Cancel',
            onClick: () => {
              settled = true
              resolve(false)
            },
            variant: 'outline',
          },
          {
            closeOnClick: false,
            disabled: computed(() =>
              options.textToConfirm ? typedText.value !== options.textToConfirm : false,
            ),
            label: options.confirmLabel ?? 'Confirm',
            onClick: () => {
              settled = true
              resolve(true)
              closeModal()
            },
            variant: options.variant ?? 'default',
          },
        ],
        description: options.description,
        content: ConfirmContent,
        onClose: () => {
          if (!settled) {
            settled = true
            resolve(false)
          }
        },
        title: options.title ?? 'Confirm action',
      })
    })
  }

  return {
    confirm,
    confirmDelete: (entityName?: string, options?: ConfirmDeleteOptions) =>
      confirm({
        ...options,
        confirmLabel: options?.confirmLabel ?? 'Delete',
        description:
          options?.description ??
          (entityName
            ? `This will permanently delete ${entityName}. This action cannot be undone.`
            : 'This action cannot be undone.'),
        title: options?.title ?? (entityName ? `Delete ${entityName}?` : 'Delete item?'),
        variant: 'destructive',
      }),
  }
}
