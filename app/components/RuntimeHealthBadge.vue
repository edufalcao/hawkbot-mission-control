<template>
  <NuxtLink
    to="/settings"
    class="block rounded-lg border border-gray-800 bg-gray-950/60 p-3 hover:border-gray-700 hover:bg-gray-900 transition-colors"
    :title="summary.detail"
  >
    <div class="flex items-center justify-between gap-2 mb-2">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-2 h-2 rounded-full shrink-0"
          :class="overallDotClass"
        />
        <span class="text-xs font-medium text-gray-300 truncate">{{ summary.label }}</span>
      </div>
      <span class="i-lucide-chevron-right w-3 h-3 text-gray-500 shrink-0" />
    </div>

    <div
      v-if="summary.badges.length"
      class="grid grid-cols-2 gap-1.5"
    >
      <div
        v-for="badge in summary.badges"
        :key="badge.provider"
        class="flex items-center gap-1.5 rounded-md bg-gray-900 px-2 py-1 text-[11px] text-gray-300"
      >
        <span
          class="w-1.5 h-1.5 rounded-full shrink-0"
          :class="badgeDotClass(badge.status)"
        />
        <span class="truncate">{{ badge.label }}</span>
      </div>
    </div>

    <p
      v-else
      class="text-[11px] text-gray-500"
    >
      Checking Hermes and OpenClaw...
    </p>
  </NuxtLink>
</template>

<script setup lang="ts">
import type { RuntimeBadgeStatus, RuntimeHealthSummary } from '../utils/runtimeStatus';

const props = defineProps<{
  summary: RuntimeHealthSummary
}>();

const overallDotClass = computed(() => {
  if (props.summary.status === 'ready') return 'bg-green-500 animate-pulse';
  if (props.summary.status === 'warning') return 'bg-amber-500';
  if (props.summary.status === 'error') return 'bg-red-500';
  return 'bg-gray-500 animate-pulse';
});

function badgeDotClass(status: RuntimeBadgeStatus) {
  if (status === 'ready') return 'bg-green-500';
  if (status === 'warning') return 'bg-amber-500';
  return 'bg-red-500';
}
</script>
