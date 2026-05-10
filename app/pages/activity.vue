<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Activity
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          {{ logs.length }} filtered runtime, task, and system events
        </p>
      </div>
      <UButton
        icon="i-lucide-refresh-cw"
        color="neutral"
        variant="ghost"
        :loading="isFetching"
        @click="refreshActivity"
      >
        Refresh
      </UButton>
    </div>

    <section class="bg-gray-800 border border-gray-700 rounded-xl p-4 mb-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <USelect
          v-model="filters.type"
          :items="eventTypeOptions"
          placeholder="Event type"
        />
        <UInput
          v-model="filters.actor"
          icon="i-lucide-user"
          placeholder="Actor contains"
        />
        <UInput
          v-model="filters.taskId"
          icon="i-lucide-list-checks"
          placeholder="Task ID"
        />
        <USelect
          v-model="filters.limit"
          :items="limitOptions"
          placeholder="Limit"
        />
      </div>
      <div class="flex justify-end mt-3">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-x"
          @click="clearFilters"
        >
          Clear filters
        </UButton>
      </div>
    </section>

    <div
      v-if="isLoading"
      class="space-y-3"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-24 bg-gray-800 rounded-xl animate-pulse"
      />
    </div>

    <div
      v-else-if="logs.length"
      class="space-y-3"
    >
      <article
        v-for="log in logs"
        :key="log.id"
        class="bg-gray-800 border border-gray-700 rounded-xl p-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-start gap-3 min-w-0">
            <div
              class="mt-1 w-2.5 h-2.5 rounded-full flex-shrink-0"
              :class="eventColor(log.type)"
            />
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2 mb-1">
                <UBadge
                  :color="eventBadgeColor(log.type)"
                  size="xs"
                  variant="soft"
                >
                  {{ eventLabel(log.type) }}
                </UBadge>
                <span class="text-xs text-gray-500">{{ log.actor }}</span>
                <span
                  v-if="log.taskId"
                  class="text-xs text-gray-600 font-mono"
                >{{ log.taskId }}</span>
              </div>
              <p class="text-sm text-white">
                {{ log.message }}
              </p>
              <p class="text-xs text-gray-500 mt-1">
                {{ formatDate(log.createdAt) }}
              </p>
            </div>
          </div>
          <UButton
            v-if="hasMetadata(log)"
            color="neutral"
            variant="ghost"
            size="xs"
            :icon="expanded.has(log.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
            @click="toggle(log.id)"
          />
        </div>

        <pre
          v-if="expanded.has(log.id)"
          class="mt-3 p-3 rounded-lg bg-gray-950 border border-gray-700 overflow-auto text-xs text-gray-300 whitespace-pre-wrap"
        >{{ prettyMetadata(log.metadata) }}</pre>
      </article>
    </div>

    <div
      v-else
      class="text-center py-16 text-gray-500"
    >
      <UIcon
        name="i-lucide-activity"
        class="w-12 h-12 mx-auto mb-3 opacity-40"
      />
      <p>No activity matches these filters</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';

interface ActivityLog {
  id: string,
  type: string,
  actor: string,
  message: string,
  taskId: string | null,
  metadata: Record<string, unknown>,
  createdAt: string
}

const queryClient = useQueryClient();
const expanded = ref(new Set<string>());
const filters = reactive<{
  type: string | undefined,
  actor: string,
  taskId: string,
  limit: string
}>({
  type: undefined,
  actor: '',
  taskId: '',
  limit: '50'
});

const eventTypeOptions = [
  { label: 'Task created', value: 'task_created' },
  { label: 'Task updated', value: 'task_updated' },
  { label: 'Task completed', value: 'task_completed' },
  { label: 'Agent started', value: 'agent_started' },
  { label: 'Agent completed', value: 'agent_completed' },
  { label: 'Cron run', value: 'cron_run' },
  { label: 'Alert', value: 'alert' }
];

const limitOptions = [
  { label: '25 events', value: '25' },
  { label: '50 events', value: '50' },
  { label: '100 events', value: '100' },
  { label: '200 events', value: '200' }
];

const queryParams = computed(() => ({
  ...(filters.type ? { type: filters.type } : {}),
  ...(filters.actor.trim() ? { actor: filters.actor.trim() } : {}),
  ...(filters.taskId.trim() ? { taskId: filters.taskId.trim() } : {}),
  limit: filters.limit
}));

const activityQueryKey = computed(() => ['activity', queryParams.value]);

const { data, isLoading, isFetching, refetch } = useQuery<ActivityLog[]>({
  queryKey: activityQueryKey,
  queryFn: () => $fetch('/api/activity', { query: queryParams.value }),
  refetchInterval: 60_000
});

const logs = computed(() => data.value || []);

useEventStream({
  task_created: invalidateActivity,
  task_updated: invalidateActivity,
  task_completed: invalidateActivity,
  agent_completed: invalidateActivity,
  alert: invalidateActivity
});

function refreshActivity() {
  refetch();
}

function invalidateActivity() {
  queryClient.invalidateQueries({ queryKey: ['activity'] });
}

function clearFilters() {
  filters.type = undefined;
  filters.actor = '';
  filters.taskId = '';
  filters.limit = '50';
  expanded.value = new Set();
}

function toggle(id: string) {
  const next = new Set(expanded.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expanded.value = next;
}

function hasMetadata(log: ActivityLog) {
  return Object.keys(log.metadata || {}).length > 0;
}

function prettyMetadata(metadata: Record<string, unknown>) {
  return JSON.stringify(metadata, null, 2);
}

function eventLabel(type: string) {
  return type.replace(/_/g, ' ');
}

function eventColor(type: string) {
  if (type === 'task_completed' || type === 'agent_completed') return 'bg-green-500';
  if (type === 'alert') return 'bg-red-500';
  if (type === 'task_updated') return 'bg-blue-400';
  return 'bg-gray-500';
}

function eventBadgeColor(type: string) {
  if (type === 'task_completed' || type === 'agent_completed') return 'success';
  if (type === 'alert') return 'error';
  if (type === 'task_updated') return 'info';
  return 'neutral';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}
</script>
