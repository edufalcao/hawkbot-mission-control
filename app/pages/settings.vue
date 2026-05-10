<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Settings
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          Configure runtime providers, gateway connection, and dispatch behavior
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
      class="max-w-3xl space-y-8"
    >
      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <div class="flex items-center justify-between gap-4 mb-4">
          <h2 class="text-lg font-semibold text-white flex items-center gap-2">
            <span class="i-lucide-heart-pulse w-5 h-5" />
            Runtime Health
          </h2>
          <UButton
            icon="i-lucide-refresh-cw"
            color="neutral"
            variant="ghost"
            size="sm"
            :loading="runtimePending"
            @click="refreshRuntimeHealth"
          >
            Refresh
          </UButton>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="runtime in runtimeCards"
            :key="runtime.provider"
            class="rounded-lg border border-gray-700 bg-gray-900/60 p-4"
          >
            <div class="flex items-start justify-between gap-3 mb-2">
              <div>
                <p class="text-sm font-semibold text-white">
                  {{ runtime.label }}
                </p>
                <p class="text-xs text-gray-500 font-mono">
                  {{ runtime.command }}
                </p>
              </div>
              <UBadge
                :color="runtime.ready ? 'success' : runtime.available ? 'warning' : 'error'"
                size="xs"
                variant="soft"
              >
                {{ runtime.ready ? 'Ready' : runtime.available ? 'Needs config' : 'Unavailable' }}
              </UBadge>
            </div>
            <p class="text-xs text-gray-400">
              {{ runtime.version || runtime.error || 'No version output' }}
            </p>
            <p
              v-if="runtime.detail"
              class="text-xs text-gray-500 mt-2"
            >
              {{ runtime.detail }}
            </p>
          </div>
        </div>
      </section>

      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-radio w-5 h-5" />
          OpenClaw Gateway
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
              Optional WebSocket URL for OpenClaw gateway features.
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
          </div>
        </div>
      </section>

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
            Path used by the memory browser and OpenClaw workspace integrations.
          </p>
        </div>
      </section>

      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-bot w-5 h-5" />
          Runtime Providers
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">Default Runtime Provider</label>
            <USelect
              v-model="form.default_runtime_provider"
              :items="runtimeProviderOptions"
              size="lg"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              Used only when an agent has no explicit runtime configured.
            </p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Hermes Default Profile</label>
              <UInput
                v-model="form.hermes_default_profile"
                placeholder="default, coding, research..."
                size="lg"
                class="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1.5">Hermes Worktree Mode</label>
              <USelect
                v-model="form.hermes_worktree_mode"
                :items="booleanOptions"
                size="lg"
                class="w-full"
              />
            </div>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1.5">OpenClaw Main Session ID</label>
            <UInput
              v-model="form.openclaw_main_session_id"
              placeholder="OpenClaw session ID"
              size="lg"
              class="w-full"
            />
            <p class="text-xs text-gray-500 mt-1">
              Legacy main_session_id is still read as a fallback, but new dispatches should use this field.
            </p>
          </div>
        </div>
      </section>

      <section class="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span class="i-lucide-send w-5 h-5" />
          Task Dispatch
        </h2>
        <div>
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

interface RuntimeHealthItem {
  provider: 'hermes' | 'openclaw',
  command: string,
  available: boolean,
  version: string | null,
  error: string | null,
  ready: boolean,
  details: Record<string, unknown>
}

interface RuntimeHealthReport {
  runtimes: {
    hermes: RuntimeHealthItem,
    openclaw: RuntimeHealthItem
  }
}

const queryClient = useQueryClient();

const { data, isLoading } = useQuery({
  queryKey: ['settings'],
  queryFn: () => $fetch<Record<string, string>>('/api/settings')
});

const { data: runtimeHealth, isFetching: runtimePending, refetch: refetchRuntimeHealth } = useQuery<RuntimeHealthReport>({
  queryKey: ['runtime-health'],
  queryFn: () => $fetch('/api/runtimes/health'),
  refetchInterval: 30_000
});

const form = reactive({
  gateway_url: '',
  gateway_token: '',
  workspace_path: '',
  openclaw_main_session_id: '',
  default_runtime_provider: 'openclaw',
  hermes_default_profile: '',
  hermes_worktree_mode: 'false',
  dispatch_prompt_template: ''
});

const runtimeProviderOptions = [
  { label: 'OpenClaw', value: 'openclaw' },
  { label: 'Hermes', value: 'hermes' },
  { label: 'Manual', value: 'manual' }
];

const booleanOptions = [
  { label: 'Disabled', value: 'false' },
  { label: 'Enabled', value: 'true' }
];

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

const runtimeCards = computed(() => {
  const runtimes = runtimeHealth.value?.runtimes;
  if (!runtimes) return [];
  return [
    toRuntimeCard('Hermes', runtimes.hermes),
    toRuntimeCard('OpenClaw', runtimes.openclaw)
  ];
});

function refreshRuntimeHealth() {
  refetchRuntimeHealth();
}

function toRuntimeCard(label: string, runtime: RuntimeHealthItem) {
  const details = runtime.details || {};
  const detail = runtime.provider === 'openclaw'
    ? `Gateway: ${details.gatewayStatus || 'unknown'} · Session: ${details.sessionConfigured ? 'configured' : 'missing'}`
    : `Profile: ${details.defaultProfile || 'default'} · Worktree: ${details.worktreeMode ? 'enabled' : 'disabled'}`;
  return { ...runtime, label, detail };
}

watch(data, (val) => {
  if (val) {
    form.gateway_url = val.gateway_url || '';
    form.gateway_token = val.gateway_token || '';
    form.workspace_path = val.workspace_path || '';
    form.openclaw_main_session_id = val.openclaw_main_session_id || val.main_session_id || '';
    form.default_runtime_provider = val.default_runtime_provider || 'openclaw';
    form.hermes_default_profile = val.hermes_default_profile || '';
    form.hermes_worktree_mode = val.hermes_worktree_mode || 'false';
    form.dispatch_prompt_template = val.dispatch_prompt_template || '';
  }
}, { immediate: true });

const hasChanges = computed(() => {
  if (!data.value) return false;
  return form.gateway_url !== (data.value.gateway_url || '')
    || form.gateway_token !== (data.value.gateway_token || '')
    || form.workspace_path !== (data.value.workspace_path || '')
    || form.openclaw_main_session_id !== (data.value.openclaw_main_session_id || data.value.main_session_id || '')
    || form.default_runtime_provider !== (data.value.default_runtime_provider || 'openclaw')
    || form.hermes_default_profile !== (data.value.hermes_default_profile || '')
    || form.hermes_worktree_mode !== (data.value.hermes_worktree_mode || 'false')
    || form.dispatch_prompt_template !== (data.value.dispatch_prompt_template || '');
});

function resetForm() {
  if (data.value) {
    form.gateway_url = data.value.gateway_url || '';
    form.gateway_token = data.value.gateway_token || '';
    form.workspace_path = data.value.workspace_path || '';
    form.openclaw_main_session_id = data.value.openclaw_main_session_id || data.value.main_session_id || '';
    form.default_runtime_provider = data.value.default_runtime_provider || 'openclaw';
    form.hermes_default_profile = data.value.hermes_default_profile || '';
    form.hermes_worktree_mode = data.value.hermes_worktree_mode || 'false';
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
        openclaw_main_session_id: form.openclaw_main_session_id,
        default_runtime_provider: form.default_runtime_provider,
        hermes_default_profile: form.hermes_default_profile,
        hermes_worktree_mode: form.hermes_worktree_mode,
        ...(form.dispatch_prompt_template ? { dispatch_prompt_template: form.dispatch_prompt_template } : {})
      }
    });
    queryClient.invalidateQueries({ queryKey: ['settings'] });
    queryClient.invalidateQueries({ queryKey: ['runtime-health'] });
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
