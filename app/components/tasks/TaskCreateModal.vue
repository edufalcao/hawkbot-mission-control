<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4">
        <h2 class="text-lg font-bold text-white">New Task</h2>

        <UFormField label="Title" required>
          <UInput v-model="form.title" placeholder="What needs to be done?" autofocus class="w-full" />
        </UFormField>

        <UFormField label="Description">
          <UTextarea v-model="form.description" placeholder="Optional details..." :rows="3" class="w-full" />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Assignee">
            <USelect
              v-model="form.assignee"
              :items="[
                { label: '👤 Eduardo', value: 'eduardo' },
                { label: '🦅 HawkBot', value: 'hawkbot' }
              ]"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Priority">
            <USelect
              v-model="form.priority"
              :items="[
                { label: '— None', value: 'none' },
                { label: '🔴 High', value: 'high' },
                { label: '🟡 Medium', value: 'medium' },
                { label: '🔵 Low', value: 'low' }
              ]"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Tags (comma separated)">
          <UInput v-model="tagsInput" placeholder="frontend, bug, feature" class="w-full" />
        </UFormField>

        <div class="flex justify-end gap-3 pt-2">
          <UButton color="gray" variant="ghost" @click="open = false">Cancel</UButton>
          <UButton :loading="loading" :disabled="!form.title.trim()" @click="submit">
            Create Task
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>()
const emit = defineEmits<{ created: [] }>()

const loading = ref(false)
const tagsInput = ref('')

const form = reactive({
  title: '',
  description: '',
  assignee: 'eduardo',
  priority: 'none'
})

async function submit() {
  if (!form.title.trim()) return
  loading.value = true
  try {
    await $fetch('/api/tasks', {
      method: 'POST',
      body: {
        ...form,
        tags: tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)
      }
    })
    emit('created')
    open.value = false
    // Reset
    form.title = ''
    form.description = ''
    form.assignee = 'eduardo'
    form.priority = 'none'
    tagsInput.value = ''
  }
  finally {
    loading.value = false
  }
}
</script>
