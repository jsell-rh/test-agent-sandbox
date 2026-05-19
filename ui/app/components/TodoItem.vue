<template>
  <li
    class="todo-item"
    :class="{ pending: isPending }"
    :data-todo-id="todo.id"
  >
    <!-- Checkbox with associated label (accessibility: input has label) -->
    <label class="todo-checkbox-label" :for="`checkbox-${todo.id}`">
      <input
        :id="`checkbox-${todo.id}`"
        type="checkbox"
        class="todo-checkbox"
        :checked="todo.status === 'completed'"
        :aria-label="`Mark '${todo.title}' as ${todo.status === 'active' ? 'completed' : 'active'}`"
        @change="handleToggle"
      />
    </label>

    <!-- Title or edit input -->
    <div class="todo-title-wrapper">
      <!-- Edit mode -->
      <input
        v-if="isEditing"
        ref="editInputRef"
        v-model="editValue"
        type="text"
        class="todo-edit-input"
        :aria-label="`Edit todo: ${todo.title}`"
        maxlength="500"
        @keydown.enter.prevent="handleEditSubmit"
        @keydown.escape.prevent="handleEditCancel"
        @blur="handleEditBlur"
      />

      <!-- Display mode: double-click enters edit mode -->
      <span
        v-else
        class="todo-title"
        :class="{ completed: todo.status === 'completed' }"
        role="button"
        tabindex="0"
        :aria-label="`${todo.title}${todo.status === 'completed' ? ' (completed)' : ''}. Double-click or press Enter to edit.`"
        @dblclick="handleStartEdit"
        @keydown.enter.prevent="handleStartEdit"
        v-html="renderedTitle"
      />
    </div>

    <!-- Delete button (visible on hover or focus) -->
    <button
      v-if="!isEditing"
      type="button"
      class="todo-delete-btn"
      :aria-label="`Delete '${todo.title}'`"
      @click="handleDelete"
    >
      ×
    </button>
  </li>
</template>

<script setup lang="ts">
import type { Todo } from '~/types/todo'

interface Props {
  todo: Todo
  isEditing: boolean
  isPending?: boolean
}

const props = withDefaults(defineProps<Props>(), { isPending: false })

const emit = defineEmits<{
  toggle: [id: string]
  'start-edit': [id: string]
  'save-edit': [id: string, title: string]
  'cancel-edit': []
  delete: [id: string]
}>()

// -------- Markdown rendering --------
const { renderInline } = useMarkdown()

const renderedTitle = computed(() => renderInline(props.todo.title))

// -------- Edit state --------
const editValue = ref(props.todo.title)
const editInputRef = ref<HTMLInputElement | null>(null)

// Track whether blur should be ignored (Enter/Escape already handled)
let _ignoreNextBlur = false

// Focus and select input when entering edit mode
watch(
  () => props.isEditing,
  (editing) => {
    if (editing) {
      editValue.value = props.todo.title
      _ignoreNextBlur = false
      nextTick(() => {
        editInputRef.value?.focus()
        editInputRef.value?.select()
      })
    }
  },
)

// -------- Handlers --------
function handleToggle(): void {
  emit('toggle', props.todo.id)
}

function handleStartEdit(): void {
  emit('start-edit', props.todo.id)
}

function handleEditSubmit(): void {
  _ignoreNextBlur = true
  emit('save-edit', props.todo.id, editValue.value)
}

function handleEditCancel(): void {
  _ignoreNextBlur = true
  emit('cancel-edit')
}

function handleEditBlur(): void {
  if (_ignoreNextBlur) {
    _ignoreNextBlur = false
    return
  }
  // Blur without explicit Enter/Escape → save
  emit('save-edit', props.todo.id, editValue.value)
}

function handleDelete(): void {
  emit('delete', props.todo.id)
}
</script>
