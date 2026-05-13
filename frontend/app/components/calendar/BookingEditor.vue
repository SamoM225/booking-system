<script setup lang="ts">
import type { AdminBooking, BookingStatus } from '~/types/admin'
import { statusLabels } from '~/utils/admin'
import { fromMinutes, toMinutes } from '~/utils/calendar'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  booking?: AdminBooking | null
  /** Prefill for a new booking (clicked slot) */
  defaults?: Partial<AdminBooking>
}>()

const { isAdmin, user } = useAuth()
const { data, saveBooking, removeBooking } = useCalendar()
const error = ref('')
const saving = ref(false)
const confirmDelete = ref(false)
const draft = ref<AdminBooking>()
const statuses = Object.entries(statusLabels).map(([value, label]) => ({ value: value as BookingStatus, label }))

const members = computed(() => data.value.members
  .filter(item => item.active || item.id === draft.value?.userId)
  .map(item => ({ label: item.name, value: item.id })))
// Only the services the chosen specialist offers (none selected = offers everything)
const services = computed(() => {
  const offered = data.value.members.find(item => item.id === draft.value?.userId)?.serviceIds ?? []
  return data.value.services
    .filter(item => item.id === draft.value?.serviceId || (item.active && (!offered.length || offered.includes(item.id))))
    .map(item => ({ label: `${item.name} · ${item.duration} min`, value: item.id }))
})
const ends = computed(() => {
  const service = data.value.services.find(item => item.id === draft.value?.serviceId)
  return service && draft.value?.time ? fromMinutes((toMinutes(draft.value.time) + service.duration) % (24 * 60)) : ''
})

watch(open, (value) => {
  if (!value) return
  error.value = ''
  confirmDelete.value = false
  const userId = props.defaults?.userId ?? (isAdmin.value ? data.value.members.find(item => item.active)?.id : user.value?.id) ?? ''
  draft.value = props.booking
    ? { ...props.booking }
    : {
        id: 0, serviceId: 0, userId, date: '', time: '09:00',
        firstName: '', lastName: '', email: '', phone: '', note: '', status: 'confirmed',
        ...props.defaults
      }
})
// Keep the service valid when the specialist changes
watch(services, (list) => {
  if (draft.value && !list.some(item => item.value === draft.value!.serviceId)) draft.value.serviceId = list[0]?.value ?? 0
})

async function submit() {
  if (!draft.value) return
  const value = { ...draft.value, firstName: draft.value.firstName.trim(), lastName: draft.value.lastName.trim(), email: draft.value.email.trim(), phone: draft.value.phone.trim() }
  if (!value.firstName || !value.lastName || !value.serviceId || !value.userId || !value.phone || !value.date || !value.time) {
    error.value = 'Please complete all required fields.'
    return
  }
  saving.value = true
  try {
    await saveBooking(value)
    open.value = false
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.booking) return
  try {
    await removeBooking(props.booking.id)
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
    :description="booking ? 'Change the appointment, move it to another time or update its status.' : 'Add an appointment to the calendar.'"
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
          <UFormField label="Email">
            <UInput
              v-model="draft.email"
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
              maxlength="30"
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
              :disabled="!isAdmin"
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
            :hint="ends ? `ends ${ends}` : undefined"
          >
            <UInput
              v-model="draft.time"
              type="time"
              step="300"
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
            maxlength="1000"
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
        <div class="flex flex-wrap items-center justify-between gap-2 border-t border-default pt-5">
          <div>
            <template v-if="booking && isAdmin">
              <UButton
                v-if="!confirmDelete"
                label="Delete"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                @click="confirmDelete = true"
              />
              <UButton
                v-else
                label="Delete permanently"
                icon="i-lucide-trash-2"
                color="error"
                @click="remove"
              />
            </template>
          </div>
          <div class="flex gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="open = false"
            />
            <UButton
              type="submit"
              :label="booking ? 'Save changes' : 'Create booking'"
              icon="i-lucide-check"
              :loading="saving"
            />
          </div>
        </div>
      </form>
    </template>
  </UModal>
</template>
