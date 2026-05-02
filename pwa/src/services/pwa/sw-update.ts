/**
 * Service de gestion des mises à jour du Service Worker PWA
 * 
 * Fournit :
 * - Détection des nouvelles versions
 * - Notification des mises à jour disponibles
 * - Rechargement contrôlé de l'application
 */

import { ref, computed } from "vue";

// État réactif
const updateAvailable = ref(false);
const updatePending = ref(false);
const offlineReady = ref(false);

export const useSwUpdate = () => {
  return {
    updateAvailable: computed(() => updateAvailable.value),
    updatePending: computed(() => updatePending.value),
    offlineReady: computed(() => offlineReady.value),
    applyUpdate,
    dismissUpdate,
    checkForUpdates
  };
};

/**
 * Applique la mise à jour et recharge la page
 */
function applyUpdate(): void {
  if (!updateAvailable.value) return;
  
  updatePending.value = true;
  
  // Recharger la page pour activer le nouveau SW
  window.location.reload();
}

/**
 * Ignore la mise à jour disponible
 */
function dismissUpdate(): void {
  updateAvailable.value = false;
}

/**
 * Vérifie manuellement les mises à jour
 * (utile pour un bouton "Vérifier les mises à jour")
 */
async function checkForUpdates(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
    return updateAvailable.value;
  } catch (error) {
    console.error("[PWA] Failed to check for updates:", error);
    return false;
  }
}

/**
 * Enregistre le service worker avec gestion des mises à jour
 * À appeler au démarrage de l'application (main.ts)
 */
export async function registerSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    console.log("[PWA] Service workers not supported");
    return;
  }
  
  try {
    const { registerSW: viteRegisterSW } = await import("virtual:pwa-register");
    
    viteRegisterSW({
      // Callback quand une mise à jour est disponible
      onNeedRefresh() {
        console.log("[PWA] Update available");
        updateAvailable.value = true;
      },
      
      // Callback quand le SW est prêt (contenu en cache)
      onOfflineReady() {
        console.log("[PWA] App ready to work offline");
        offlineReady.value = true;
      },
      
      // Callback d'erreur
      onRegisterError(error) {
        console.error("[PWA] Service worker registration failed:", error);
      }
    });
    
    // Écouter les messages du SW (pour le debugging)
    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data?.type === "CACHE_UPDATED") {
        console.log("[PWA] Cache updated:", event.data.payload);
      }
    });
    
  } catch (error) {
    console.error("[PWA] Failed to register service worker:", error);
  }
}

/**
 * Force le nettoyage des caches (utile pour le debugging)
 */
export async function clearAllCaches(): Promise<void> {
  if (!("caches" in window)) return;
  
  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map(name => caches.delete(name)));
    console.log("[PWA] All caches cleared");
  } catch (error) {
    console.error("[PWA] Failed to clear caches:", error);
  }
}

/**
 * Désinscrit tous les service workers (pour le debugging)
 */
export async function unregisterAllSW(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(r => r.unregister()));
    console.log("[PWA] All service workers unregistered");
  } catch (error) {
    console.error("[PWA] Failed to unregister service workers:", error);
  }
}
