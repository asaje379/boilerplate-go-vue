import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import "./style.css";
import { registerSW } from "@/services/pwa/sw-update";

// Enregistrer le service worker pour la PWA
registerSW();

createApp(App).use(createPinia()).use(router).mount("#app");
