# PWA Caching Strategy

Workbox configuration and caching strategies for the PWA.

---

## 1. Problem Statement

**Previous Issue:** Aggressive caching caused stale data to persist even when new data was available from the API. Pages and API responses were cached too long, leading to:
- Users seeing outdated information
- New data not appearing after mutations
- Confusing user experience requiring hard refreshes

---

## 2. Strategy Overview

The PWA uses **Network First** for all dynamic content to ensure fresh data, with **Cache First** only for static assets.

```
┌─────────────────────────────────────────────────────────────┐
│                      Caching Strategy                       │
├─────────────────────┬───────────────────────────────────────┤
│   Static Assets     │         Dynamic Content                │
│   (Cache First)     │         (Network First)                │
├─────────────────────┼───────────────────────────────────────┤
│ • JS bundles        │ • API responses                        │
│ • CSS styles        │ • User data                            │
│ • HTML shell        │ • Notifications                        │
│ • Icons/fonts       │ • Files list                           │
│ • SVG images        │ • Realtime events                      │
└─────────────────────┴───────────────────────────────────────┘
```

---

## 3. Current Configuration

### 3.1 Vite PWA Config

```typescript
// pwa/vite.config.ts
VitePWA({
  registerType: "autoUpdate",
  manifest: {
    name: "Asaje PWA",
    short_name: "Asaje",
    description: "Optional end-user PWA surface",
    start_url: "/",
    display: "standalone",
    theme_color: "#111827",
    background_color: "#ffffff",
    icons: [
      { src: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any maskable" }
    ]
  },
  workbox: {
    globPatterns: ["**/*.{js,css,html,svg}"],
    navigateFallback: "index.html",
    runtimeCaching: [
      // API calls - Network First
      {
        urlPattern: /^\/api\/.*/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          networkTimeoutSeconds: 3,
          cacheableResponse: { statuses: [0, 200] },
          expiration: {
            maxEntries: 50,
            maxAgeSeconds: 60 * 5 // 5 minutes max
          }
        }
      },
      // Static assets - Cache First
      {
        urlPattern: /\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/,
        handler: "CacheFirst",
        options: {
          cacheName: "static-assets",
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
          }
        }
      },
      // Media files - Stale While Revalidate
      {
        urlPattern: /\.(mp4|webm|mp3|wav)$/,
        handler: "StaleWhileRevalidate",
        options: {
          cacheName: "media-cache",
          expiration: {
            maxEntries: 20,
            maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
          }
        }
      }
    ]
  }
})
```

---

## 4. Strategy Details

### 4.1 Network First (API Calls)

```
User Request
    │
    ▼
┌─────────────┐    Success    ┌─────────┐
│   Network   │ ────────────▶ │ Return  │
│   Request   │               │ Response│
└─────────────┘               └─────────┘
    │
    │ Timeout / Fail
    ▼
┌─────────────┐    Found      ┌─────────┐
│    Cache    │ ────────────▶ │ Return  │
│    Check    │               │ Cached  │
└─────────────┘               └─────────┘
    │
    │ Not Found
    ▼
┌─────────────┐
│   Error     │
│  (Offline)  │
└─────────────┘
```

**Why:** API responses must be fresh. If offline, use cached data temporarily.

### 4.2 Cache First (Static Assets)

```
User Request
    │
    ▼
┌─────────────┐    Found      ┌─────────┐
│    Cache    │ ────────────▶ │ Return  │
│    Check    │               │ Cached  │
└─────────────┘               └─────────┘
    │
    │ Not Found
    ▼
┌─────────────┐    Success    ┌─────────┐
│   Network   │ ────────────▶ │ Cache   │
│   Fetch     │               │ & Return│
└─────────────┘               └─────────┘
```

**Why:** JS/CSS bundles don't change often. Cache aggressively.

### 4.3 Stale While Revalidate (Media)

```
User Request
    │
    ▼
┌─────────────┐    Any result  ┌─────────┐
│    Cache    │ ─────────────▶ │ Return  │
│    Check    │                │ Cached  │
└─────────────┘                └─────────┘
    │
    ▼ (Background)
┌─────────────┐
│   Network   │ ──▶ Update cache silently
│   Update    │
└─────────────┘
```

**Why:** Media files are large. Show cached immediately, update in background.

---

## 5. Cache Lifetimes

| Cache Type | Strategy | Max Age | Max Entries |
|------------|----------|---------|-------------|
| API responses | NetworkFirst | 5 minutes | 50 |
| Static assets | CacheFirst | 30 days | 100 |
| Media files | StaleWhileRevalidate | 7 days | 20 |

---

## 6. Update Behavior

### 6.1 Service Worker Auto-Update

```typescript
// PWA auto-checks for updates every 1 hour
// When update available:
// 1. New SW installs in background
// 2. On next navigation, prompt user or auto-reload
```

### 6.2 Handling Updates

```typescript
// In your main.ts or App.vue
if (import.meta.env.PROD) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Show "Update available" toast/notification
      if (confirm("New version available. Reload?")) {
        updateSW(true)
      }
    },
    onOfflineReady() {
      // Show "App ready for offline use"
    }
  })
}
```

---

## 7. Offline Behavior

### 7.1 Graceful Degradation

| Feature | Online | Offline |
|---------|--------|---------|
| View cached data | ✓ | ✓ (from cache) |
| Realtime updates | ✓ | ✗ (queue for reconnect) |
| Form submissions | ✓ | Queue for sync |
| File upload | ✓ | ✗ (show error) |

### 7.2 Background Sync (Optional)

```typescript
// For queued mutations
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
    registration.sync.register('sync-forms')
  })
}
```

---

## 8. Testing Caching

### 8.1 DevTools Verification

```
Chrome DevTools > Application > Service Workers
├── Check "Update on reload" (for development)
├── Inspect caches under "Cache Storage"
└── Simulate offline mode
```

### 8.2 Lighthouse Audit

Run Lighthouse PWA audit to verify:
- ✓ Service worker registered
- ✓ Offline functionality works
- ✓ Start URL responds correctly

---

## 9. Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Old data persists | Cache expiration too long | Reduce `maxAgeSeconds` |
| API calls fail offline | No cache fallback | Ensure NetworkFirst strategy |
| SW won't update | Browser caching SW file | Use `skipWaiting` or auto-update |
| Large media files fail | Cache quota exceeded | Limit `maxEntries` |

---

## 10. Implementation Checklist

- [ ] `vite-plugin-pwa` installed and configured
- [ ] `runtimeCaching` rules defined for all API endpoints
- [ ] `NetworkFirst` for `/api/*` routes
- [ ] `CacheFirst` for static assets (JS/CSS/images)
- [ ] Appropriate cache limits set (`maxEntries`, `maxAgeSeconds`)
- [ ] Auto-update behavior configured
- [ ] Offline fallback page (optional)
- [ ] Update notification UI implemented
