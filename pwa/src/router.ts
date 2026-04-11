import { createRouter, createWebHistory } from "vue-router";
import HomeView from "./views/HomeView.vue";
import AccountView from "./views/AccountView.vue";
import NotificationsView from "./views/NotificationsView.vue";

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomeView },
    { path: "/account", component: AccountView },
    { path: "/notifications", component: NotificationsView }
  ]
});
