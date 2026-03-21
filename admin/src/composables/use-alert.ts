import { useModal } from '@/composables/use-modal'

export interface AlertOptions {
  acknowledgeLabel?: string
  description?: string
  title?: string
  variant?: 'default' | 'destructive'
}

export function useAlert() {
  const { closeModal, openModal } = useModal()

  function alert(options: AlertOptions) {
    return new Promise<void>((resolve) => {
      openModal({
        actions: [
          {
            label: options.acknowledgeLabel ?? 'OK',
            onClick: () => {
              closeModal()
              resolve()
            },
            variant: options.variant ?? 'default',
          },
        ],
        description: options.description,
        onClose: () => resolve(),
        title: options.title ?? 'Information',
      })
    })
  }

  return {
    alert,
  }
}
