<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">
        Office
      </h1>
      <p class="text-gray-400 text-sm mt-0.5">
        Live view of your agents
      </p>
    </div>

    <div class="bg-gray-800 border border-gray-700 rounded-xl p-8 min-h-96 relative overflow-hidden">
      <!-- Office floor -->
      <div class="absolute inset-0 opacity-5">
        <div
          v-for="i in 20"
          :key="i"
          class="absolute border-b border-gray-400"
          :style="{ top: `${i * 5}%`, left: 0, right: 0 }"
        />
        <div
          v-for="i in 20"
          :key="i"
          class="absolute border-r border-gray-400"
          :style="{ left: `${i * 5}%`, top: 0, bottom: 0 }"
        />
      </div>

      <!-- Agent workstations -->
      <div class="relative grid grid-cols-2 md:grid-cols-3 gap-6">
        <div
          v-for="member in members"
          :key="member.id"
          class="bg-gray-900 border rounded-xl p-4 text-center transition-all"
          :class="member.status === 'busy'
            ? 'border-green-500/50 shadow-lg shadow-green-500/10'
            : 'border-gray-700'"
        >
          <!-- Desk -->
          <div class="mb-3 relative inline-block">
            <!-- Agent emoji -->
            <div
              class="text-4xl transition-transform"
              :class="member.status === 'busy' ? 'animate-bounce' : ''"
            >
              {{ member.emoji }}
            </div>
            <!-- Typing indicator when busy -->
            <div
              v-if="member.status === 'busy'"
              class="absolute -bottom-1 -right-1 bg-green-500 rounded-full w-3 h-3 animate-ping"
            />
          </div>

          <!-- Monitor -->
          <div
            class="bg-gray-800 border rounded-lg p-2 mb-2 min-h-12"
            :class="member.status === 'busy' ? 'border-green-700' : 'border-gray-700'"
          >
            <div
              v-if="member.status === 'busy'"
              class="space-y-1"
            >
              <div
                class="h-1.5 bg-green-500/40 rounded animate-pulse"
                style="width: 80%"
              />
              <div
                class="h-1.5 bg-green-500/30 rounded animate-pulse"
                style="width: 60%"
              />
              <div
                class="h-1.5 bg-green-500/20 rounded animate-pulse"
                style="width: 70%"
              />
            </div>
            <div
              v-else
              class="flex items-center justify-center h-8"
            >
              <span class="text-xs text-gray-600">idle</span>
            </div>
          </div>

          <!-- Name + status -->
          <p class="font-medium text-sm text-white">
            {{ member.name }}
          </p>
          <p class="text-xs text-gray-400 capitalize">
            {{ member.status }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { data } = useFetch('/api/team', { watch: false })
const members = computed(() => data.value || [])
</script>
