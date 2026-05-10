<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4">
        <h2 class="text-lg font-bold text-white">
          {{ isEdit ? 'Edit Member' : 'Add Member' }}
        </h2>

        <div class="grid grid-cols-2 gap-4">
          <UFormField
            label="Name"
            required
            class="col-span-2"
          >
            <UInput
              v-model="form.name"
              placeholder="Agent name"
              autofocus
              class="w-full"
              @keydown.enter="submit"
            />
          </UFormField>

          <UFormField label="Type">
            <USelect
              v-model="form.memberType"
              :items="memberTypeOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Emoji">
            <UInput
              v-model="form.emoji"
              placeholder="🤖"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Role">
            <UInput
              v-model="form.role"
              placeholder="developer, researcher..."
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="What does this member do?"
            :rows="2"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Specialties"
          hint="Comma separated"
        >
          <UInput
            v-model="specialtiesInput"
            placeholder="javascript, nuxt, typescript"
            class="w-full"
          />
        </UFormField>

        <UFormField label="OpenClaw Agent ID">
          <UInput
            v-model="form.openclawAgentId"
            placeholder="dev, research, ops..."
            class="w-full"
          />
        </UFormField>

        <div class="border border-gray-700 rounded-lg p-4 space-y-4">
          <p class="text-sm font-semibold text-white">
            Runtime
          </p>
          <div class="grid grid-cols-2 gap-4">
            <UFormField label="Provider">
              <USelect
                v-model="form.runtimeProvider"
                :items="runtimeProviderOptions"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Profile">
              <UInput
                v-model="form.runtimeProfile"
                placeholder="Hermes profile (optional)"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Command override">
              <UInput
                v-model="form.runtimeCommand"
                placeholder="hermes or openclaw"
                class="w-full"
              />
            </UFormField>
            <UFormField label="Working directory">
              <UInput
                v-model="form.runtimeWorkdir"
                placeholder="/path/to/workdir"
                class="w-full"
              />
            </UFormField>
          </div>
        </div>

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
            :disabled="!form.name.trim()"
            @click="submit"
          >
            {{ isEdit ? 'Save Changes' : 'Add Member' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
interface TeamMember {
  id: string,
  name: string,
  memberType: string,
  emoji: string | null,
  role: string,
  specialties: string[],
  description: string | null,
  runtimeProvider?: 'openclaw' | 'hermes' | 'manual' | null,
  runtimeProfile?: string | null,
  runtimeCommand?: string | null,
  runtimeWorkdir?: string | null,
  openclawAgentId?: string | null
}

const props = defineProps<{
  member?: TeamMember | null
}>();

const open = defineModel<boolean>();
const emit = defineEmits<{ saved: [] }>();

const isEdit = computed(() => !!props.member);

const loading = ref(false);
const error = ref('');
const specialtiesInput = ref('');

const form = reactive({
  name: '',
  memberType: 'agent',
  emoji: '🤖',
  role: '',
  description: '',
  runtimeProvider: 'openclaw' as 'openclaw' | 'hermes' | 'manual',
  runtimeProfile: '',
  runtimeCommand: '',
  runtimeWorkdir: '',
  openclawAgentId: ''
});

const memberTypeOptions = [
  { label: '🤖 Agent', value: 'agent' },
  { label: '👤 Human', value: 'human' }
];

const runtimeProviderOptions = [
  { label: 'OpenClaw', value: 'openclaw' },
  { label: 'Hermes', value: 'hermes' },
  { label: 'Manual', value: 'manual' }
];

watch(() => props.member, (m) => {
  if (m) {
    form.name = m.name;
    form.memberType = m.memberType;
    form.emoji = m.emoji || '🤖';
    form.role = m.role;
    form.description = m.description || '';
    form.runtimeProvider = m.runtimeProvider || (m.memberType === 'human' ? 'manual' : 'openclaw');
    form.runtimeProfile = m.runtimeProfile || '';
    form.runtimeCommand = m.runtimeCommand || '';
    form.runtimeWorkdir = m.runtimeWorkdir || '';
    form.openclawAgentId = m.openclawAgentId || '';
    specialtiesInput.value = (m.specialties || []).join(', ');
  } else {
    resetForm();
  }
}, { immediate: true });

async function submit() {
  if (!form.name.trim()) return;
  loading.value = true;
  error.value = '';

  const body = {
    ...form,
    specialties: specialtiesInput.value.split(',').map(s => s.trim()).filter(Boolean)
  };

  try {
    if (isEdit.value && props.member) {
      await $fetch(`/api/team/${props.member.id}`, {
        method: 'PATCH',
        body
      });
    } else {
      await $fetch('/api/team', {
        method: 'POST',
        body
      });
    }
    emit('saved');
    open.value = false;
    resetForm();
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } };
    error.value = fetchError?.data?.message || 'Failed to save member. Try again.';
  } finally {
    loading.value = false;
  }
}

function resetForm() {
  form.name = '';
  form.memberType = 'agent';
  form.emoji = '🤖';
  form.role = '';
  form.description = '';
  form.runtimeProvider = 'openclaw';
  form.runtimeProfile = '';
  form.runtimeCommand = '';
  form.runtimeWorkdir = '';
  form.openclawAgentId = '';
  specialtiesInput.value = '';
  error.value = '';
}
</script>
