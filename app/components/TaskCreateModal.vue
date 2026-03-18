<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4">
        <h2 class="text-lg font-bold text-white">
          New Task
        </h2>

        <UFormField
          label="Title"
          required
        >
          <UInput
            v-model="form.title"
            placeholder="What needs to be done?"
            autofocus
            class="w-full"
            @keydown.enter="submit"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Optional details..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Assignee">
            <USelect
              v-model="form.assignee"
              :items="assigneeOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Priority">
            <USelect
              v-model="form.priority"
              :items="priorityOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField
          label="Tags"
          hint="Comma separated"
        >
          <UInput
            v-model="tagsInput"
            placeholder="frontend, bug, feature"
            class="w-full"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-xs text-red-400"
        >
          {{ error }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="open = false"
          >
            Cancel
          </UButton>
          <UButton
            :loading="loading"
            :disabled="!form.title.trim() || !form.assignee"
            @click="submit"
          >
            Create Task
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query';

interface TeamMember {
  id: string,
  name: string,
  emoji: string,
  memberType: string
}

const open = defineModel<boolean>();
const emit = defineEmits<{ created: [] }>();

const loading = ref(false);
const error = ref('');
const tagsInput = ref('');

const form = reactive({
  title: '',
  description: '',
  assignee: '',
  priority: 'none'
});

const { data: teamData } = useQuery({
  queryKey: ['team'],
  queryFn: () => $fetch<TeamMember[]>('/api/team')
});

const assigneeOptions = computed(() => {
  if (!teamData.value) return [];
  return teamData.value.map(m => ({
    label: `${m.emoji} ${m.name}`,
    value: m.id
  }));
});

// Set default assignee when team data loads
watch(teamData, (members) => {
  if (members?.length && !form.assignee) {
    const firstHuman = members.find(m => m.memberType === 'human');
    form.assignee = firstHuman?.id ?? members[0]!.id;
  }
}, { immediate: true });

const priorityOptions = [
  { label: '— None', value: 'none' },
  { label: '🔴 High', value: 'high' },
  { label: '🟡 Medium', value: 'medium' },
  { label: '🔵 Low', value: 'low' }
];

async function submit() {
  if (!form.title.trim() || !form.assignee) return;
  loading.value = true;
  error.value = '';

  try {
    await $fetch('/api/tasks', {
      method: 'POST',
      body: {
        ...form,
        tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
      }
    });
    emit('created');
    open.value = false;
    resetForm();
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } };
    error.value = fetchError?.data?.message || 'Failed to create task. Try again.';
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.title = '';
  form.description = '';
  // Reset assignee to default (first human member)
  const members = teamData.value;
  if (members?.length) {
    const firstHuman = members.find(m => m.memberType === 'human');
    form.assignee = firstHuman?.id ?? members[0]!.id;
  } else {
    form.assignee = '';
  }
  form.priority = 'none';
  tagsInput.value = '';
  error.value = '';
}
</script>
