<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { z } from 'zod'

useSeoMeta({
  title: 'Contact us',
  description: 'Get in touch with our team. We are here to help with your booking and any questions.'
})

const toast = useToast()

const subjects = [
  'Booking support',
  'Change or cancel a booking',
  'Service question',
  'Other'
]

const schema = z.object({
  name: z.string().min(2, 'Please enter your name'),
  email: z.email('Please enter a valid email address'),
  subject: z.string().min(1, 'Please choose a subject'),
  message: z.string().min(10, 'Please add a little more detail')
})

type Schema = z.output<typeof schema>

const state = reactive<Partial<Schema>>({
  name: '',
  email: '',
  subject: '',
  message: ''
})

const details = [
  {
    icon: 'i-lucide-mail',
    title: 'Email',
    description: 'hello@example.com'
  },
  {
    icon: 'i-lucide-phone',
    title: 'Phone',
    description: '+1 (555) 123-4567'
  },
  {
    icon: 'i-lucide-map-pin',
    title: 'Office',
    description: '123 Booking Street, Service City'
  },
  {
    icon: 'i-lucide-clock',
    title: 'Hours',
    description: 'Mon–Fri, 9:00–18:00'
  }
]

function onSubmit(_event: FormSubmitEvent<Schema>) {
  toast.add({
    title: 'Message sent',
    description: 'Thanks for reaching out. We will get back to you shortly.',
    icon: 'i-lucide-check',
    color: 'success'
  })

  Object.assign(state, {
    name: '',
    email: '',
    subject: '',
    message: ''
  })
}
</script>

<template>
  <div>
    <section class="relative isolate overflow-hidden">
      <img
        src="/images/contact-hero.png"
        alt=""
        width="2048"
        height="768"
        fetchpriority="high"
        class="absolute inset-0 -z-20 h-full w-full object-cover"
      >
      <div class="absolute inset-0 -z-10 bg-white/20 dark:bg-slate-950/75" />

      <UContainer class="py-20 sm:py-28">
        <div class="mx-auto max-w-3xl text-center">
          <UBadge
            icon="i-lucide-sparkles"
            label="We are here to help"
            variant="subtle"
            size="lg"
          />
          <h1 class="mt-5 text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl dark:text-white">
            Let’s start a conversation.
          </h1>
          <p class="mx-auto mt-5 max-w-2xl text-base text-slate-700 sm:text-lg dark:text-slate-200">
            Need help with a booking or have a question? Send us a message and our team will take it from here.
          </p>
        </div>
      </UContainer>
    </section>

    <UContainer class="py-16 sm:py-20">
      <div class="grid gap-8 lg:grid-cols-[360px_minmax(0,1fr)] lg:gap-12">
        <aside class="space-y-4">
          <div class="mb-7">
            <p class="text-sm font-semibold text-primary">
              Contact details
            </p>
            <h2 class="mt-1 text-2xl font-bold text-highlighted">
              Reach us your way
            </h2>
            <p class="mt-2 text-sm leading-6 text-muted">
              Choose the channel that works best for you. We usually reply within one business day.
            </p>
          </div>

          <UPageCard
            v-for="item in details"
            :key="item.title"
            :icon="item.icon"
            :title="item.title"
            :description="item.description"
            variant="soft"
            class="shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
          />

          <div class="rounded-2xl bg-primary/5 p-5 shadow-sm">
            <div class="flex items-center gap-3 text-sm font-semibold text-highlighted">
              <span class="relative flex size-2.5">
                <span class="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span class="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
              </span>
              Support team online
            </div>
            <p class="mt-2 text-sm text-muted">
              Typical response time: under 2 hours.
            </p>
          </div>
        </aside>

        <section class="rounded-3xl bg-default p-6 shadow-2xl shadow-default/10 sm:p-8">
          <div class="mb-8 flex items-start gap-4">
            <div class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
              <UIcon
                name="i-lucide-message-square-more"
                class="size-5"
              />
            </div>
            <div>
              <p class="text-sm font-semibold text-primary">
                Write to us
              </p>
              <h2 class="mt-1 text-2xl font-bold text-highlighted">
                How can we help?
              </h2>
              <p class="mt-2 text-sm text-muted">
                Share a few details and we will get back to you as soon as possible.
              </p>
            </div>
          </div>

          <UForm
            :schema="schema"
            :state="state"
            class="flex flex-col gap-6"
            @submit="onSubmit"
          >
            <div class="grid gap-5 md:grid-cols-2">
              <UFormField
                label="Your name"
                name="name"
                required
              >
                <UInput
                  v-model="state.name"
                  icon="i-lucide-user"
                  variant="soft"
                  size="lg"
                  placeholder="John Doe"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Email address"
                name="email"
                required
              >
                <UInput
                  v-model="state.email"
                  type="email"
                  icon="i-lucide-at-sign"
                  variant="soft"
                  size="lg"
                  placeholder="john@example.com"
                  class="w-full"
                />
              </UFormField>
            </div>

            <UFormField
              label="What can we help with?"
              name="subject"
              required
            >
              <USelect
                v-model="state.subject"
                :items="subjects"
                icon="i-lucide-list-filter"
                variant="soft"
                size="lg"
                placeholder="Choose a subject"
                class="w-full"
              />
            </UFormField>

            <UFormField
              label="Your message"
              name="message"
              hint="Minimum 10 characters"
              required
            >
              <UTextarea
                v-model="state.message"
                :rows="7"
                variant="soft"
                size="lg"
                placeholder="Tell us how we can help..."
                class="w-full"
              />
            </UFormField>

            <div class="space-y-4 pt-2">
              <p class="flex items-center justify-center gap-2 text-center text-xs text-muted">
                <UIcon
                  name="i-lucide-shield-check"
                  class="size-4 text-primary"
                />
                Your details are only used to answer this request.
              </p>
              <UButton
                type="submit"
                size="lg"
                trailing-icon="i-lucide-send"
                block
                class="justify-center"
              >
                Send message
              </UButton>
            </div>
          </UForm>
        </section>
      </div>
    </UContainer>
  </div>
</template>
