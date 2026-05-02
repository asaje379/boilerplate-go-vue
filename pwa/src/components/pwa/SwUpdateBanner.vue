<template>
  <!-- Bannière de mise à jour disponible -->
  <Transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-y-10 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition ease-in duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-10 opacity-0"
  >
    <div
      v-if="updateAvailable && !dismissed"
      class="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-96 z-50"
    >
      <div class="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between">
        <div class="flex items-center gap-3">
          <svg
            class="w-5 h-5 text-blue-400 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span class="text-sm font-medium">
            Nouvelle version disponible
          </span>
        </div>
        
        <div class="flex items-center gap-2">
          <button
            @click="dismiss"
            class="px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
          >
            Plus tard
          </button>
          <button
            @click="applyUpdate"
            :disabled="updatePending"
            class="px-3 py-1.5 text-xs bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 rounded-md font-medium transition-colors flex items-center gap-1.5"
          >
            <svg
              v-if="updatePending"
              class="w-3 h-3 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
              />
              <path
                class="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {{ updatePending ? "Mise à jour..." : "Actualiser" }}
          </button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Toast "Prêt pour le hors-ligne" -->
  <Transition
    enter-active-class="transform transition ease-out duration-300"
    enter-from-class="translate-y-10 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transform transition ease-in duration-200"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="translate-y-10 opacity-0"
  >
    <div
      v-if="offlineReady && !offlineDismissed"
      class="fixed bottom-4 left-4 sm:left-auto sm:right-4 z-50"
    >
      <div class="bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span class="text-sm font-medium">
          Application prête hors-ligne
        </span>
        <button
          @click="dismissOffline"
          class="ml-2 text-green-100 hover:text-white"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useSwUpdate } from "@/services/pwa/sw-update";

const { updateAvailable, updatePending, offlineReady, applyUpdate: swApplyUpdate, dismissUpdate } = useSwUpdate();

const dismissed = ref(false);
const offlineDismissed = ref(false);

function dismiss(): void {
  dismissed.value = true;
  dismissUpdate();
}

function applyUpdate(): void {
  swApplyUpdate();
}

function dismissOffline(): void {
  offlineDismissed.value = true;
}
</script>
