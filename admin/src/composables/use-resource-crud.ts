import { computed, ref } from "vue";

export function useResourceCrud<TItem>(options: {
  createDescription: string;
  createInitialValues: Record<string, unknown>;
  createTitle: string;
  editDescription: string;
  editInitialValues: (item: TItem) => Record<string, unknown>;
  editTitle: string;
}) {
  const isDialogOpen = ref(false);
  const editingItem = ref<TItem | null>(null);

  const isEditing = computed(() => Boolean(editingItem.value));
  const dialogTitle = computed(() => (isEditing.value ? options.editTitle : options.createTitle));
  const dialogDescription = computed(() =>
    isEditing.value ? options.editDescription : options.createDescription,
  );
  const formInitialValues = computed(() =>
    editingItem.value ? options.editInitialValues(editingItem.value) : options.createInitialValues,
  );

  function openCreateDialog() {
    editingItem.value = null;
    isDialogOpen.value = true;
  }

  function openEditDialog(item: TItem) {
    editingItem.value = item;
    isDialogOpen.value = true;
  }

  function closeDialog() {
    isDialogOpen.value = false;
  }

  function clearEditingItem() {
    editingItem.value = null;
  }

  return {
    clearEditingItem,
    closeDialog,
    dialogDescription,
    dialogTitle,
    editingItem,
    formInitialValues,
    isDialogOpen,
    isEditing,
    openCreateDialog,
    openEditDialog,
  };
}
