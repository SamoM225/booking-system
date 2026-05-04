<script setup lang="ts">
const store = usePersonalDetailsStore()
const { first_name, last_name, email, phone, description, agreeToTerms } = storeToRefs(store)
</script>

<template>
  <section class="space-y-5 pt-2">
    <div>
      <h2 class="flex items-center gap-3 text-sm font-medium">
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white shadow-md shadow-primary/25">4</span>
        Personal details
      </h2>
      <p class="ml-11 mt-1 text-sm text-muted">
        We will use these details to send your confirmation.
      </p>
    </div>

    <div class="rounded-2xl bg-default p-5 shadow-sm sm:p-6">
      <div class="grid gap-5 md:grid-cols-2">
        <UFormField
          required
          label="First name"
        >
          <UInput
            v-model="first_name"
            icon="i-lucide-user"
            variant="soft"
            size="lg"
            placeholder="John"
            class="w-full"
          />
        </UFormField>

        <UFormField
          required
          label="Last name"
        >
          <UInput
            v-model="last_name"
            icon="i-lucide-user"
            variant="soft"
            size="lg"
            placeholder="Doe"
            class="w-full"
          />
        </UFormField>

        <UFormField
          required
          label="Email address"
        >
          <UInput
            v-model="email"
            type="email"
            icon="i-lucide-at-sign"
            variant="soft"
            size="lg"
            placeholder="mail@example.com"
            class="w-full"
          />
        </UFormField>

        <UFormField
          required
          label="Phone number"
        >
          <UInput
            v-model="phone"
            type="tel"
            icon="i-lucide-phone"
            variant="soft"
            size="lg"
            placeholder="+1 (555) 123-4567"
            class="w-full"
          />
        </UFormField>
      </div>

      <UFormField
        label="Note for your appointment"
        class="mt-5"
      >
        <UTextarea
          v-model="description"
          :rows="4"
          variant="soft"
          size="lg"
          placeholder="Anything we should know before your visit?"
          class="w-full"
        />
      </UFormField>

      <div class="mt-5 rounded-xl bg-elevated/70 p-4">
        <UCheckbox
          v-model="agreeToTerms"
          required
          label="I agree to the terms and conditions"
        />
      </div>
    </div>
  </section>
</template>
