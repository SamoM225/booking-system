<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const link = ref<ButtonProps[]>([
    {
        label: 'Schedule your appointment',
        to: '/booking',
        trailingIcon: 'i-lucide-book-open'
    },
    {
        label: 'Contact us',
        to: '/contact',
        trailingIcon: 'i-lucide-arrow-right'
    }
])

</script>


<template>
    <UPageHero 
        title="Make your appointment today"
        description="We are here to help you with your needs. Schedule your appointment today and let us take care of the rest."
        :links="link"
        headline="Easy appointment scheduling"
        orientation="horizontal"
    >
        <img
            src="/images/appointment-booking-hero.png"
            alt="Appointment booking interface with service options, calendar, available times, and confirmation"
            width="1536"
            height="1024"
            loading="eager"
            fetchpriority="high"
            class="w-full rounded-2xl shadow-2xl ring-1 ring-default"
        >
    </UPageHero>
</template>
