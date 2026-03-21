<script setup lang="ts">
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

defineOptions({
  inheritAttrs: false,
});
</script>

<template>
  <SidebarProvider>
    <div class="flex h-screen min-h-0 w-full overflow-hidden bg-background">
      <Sidebar class="h-full border-r" collapsible="icon">
        <SidebarHeader>
          <slot name="sidebar-header" />
        </SidebarHeader>

        <SidebarContent>
          <slot name="sidebar" />
        </SidebarContent>

        <SidebarFooter>
          <slot name="sidebar-footer" />
        </SidebarFooter>
      </Sidebar>

      <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div class="flex items-center gap-2 border-b bg-background p-4">
          <SidebarTrigger />
          <div class="min-w-0 flex-1">
            <slot name="header" />
          </div>
        </div>

        <main class="min-h-0 flex-1 overflow-auto">
          <div class="min-h-full p-6">
            <slot />
          </div>
        </main>

        <div class="border-t bg-background p-4 text-xs">
          <slot name="footer" />
        </div>
      </div>
    </div>
  </SidebarProvider>
</template>
