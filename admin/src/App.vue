<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { toast } from "vue-sonner";
import { ChevronRight, CircleHelp, PanelsTopLeft, ShieldCheck, UserRound } from "lucide-vue-next";
import { useI18n } from "vue-i18n";
import { provideModal } from "@/composables";
import { AppLayout, AppModalHost, AppPreferencesMenu, AppUserMenu } from "@/components/system";
import { setSessionExpiredHandler } from "@/services/http/client";
import { Toaster } from "@/components/ui/sonner";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { supportedLocales, type AppLocale } from "@/lib/i18n";
import { usePreferencesStore, type ThemePreference } from "@/stores/preferences";
import { useRealtimeStore } from "@/stores/realtime";
import { useSessionStore } from "@/stores/session";

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

provideModal();

onMounted(() => {
  setSessionExpiredHandler(() => {
    session.$reset();
    toast.error(t("auth.sessionExpired"));
    router.push({ name: "login" });
  });
});

const preferences = usePreferencesStore();
const { locale, resolvedTheme, themePreference } = storeToRefs(preferences);
const session = useSessionStore();
const { currentUser, isAuthenticated } = storeToRefs(session);
const realtime = useRealtimeStore();
const { connectedUsersCount, isConnected: isRealtimeConnected } = storeToRefs(realtime);

const navigation = computed(() => [
  { icon: PanelsTopLeft, label: t("nav.home"), to: "/" },
  { icon: UserRound, label: t("users.title"), to: "/users" },
  { icon: ShieldCheck, label: t("profile.info.title"), to: "/profile" },
  {
    children: [
      { label: "FormPlayground", to: "/playground/form" },
      { label: "TablePlayground", to: "/playground/table" },
      { label: "ModalPlayground", to: "/playground/modal" },
    ],
    icon: PanelsTopLeft,
    label: t("nav.playground"),
    to: "/playground",
  },
  { icon: CircleHelp, label: t("nav.about"), to: "/about" },
]);

const localeLabels: Record<AppLocale, string> = {
  fr: "FR",
  en: "EN",
};

const themeLabels = computed<Record<ThemePreference, string>>(() => ({
  light: t("controls.light"),
  dark: t("controls.dark"),
  system: t("controls.system"),
}));

const isPlaygroundOpen = ref(route.path.startsWith("/playground"));

const isAuthRoute = computed(
  () => route.name === "setup" || route.name === "login" || route.name === "verify-otp",
);

const currentUserDisplay = computed(() => {
  const name = currentUser.value?.name?.trim() || "";
  const [firstName = "", ...rest] = name.split(" ");

  return {
    avatarUrl: currentUser.value?.profilePhotoUrl || "",
    firstName: firstName || "User",
    lastName: rest.join(" ") || currentUser.value?.role || "",
    role: currentUser.value?.role === "admin" ? "Administrator" : "User",
  };
});

const currentPage = computed(() => {
  for (const item of navigation.value) {
    if (item.to === route.path) {
      return item;
    }

    const child = item.children?.find((entry) => entry.to === route.path);

    if (child) {
      return child;
    }
  }

  return undefined;
});

function setLocale(value: AppLocale) {
  preferences.setLocale(value);
}

function setTheme(value: ThemePreference) {
  preferences.setTheme(value);
}

function openProfile() {
  router.push("/profile");
}

async function logout() {
  try {
    await session.logout();
    toast.success(t("auth.logout.success"));
    await router.push("/login");
  } catch {
    return;
  }
}

function togglePlayground() {
  isPlaygroundOpen.value = !isPlaygroundOpen.value;
}

watch(
  isAuthenticated,
  (authenticated) => {
    if (authenticated) {
      realtime.connect({ channels: ["presence"] });
      return;
    }

    realtime.disconnect();
  },
  { immediate: true },
);

watch(
  () => route.path,
  (path) => {
    if (path.startsWith("/playground")) {
      isPlaygroundOpen.value = true;
    }
  },
);

onBeforeUnmount(() => {
  realtime.disconnect();
});
</script>

<template>
  <RouterView v-if="isAuthRoute" />

  <AppLayout v-else-if="isAuthenticated">
    <template #sidebar-header>
      <div>
        <p>{{ t("common.appName") }}</p>
      </div>
    </template>

    <template #sidebar>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem v-for="item in navigation" :key="item.to">
              <SidebarMenuButton
                v-if="item.children?.length"
                :is-active="Boolean(item.children.some((entry) => entry.to === route.path))"
                @click="togglePlayground"
              >
                <component :is="item.icon" />
                <span>{{ item.label }}</span>
                <ChevronRight
                  class="ml-auto size-4 transition-transform"
                  :class="isPlaygroundOpen && 'rotate-90'"
                />
              </SidebarMenuButton>

              <SidebarMenuButton v-else as-child :is-active="route.path === item.to">
                <RouterLink :to="item.to">
                  <component :is="item.icon" />
                  <span>{{ item.label }}</span>
                </RouterLink>
              </SidebarMenuButton>

              <SidebarMenuSub v-if="item.children?.length && isPlaygroundOpen">
                <SidebarMenuSubItem v-for="child in item.children" :key="child.to">
                  <SidebarMenuSubButton as-child :is-active="route.path === child.to">
                    <RouterLink :to="child.to">
                      <span>{{ child.label }}</span>
                    </RouterLink>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              </SidebarMenuSub>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </template>

    <template #sidebar-footer>
      <div class="space-y-3 px-2 py-1">
        <div class="sm:hidden">
          <AppPreferencesMenu
            :locale="locale"
            :locale-labels="localeLabels"
            :supported-locales="supportedLocales"
            :theme="themePreference"
            :theme-labels="themeLabels"
            @update:locale="setLocale"
            @update:theme="setTheme"
          />
        </div>
        <div class="text-muted-foreground text-xs">
          {{ t("controls.currentTheme", { theme: themeLabels[resolvedTheme] }) }}
        </div>
      </div>
    </template>

    <template #header>
      <div class="flex items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="truncate font-medium">{{ currentPage?.label ?? t("common.appName") }}</p>
        </div>

        <div class="flex items-center gap-1 sm:gap-2">
          <div class="hidden sm:block">
            <AppPreferencesMenu
              :locale="locale"
              :locale-labels="localeLabels"
              :supported-locales="supportedLocales"
              :theme="themePreference"
              :theme-labels="themeLabels"
              @update:locale="setLocale"
              @update:theme="setTheme"
            />
          </div>

          <AppUserMenu
            compact
            :avatar-url="currentUserDisplay.avatarUrl"
            :first-name="currentUserDisplay.firstName"
            :last-name="currentUserDisplay.lastName"
            :role="currentUserDisplay.role"
            @logout="logout"
            @profile="openProfile"
          />
        </div>
      </div>
    </template>

    <RouterView />

    <template #footer>
      <div class="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <div class="flex items-center gap-4">
          <span>
            {{
              isRealtimeConnected
                ? `${connectedUsersCount ?? 0} users connected`
                : "Realtime offline"
            }}
          </span>
        </div>
        <span>Copyright {{ new Date().getFullYear() }}</span>
      </div>
    </template>
  </AppLayout>

  <RouterView v-else />

  <AppModalHost />
  <Toaster position="top-center" rich-colors />
</template>
