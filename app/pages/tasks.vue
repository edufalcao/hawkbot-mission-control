<template>
  <div>
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Tasks Board
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          {{ totalTasks }} tasks · {{ doneTasks }} completed
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="showCreateModal = true"
      >
        New Task
      </UButton>
    </div>

    <!-- Loading -->
    <div
      v-if="pending && !tasks"
      class="flex gap-5 overflow-x-auto pb-4"
    >
      <div
        v-for="col in COLUMNS"
        :key="col.id"
        class="flex-shrink-0 w-72"
      >
        <div class="h-8 bg-gray-800 rounded animate-pulse mb-3" />
        <div
          v-for="i in 2"
          :key="i"
          class="h-24 bg-gray-800 rounded-lg animate-pulse mb-2"
        />
      </div>
    </div>

    <!-- Kanban board -->
    <div
      v-else
      class="flex gap-5 overflow-x-auto pb-4"
    >
      <div
        v-for="col in COLUMNS"
        :key="col.id"
        class="flex-shrink-0 w-72"
      >
        <!-- Column header -->
        <div class="flex items-center gap-2 mb-3 px-1">
          <span class="text-lg">{{ col.emoji }}</span>
          <span class="font-semibold text-sm text-gray-300">{{ col.label }}</span>
          <UBadge
            :color="col.color"
            size="xs"
            class="ml-auto"
          >
            {{ columnTasks[col.id]?.length || 0 }}
          </UBadge>
        </div>

        <!-- Draggable column -->
        <VueDraggable
          v-model="columnTasks[col.id]"
          group="tasks"
          :animation="150"
          ghost-class="opacity-40"
          drag-class="rotate-1"
          chosen-class="scale-105"
          class="min-h-16 space-y-2 rounded-xl p-1"
          :class="isDragging ? 'ring-1 ring-gray-600 ring-inset' : ''"
          @start="isDragging = true"
          @end="onDragEnd"
        >
          <div
            v-for="task in columnTasks[col.id]"
            :key="task.id"
            :class="isDragging ? 'cursor-grabbing' : 'cursor-grab'"
          >
            <TaskCard
              :task="task"
              @update="handleUpdate"
              @delete="handleDelete"
            />
          </div>
        </VueDraggable>

        <!-- Empty placeholder (outside draggable to avoid conflicts) -->
        <div
          v-if="!columnTasks[col.id]?.length && !isDragging"
          class="rounded-lg p-3 text-center text-xs text-gray-600 -mt-1"
        >
          No tasks
        </div>
      </div>
    </div>

    <!-- Create Task Modal -->
    <TaskCreateModal
      v-model="showCreateModal"
      @created="refetch"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import { useQuery, useQueryClient } from '@tanstack/vue-query';

interface Task {
  id: string,
  title: string,
  description?: string,
  status: string,
  assignee: string,
  priority: string,
  tags: string[],
  createdAt: string
}

type ColumnId = 'todo' | 'in_progress' | 'review' | 'done';

const COLUMNS: { id: ColumnId, label: string, emoji: string, color: 'neutral' | 'warning' | 'info' | 'success' }[] = [
  { id: 'todo', label: 'To Do', emoji: '📋', color: 'neutral' },
  { id: 'in_progress', label: 'In Progress', emoji: '⚡', color: 'warning' },
  { id: 'review', label: 'Review', emoji: '👀', color: 'info' },
  { id: 'done', label: 'Done', emoji: '✅', color: 'success' }
];

const showCreateModal = ref(false);
const isDragging = ref(false);

// Per-column local task lists (needed for vue-draggable-plus v-model)
const columnTasks = ref<{ [K in ColumnId]: Task[] }>({
  todo: [],
  in_progress: [],
  review: [],
  done: []
});

const queryClient = useQueryClient();

const { data: tasks, isLoading: pending, refetch } = useQuery({
  queryKey: ['tasks'],
  queryFn: () => $fetch<Task[]>('/api/tasks'),
  refetchInterval: 60000,
  refetchIntervalInBackground: false
});

// Sync server data → local column lists
watch(tasks, (val) => {
  if (!val) return;
  for (const col of COLUMNS) {
    columnTasks.value[col.id] = val.filter(t => t.status === col.id);
  }
}, { immediate: true });

// SSE-driven invalidation for instant updates
const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ['tasks'] });
useEventStream({
  task_created: invalidateTasks,
  task_updated: invalidateTasks,
  task_completed: invalidateTasks,
  task_deleted: invalidateTasks
});

const totalTasks = computed(() => tasks.value?.length || 0);
const doneTasks = computed(() => columnTasks.value['done']?.length || 0);

async function onDragEnd() {
  isDragging.value = false;

  // After vue-draggable-plus updates columnTasks v-model,
  // compare local state vs server state to find what moved
  const serverTasks = tasks.value || [];
  const patches: Promise<unknown>[] = [];

  for (const col of COLUMNS) {
    for (const task of columnTasks.value[col.id] || []) {
      const serverTask = serverTasks.find((t: Task) => t.id === task.id);
      if (serverTask && serverTask.status !== col.id) {
        task.status = col.id; // keep local in sync
        patches.push(
          $fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            body: { status: col.id }
          })
        );
      }
    }
  }

  if (patches.length) {
    await Promise.all(patches);
    await refetch();
  }
}

async function handleUpdate({ id, ...data }: { id: string, status?: string }) {
  await $fetch(`/api/tasks/${id}`, { method: 'PATCH', body: data });
  await refetch();
}

async function handleDelete(id: string) {
  await $fetch(`/api/tasks/${id}`, { method: 'DELETE' });
  await refetch();
}
</script>
