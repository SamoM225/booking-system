<script setup lang="ts">
const route = useRoute()
const { loaded, load } = useAdmin()
const { logout, user, isAdmin } = useAuth()
// The user is only known on the client (see admin.global.ts): render the SSR version first, switch after mount
const mounted = ref(false)
const viewer = computed(() => mounted.value ? user.value : null)
const isWorker = computed(() => viewer.value?.role === 'worker')
const loadError = ref('')
onMounted(async () => {
  mounted.value = true
  // Workers only have the calendar, which loads its own data from /calendar
  if (!isAdmin.value) {
    loaded.value = true
    return
  }
  try {
    await load()
  } catch (e) {
    loadError.value = apiErrorMessage(e, 'Could not load data from the server.')
  }
})
async function signOut() {
  await logout()
  loaded.value = false
  await navigateTo('/login')
}
const { colorMode, toggle } = useThemeTransition()
const allLinks = [
  { label: 'Overview', to: '/admin', icon: 'i-lucide-layout-dashboard' },
  { label: 'Calendar', to: '/admin/calendar', icon: 'i-lucide-calendar-range' },
  { label: 'Bookings', to: '/admin/bookings', icon: 'i-lucide-calendar-days' },
  { label: 'Services', to: '/admin/services', icon: 'i-lucide-sparkles' },
  { label: 'Team', to: '/admin/team', icon: 'i-lucide-users-round' },
  { label: 'Availability', to: '/admin/availability', icon: 'i-lucide-clock-3' }
]
const links = computed(() => isWorker.value ? allLinks.filter(link => link.to === '/admin/calendar') : allLinks)
const home = computed(() => isWorker.value ? '/admin/calendar' : '/admin')
const initials = computed(() => !viewer.value?.name ? 'AD' : viewer.value.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase())
const current = computed(() => allLinks.find(link => link.to === route.path)?.label ?? 'Overview')
useHead({ meta: [{ name: 'robots', content: 'noindex, nofollow' }] })
useSeoMeta({ title: () => `${current.value} · Booking Admin` })
</script>

<template>
  <div class="admin-shell min-h-screen bg-slate-50 dark:bg-slate-950">
    <a
      href="#admin-main"
      class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-default focus:p-3"
    >Skip to content</a>
    <aside class="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-default bg-default lg:flex">
      <NuxtLink
        :to="home"
        class="flex h-22 items-center gap-2.5 px-7"
        aria-label="Booking administration"
      ><AppLogo /><span class="text-xl font-bold tracking-tight">Booking<span class="text-primary">.</span></span></NuxtLink>
      <div class="px-5 pt-7">
        <p class="mb-3 px-3 text-[10px] font-bold tracking-[0.18em] text-muted uppercase">
          Workspace
        </p>
        <nav
          aria-label="Administration"
          class="space-y-1.5"
        >
          <NuxtLink
            v-for="link in links"
            :key="link.to"
            :to="link.to"
            :aria-current="route.path === link.to ? 'page' : undefined"
            class="flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-colors"
            :class="route.path === link.to ? 'bg-primary/10 text-primary' : 'text-muted hover:bg-elevated hover:text-highlighted'"
          ><UIcon
            :name="link.icon"
            class="size-5"
          />{{ link.label }}</NuxtLink>
        </nav>
      </div>
      <div class="mt-auto p-5">
        <div class="rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 p-4">
          <UIcon
            name="i-lucide-heart-handshake"
            class="mb-2 size-6 text-primary"
          /><p class="text-sm font-semibold">
            A little more organised.
          </p><p class="mt-1 text-xs leading-5 text-muted">
            More time for the people who matter.
          </p><UButton
            to="/"
            variant="link"
            size="xs"
            trailing-icon="i-lucide-arrow-up-right"
            class="mt-3 p-0"
          >
            View booking website
          </UButton>
        </div>
        <div class="mt-5 flex items-center gap-3 border-t border-default pt-5">
          <div class="flex size-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {{ initials }}
          </div><div>
            <p class="text-sm font-semibold">
              {{ viewer?.name || 'Admin workspace' }}
            </p><p class="text-xs text-muted">
              {{ isWorker ? 'Specialist' : 'Administrator' }}
            </p>
          </div>
        </div>
      </div>
    </aside>
    <div class="lg:pl-60">
      <header class="flex h-22 items-center justify-between gap-3 border-b border-default bg-default px-5 sm:px-8 xl:px-10">
        <div class="hidden items-center gap-2 text-sm lg:flex">
          <span class="text-muted">Workspace</span><UIcon
            name="i-lucide-chevron-right"
            class="size-3 text-dimmed"
          /><span class="font-medium">{{ current }}</span>
        </div>
        <NuxtLink
          :to="home"
          class="flex items-center gap-2 font-bold lg:hidden"
        ><AppLogo />Booking</NuxtLink>
        <div class="flex items-center gap-2 sm:gap-4">
          <UButton
            to="/"
            label="View website"
            trailing-icon="i-lucide-arrow-up-right"
            color="neutral"
            variant="ghost"
            size="sm"
          /><UButton
            :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
            :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
            variant="ghost"
            color="neutral"
            class="rounded-full"
            @click="toggle($event)"
          /><UButton
            icon="i-lucide-log-out"
            aria-label="Sign out"
            variant="ghost"
            color="neutral"
            class="rounded-full"
            @click="signOut"
          />
        </div>
      </header>
      <nav
        aria-label="Administration mobile"
        class="flex gap-1 overflow-x-auto border-b border-default bg-default px-4 py-3 lg:hidden"
      >
        <NuxtLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          :aria-current="route.path === link.to ? 'page' : undefined"
          class="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium"
          :class="route.path === link.to ? 'bg-primary/10 text-primary' : 'text-muted'"
        ><UIcon
          :name="link.icon"
          class="size-4"
        />{{ link.label }}</NuxtLink>
      </nav>
      <main
        id="admin-main"
        class="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 xl:px-10 xl:py-9"
      >
        <UAlert
          v-if="loadError"
          color="error"
          variant="subtle"
          :description="loadError"
        />
        <slot v-else-if="loaded" />
        <p
          v-else
          class="py-20 text-center text-sm text-muted"
        >
          Loading…
        </p>
        <footer class="mt-10 flex flex-wrap justify-between gap-2 border-t border-default pt-5 text-xs text-muted">
          <span>Booking · Administration</span><span>Made for a smoother working day.</span>
        </footer>
      </main>
    </div>
  </div>
</template>
