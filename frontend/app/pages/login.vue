<script setup lang="ts">
useSeoMeta({ title: 'Sign in', robots: 'noindex, nofollow' })

const { login, user } = useAuth()
const route = useRoute()
// Prefilled after accepting an invitation when the automatic sign-in did not work
const email = ref(typeof route.query.email === 'string' ? route.query.email : '')
const password = ref('')
const error = ref('')
const loading = ref(false)
const { public: { demoMode } } = useRuntimeConfig()

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await login(email.value.trim(), password.value)
    if (user.value?.role === 'worker') {
      await navigateTo('/admin/calendar')
      return
    }
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

function signInAsDemo(demoEmail: string) {
  email.value = demoEmail
  password.value = DEMO_PASSWORD
  return submit()
}
</script>

<template>
  <UContainer class="flex min-h-[60vh] flex-col items-center justify-center gap-4 py-16">
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
      <p class="text-center text-sm text-muted">
        No account yet?
        <ULink
          to="/register"
          class="font-medium text-primary"
        >
          Create one
        </ULink>
      </p>
    </form>

    <section
      v-if="demoMode"
      aria-labelledby="demo-accounts"
      class="w-full max-w-sm rounded-2xl border border-primary/30 bg-primary/5 p-5"
    >
      <h2
        id="demo-accounts"
        class="font-semibold text-highlighted"
      >
        Try the demo
      </h2>
      <p class="mt-1 text-sm text-muted">
        Sign in with a demo account. Password for both: <code class="font-mono text-highlighted">{{ DEMO_PASSWORD }}</code>. The data resets every night.
      </p>
      <ul class="mt-4 space-y-3">
        <li
          v-for="account in DEMO_ACCOUNTS"
          :key="account.email"
          class="flex items-center justify-between gap-3"
        >
          <div class="min-w-0 text-sm">
            <p class="font-medium text-highlighted">
              {{ account.label }}
            </p>
            <p class="truncate font-mono text-xs text-muted">
              {{ account.email }}
            </p>
            <p class="text-xs text-muted">
              {{ account.description }}
            </p>
          </div>
          <UButton
            size="sm"
            variant="soft"
            :disabled="loading"
            @click="signInAsDemo(account.email)"
          >
            Sign in
          </UButton>
        </li>
      </ul>
    </section>
  </UContainer>
</template>
