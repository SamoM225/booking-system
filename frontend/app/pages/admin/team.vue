<script setup lang="ts">
import type { AdminMember } from '~/types/admin'

definePageMeta({ layout: 'admin' })
const { data, saveMember, inviteMember } = useAdmin()
const search = ref('')
const open = ref(false)
const error = ref('')
const draft = ref<AdminMember>({ id: '', name: '', email: '', role: 'worker', active: true })
const members = computed(() => data.value.members.filter(item => `${item.name} ${item.email}`.toLowerCase().includes(search.value.trim().toLowerCase())))
function edit(member?: AdminMember) {
  draft.value = member ? { ...member } : { id: '', name: '', email: '', role: 'worker', active: true }
  error.value = ''
  open.value = true
}
async function submit() {
  const value = { ...draft.value, name: draft.value.name.trim(), email: draft.value.email.trim().toLowerCase() }
  if (!value.name || data.value.members.some(item => item.id !== value.id && item.email.toLowerCase() === value.email)) {
    error.value = 'Enter a name and a unique email address.'
    return
  }
  const original = data.value.members.find(item => item.id === value.id)
  if (original?.role === 'admin' && original.active && (value.role !== 'admin' || !value.active) && !data.value.members.some(item => item.id !== value.id && item.role === 'admin' && item.active)) {
    error.value = 'Keep at least one active administrator in the team.'
    return
  }
  try {
    if (value.id) await saveMember(value)
    else await inviteMember({ name: value.name, email: value.email, role: value.role })
    open.value = false
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Your people"
      title="Great care starts with a team."
      description="Manage the specialists who bring your booking experience to life."
    >
      <UButton
        label="Add team member"
        icon="i-lucide-user-plus"
        size="lg"
        class="rounded-xl"
        @click="edit()"
      />
    </AdminPageHeading>
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted">
        <span class="font-semibold text-highlighted">{{ data.members.filter(item => item.active).length }}</span> active members in your workspace
      </p><UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Search your team…"
        aria-label="Search team"
      />
    </div>
    <div
      v-if="members.length"
      class="grid gap-5 md:grid-cols-2 2xl:grid-cols-3"
    >
      <article
        v-for="(member, index) in members"
        :key="member.id"
        class="overflow-hidden rounded-2xl border border-default bg-default"
      >
        <div
          class="h-20 bg-gradient-to-br"
          :class="index % 2 ? 'from-violet-500/15 to-blue-500/5' : 'from-blue-500/15 to-cyan-500/5'"
        />
        <div class="px-6 pb-6">
          <div class="-mt-7 flex items-end justify-between">
            <div class="flex size-16 items-center justify-center rounded-2xl border-4 border-default bg-blue-100 text-xl font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              {{ member.name.split(' ').map(part => part[0]).slice(0, 2).join('') }}
            </div><UBadge
              :label="member.active ? 'Active' : 'Inactive'"
              :color="member.active ? 'success' : 'neutral'"
              variant="subtle"
              size="sm"
            />
          </div><h2 class="mt-4 text-lg font-semibold">
            {{ member.name }}
          </h2><p class="mt-1 text-xs font-medium text-primary">
            {{ member.role === 'admin' ? 'Administrator' : 'Specialist' }}
          </p><p class="mt-3 flex items-center gap-2 break-all text-sm text-muted">
            <UIcon
              name="i-lucide-mail"
              class="size-4 shrink-0"
            />{{ member.email }}
          </p><div class="mt-5 rounded-xl bg-elevated/60 p-3 text-sm">
            <span class="font-semibold">{{ data.bookings.filter(item => item.userId === member.id && item.date === data.today && item.status !== 'cancelled').length }}</span><span class="ml-1 text-muted">appointments today</span>
          </div><div class="mt-4 flex flex-wrap justify-between gap-2">
            <UButton
              :to="{ path: '/admin/availability', query: { member: member.id } }"
              label="Working hours"
              icon="i-lucide-clock-3"
              variant="ghost"
              color="neutral"
              size="sm"
            /><UButton
              label="Edit profile"
              trailing-icon="i-lucide-arrow-up-right"
              variant="ghost"
              size="sm"
              @click="edit(member)"
            />
          </div>
        </div>
      </article>
    </div>
    <AdminEmptyState
      v-else
      title="No team members found"
      description="Try searching for a different name or email."
      icon="i-lucide-users-round"
    />
    <UModal
      v-model:open="open"
      :title="draft.id ? 'Edit team member' : 'Add team member'"
      :description="draft.id ? 'Update this team member’s details and access.' : 'We will invite this person to join the team.'"
    >
      <template #body>
        <form
          class="space-y-5"
          @submit.prevent="submit"
        >
          <UFormField
            label="Full name"
            required
          >
            <UInput
              v-model="draft.name"
              required
              minlength="2"
              maxlength="50"
              class="w-full"
            />
          </UFormField><UFormField
            label="Email address"
            required
          >
            <UInput
              v-model="draft.email"
              required
              type="email"
              class="w-full"
            />
          </UFormField><UFormField label="Role">
            <USelect
              v-model="draft.role"
              :items="[{ label: 'Specialist', value: 'worker' }, { label: 'Administrator', value: 'admin' }]"
              class="w-full"
            />
          </UFormField><USwitch
            v-model="draft.active"
            label="Active team member"
          /><p class="text-xs leading-5 text-muted">
            Inactive members keep their existing appointments and cannot be selected for new bookings.
          </p><p
            v-if="error"
            role="alert"
            class="rounded-lg bg-error/10 p-3 text-sm text-error"
          >
            {{ error }}
          </p><div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="open = false"
            /><UButton
              :label="draft.id ? 'Save team member' : 'Send invitation'"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>
