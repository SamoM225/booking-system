<script setup lang="ts">
useSeoMeta({ title: 'Sign in', robots: 'noindex, nofollow' })

const { login, user } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    if (user.value?.role !== 'admin') {
      error.value = 'This account has no administrator access.'
      return
    }
    await navigateTo('/admin')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Sign in failed.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UContainer class="flex min-h-[60vh] items-center justify-center py-16">
    <form
      class="w-full max-w-sm space-y-5 rounded-2xl border border-default bg-default p-6 shadow-sm"
      @submit.prevent="submit"
    >
      <div>
        <h1 class="text-xl font-bold text-highlighted">
          Administration
        </h1>
        <p class="mt-1 text-sm text-muted">
          Sign in to manage bookings, services and your team.
        </p>
      </div>
      <UFormField
        label="Email"
        required
      >
        <UInput
          v-model="email"
          type="email"
          autocomplete="email"
          required
          class="w-full"
        />
      </UFormField>
      <UFormField
        label="Password"
        required
      >
        <UInput
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          class="w-full"
        />
      </UFormField>
      <UAlert
        v-if="error"
        color="error"
        variant="subtle"
        :description="error"
      />
      <UButton
        type="submit"
        block
        :loading="loading"
      >
        Sign in
      </UButton>
    </form>
  </UContainer>
</template>
