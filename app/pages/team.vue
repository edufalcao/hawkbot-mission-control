<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-white">
        Team
      </h1>
      <p class="text-gray-400 text-sm mt-0.5">
        {{ members.length }} agents · {{ busyCount }} busy
      </p>
    </div>

    <div
      v-if="pending"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="i in 5"
        :key="i"
        class="h-40 bg-gray-800 rounded-xl animate-pulse"
      />
    </div>

    <div
      v-else
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      <div
        v-for="member in members"
        :key="member.id"
        class="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors"
      >
        <!-- Avatar + status -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="text-3xl">
              {{ member.emoji }}
            </div>
            <div>
              <p class="font-bold text-white text-sm">
                {{ member.name }}
              </p>
              <p class="text-xs text-gray-400 capitalize">
                {{ member.role }}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-1.5">
            <span
              class="w-2 h-2 rounded-full"
              :class="{
                'bg-green-500 animate-pulse': member.status === 'busy',
                'bg-blue-400': member.status === 'active',
                'bg-gray-500': member.status === 'idle'
              }"
            />
            <span class="text-xs text-gray-400 capitalize">{{ member.status }}</span>
          </div>
        </div>

        <!-- Description -->
        <p class="text-xs text-gray-400 mb-3">
          {{ member.description }}
        </p>

        <!-- Specialties -->
        <div class="flex flex-wrap gap-1 mb-3">
          <UBadge
            v-for="spec in member.specialties"
            :key="spec"
            color="neutral"
            size="xs"
            variant="solid"
          >
            {{ spec }}
          </UBadge>
        </div>

        <!-- Stats -->
        <div class="flex gap-4 text-xs text-gray-500 border-t border-gray-700 pt-3">
          <span>Model: <span class="text-gray-300">{{ member.model }}</span></span>
          <span>Uses: <span class="text-gray-300">{{ member.usageCount }}</span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TeamMember {
  id: string
  name: string
  memberType: string
  emoji: string | null
  role: string
  model: string | null
  specialties: string[]
  description: string | null
  status: string
  currentTaskId: string | null
  lastUsed: string | null
  usageCount: number | null
  successCount: number | null
  createdAt: string
}

const { data, pending } = useFetch<TeamMember[]>('/api/team')

const members = computed(() => data.value || [])
const busyCount = computed(() => members.value.filter(m => m.status === 'busy').length)
</script>
