<script setup lang="ts">
useSeoMeta({ title: 'Create account', robots: 'noindex, nofollow' })

const api = useApi()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await api('/auth/register', {
      method: 'POST',
      body: { name: name.value.trim(), email: email.value.trim(), password: password.value }
    })
    await navigateTo('/login')
  } catch (e) {
    error.value = apiErrorMessage(e, 'Registration failed.')
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
          Create account
        </h1>
        <p class="mt-1 text-sm text-muted">
          Register with your name, e-mail and a password.
        </p>
      </div>
      <UFormField
        label="Name"
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
        Create account
      </UButton>
      <p class="text-center text-sm text-muted">
        Already have an account?
        <ULink
          to="/login"
          class="font-medium text-primary"
        >
          Sign in
        </ULink>
      </p>
    </form>
  </UContainer>
</template>
