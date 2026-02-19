<template>
  <div class="bg-gray-800 border border-gray-700 rounded-lg p-3 hover:border-gray-500 transition-colors group">
    <!-- Priority indicator + assignee -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <span
          v-if="task.priority !== 'none'"
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="{
            'bg-red-500': task.priority === 'high',
            'bg-amber-500': task.priority === 'medium',
            'bg-blue-500': task.priority === 'low'
          }"
        />
        <UBadge
          :color="task.assignee === 'hawkbot' ? 'violet' : 'gray'"
          size="xs"
          variant="subtle"
        >
          {{ task.assignee === 'hawkbot' ? '🦅 HawkBot' : '👤 Eduardo' }}
        </UBadge>
      </div>

      <!-- Actions (visible on hover) -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
        <UDropdownMenu :items="actionItems">
          <UButton icon="i-lucide-more-horizontal" color="gray" variant="ghost" size="xs" />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Title -->
    <p class="text-sm text-gray-100 font-medium leading-snug mb-2">{{ task.title }}</p>

    <!-- Description preview -->
    <p v-if="task.description" class="text-xs text-gray-400 mb-2 line-clamp-2">
      {{ task.description }}
    </p>

    <!-- Tags -->
    <div v-if="task.tags?.length" class="flex flex-wrap gap-1 mb-2">
      <UBadge
        v-for="tag in task.tags"
        :key="tag"
        color="gray"
        size="xs"
        variant="solid"
      >
        {{ tag }}
      </UBadge>
    </div>

    <!-- Date -->
    <p class="text-xs text-gray-500">
      {{ formatDate(task.createdAt) }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  task: {
    id: string
    title: string
    description?: string
    status: string
    assignee: string
    priority: string
    tags: string[]
    createdAt: string
  }
}>()

const emit = defineEmits<{
  update: [data: { id: string; status?: string }]
  delete: [id: string]
}>()

const STATUS_TRANSITIONS: Record<string, string[]> = {
  todo: ['in_progress'],
  in_progress: ['review', 'done'],
  review: ['in_progress', 'done'],
  done: []
}

const actionItems = computed(() => {
  const transitions = STATUS_TRANSITIONS[props.task.status] || []
  const STATUS_LABELS: Record<string, string> = {
    in_progress: '⚡ Move to In Progress',
    review: '👀 Move to Review',
    done: '✅ Mark as Done'
  }

  return [
    ...transitions.map(s => ({
      label: STATUS_LABELS[s],
      click: () => emit('update', { id: props.task.id, status: s })
    })),
    ...(transitions.length ? [{ type: 'separator' as const }] : []),
    {
      label: '🗑 Delete',
      click: () => emit('delete', props.task.id)
    }
  ]
})

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
</script>
