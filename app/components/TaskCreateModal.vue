<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="p-6 space-y-4">
        <h2 class="text-lg font-bold text-white">
          New Task
        </h2>

        <UFormField
          label="Title"
          required
        >
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

        <UFormField
          label="Tags"
          hint="Comma separated"
        >
          <UInput
            v-model="tagsInput"
            placeholder="frontend, bug, feature"
            class="w-full"
          />
        </UFormField>

        <p
          v-if="error"
          class="text-xs text-red-400"
        >
          {{ error }}
        </p>

        <div class="flex justify-end gap-3 pt-2">
          <UButton
            color="neutral"
            variant="ghost"
            @click="open = false"
          >
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
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
const open = defineModel<boolean>()
const emit = defineEmits<{ created: [] }>()

const loading = ref(false)
const error = ref('')
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
  error.value = ''

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
  } catch (e: unknown) {
    const fetchError = e as { data?: { message?: string } }
    error.value = fetchError?.data?.message || 'Failed to create task. Try again.'
  } finally {
    loading.value = false
  }
}

function resetForm() {
  form.title = ''
  form.description = ''
  form.assignee = 'eduardo'
  form.priority = 'none'
  tagsInput.value = ''
  error.value = ''
}
</script>
