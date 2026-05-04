<script setup lang="ts">
import type { AdminService } from '~/types/admin'

definePageMeta({ layout: 'admin' })
const { data, saveService, nextId, saved } = useAdminDemo()
const search = ref('')
const category = ref(0)
const open = ref(false)
const categoryOpen = ref(false)
const categoryId = ref(0)
const categoryName = ref('')
const categoryError = ref('')
const error = ref('')
const draft = ref<AdminService>({ id: 0, name: '', description: '', categoryId: 1, duration: 30, active: true })
const filtered = computed(() => data.value.services.filter(item => (!category.value || item.categoryId === category.value) && `${item.name} ${item.description}`.toLowerCase().includes(search.value.trim().toLowerCase())))
const categories = computed(() => data.value.categories.map(item => ({ label: item.name, value: item.id })))
function edit(service?: AdminService) {
  error.value = ''
  draft.value = service ? { ...service } : { id: 0, name: '', description: '', categoryId: category.value || categories.value[0]?.value || 0, duration: 30, active: true }
  open.value = true
}
function submit() {
  if (!draft.value.name.trim() || !draft.value.categoryId || !Number.isInteger(Number(draft.value.duration)) || Number(draft.value.duration) < 5 || Number(draft.value.duration) > 480) {
    error.value = 'Enter a name, category and duration between 5 and 480 minutes.'
    return
  }
  saveService({ ...draft.value, name: draft.value.name.trim(), duration: Number(draft.value.duration) })
  open.value = false
}
function editCategory(id = 0) {
  categoryId.value = id
  categoryName.value = data.value.categories.find(item => item.id === id)?.name ?? ''
  categoryError.value = ''
  categoryOpen.value = true
}
function submitCategory() {
  const name = categoryName.value.trim()
  if (!name || data.value.categories.some(item => item.id !== categoryId.value && item.name.toLowerCase() === name.toLowerCase())) {
    categoryError.value = 'Choose a unique category name.'
    return
  }
  const existing = data.value.categories.find(item => item.id === categoryId.value)
  if (existing) existing.name = name
  else data.value.categories.push({ id: nextId(data.value.categories), name })
  categoryOpen.value = false
  saved('Category saved')
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Service catalogue"
      title="Care, thoughtfully curated."
      description="Organise the services your clients can book and keep the details up to date."
    >
      <UButton
        label="Manage categories"
        icon="i-lucide-folder"
        color="neutral"
        variant="outline"
        size="lg"
        class="rounded-xl"
        @click="editCategory()"
      /><UButton
        label="Add service"
        icon="i-lucide-plus"
        size="lg"
        class="rounded-xl"
        @click="edit()"
      />
    </AdminPageHeading>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="rounded-full border px-4 py-2 text-sm transition-colors"
          :class="category === 0 ? 'border-primary bg-primary text-white' : 'border-default bg-default text-muted'"
          :aria-pressed="category === 0"
          @click="category = 0"
        >
          All services <span class="ml-1 opacity-70">{{ data.services.length }}</span>
        </button><button
          v-for="item in data.categories"
          :key="item.id"
          type="button"
          class="rounded-full border px-4 py-2 text-sm transition-colors"
          :class="category === item.id ? 'border-primary bg-primary text-white' : 'border-default bg-default text-muted'"
          :aria-pressed="category === item.id"
          @click="category = item.id"
        >
          {{ item.name }}
        </button>
      </div><UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Find a service…"
        aria-label="Search services"
      />
    </div>
    <div
      v-if="filtered.length"
      class="grid gap-5 md:grid-cols-2 2xl:grid-cols-3"
    >
      <article
        v-for="service in filtered"
        :key="service.id"
        class="flex flex-col rounded-2xl border border-default bg-default p-6 transition-shadow hover:shadow-md hover:shadow-primary/5"
      >
        <div class="flex items-center justify-between">
          <div class="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UIcon
              :name="service.categoryId === 1 ? 'i-lucide-scissors' : service.categoryId === 2 ? 'i-lucide-leaf' : 'i-lucide-sparkles'"
              class="size-6"
            />
          </div><UBadge
            :label="service.active ? 'Active' : 'Archived'"
            :color="service.active ? 'success' : 'neutral'"
            variant="subtle"
            size="sm"
          />
        </div>
        <p class="mt-5 text-xs font-medium text-primary">
          {{ data.categories.find(item => item.id === service.categoryId)?.name }}
        </p><h2 class="mt-1 text-lg font-semibold">
          {{ service.name }}
        </h2><p class="mt-2 flex-1 text-sm leading-6 text-muted">
          {{ service.description || 'No description added yet.' }}
        </p>
        <div class="mt-6 flex items-center justify-between border-t border-default pt-4">
          <span class="flex items-center gap-2 text-xs text-muted"><UIcon
            name="i-lucide-clock-3"
            class="size-4"
          />{{ service.duration }} minutes</span><UButton
            label="Edit service"
            trailing-icon="i-lucide-arrow-up-right"
            variant="ghost"
            size="sm"
            @click="edit(service)"
          />
        </div>
      </article>
    </div>
    <AdminEmptyState
      v-else
      title="No services found"
      description="Try another search or add a service to your catalogue."
      icon="i-lucide-sparkles"
    >
      <UButton
        label="Add service"
        @click="edit()"
      />
    </AdminEmptyState>
    <UModal
      v-model:open="open"
      :title="draft.id ? 'Edit service' : 'Add service'"
      description="Set the details clients need when choosing an appointment."
    >
      <template #body>
        <form
          class="space-y-5"
          @submit.prevent="submit"
        >
          <UFormField
            label="Service name"
            required
          >
            <UInput
              v-model="draft.name"
              required
              maxlength="100"
              class="w-full"
            />
          </UFormField><UFormField
            label="Category"
            required
          >
            <USelect
              v-model="draft.categoryId"
              :items="categories"
              class="w-full"
            />
          </UFormField><UFormField label="Description">
            <UTextarea
              v-model="draft.description"
              maxlength="1000"
              class="w-full"
            />
          </UFormField><UFormField
            label="Duration (minutes)"
            required
          >
            <UInput
              v-model="draft.duration"
              type="number"
              min="5"
              max="480"
              step="1"
              required
              class="w-full"
            />
          </UFormField><USwitch
            v-model="draft.active"
            label="Available for new bookings"
          /><p class="text-xs leading-5 text-muted">
            Archived services remain attached to existing bookings.
          </p><p
            v-if="error"
            role="alert"
            class="text-sm text-error"
          >
            {{ error }}
          </p><div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              variant="outline"
              color="neutral"
              @click="open = false"
            /><UButton
              label="Save service"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>
    <UModal
      v-model:open="categoryOpen"
      title="Manage categories"
      description="Group services so clients can find the right care."
    >
      <template #body>
        <div class="mb-6 space-y-2">
          <div
            v-for="item in data.categories"
            :key="item.id"
            class="flex items-center justify-between rounded-xl bg-elevated/50 px-3 py-2"
          >
            <span class="text-sm">{{ item.name }}</span><UButton
              icon="i-lucide-pencil"
              :aria-label="`Rename ${item.name}`"
              variant="ghost"
              color="neutral"
              @click="editCategory(item.id)"
            />
          </div>
        </div><form
          class="space-y-4 border-t border-default pt-5"
          @submit.prevent="submitCategory"
        >
          <UFormField
            :label="categoryId ? 'Rename category' : 'New category'"
            required
          >
            <UInput
              v-model="categoryName"
              required
              maxlength="50"
              class="w-full"
            />
          </UFormField><p
            v-if="categoryError"
            role="alert"
            class="text-sm text-error"
          >
            {{ categoryError }}
          </p><div class="flex justify-end gap-2">
            <UButton
              v-if="categoryId"
              label="Add new instead"
              variant="ghost"
              @click="editCategory()"
            /><UButton
              :label="categoryId ? 'Save name' : 'Add category'"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
