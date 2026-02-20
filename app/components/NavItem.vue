<template>
  <NuxtLink
    :to="to"
    class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
    :class="isActive
      ? 'bg-primary-600 text-white'
      : 'text-gray-400 hover:text-white hover:bg-gray-800'"
  >
    <UIcon
      :name="icon"
      class="w-4 h-4 flex-shrink-0"
    />
    {{ label }}
  </NuxtLink>
</template>

<script setup lang="ts">
const props = defineProps<{
  to: string,
  icon: string,
  label: string
}>();

const route = useRoute();
const isActive = computed(() => route.path.startsWith(props.to));
</script>
