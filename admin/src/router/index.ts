import { createRouter, createWebHistory } from "vue-router";
import type { SetupStatus } from "@/types/auth";
import { authApi } from "@/services/api/auth.api";
import { pinia } from "@/pinia";
import { useSessionStore } from "@/stores/session";
import HomeView from "../views/HomeView.vue";

let cachedSetupStatus: SetupStatus | null = null;

async function getSetupStatus(): Promise<SetupStatus> {
  if (!cachedSetupStatus) {
    cachedSetupStatus = await authApi.setupStatus();
  }
  return cachedSetupStatus;
}

export function invalidateSetupStatus() {
  cachedSetupStatus = null;
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/setup",
      name: "setup",
      component: () => import("../views/SetupView.vue"),
      meta: {
        public: true,
        title: "Setup",
      },
    },
    {
      path: "/login",
      name: "login",
      component: () => import("../views/LoginView.vue"),
      meta: {
        public: true,
        title: "Login",
      },
    },
    {
      path: "/verify-otp",
      name: "verify-otp",
      component: () => import("../views/VerifyOtpView.vue"),
      meta: {
        public: true,
        title: "Verify OTP",
      },
    },
    {
      path: "/force-password-change",
      name: "force-password-change",
      component: () => import("../views/ForcePasswordChangeView.vue"),
      meta: {
        requiresAuth: true,
        title: "Change Password",
      },
    },
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: {
        requiresAuth: true,
        title: "Home",
      },
    },
    {
      path: "/about",
      name: "about",
      component: () => import("../views/AboutView.vue"),
      meta: {
        requiresAuth: true,
        title: "Structure",
      },
    },
    {
      path: "/users",
      name: "users",
      component: () => import("../views/UsersView.vue"),
      meta: {
        requiresAuth: true,
        title: "Users",
      },
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/ProfileView.vue"),
      meta: {
        requiresAuth: true,
        title: "Profile",
      },
    },
    {
      path: "/playground",
      component: () => import("../views/PlaygroundView.vue"),
      meta: {
        requiresAuth: true,
        title: "Playground",
      },
      children: [
        {
          path: "",
          redirect: { name: "playground-form" },
        },
        {
          path: "form",
          name: "playground-form",
          component: () => import("../views/SystemFormPlayground.vue"),
        },
        {
          path: "table",
          name: "playground-table",
          component: () => import("../views/SystemDataTablePlayground.vue"),
        },
        {
          path: "modal",
          name: "playground-modal",
          component: () => import("../views/SystemModalPlayground.vue"),
        },
      ],
    },
    {
      path: "/playground/system-form",
      redirect: { name: "playground-form" },
    },
    {
      path: "/playground/system-table",
      redirect: { name: "playground-table" },
    },
    {
      path: "/playground/system-modal",
      redirect: { name: "playground-modal" },
    },
  ],
});

router.beforeEach(async (to) => {
  const session = useSessionStore(pinia);

  const setupStatus = await getSetupStatus();

  if (setupStatus.requiresSetup && to.name !== "setup") {
    return { name: "setup" };
  }

  if (!setupStatus.requiresSetup && to.name === "setup") {
    return session.isAuthenticated ? { name: "home" } : { name: "login" };
  }

  if (!session.currentUser && session.refreshToken && !session.isBootstrappingSession) {
    await session.bootstrapSession();
  }

  if (to.meta.requiresAuth && !session.isAuthenticated) {
    return {
      name: "login",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (to.name === "verify-otp" && !session.otpChallenge) {
    return { name: "login" };
  }

  if (
    session.isAuthenticated &&
    session.requiresPasswordChange &&
    to.name !== "force-password-change" &&
    !to.meta.public
  ) {
    return { name: "force-password-change" };
  }

  if (to.meta.public && session.isAuthenticated && to.name !== "setup") {
    return session.requiresPasswordChange ? { name: "force-password-change" } : { name: "home" };
  }

  return true;
});

const APP_TITLE = "Admin Blueprint";

router.afterEach((to) => {
  const pageTitle = to.meta.title as string | undefined;
  document.title = pageTitle ? `${pageTitle} | ${APP_TITLE}` : APP_TITLE;
});

export default router;
