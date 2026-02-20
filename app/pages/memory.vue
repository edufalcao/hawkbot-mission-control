<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Memory
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          {{ files.length }} files indexed
        </p>
      </div>
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search memories..."
        class="w-64"
      />
    </div>

    <div
      v-if="pending"
      class="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="h-28 bg-gray-800 rounded-lg animate-pulse"
      />
    </div>

    <div
      v-else-if="files.length"
      class="grid grid-cols-1 md:grid-cols-2 gap-3"
    >
      <div
        v-for="file in files"
        :key="file.path"
        class="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer"
        @click="openFile(file)"
      >
        <div class="flex items-start justify-between gap-3 mb-2">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ typeEmoji(file.type) }}</span>
            <span class="font-medium text-sm text-white">{{ file.name }}</span>
          </div>
          <UBadge
            :color="typeBadgeColor(file.type)"
            size="xs"
          >
            {{ file.type }}
          </UBadge>
        </div>
        <p class="text-xs text-gray-400 line-clamp-2">
          {{ file.preview }}
        </p>
        <p class="text-xs text-gray-500 mt-2">
          {{ formatDate(file.modifiedAt) }}
        </p>
      </div>
    </div>

    <div
      v-else
      class="text-center py-16 text-gray-500"
    >
      <UIcon
        name="i-lucide-brain"
        class="w-12 h-12 mx-auto mb-3 opacity-40"
      />
      <p>No memories found</p>
    </div>

    <!-- File viewer modal -->
    <UModal
      v-model:open="showFileModal"
      :ui="{ content: 'max-w-3xl' }"
    >
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-bold text-white">
              {{ selectedFile?.name }}.md
            </h2>
            <UButton
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="showFileModal = false"
            />
          </div>
          <div
            v-if="fileContent"
            class="prose prose-invert prose-sm max-h-[60vh] overflow-auto text-sm text-gray-300 whitespace-pre-wrap font-mono"
          >
            {{ fileContent }}
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
const search = ref('');
const showFileModal = ref(false);
interface MemoryFile {
  path: string,
  name: string,
  type: string,
  preview: string,
  content?: string,
  modifiedAt: string
}

const selectedFile = ref<MemoryFile | null>(null);
const fileContent = ref('');

const { data, pending } = useFetch('/api/memory', {
  query: computed(() => search.value ? { q: search.value } : {})
});

const files = computed(() => data.value || []);

async function openFile(file: MemoryFile) {
  selectedFile.value = file;
  showFileModal.value = true;
  const result = await $fetch('/api/memory', { query: { q: '', content: 'true' } }) as MemoryFile[];
  const full = result.find((f: MemoryFile) => f.path === file.path);
  fileContent.value = full?.content || '';
}

function typeEmoji(type: string) {
  return { memory: '🧠', daily: '📅', plan: '🗺️', other: '📄' }[type] || '📄';
}

function typeBadgeColor(type: string) {
  return { memory: 'secondary' as const, daily: 'info' as const, plan: 'warning' as const, other: 'neutral' as const }[type] || 'neutral' as const;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}
</script>
