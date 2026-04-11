<template>
  <main class="page">
    <section class="panel hero">
      <p class="eyebrow">Optional PWA</p>
      <h1>{{ appName }}</h1>
      <p>This starter surface is intended for authenticated end-user journeys, mobile-friendly flows and installable app experiences.</p>
      <div class="actions">
        <router-link class="button" to="/account">Open account shell</router-link>
        <router-link class="button secondary" to="/notifications">Open notifications</router-link>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
const appName = import.meta.env.VITE_APP_NAME || "Asaje PWA";
</script>
