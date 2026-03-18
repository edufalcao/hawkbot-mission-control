<template>
  <div class="min-h-screen bg-gray-950 text-gray-100 flex">
    <!-- Sidebar -->
    <aside class="w-60 bg-gray-900 border-r border-gray-800 flex flex-col fixed h-full z-10">
      <!-- Logo -->
      <div class="px-5 py-4 border-b border-gray-800">
        <div class="flex items-center gap-2">
          <span class="text-2xl">🦅</span>
          <div>
            <p class="font-bold text-white text-sm leading-tight">
              Mission Control
            </p>
            <p class="text-xs text-gray-400">
              HawkBot
            </p>
          </div>
        </div>
      </div>

      <!-- Nav -->
      <nav class="flex-1 px-3 py-4 space-y-1">
        <NavItem
          to="/tasks"
          icon="i-lucide-kanban"
          label="Tasks"
        />
        <NavItem
          to="/calendar"
          icon="i-lucide-calendar"
          label="Calendar"
        />
        <NavItem
          to="/content"
          icon="i-lucide-film"
          label="Content Pipeline"
        />
        <NavItem
          to="/memory"
          icon="i-lucide-brain"
          label="Memory"
        />
        <NavItem
          to="/team"
          icon="i-lucide-users"
          label="Team"
        />
        <NavItem
          to="/office"
          icon="i-lucide-building-2"
          label="Office"
        />
        <NavItem
          to="/settings"
          icon="i-lucide-settings"
          label="Settings"
        />
      </nav>

      <!-- Live indicator -->
      <div class="px-4 py-3 border-t border-gray-800">
        <div class="flex items-center gap-2 text-xs text-gray-400">
          <span class="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Gateway connected
        </div>
      </div>
    </aside>

    <!-- Main content -->
    <main class="flex-1 ml-60 p-6 overflow-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
// Layout
</script>
