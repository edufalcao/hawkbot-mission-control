<template>
  <div class="rounded-lg border border-gray-700 bg-gray-900/70 p-3">
    <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">
      {{ label }}
    </p>
    <p class="text-sm font-semibold text-white truncate">
      {{ value }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string,
  value: string
}>();
</script>
