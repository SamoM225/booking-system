<template>
  <div>
    <section class="relative isolate overflow-hidden bg-gradient-to-br from-primary/10 via-default to-violet-500/10">
      <div class="absolute -left-24 top-10 -z-10 size-72 rounded-full bg-primary/15 blur-3xl" />
      <div class="absolute -right-24 bottom-0 -z-10 size-80 rounded-full bg-violet-500/15 blur-3xl" />

      <UContainer class="grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-20">
        <div class="max-w-xl">
          <UBadge
            icon="i-lucide-calendar-heart"
            label="Simple online booking"
            variant="subtle"
            size="lg"
          />
          <h1 class="mt-5 text-4xl font-bold tracking-tight text-highlighted sm:text-5xl">
            Your next appointment is a few clicks away.
          </h1>
          <p class="mt-5 text-base leading-7 text-muted sm:text-lg">
            Pick a service, choose your preferred specialist and reserve a time that fits your day.
          </p>
          <div class="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm font-medium text-toned">
            <span class="flex items-center gap-2">
              <UIcon
                name="i-lucide-circle-check"
                class="size-5 text-primary"
              />
              Instant confirmation
            </span>
            <span class="flex items-center gap-2">
              <UIcon
                name="i-lucide-clock-3"
                class="size-5 text-primary"
              />
              Takes less than a minute
            </span>
          </div>
        </div>

        <img
          src="/images/appointment-booking-hero.png"
          alt="Appointment calendar with services and available times"
          width="1536"
          height="1024"
          fetchpriority="high"
          class="w-full rounded-3xl shadow-2xl shadow-primary/15"
        >
      </UContainer>
    </section>

    <UContainer class="py-12 sm:py-16">
      <div class="mb-8 max-w-2xl">
        <p class="text-sm font-semibold text-primary">
          Appointment details
        </p>
        <h2 class="mt-1 text-3xl font-bold text-highlighted">
          Build your booking
        </h2>
        <p class="mt-2 text-muted">
          Complete each step and review everything before confirming.
        </p>
      </div>

      <div class="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div class="w-full rounded-3xl bg-elevated/50 p-5 shadow-xl shadow-default/5 sm:p-8 lg:flex-1">
          <CategoryPicker />
        </div>

        <aside class="w-full lg:w-96 lg:shrink-0">
          <div class="overflow-hidden rounded-3xl bg-default shadow-xl shadow-default/10 lg:sticky lg:top-24">
            <BookingSummary />
          </div>
        </aside>
      </div>
    </UContainer>
  </div>
</template>
