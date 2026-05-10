<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-5 max-w-3xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white">
              Task Output
            </h2>
            <p class="text-sm text-gray-400 mt-1">
              {{ detail?.task.title || 'Loading task details...' }}
            </p>
          </div>
          <UBadge
            v-if="detail?.task.status"
            color="neutral"
            variant="soft"
          >
            {{ detail.task.status.replace('_', ' ') }}
          </UBadge>
        </div>

        <div
          v-if="loading"
          class="space-y-3"
        >
          <div class="h-20 bg-gray-800 rounded-lg animate-pulse" />
          <div class="h-40 bg-gray-800 rounded-lg animate-pulse" />
        </div>

        <div
          v-else-if="error"
          class="rounded-lg border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300"
        >
          {{ error }}
        </div>

        <div
          v-else-if="detail"
          class="space-y-4"
        >
          <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <OutputMetric
              label="Provider"
              :value="detail.output.provider || '—'"
            />
            <OutputMetric
              label="Duration"
              :value="formatDuration(detail.output.durationMs)"
            />
            <OutputMetric
              label="Exit"
              :value="formatExit(detail.output)"
            />
            <OutputMetric
              label="Events"
              :value="String(detail.logs.length)"
            />
          </section>

          <section
            v-if="detail.output.command"
            class="rounded-lg border border-gray-700 bg-gray-900/70 p-3"
          >
            <p class="text-xs uppercase tracking-wide text-gray-500 mb-1">
              Command
            </p>
            <code class="text-xs text-gray-300 break-all">{{ detail.output.command }}</code>
          </section>

          <section
            v-if="detail.output.error"
            class="rounded-lg border border-red-900/70 bg-red-950/30 p-3"
          >
            <p class="text-xs uppercase tracking-wide text-red-400 mb-1">
              Error
            </p>
            <p class="text-sm text-red-200">
              {{ detail.output.error }}
            </p>
          </section>

          <section class="space-y-3">
            <OutputBlock
              title="stdout"
              :content="detail.output.stdoutTail"
              empty-label="No stdout captured"
            />
            <OutputBlock
              title="stderr"
              :content="detail.output.stderrTail"
              empty-label="No stderr captured"
            />
          </section>

          <section>
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold text-white">
                Task activity
              </h3>
              <span class="text-xs text-gray-500">latest first</span>
            </div>
            <div class="space-y-2 max-h-56 overflow-auto pr-1">
              <article
                v-for="log in detail.logs"
                :key="log.id"
                class="rounded-lg border border-gray-700 bg-gray-900/50 p-3"
              >
                <div class="flex items-center justify-between gap-3 mb-1">
                  <UBadge
                    color="neutral"
                    size="xs"
                    variant="soft"
                  >
                    {{ log.type.replaceAll('_', ' ') }}
                  </UBadge>
                  <span class="text-xs text-gray-500">{{ formatDate(log.createdAt) }}</span>
                </div>
                <p class="text-sm text-gray-200">
                  {{ log.message }}
                </p>
                <p class="text-xs text-gray-500 mt-1">
                  {{ log.actor }}
                </p>
              </article>
            </div>
          </section>
        </div>

        <div class="flex justify-end pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="open = false"
          >
            Close
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface TaskOutputLog {
  id: string,
  type: string,
  actor: string,
  message: string,
  createdAt: string,
  metadata: Record<string, unknown>
}

interface TaskOutputSummary {
  provider: string | null,
  command: string | null,
  durationMs: number | null,
  exitCode: number | null,
  error: string | null,
  stdoutTail: string,
  stderrTail: string,
  hasOutput: boolean
}

interface TaskOutputDetail {
  task: {
    id: string,
    title: string,
    description?: string,
    status: string,
    priority: string,
    tags: string[]
  },
  output: TaskOutputSummary,
  logs: TaskOutputLog[]
}

const props = defineProps<{
  taskId: string | null
}>();

const open = defineModel<boolean>();
const detail = ref<TaskOutputDetail | null>(null);
const loading = ref(false);
const error = ref('');

watch([open, () => props.taskId], async ([isOpen, taskId]) => {
  if (!isOpen || !taskId) return;
  loading.value = true;
  error.value = '';
  try {
    detail.value = await $fetch<TaskOutputDetail>(`/api/tasks/${taskId}/output`);
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } };
    error.value = fetchError?.data?.message || 'Failed to load task output.';
  } finally {
    loading.value = false;
  }
}, { immediate: true });

function formatDuration(durationMs: number | null) {
  if (durationMs == null) return '—';
  if (durationMs < 1000) return `${durationMs}ms`;
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function formatExit(output: TaskOutputSummary) {
  if (output.error) return 'error';
  if (output.exitCode == null) return 'success';
  return String(output.exitCode);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>
