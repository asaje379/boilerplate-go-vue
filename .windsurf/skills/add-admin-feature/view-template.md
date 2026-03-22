# View Template

```vue
<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import { useForm } from "vee-validate";
import { toTypedSchema } from "@vee-validate/zod";
import { z } from "zod";
// Import API module
// import { listThings } from "@/services/api/things.api";
// Import UI primitives from components/ui/

const { t } = useI18n();

// --- State ---
const loading = ref(false);
const items = ref([]);

// --- Form (if needed) ---
const schema = toTypedSchema(
  z.object({
    name: z.string().min(1, t("things.validation.nameRequired")),
  })
);

const { handleSubmit, resetForm } = useForm({ validationSchema: schema });

// --- Actions ---
async function loadItems() {
  loading.value = true;
  try {
    // items.value = await listThings();
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : t("things.errors.loadFailed")
    );
  } finally {
    loading.value = false;
  }
}

onMounted(loadItems);
</script>

<template>
  <!-- Loading state -->
  <div v-if="loading">{{ $t("common.loading") }}</div>

  <!-- Empty state -->
  <div v-else-if="items.length === 0">{{ $t("things.empty") }}</div>

  <!-- Content -->
  <div v-else>
    <!-- Render items -->
  </div>
</template>
```
