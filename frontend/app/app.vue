<script setup lang="ts">
import Navbar from './components/navigation/Navbar.vue'

useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'en'
  }
})

const title = 'Nuxt Starter Template'
const description = 'A production-ready starter template powered by Nuxt UI. Build beautiful, accessible, and performant applications in minutes, not hours.'

const { colorMode, isAnimating, toggle: toggleColorMode } = useThemeTransition()

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogImage: 'https://ui.nuxt.com/assets/templates/nuxt/starter-light.png',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <UHeader>
      <template #title>
        <NuxtLink to="/" aria-label="Booking home" class="flex items-center gap-2">
          <AppLogo />
          <span class="text-lg font-semibold">Booking</span>
        </NuxtLink>
      </template>

      <Navbar />

      <template #right>
        <UButton class="rounded-full" size="xs" :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          :aria-label="colorMode.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          :aria-busy="isAnimating" color="neutral" variant="ghost" data-testid="color-mode-toggle"
          @click="toggleColorMode($event)" />
      </template>
    </UHeader>

    <UMain>
      <NuxtPage />
    </UMain>

    <UContainer class="pb-0 border border-gray-200">
      <UFooter>
        <template #left>
          <span>
            
            <NuxtLink href="https://github.com/SamoM225" target="_blank" rel="noopener noreferrer" class="flex items-center gap-2">
              Created By SM
              <UIcon name="i-simple-icons-github" />
            </NuxtLink>
          </span>
        </template>

        <UNavigationMenu :items="[
          { label: 'Home', to: '/' },
          { label: 'Booking', to: '/booking' },
          { label: 'FAQ', to: '/faq' },
          { label: 'Contact Us', to: '/contact' }
        ]" :ui="{ list: 'gap-4', link: 'hover:text-primary' }" />

        <template #right>
          <UButton to="mailto:majerciks1004@gmail.com" label="Email us" icon="i-lucide-mail" color="primary" />
        </template>
      </UFooter>

    </UContainer>
  </UApp>
</template>
