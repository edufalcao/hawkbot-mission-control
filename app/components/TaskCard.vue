<template>
  <div class="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 transition-colors group">
    <!-- Priority + assignee -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <span
          v-if="task.priority !== 'none'"
          class="w-2 h-2 rounded-full flex-shrink-0"
          :class="{
            'bg-red-500': task.priority === 'high',
            'bg-amber-500': task.priority === 'medium',
            'bg-blue-400': task.priority === 'low'
          }"
        />
        <UBadge
          :color="assigneeMember?.memberType === 'agent' ? 'secondary' : 'neutral'"
          size="xs"
          variant="subtle"
        >
          {{ assigneeMember ? `${assigneeMember.emoji} ${assigneeMember.name}` : task.assignee }}
        </UBadge>
      </div>

      <!-- Actions -->
      <div class="opacity-0 group-hover:opacity-100 transition-opacity">
        <UDropdownMenu :items="actionItems">
          <UButton
            icon="i-lucide-more-horizontal"
            color="neutral"
            variant="ghost"
            size="xs"
          />
        </UDropdownMenu>
      </div>
    </div>

    <!-- Title -->
    <p class="text-sm text-gray-100 font-medium leading-snug mb-2">
      {{ task.title }}
    </p>

    <!-- Description -->
    <p
      v-if="task.description"
      class="text-xs text-gray-400 mb-2 line-clamp-2"
    >
      {{ task.description }}
    </p>

    <!-- Tags -->
    <div
      v-if="task.tags?.length"
      class="flex flex-wrap gap-1 mb-2"
    >
      <UBadge
        v-for="tag in task.tags"
        :key="tag"
        color="neutral"
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
interface TeamMember {
  id: string,
  name: string,
  emoji: string,
  memberType: string
}

const props = defineProps<{
  task: {
    id: string,
    title: string,
    description?: string,
    status: string,
    assignee: string,
    priority: string,
    tags: string[],
    createdAt: string
  },
  teamMembers: TeamMember[]
}>();

const emit = defineEmits<{
  update: [data: { id: string, status?: string }],
  delete: [id: string]
}>();

const assigneeMember = computed(() => {
  return props.teamMembers.find(m => m.id === props.task.assignee);
});

const STATUS_NEXT: Record<string, { label: string, value: string }[]> = {
  todo: [{ label: '⚡ Start', value: 'in_progress' }],
  in_progress: [
    { label: '👀 Send to Review', value: 'review' },
    { label: '✅ Mark Done', value: 'done' }
  ],
  review: [
    { label: '⚡ Back to In Progress', value: 'in_progress' },
    { label: '✅ Mark Done', value: 'done' }
  ],
  done: []
};

const actionItems = computed(() => {
  const transitions = STATUS_NEXT[props.task.status] || [];
  return [
    ...transitions.map(t => ({
      label: t.label,
      onSelect: () => emit('update', { id: props.task.id, status: t.value })
    })),
    ...(transitions.length ? [{ type: 'separator' as const }] : []),
    {
      label: '🗑 Delete',
      class: 'text-red-400',
      onSelect: () => emit('delete', props.task.id)
    }
  ];
});

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
}
</script>
