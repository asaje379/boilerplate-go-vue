import "./assets/main.css";

import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./lib/i18n";
import { pinia } from "./pinia";
import router from "./router";
import { usePreferencesStore } from "./stores/preferences";
import { useSessionStore } from "./stores/session";

const app = createApp(App);

app.use(pinia);
app.use(i18n);
app.use(router);

usePreferencesStore(pinia).initialize();
void useSessionStore(pinia).bootstrapSession();

app.mount("#app");
