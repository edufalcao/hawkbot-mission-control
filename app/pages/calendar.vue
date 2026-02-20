<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Calendar
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          Cron jobs & scheduled tasks
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        :loading="pending"
        @click="() => refresh()"
      >
        Sync
      </UButton>
    </div>

    <div
      v-if="pending"
      class="space-y-2"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-16 bg-gray-800 rounded-lg animate-pulse"
      />
    </div>

    <div
      v-else-if="events.length"
      class="space-y-2"
    >
      <div
        v-for="event in events"
        :key="event.id"
        class="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 flex items-center gap-4"
      >
        <div
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="statusColor(event.status)"
        />
        <div class="flex-1 min-w-0">
          <p class="text-sm font-medium text-white truncate">
            {{ event.title }}
          </p>
          <p class="text-xs text-gray-400">
            {{ event.cronExpr || event.recurring || 'One-time' }}
            <span v-if="event.nextRun"> · Next: {{ formatDate(event.nextRun) }}</span>
          </p>
        </div>
        <UBadge
          :color="event.status === 'scheduled' ? 'success' : 'neutral'"
          size="xs"
        >
          {{ event.status }}
        </UBadge>
      </div>
    </div>

    <div
      v-else
      class="text-center py-16 text-gray-500"
    >
      <UIcon
        name="i-lucide-calendar-off"
        class="w-12 h-12 mx-auto mb-3 opacity-40"
      />
      <p>No scheduled jobs found</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data, pending, refresh } = useFetch('/api/calendar')

const events = computed(() => data.value?.events || [])

function statusColor(status: string) {
  return {
    scheduled: 'bg-green-500',
    completed: 'bg-blue-500',
    failed: 'bg-red-500',
    disabled: 'bg-gray-500'
  }[status] || 'bg-gray-500'
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}
</script>
