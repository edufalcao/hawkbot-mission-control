<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">Tasks Board</h1>
        <p class="text-gray-400 text-sm mt-0.5">{{ totalTasks }} tasks · {{ doneTasks }} completed</p>
      </div>
      <UButton icon="i-lucide-plus" @click="showCreateModal = true">
        New Task
      </UButton>
    </div>

    <!-- Loading -->
    <div v-if="pending" class="flex gap-5 overflow-x-auto pb-4">
      <div v-for="col in COLUMNS" :key="col.id" class="flex-shrink-0 w-72">
        <div class="h-8 bg-gray-800 rounded animate-pulse mb-3" />
        <div v-for="i in 2" :key="i" class="h-24 bg-gray-800 rounded-lg animate-pulse mb-2" />
      </div>
    </div>

    <!-- Kanban board -->
    <div v-else class="flex gap-5 overflow-x-auto pb-4">
      <div v-for="col in COLUMNS" :key="col.id" class="flex-shrink-0 w-72">
        <!-- Column header -->
        <div class="flex items-center gap-2 mb-3 px-1">
          <span class="text-lg">{{ col.emoji }}</span>
          <span class="font-semibold text-sm text-gray-300">{{ col.label }}</span>
          <UBadge :color="col.color" size="xs" class="ml-auto">
            {{ tasksByStatus[col.id]?.length || 0 }}
          </UBadge>
        </div>

        <!-- Task cards -->
        <div class="space-y-2 min-h-16">
          <TaskCard
            v-for="task in tasksByStatus[col.id]"
            :key="task.id"
            :task="task"
            @update="handleUpdate"
            @delete="handleDelete"
          />
          <div
            v-if="!tasksByStatus[col.id]?.length"
            class="border border-dashed border-gray-700 rounded-lg p-4 text-center text-xs text-gray-500"
          >
            Empty
          </div>
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <TaskCreateModal v-model="showCreateModal" @created="refetch" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useQuery } from '@tanstack/vue-query'

const COLUMNS = [
  { id: 'todo', label: 'To Do', emoji: '📋', color: 'neutral' as const },
  { id: 'in_progress', label: 'In Progress', emoji: '⚡', color: 'warning' as const },
  { id: 'review', label: 'Review', emoji: '👀', color: 'info' as const },
  { id: 'done', label: 'Done', emoji: '✅', color: 'success' as const }
]

const showCreateModal = ref(false)

const { data: tasks, pending, refetch } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => $fetch<any[]>('/api/tasks'),
  refetchInterval: 10000,
  refetchIntervalInBackground: true
})

// Fallback: manual polling every 10s
onMounted(() => {
  const timer = setInterval(() => refetch(), 10000)
  onUnmounted(() => clearInterval(timer))
})

const tasksByStatus = computed(() => {
  const map: Record<string, any[]> = {}
  for (const col of COLUMNS) {
    map[col.id] = (tasks.value || []).filter(t => t.status === col.id)
  }
  return map
})

const totalTasks = computed(() => tasks.value?.length || 0)
const doneTasks = computed(() => tasksByStatus.value['done']?.length || 0)

async function handleUpdate({ id, ...data }: any) {
  await $fetch(`/api/tasks/${id}`, { method: 'PATCH', body: data })
  await refetch()
}

async function handleDelete(id: string) {
  await $fetch(`/api/tasks/${id}`, { method: 'DELETE' })
  await refetch()
}
</script>
