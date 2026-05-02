import path from "node:path";
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		vue(),
		VitePWA({
			registerType: "autoUpdate",
			manifest: {
				name: "Asaje PWA",
				short_name: "Asaje",
				description: "Optional end-user PWA surface for the Asaje boilerplate",
				start_url: "/",
				display: "standalone",
				theme_color: "#111827",
				background_color: "#ffffff",
				icons: [
					{
						src: "/icons/icon-192.svg",
						sizes: "192x192",
						type: "image/svg+xml",
						purpose: "any",
					},
					{
						src: "/icons/icon-512.svg",
						sizes: "512x512",
						type: "image/svg+xml",
						purpose: "any maskable",
					},
				],
			},
			workbox: {
				// Pré-cache des assets de build
				globPatterns: [
					"**/*.{js,css,html,svg,png,jpg,jpeg,gif,webp,woff,woff2}",
				],
				navigateFallback: "index.html",
				navigateFallbackDenylist: [/^\/api/, /^\/media/, /^\/rt\/sse/],
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
				// Stratégies de runtime caching
				runtimeCaching: [
					// API : NetworkFirst - données fraîches prioritaires
					{
						urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
						handler: "NetworkFirst",
						options: {
							cacheName: "api-cache",
							networkTimeoutSeconds: 5,
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24, // 24 heures
							},
							cacheableResponse: {
								statuses: [0, 200],
							},
						},
					},
					// Médias : StaleWhileRevalidate - rapide + mise à jour en arrière-plan
					{
						urlPattern: ({ url }) =>
							url.pathname.startsWith("/media/") ||
							/\.(?:png|jpg|jpeg|gif|webp|svg|mp4|webm)$/i.test(url.pathname),
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "media-cache",
							expiration: {
								maxEntries: 200,
								maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours
							},
						},
					},
					// Google Fonts : CacheFirst - stable
					{
						urlPattern: ({ url }) =>
							url.origin === "https://fonts.googleapis.com" ||
							url.origin === "https://fonts.gstatic.com",
						handler: "CacheFirst",
						options: {
							cacheName: "google-fonts-cache",
							expiration: {
								maxEntries: 10,
								maxAgeSeconds: 60 * 60 * 24 * 365, // 1 an
							},
						},
					},
					// CDN externes : StaleWhileRevalidate
					{
						urlPattern: ({ url }) =>
							url.origin !== self.location.origin &&
							!url.pathname.startsWith("/api/"),
						handler: "StaleWhileRevalidate",
						options: {
							cacheName: "cdn-cache",
							expiration: {
								maxEntries: 50,
								maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
							},
						},
					},
				],
			},
			// Détection et gestion des mises à jour
			devOptions: {
				enabled: false,
			},
		}),
	],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 4174,
	},
});
