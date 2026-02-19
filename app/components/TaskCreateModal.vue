<template>
  <UModal v-model:open="open" title="New Task">
    <template #body>
      <div class="space-y-4">
        <UFormField label="Title" required>
          <UInput
            v-model="form.title"
            placeholder="What needs to be done?"
            autofocus
            class="w-full"
            @keydown.enter="submit"
          />
        </UFormField>

        <UFormField label="Description">
          <UTextarea
            v-model="form.description"
            placeholder="Optional details..."
            :rows="3"
            class="w-full"
          />
        </UFormField>

        <div class="grid grid-cols-2 gap-4">
          <UFormField label="Assignee">
            <USelect
              v-model="form.assignee"
              :items="assigneeOptions"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Priority">
            <USelect
              v-model="form.priority"
              :items="priorityOptions"
              class="w-full"
            />
          </UFormField>
        </div>

        <UFormField label="Tags" hint="Comma separated">
          <UInput
            v-model="tagsInput"
            placeholder="frontend, bug, feature"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-3 w-full">
        <UButton color="neutral" variant="ghost" @click="open = false">
          Cancel
        </UButton>
        <UButton
          :loading="loading"
          :disabled="!form.title.trim()"
          @click="submit"
        >
          Create Task
        </UButton>
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

const assigneeOptions = [
  { label: '👤 Eduardo', value: 'eduardo' },
  { label: '🦅 HawkBot', value: 'hawkbot' }
]

const priorityOptions = [
  { label: '— None', value: 'none' },
  { label: '🔴 High', value: 'high' },
  { label: '🟡 Medium', value: 'medium' },
  { label: '🔵 Low', value: 'low' }
]

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
    resetForm()
  }
  finally {
    loading.value = false
  }
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.assignee = 'eduardo'
  form.priority = 'none'
  tagsInput.value = ''
}
</script>
