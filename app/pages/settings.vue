<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Settings
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          Configure gateway connection and workspace
        </p>
      </div>
    </div>

    <div
      v-if="isLoading"
      class="max-w-2xl space-y-6"
    >
      <div
        v-for="i in 4"
        :key="i"
        class="h-20 bg-gray-800 rounded-xl animate-pulse"
      />
    </div>

    <div
      v-else
      class="max-w-2xl space-y-8"
    >
      <!-- Gateway Section -->
      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-radio w-5 h-5" />
          Gateway Connection
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Gateway URL</label>
            <UInput
              v-model="form.gateway_url"
              placeholder="ws://127.0.0.1:18789"
              size="lg"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              WebSocket URL for the OpenClaw gateway
            </p>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Gateway Token</label>
            <UInput
              v-model="form.gateway_token"
              :type="showToken ? 'text' : 'password'"
              placeholder="Bearer token for authentication"
              size="lg"
              class="w-full"
            >
              <template #trailing>
                <UButton
                  :icon="showToken ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="showToken = !showToken"
                />
              </template>
            </UInput>
            <p class="text-xs text-gray-500 mt-1">
              Auth token from ~/.openclaw/openclaw.json
            </p>
          </div>
        </div>
      </section>

      <!-- Workspace Section -->
      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-folder w-5 h-5" />
          Workspace
        </h2>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">Workspace Path</label>
          <UInput
            v-model="form.workspace_path"
            placeholder="/Users/you/.openclaw/workspace"
            size="lg"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            Path to your OpenClaw workspace directory
          </p>
        </div>
      </section>

      <!-- Dispatch Section -->
      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-send w-5 h-5" />
          Task Dispatch
        </h2>
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-1.5">Main Session ID</label>
          <UInput
            v-model="form.main_session_id"
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            size="lg"
            class="w-full"
          />
          <p class="text-xs text-gray-500 mt-1">
            OpenClaw session ID used when dispatching tasks to agents
          </p>
        </div>
        <div class="mt-4">
          <label class="block text-sm font-medium text-gray-300 mb-1.5">Dispatch Prompt Template</label>
          <UTextarea
            v-model="form.dispatch_prompt_template"
            :rows="8"
            placeholder="New task from Mission Control: ..."
            size="lg"
            class="w-full font-mono text-sm"
          />
          <p class="text-xs text-gray-500 mt-1">
            Template for the prompt sent to agents. Available variables:
            <code
              v-for="v in templateVars"
              :key="v"
              class="text-gray-400 mr-1"
              v-text="v"
            />
          </p>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex items-center gap-3">
        <UButton
          icon="i-lucide-save"
          :loading="saving"
          @click="saveSettings"
        >
          Save Settings
        </UButton>
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="!hasChanges"
          @click="resetForm"
        >
          Reset
        </UButton>
        <span
          v-if="saveMessage"
          class="text-sm"
          :class="saveError ? 'text-red-400' : 'text-green-400'"
        >
          {{ saveMessage }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';

const queryClient = useQueryClient();

const { data, isLoading } = useQuery({
  queryKey: ['settings'],
  queryFn: () => $fetch<Record<string, string>>('/api/settings')
});

const form = reactive({
  gateway_url: '',
  gateway_token: '',
  workspace_path: '',
  main_session_id: '',
  dispatch_prompt_template: ''
});

const templateVars = [
  '{{agent_emoji}}',
  '{{agent_name}}',
  '{{agent_specialties}}',
  '{{task_title}}',
  '{{task_description}}',
  '{{task_id}}'
];
const showToken = ref(false);
const saving = ref(false);
const saveMessage = ref('');
const saveError = ref(false);

// Populate form when data loads
watch(data, (val) => {
  if (val) {
    form.gateway_url = val.gateway_url || '';
    form.gateway_token = val.gateway_token || '';
    form.workspace_path = val.workspace_path || '';
    form.main_session_id = val.main_session_id || '';
    form.dispatch_prompt_template = val.dispatch_prompt_template || '';
  }
}, { immediate: true });

const hasChanges = computed(() => {
  if (!data.value) return false;
  return form.gateway_url !== (data.value.gateway_url || '')
    || form.gateway_token !== (data.value.gateway_token || '')
    || form.workspace_path !== (data.value.workspace_path || '')
    || form.main_session_id !== (data.value.main_session_id || '')
    || form.dispatch_prompt_template !== (data.value.dispatch_prompt_template || '');
});

function resetForm() {
  if (data.value) {
    form.gateway_url = data.value.gateway_url || '';
    form.gateway_token = data.value.gateway_token || '';
    form.workspace_path = data.value.workspace_path || '';
    form.main_session_id = data.value.main_session_id || '';
    form.dispatch_prompt_template = data.value.dispatch_prompt_template || '';
  }
  saveMessage.value = '';
}

async function saveSettings() {
  saving.value = true;
  saveMessage.value = '';
  saveError.value = false;
  try {
    await $fetch('/api/settings', {
      method: 'PATCH',
      body: {
        gateway_url: form.gateway_url,
        gateway_token: form.gateway_token,
        workspace_path: form.workspace_path,
        main_session_id: form.main_session_id,
        ...(form.dispatch_prompt_template ? { dispatch_prompt_template: form.dispatch_prompt_template } : {})
      }
    });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    saveMessage.value = 'Settings saved successfully';
  } catch (err: unknown) {
    saveError.value = true;
    const message = err instanceof Error ? err.message : 'Failed to save settings';
    saveMessage.value = message;
  } finally {
    saving.value = false;
  }
}
</script>
