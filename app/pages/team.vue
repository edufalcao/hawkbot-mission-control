<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-white">
          Team
        </h1>
        <p class="text-gray-400 text-sm mt-0.5">
          {{ members.length }} members · {{ busyCount }} busy
        </p>
      </div>
      <UButton
        icon="i-lucide-plus"
        @click="openCreateModal"
      >
        Add Member
      </UButton>
    </div>

    <div
      v-if="isLoading"
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
        class="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-gray-500 transition-colors group"
      >
        <!-- Avatar + status + actions -->
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
          <div class="flex items-center gap-2">
            <div class="opacity-0 group-hover:opacity-100 transition-opacity">
              <UDropdownMenu :items="getCardActions(member)">
                <UButton
                  icon="i-lucide-more-horizontal"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                />
              </UDropdownMenu>
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

    <!-- Create/Edit Modal -->
    <TeamMemberModal
      v-model="showModal"
      :member="editingMember"
      @saved="onMemberSaved"
    />

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteConfirm">
      <template #content>
        <div class="p-6 space-y-4">
          <h2 class="text-lg font-bold text-white">
            Delete Member
          </h2>
          <p class="text-sm text-gray-400">
            Are you sure you want to delete <strong class="text-white">{{ deletingMember?.name }}</strong>? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-3 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showDeleteConfirm = false"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="deleteLoading"
              @click="confirmDelete"
            >
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { useQuery, useQueryClient } from '@tanstack/vue-query';

interface TeamMember {
  id: string,
  name: string,
  memberType: string,
  emoji: string | null,
  role: string,
  model: string | null,
  specialties: string[],
  description: string | null,
  status: string,
  currentTaskId: string | null,
  lastUsed: string | null,
  openclawAgentId?: string | null,
  usageCount: number | null,
  successCount: number | null,
  createdAt: string
}

const queryClient = useQueryClient();

const { data, isLoading } = useQuery({
  queryKey: ['team'],
  queryFn: () => $fetch<TeamMember[]>('/api/team'),
  refetchInterval: 10000
});

const members = computed(() => data.value || []);
const busyCount = computed(() => members.value.filter(m => m.status === 'busy').length);

// Modal state
const showModal = ref(false);
const editingMember = ref<TeamMember | null>(null);

// Delete state
const showDeleteConfirm = ref(false);
const deletingMember = ref<TeamMember | null>(null);
const deleteLoading = ref(false);

function openCreateModal() {
  editingMember.value = null;
  showModal.value = true;
}

function openEditModal(member: TeamMember) {
  editingMember.value = member;
  showModal.value = true;
}

function openDeleteConfirm(member: TeamMember) {
  deletingMember.value = member;
  showDeleteConfirm.value = true;
}

async function confirmDelete() {
  if (!deletingMember.value) return;
  deleteLoading.value = true;
  try {
    await $fetch(`/api/team/${deletingMember.value.id}`, { method: 'DELETE' });
    queryClient.invalidateQueries({ queryKey: ['team'] });
    showDeleteConfirm.value = false;
    deletingMember.value = null;
  } finally {
    deleteLoading.value = false;
  }
}

function onMemberSaved() {
  queryClient.invalidateQueries({ queryKey: ['team'] });
}

function getCardActions(member: TeamMember) {
  return [
    {
      label: '✏️ Edit',
      onSelect: () => openEditModal(member)
    },
    { type: 'separator' as const },
    {
      label: '🗑 Delete',
      class: 'text-red-400',
      onSelect: () => openDeleteConfirm(member)
    }
  ];
}
</script>
