<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items = ref<NavigationMenuItem[]>([
    {
        label: 'Home',
        icon: 'i-lucide-home',
        to: '/',
    },
    {
        label: 'Booking',
        icon: 'i-lucide-calendar',
        to: '/booking',
    },
    {
        label: 'FAQ',
        icon: 'i-lucide-help-circle',
        to: '/faq',
    },
    {
        label: 'Contact Us',
        icon: 'i-lucide-phone',
        to: '/contact',
    }
])
</script>

<template>
    <UNavigationMenu
        :items="items"
        :ui="{ list: 'gap-4' }"
    />
</template>