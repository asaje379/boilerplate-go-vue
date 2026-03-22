import { defineStore } from "pinia";
import { toast } from "vue-sonner";

export const useToastStore = defineStore("toast", () => {
  function success(message: string) {
    toast.success(message);
  }

  function error(message: string) {
    toast.error(message);
  }

  return {
    error,
    success,
  };
});
