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
          <UFormField label="Delegate via">
            <USelect
              v-model="form.runtimeProvider"
              :items="runtimeProviderOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Assignee">
            <USelect
              v-model="form.assignee"
              :items="assigneeOptions"
              class="w-full"
            />
          </UFormField>

          <p class="col-span-2 text-xs text-gray-500 -mt-2">
            Runtime is configured on the selected team member. Pick Hermes/OpenClaw here to filter available agents.
          </p>

          <p
            v-if="runtimeWarning"
            class="col-span-2 text-xs text-amber-400 -mt-2"
          >
            {{ runtimeWarning }}
          </p>

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
  memberType: string,
  runtimeProvider?: 'openclaw' | 'hermes' | 'manual' | null
}

const open = defineModel<boolean>();
const emit = defineEmits<{ created: [] }>();

const loading = ref(false);
const error = ref('');
const tagsInput = ref('');

const form = reactive({
  title: '',
  description: '',
  runtimeProvider: 'any' as 'any' | 'openclaw' | 'hermes' | 'manual',
  assignee: '',
  priority: 'none'
});

const { data: teamData } = useQuery({
  queryKey: ['team'],
  queryFn: () => $fetch<TeamMember[]>('/api/team')
});

const runtimeProviderOptions = [
  { label: 'Any runtime', value: 'any' },
  { label: 'Hermes agents', value: 'hermes' },
  { label: 'OpenClaw agents', value: 'openclaw' },
  { label: 'Manual / human', value: 'manual' }
];

function effectiveRuntime(member: TeamMember) {
  if (member.memberType === 'human') return 'manual';
  return member.runtimeProvider || 'openclaw';
}

function runtimeLabel(provider: string) {
  if (provider === 'hermes') return 'Hermes';
  if (provider === 'manual') return 'Manual';
  return 'OpenClaw';
}

const filteredMembers = computed(() => {
  const members = teamData.value || [];
  if (form.runtimeProvider === 'any') return members;
  return members.filter(m => effectiveRuntime(m) === form.runtimeProvider);
});

const runtimeWarning = computed(() => {
  if (form.runtimeProvider === 'any' || filteredMembers.value.length > 0) return '';
  return `No ${runtimeLabel(form.runtimeProvider)} assignees found. Add/configure one in Team first.`;
});

const assigneeOptions = computed(() => {
  return filteredMembers.value.map(m => ({
    label: `${m.emoji} ${m.name} · ${runtimeLabel(effectiveRuntime(m))}`,
    value: m.id
  }));
});

// Set default assignee when team data or runtime filter changes
watch([teamData, () => form.runtimeProvider], () => {
  const members = filteredMembers.value;
  const currentStillVisible = members.some(m => m.id === form.assignee);
  if (members.length && (!form.assignee || !currentStillVisible)) {
    const firstHuman = members.find(m => m.memberType === 'human');
    form.assignee = firstHuman?.id ?? members[0]!.id;
  } else if (!members.length) {
    form.assignee = '';
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
  form.runtimeProvider = 'any';
  // Reset assignee to default (first human member)
  const members = filteredMembers.value;
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
