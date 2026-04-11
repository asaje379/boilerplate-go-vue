<template>
  <main class="page">
    <section class="panel">
      <router-link class="back" to="/">Back</router-link>
      <h1>Account shell</h1>
      <p>Connect this surface to your API modules for auth, notifications, files and realtime.</p>
      <label class="field">
        <span>Access token</span>
        <textarea v-model="tokenInput" rows="4" placeholder="Paste a bearer token to load notifications" />
      </label>
      <div class="actions">
        <button class="button secondary" @click="saveToken">Save token</button>
        <button class="button" :disabled="!isAuthenticated" @click="loadNotifications">Load notifications</button>
      </div>
      <ul>
        <li><strong>API:</strong> {{ apiBase }}</li>
        <li><strong>Realtime:</strong> {{ realtimeBase }}</li>
      </ul>

      <div v-if="profile" class="prefs">
        <h2>Notification channels</h2>
        <label class="field">
          <span>WhatsApp phone</span>
          <input v-model="profile.whatsAppPhone" type="text" placeholder="+221770000000" />
        </label>
        <label class="checkbox-row"><input v-model="profile.notifyEmail" type="checkbox" /> Email notifications</label>
        <label class="checkbox-row"><input v-model="profile.notifyInApp" type="checkbox" /> In-app notifications</label>
        <label class="checkbox-row"><input v-model="profile.notifyWhatsapp" type="checkbox" :disabled="!profile.whatsAppPhone || !hasValidWhatsAppPhone" /> WhatsApp notifications</label>
        <p v-if="!hasValidWhatsAppPhone" class="error-text">WhatsApp phone must use E.164 format, for example +221770000000.</p>
        <button class="button secondary" :disabled="isSavingPrefs || !hasValidWhatsAppPhone" @click="saveNotificationPrefs">Save notification preferences</button>
      </div>
    </section>

    <NotificationCenter
      title="PWA notification inbox"
      :items="items"
      :loading="isLoading"
      :unread-count="unreadCount"
      @mark-all-read="handleMarkAllRead"
      @select="handleSelect"
    />
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import NotificationCenter from "@/components/NotificationCenter.vue";
import { usersApi } from "@/services/api/users";
import { useNotificationsStore } from "@/stores/notifications";
import { useRealtimeStore } from "@/stores/realtime";
import { useSessionStore } from "@/stores/session";
import type { NotificationItem, UserProfile } from "@/types";

const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";
const realtimeBase = import.meta.env.VITE_REALTIME_BASE_URL || "http://localhost:8090";
const session = useSessionStore();
const notifications = useNotificationsStore();
const realtime = useRealtimeStore();

const tokenInput = ref(session.accessToken);
const profile = ref<UserProfile | null>(null);
const isSavingPrefs = ref(false);
const isAuthenticated = computed(() => session.isAuthenticated);
const hasValidWhatsAppPhone = computed(() => {
  const value = profile.value?.whatsAppPhone?.trim() || "";
  return value === "" || /^\+[1-9]\d{7,14}$/.test(value);
});
const items = computed(() => notifications.items);
const isLoading = computed(() => notifications.isLoading);
const unreadCount = computed(() => notifications.unreadCount);

function saveToken() {
  session.setAccessToken(tokenInput.value);
  realtime.disconnect();
  if (session.isAuthenticated) {
    connectRealtime();
  }
}

async function loadNotifications() {
  await notifications.fetchLatest();
  profile.value = await usersApi.getCurrent();
}

async function handleSelect(id: string) {
  await notifications.markRead(id);
}

async function handleMarkAllRead() {
  await notifications.markAllRead();
}

async function saveNotificationPrefs() {
  if (!profile.value) {
    return;
  }
  if (!hasValidWhatsAppPhone.value) {
    return;
  }

  isSavingPrefs.value = true;
  try {
    profile.value = await usersApi.updateNotificationPrefs({
      notifyEmail: profile.value.notifyEmail,
      notifyInApp: profile.value.notifyInApp,
      notifyWhatsapp: profile.value.notifyWhatsapp,
      whatsAppPhone: profile.value.whatsAppPhone,
    });
  } finally {
    isSavingPrefs.value = false;
  }
}

function connectRealtime() {
  realtime.connect((notification) => {
    notifications.pushRealtimeNotification(notification as NotificationItem);
  });
}

onMounted(() => {
  if (session.isAuthenticated) {
    connectRealtime();
  }
});

onBeforeUnmount(() => {
  realtime.disconnect();
});
</script>
