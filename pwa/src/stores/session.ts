import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { readAccessToken, writeAccessToken } from "@/services/http/client";

export const useSessionStore = defineStore("pwa-session", () => {
  const accessToken = ref<string>(readAccessToken() || "");
  const isAuthenticated = computed(() => accessToken.value.trim().length > 0);

  function setAccessToken(value: string) {
    accessToken.value = value.trim();
    writeAccessToken(accessToken.value || null);
  }

  return {
    accessToken,
    isAuthenticated,
    setAccessToken,
  };
});
