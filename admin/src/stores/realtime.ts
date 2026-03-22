import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useSessionStore } from "@/stores/session";
import {
  REALTIME_BASE_URL,
  REALTIME_DEFAULT_TRANSPORT,
  REALTIME_RECONNECT_DELAY_MS,
} from "@/config/realtime";

export type RealtimeTransport = "sse" | "ws";
export type RealtimeStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export interface RealtimeEvent<TPayload = unknown> {
  data?: TPayload;
  event: string;
  id?: string;
  meta?: {
    channel?: string;
    occurredAt?: string;
    transport?: string;
  };
}

interface PresenceUsersCountPayload {
  count: number;
}

export interface ConnectRealtimeOptions {
  channels?: string[];
  force?: boolean;
  transport?: RealtimeTransport;
}

type RealtimeEventHandler<TPayload = unknown> = (event: RealtimeEvent<TPayload>) => void;

function normalizeChannels(channels?: string[]) {
  return [...new Set((channels || []).map((channel) => channel.trim()).filter(Boolean))];
}

function buildRealtimeUrl(path: string, params: URLSearchParams) {
  const base = REALTIME_BASE_URL.endsWith("/") ? REALTIME_BASE_URL.slice(0, -1) : REALTIME_BASE_URL;
  const url = new URL(`${base}${path}`);
  url.search = params.toString();
  return url;
}

export const useRealtimeStore = defineStore("realtime", () => {
  const session = useSessionStore();

  const status = ref<RealtimeStatus>("idle");
  const transport = ref<RealtimeTransport>(REALTIME_DEFAULT_TRANSPORT);
  const activeChannels = ref<string[]>([]);
  const lastEventId = ref<string | null>(null);
  const lastError = ref<string | null>(null);
  const connectedUsersCount = ref<number | null>(null);
  const isConnected = computed(() => status.value === "connected");

  const listeners = new Map<string, Set<RealtimeEventHandler>>();
  let eventSource: EventSource | null = null;
  let socket: WebSocket | null = null;
  let reconnectTimer: number | null = null;
  let shouldReconnect = false;

  function connect(options: ConnectRealtimeOptions = {}) {
    const nextTransport = options.transport || transport.value;
    const nextChannels = normalizeChannels(options.channels ?? activeChannels.value);

    if (!session.accessToken) {
      disconnect({ clearChannels: false });
      lastError.value = "Missing access token for realtime connection.";
      status.value = "disconnected";
      return;
    }

    if (
      !options.force &&
      status.value === "connected" &&
      transport.value === nextTransport &&
      JSON.stringify(activeChannels.value) === JSON.stringify(nextChannels)
    ) {
      return;
    }

    clearReconnectTimer();
    cleanupConnection();

    shouldReconnect = true;
    transport.value = nextTransport;
    activeChannels.value = nextChannels;
    lastError.value = null;
    status.value = status.value === "connected" ? "reconnecting" : "connecting";

    if (nextTransport === "ws") {
      openWebSocket(nextChannels);
      return;
    }

    openEventSource(nextChannels);
  }

  function disconnect(options: { clearChannels?: boolean } = {}) {
    shouldReconnect = false;
    clearReconnectTimer();
    cleanupConnection();
    if (options.clearChannels !== false) {
      activeChannels.value = [];
    }
    connectedUsersCount.value = null;
    status.value = "disconnected";
  }

  function reconnect() {
    if (!shouldReconnect) {
      return;
    }

    clearReconnectTimer();
    reconnectTimer = window.setTimeout(() => {
      connect({ channels: activeChannels.value, force: true, transport: transport.value });
    }, REALTIME_RECONNECT_DELAY_MS);
  }

  function subscribe<TPayload = unknown>(
    eventName: string,
    handler: RealtimeEventHandler<TPayload>,
  ) {
    const normalizedEventName = eventName.trim() || "*";
    const eventHandlers = listeners.get(normalizedEventName) || new Set<RealtimeEventHandler>();
    eventHandlers.add(handler as RealtimeEventHandler);
    listeners.set(normalizedEventName, eventHandlers);

    return () => unsubscribe(normalizedEventName, handler);
  }

  function unsubscribe<TPayload = unknown>(
    eventName: string,
    handler: RealtimeEventHandler<TPayload>,
  ) {
    const normalizedEventName = eventName.trim() || "*";
    const eventHandlers = listeners.get(normalizedEventName);
    if (!eventHandlers) {
      return;
    }

    eventHandlers.delete(handler as RealtimeEventHandler);
    if (eventHandlers.size === 0) {
      listeners.delete(normalizedEventName);
    }
  }

  function openEventSource(channels: string[]) {
    const params = new URLSearchParams();
    params.set("access_token", session.accessToken || "");
    if (channels.length > 0) {
      params.set("channels", channels.join(","));
    }
    if (lastEventId.value) {
      params.set("lastEventId", lastEventId.value);
    }

    const source = new EventSource(buildRealtimeUrl("/rt/sse", params));
    eventSource = source;

    source.onopen = () => {
      status.value = "connected";
      lastError.value = null;
    };

    source.onmessage = (message) => {
      dispatchRawMessage(message.data);
    };

    source.onerror = () => {
      cleanupConnection();
      status.value = "reconnecting";
      lastError.value = "Realtime SSE connection lost.";
      reconnect();
    };
  }

  function openWebSocket(channels: string[]) {
    const params = new URLSearchParams();
    params.set("access_token", session.accessToken || "");
    if (channels.length > 0) {
      params.set("channels", channels.join(","));
    }

    const httpUrl = buildRealtimeUrl("/rt/ws", params);
    const protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
    const socketUrl = `${protocol}//${httpUrl.host}${httpUrl.pathname}${httpUrl.search}`;
    const nextSocket = new WebSocket(socketUrl);
    socket = nextSocket;

    nextSocket.onopen = () => {
      status.value = "connected";
      lastError.value = null;
    };

    nextSocket.onmessage = (message) => {
      if (typeof message.data !== "string") {
        return;
      }

      dispatchRawMessage(message.data);
    };

    nextSocket.onerror = () => {
      lastError.value = "Realtime WebSocket connection failed.";
    };

    nextSocket.onclose = () => {
      cleanupConnection();
      if (!shouldReconnect) {
        status.value = "disconnected";
        return;
      }

      status.value = "reconnecting";
      reconnect();
    };
  }

  function dispatchRawMessage(rawMessage: string) {
    try {
      const event = JSON.parse(rawMessage) as RealtimeEvent;
      if (event.id) {
        lastEventId.value = event.id;
      }

      if (event.event === "presence.users.count.updated") {
        const payload = event.data as PresenceUsersCountPayload | undefined;
        connectedUsersCount.value = typeof payload?.count === "number" ? payload.count : null;
      }

      notify(event.event, event);
      notify("*", event);
    } catch {
      lastError.value = "Unable to parse realtime message.";
    }
  }

  function notify(eventName: string, payload: RealtimeEvent) {
    const eventHandlers = listeners.get(eventName);
    if (!eventHandlers) {
      return;
    }

    for (const handler of eventHandlers) {
      handler(payload);
    }
  }

  function cleanupConnection() {
    if (eventSource) {
      eventSource.onopen = null;
      eventSource.onmessage = null;
      eventSource.onerror = null;
      eventSource.close();
      eventSource = null;
    }
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.close();
      socket = null;
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer !== null) {
      window.clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  }

  return {
    activeChannels,
    connectedUsersCount,
    connect,
    disconnect,
    isConnected,
    lastError,
    lastEventId,
    status,
    subscribe,
    transport,
    unsubscribe,
  };
});
