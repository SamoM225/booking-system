<script setup lang="ts">
import type { AccordionItem } from '@nuxt/ui'

useSeoMeta({
  title: 'FAQ',
  description: 'Answers to common questions about booking, changing, and cancelling appointments.'
})

const query = ref('')

const items: AccordionItem[] = [
  {
    label: 'How do I book an appointment?',
    icon: 'i-lucide-calendar-check',
    content: 'Open the Booking page, choose a service and team member, then select an available date and time. Review the summary and confirm your appointment.'
  },
  {
    label: 'Can I change my booking after it is confirmed?',
    icon: 'i-lucide-calendar-cog',
    content: 'Yes. Use the link in your confirmation email or contact our team. We recommend making changes at least 24 hours before your appointment.'
  },
  {
    label: 'How can I cancel an appointment?',
    icon: 'i-lucide-calendar-x',
    content: 'You can cancel through your confirmation email. If the link is unavailable, send us a message with your name, appointment date, and selected service.'
  },
  {
    label: 'Will I receive a booking confirmation?',
    icon: 'i-lucide-mail-check',
    content: 'A confirmation is sent to your email immediately after booking. It includes your service, team member, date, time, and a link for managing the appointment.'
  },
  {
    label: 'What happens if I arrive late?',
    icon: 'i-lucide-clock-3',
    content: 'Please let us know as soon as possible. We will do our best to accommodate you, but a late arrival may shorten the appointment or require a new time.'
  },
  {
    label: 'Can I choose a specific team member?',
    icon: 'i-lucide-user-round-check',
    content: 'Yes. Available team members appear after you select a service. Their available dates and times are shown automatically.'
  },
  {
    label: 'Is my personal information secure?',
    icon: 'i-lucide-shield-check',
    content: 'We only use your details to manage the appointment and contact you about your booking. Your information is not sold or used for unrelated marketing.'
  }
]

const filteredItems = computed(() => {
  const search = query.value.trim().toLowerCase()

  if (!search) {
    return items
  }

  return items.filter(item => `${item.label} ${item.content}`.toLowerCase().includes(search))
})
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden border-b border-default">
      <img
        src="/images/faq-hero.png"
        alt=""
        width="1983"
        height="793"
        fetchpriority="high"
        class="absolute inset-0 -z-20 h-full w-full object-cover"
      >
      <div class="absolute inset-0 -z-10 bg-white/20 dark:bg-slate-950/75" />

      <UContainer class="py-20 sm:py-28">
        <div class="mx-auto max-w-3xl text-center">
          <UBadge
            icon="i-lucide-message-circle-question"
            label="Help center"
            variant="subtle"
            size="lg"
          />
          <h1 class="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl dark:text-white">
            Questions? We have answers.
          </h1>
          <p class="mx-auto mt-5 max-w-2xl text-base text-slate-700 sm:text-lg dark:text-slate-200">
            Find everything you need to book, change, or manage your appointment with confidence.
          </p>

          <UInput
            v-model="query"
            icon="i-lucide-search"
            size="xl"
            placeholder="Search booking questions..."
            aria-label="Search frequently asked questions"
            class="mx-auto mt-8 w-full max-w-xl shadow-xl"
          />
        </div>
      </UContainer>
    </section>

    <UContainer class="py-16 sm:py-20">
      <div class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div class="mb-6">
            <p class="text-sm font-semibold text-primary">
              {{ filteredItems.length }} answers
            </p>
            <h2 class="mt-1 text-2xl font-bold text-highlighted">
              Frequently asked questions
            </h2>
          </div>

          <UAccordion
            v-if="filteredItems.length"
            :items="filteredItems"
            :ui="{
              root: 'space-y-3',
              item: 'rounded-xl border border-default bg-default px-5 shadow-sm',
              trigger: 'py-5 text-left',
              content: 'pb-5 text-muted'
            }"
          />

          <UEmpty
            v-else
            icon="i-lucide-search-x"
            title="No matching questions"
            description="Try a different search or send our team a message."
            variant="subtle"
          />
        </div>

        <aside>
          <UCard class="sticky top-24 overflow-hidden bg-gradient-to-br from-primary/10 via-default to-violet-500/10">
            <div class="flex size-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/25">
              <UIcon
                name="i-lucide-headphones"
                class="size-6"
              />
            </div>
            <h2 class="mt-5 text-xl font-bold text-highlighted">
              Still need help?
            </h2>
            <p class="mt-2 text-sm leading-6 text-muted">
              Our team can help with an existing booking or answer anything not covered here.
            </p>
            <div class="mt-6 flex flex-col gap-3">
              <UButton
                to="/contact"
                label="Contact support"
                icon="i-lucide-message-square"
                block
                size="lg"
              />
              <UButton
                to="/booking"
                label="Book an appointment"
                icon="i-lucide-calendar-plus"
                color="neutral"
                variant="outline"
                block
              />
            </div>
          </UCard>
        </aside>
      </div>
    </UContainer>
  </div>
</template>
