<script setup lang="ts">
import type { AdminBooking, BookingStatus } from '~/types/admin'
import { statusLabels } from '~/utils/admin'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ booking?: AdminBooking | null }>()
const { data, saveBooking } = useAdmin()
const error = ref('')
const draft = ref<AdminBooking>()
const statuses = Object.entries(statusLabels).map(([value, label]) => ({ value: value as BookingStatus, label }))
const services = computed(() => data.value.services.filter(item => item.active || item.id === draft.value?.serviceId).map(item => ({ label: item.name, value: item.id })))
const members = computed(() => data.value.members.filter(item => item.active || item.id === draft.value?.userId).map(item => ({ label: item.name, value: item.id })))
watch(open, (value) => {
  if (!value) return
  error.value = ''
  draft.value = props.booking
    ? { ...props.booking }
    : {
        id: 0, serviceId: data.value.services.find(item => item.active)?.id ?? 0, userId: data.value.members.find(item => item.active)?.id ?? '',
        date: data.value.today, time: '09:00', firstName: '', lastName: '', email: '', phone: '', note: '', status: 'confirmed'
      }
})
async function submit() {
  if (!draft.value) return
  const value = { ...draft.value, firstName: draft.value.firstName.trim(), lastName: draft.value.lastName.trim(), email: draft.value.email.trim(), phone: draft.value.phone.trim() }
  if (!value.firstName || !value.lastName || !value.serviceId || !value.userId || !value.phone) {
    error.value = 'Please complete all required fields.'
    return
  }
  const service = data.value.services.find(item => item.id === value.serviceId)!
  const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3))
  const start = minutes(value.time)
  const conflict = value.status !== 'cancelled' && data.value.bookings.some((item) => {
    if (item.id === value.id || item.userId !== value.userId || item.date !== value.date || item.status === 'cancelled') return false
    const end = minutes(item.time) + (data.value.services.find(s => s.id === item.serviceId)?.duration ?? 0)
    return start < end && start + service.duration > minutes(item.time)
  })
  if (value.status !== 'cancelled' && data.value.closures.some(item => item.date === value.date)) {
    error.value = 'The business is closed on this date. Please choose another day.'
    return
  }
  if (conflict) {
    error.value = 'This specialist already has an overlapping booking. Choose another time or specialist.'
    return
  }
  try {
    await saveBooking(value)
    open.value = false
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="booking ? `Booking #${booking.id}` : 'New booking'"
    description="Manage appointment and client details for your clients."
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <template #body>
      <form
        v-if="draft"
        class="space-y-5"
        @submit.prevent="submit"
      >
        <div class="grid gap-4 sm:grid-cols-2">
          <UFormField
            label="First name"
            required
          >
            <UInput
              v-model="draft.firstName"
              required
              maxlength="50"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Last name"
            required
          >
            <UInput
              v-model="draft.lastName"
              required
              maxlength="50"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Email"
            required
          >
            <UInput
              v-model="draft.email"
              required
              type="email"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Phone"
            required
          >
            <UInput
              v-model="draft.phone"
              required
              type="tel"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Service"
            required
          >
            <USelect
              v-model="draft.serviceId"
              :items="services"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Specialist"
            required
          >
            <USelect
              v-model="draft.userId"
              :items="members"
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Date"
            required
          >
            <UInput
              v-model="draft.date"
              type="date"
              required
              class="w-full"
            />
          </UFormField>
          <UFormField
            label="Time"
            required
          >
            <UInput
              v-model="draft.time"
              type="time"
              required
              class="w-full"
            />
          </UFormField>
        </div>
        <UFormField label="Status">
          <USelect
            v-model="draft.status"
            :items="statuses"
            class="w-full"
          />
        </UFormField>
        <UFormField label="Appointment note">
          <UTextarea
            v-model="draft.note"
            :rows="3"
            maxlength="2000"
            class="w-full"
            placeholder="Anything the specialist should know?"
          />
        </UFormField>
        <p
          v-if="error"
          role="alert"
          class="rounded-lg bg-error/10 p-3 text-sm text-error"
        >
          {{ error }}
        </p>
        <div class="flex justify-end gap-2 border-t border-default pt-5">
          <UButton
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="open = false"
          /><UButton
            type="submit"
            :label="booking ? 'Save changes' : 'Create booking'"
            icon="i-lucide-check"
          />
        </div>
      </form>
    </template>
  </UModal>
</template>
