<script setup lang="ts">
import Navbar from '../components/navigation/Navbar.vue'

const { colorMode, isAnimating, toggle: toggleColorMode } = useThemeTransition()
</script>

<template>
  <div>
    <UHeader>
      <template #title>
        <NuxtLink
          to="/"
          aria-label="Booking home"
          class="flex items-center gap-2"
        >
          <AppLogo />
          <span class="text-lg font-semibold">Booking</span>
        </NuxtLink>
      </template>

      <Navbar />

      <template #right>
        <UButton
          class="rounded-full"
          size="xs"
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-busy="isAnimating"
          color="neutral"
          variant="ghost"
          data-testid="color-mode-toggle"
          @click="toggleColorMode($event)"
        />
      </template>
    </UHeader>

    <UMain>
      <slot />
    </UMain>

    <UContainer class="pb-0 border border-gray-200">
      <UFooter>
        <template #left>
          <span>

            <NuxtLink
              href="https://github.com/SamoM225"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-2"
            >
              Created By SM
              <UIcon name="i-simple-icons-github" />
            </NuxtLink>
          </span>
        </template>

        <UNavigationMenu
          :items="[
            { label: 'Home', to: '/' },
            { label: 'Booking', to: '/booking' },
            { label: 'FAQ', to: '/faq' },
            { label: 'Contact Us', to: '/contact' },
            { label: 'Admin preview', to: '/admin' }
          ]"
          :ui="{ list: 'gap-4', link: 'hover:text-primary' }"
        />

        <template #right>
          <UButton
            to="mailto:majerciks1004@gmail.com"
            label="Email us"
            icon="i-lucide-mail"
            color="primary"
          />
        </template>
      </UFooter>
    </UContainer>
  </div>
</template>
