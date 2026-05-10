<template>
  <div class="rounded-lg border border-gray-700 bg-gray-950/80 overflow-hidden">
    <div class="flex items-center justify-between border-b border-gray-800 px-3 py-2">
      <p class="text-xs uppercase tracking-wide text-gray-500">
        {{ title }}
      </p>
      <UButton
        v-if="content"
        color="neutral"
        variant="ghost"
        size="xs"
        icon="i-lucide-copy"
        @click="copy"
      >
        Copy
      </UButton>
    </div>
    <pre
      v-if="content"
      class="max-h-64 overflow-auto p-3 text-xs text-gray-300 whitespace-pre-wrap"
    >{{ content }}</pre>
    <p
      v-else
      class="p-3 text-xs text-gray-600"
    >
      {{ emptyLabel }}
    </p>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  title: string,
  content: string,
  emptyLabel: string
}>();

async function copy() {
  await navigator.clipboard.writeText(props.content);
}
</script>
