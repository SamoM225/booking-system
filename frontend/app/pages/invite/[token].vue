<script setup lang="ts">
import type { AuthUser } from '~/composables/useAuth'
import type { AdminInvitation } from '~/types/admin'

useSeoMeta({ title: 'Join the team', robots: 'noindex, nofollow' })

const route = useRoute()
const api = useApi()
const { user, checked } = useAuth()
const token = String(route.params.token)

const invitation = ref<AdminInvitation & { hasAccount: boolean } | null>(null)
const loadError = ref('')
const loading = ref(true)
const name = ref('')
const password = ref('')
const confirm = ref('')
const error = ref('')
const saving = ref(false)

onMounted(async () => {
  try {
    invitation.value = await api<AdminInvitation & { hasAccount: boolean }>(`/invitations/${encodeURIComponent(token)}`)
    name.value = invitation.value.name
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'This invitation could not be loaded.')
  } finally {
    loading.value = false
  }
})

async function submit() {
  error.value = ''
  if (password.value.length < 6) {
    error.value = 'Choose a password with at least 6 characters.'
    return
  }
  if (password.value !== confirm.value) {
    error.value = 'The passwords do not match.'
    return
  }
  saving.value = true
  try {
    const result = await api<{ user: AuthUser }>(`/invitations/${encodeURIComponent(token)}/accept`, {
      method: 'POST',
      body: { name: name.value.trim(), password: password.value }
    })
    // The backend signs the new member in right away
    user.value = result.user
    checked.value = true
    await navigateTo(result.user.role === 'admin' ? '/admin' : '/admin/calendar')
  } catch (e) {
    error.value = apiErrorMessage(e, 'The invitation could not be accepted.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UContainer class="flex min-h-[60vh] items-center justify-center py-16">
    <div class="w-full max-w-sm rounded-2xl border border-default bg-default p-6 shadow-sm">
      <p
        v-if="loading"
        class="py-10 text-center text-sm text-muted"
      >
        Loading your invitation…
      </p>
      <div
        v-else-if="loadError || !invitation"
        class="space-y-5 text-center"
      >
        <div class="mx-auto flex size-12 items-center justify-center rounded-2xl bg-error/10 text-error">
          <UIcon
            name="i-lucide-link-2-off"
            class="size-6"
          />
        </div>
        <div>
          <h1 class="text-xl font-bold text-highlighted">
            Invitation unavailable
          </h1>
          <p class="mt-2 text-sm text-muted">
            {{ loadError }}
          </p>
        </div>
        <UButton
          to="/login"
          label="Go to sign in"
          block
        />
      </div>
      <form
        v-else
        class="space-y-5"
        @submit.prevent="submit"
      >
        <div>
          <p class="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">
            You're invited
          </p>
          <h1 class="text-xl font-bold text-highlighted">
            Join the team
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ invitation.invitedBy ? `${invitation.invitedBy} invited you` : 'You were invited' }} to join as
            <strong class="text-highlighted">{{ invitation.role === 'admin' ? 'administrator' : 'specialist' }}</strong>. Choose your password to get started.
          </p>
        </div>
        <UFormField label="Email">
          <UInput
            :model-value="invitation.email"
            type="email"
            disabled
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Your name"
          required
        >
          <UInput
            v-model="name"
            autocomplete="name"
            minlength="2"
            maxlength="50"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Password"
          hint="At least 6 characters"
          required
        >
          <UInput
            v-model="password"
            type="password"
            autocomplete="new-password"
            minlength="6"
            maxlength="100"
            required
            class="w-full"
          />
        </UFormField>
        <UFormField
          label="Confirm password"
          required
        >
          <UInput
            v-model="confirm"
            type="password"
            autocomplete="new-password"
            minlength="6"
            maxlength="100"
            required
            class="w-full"
          />
        </UFormField>
        <p
          v-if="invitation.hasAccount"
          class="rounded-lg bg-elevated p-3 text-xs leading-5 text-muted"
        >
          You already have an account with this e-mail. Accepting gives it team access and sets this new password.
        </p>
        <UAlert
          v-if="error"
          color="error"
          variant="subtle"
          :description="error"
        />
        <UButton
          type="submit"
          block
          :loading="saving"
        >
          Accept invitation
        </UButton>
      </form>
    </div>
  </UContainer>
</template>
