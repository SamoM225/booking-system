<script setup lang="ts">
import type { TimeOff } from '~/types/admin'
import { shiftDate } from '~/utils/admin'
import { fromMinutes, joinDateTime, splitDateTime, toMinutes } from '~/utils/calendar'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{
  timeOff?: TimeOff | null
  /** Prefill for a new entry: a clicked slot, a range dragged in the grid or days selected in the month view */
  defaults?: { userId?: string, date: string, time: string, endDate?: string, endTime?: string, allDay?: boolean }
}>()

const { isAdmin, user } = useAuth()
const { data, saveTimeOff, removeTimeOff } = useCalendar()
const error = ref('')
const saving = ref(false)
const draft = ref({ userId: '', allDay: false, fromDate: '', fromTime: '09:00', toDate: '', toTime: '10:00', reason: '' })
const members = computed(() => data.value.members
  .filter(item => item.active || item.id === draft.value.userId)
  .map(item => ({ label: item.name, value: item.id })))

watch(open, (value) => {
  if (!value) return
  error.value = ''
  if (props.timeOff) {
    const from = props.timeOff.from.slice(11, 16)
    const to = splitDateTime(props.timeOff.to)
    const allDay = from === '00:00' && to.minutes === 0
    draft.value = {
      userId: props.timeOff.userId,
      allDay,
      fromDate: props.timeOff.from.slice(0, 10),
      fromTime: allDay ? '09:00' : from,
      // All-day ranges end at the next midnight, show the last day instead
      toDate: allDay ? shiftDate(to.date, -1) : to.date,
      toTime: allDay ? '17:00' : props.timeOff.to.slice(11, 16),
      reason: props.timeOff.reason
    }
    return
  }
  const defaults = props.defaults
  const start = defaults?.time ?? '09:00'
  // Without a given end: one hour, which may run into the next day
  const fallback = defaults?.date ? splitDateTime(joinDateTime(defaults.date, toMinutes(start) + 60)) : null
  draft.value = {
    userId: defaults?.userId ?? (isAdmin.value ? data.value.members.find(item => item.active)?.id : user.value?.id) ?? '',
    allDay: Boolean(defaults?.allDay),
    fromDate: defaults?.date ?? '',
    fromTime: start,
    toDate: defaults?.endDate ?? fallback?.date ?? '',
    toTime: defaults?.endTime ?? (fallback ? fromMinutes(fallback.minutes) : '10:00'),
    reason: ''
  }
})
// Most time off ends on the day it starts: moving the first day drags the last day along.
// A handler instead of a watcher, so prefilling a range above never resets its end.
function setFromDate(value: string) {
  const previous = draft.value.fromDate
  draft.value.fromDate = value
  if (value && (!draft.value.toDate || draft.value.toDate === previous || draft.value.toDate < value)) draft.value.toDate = value
}

async function submit() {
  const value = draft.value
  if (!value.userId || !value.fromDate || !value.toDate || (!value.allDay && (!value.fromTime || !value.toTime))) {
    error.value = 'Please complete all required fields.'
    return
  }
  const from = value.allDay ? `${value.fromDate}T00:00` : `${value.fromDate}T${value.fromTime}`
  const to = value.allDay ? `${shiftDate(value.toDate, 1)}T00:00` : `${value.toDate}T${value.toTime}`
  if (from >= to) {
    error.value = 'The end must be later than the start.'
    return
  }
  saving.value = true
  try {
    await saveTimeOff({ id: props.timeOff?.id, userId: value.userId, from, to, reason: value.reason.trim() })
    open.value = false
  } catch (e) {
    error.value = apiErrorMessage(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  if (!props.timeOff) return
  try {
    await removeTimeOff(props.timeOff.id)
    open.value = false
  } catch (e) {
    error.value = apiErrorMessage(e)
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="timeOff ? 'Unavailability' : 'Add unavailability'"
    description="Block time when the specialist cannot take appointments. Clients will not be able to book it."
  >
    <template #body>
      <form
        class="space-y-5"
        @submit.prevent="submit"
      >
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
        <USwitch
          v-model="draft.allDay"
          label="All day"
        />
        <div class="grid gap-4">
          <UFormField
            :label="draft.allDay ? 'First day' : 'From'"
            required
          >
            <div class="flex gap-2">
              <UInput
                :model-value="draft.fromDate"
                type="date"
                required
                class="min-w-0 flex-1"
                @update:model-value="value => setFromDate(String(value ?? ''))"
              />
              <UInput
                v-if="!draft.allDay"
                v-model="draft.fromTime"
                type="time"
                step="300"
                required
                aria-label="Start time"
                class="w-32 shrink-0"
              />
            </div>
          </UFormField>
          <UFormField
            :label="draft.allDay ? 'Last day' : 'To'"
            required
          >
            <div class="flex gap-2">
              <UInput
                v-model="draft.toDate"
                type="date"
                :min="draft.fromDate"
                required
                class="min-w-0 flex-1"
              />
              <UInput
                v-if="!draft.allDay"
                v-model="draft.toTime"
                type="time"
                step="300"
                required
                aria-label="End time"
                class="w-32 shrink-0"
              />
            </div>
          </UFormField>
        </div>
        <UFormField label="Reason">
          <UInput
            v-model="draft.reason"
            maxlength="200"
            placeholder="Doctor, vacation, training…"
            class="w-full"
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
            <UButton
              v-if="timeOff"
              label="Remove"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              @click="remove"
            />
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
              :label="timeOff ? 'Save changes' : 'Add unavailability'"
              icon="i-lucide-check"
              :loading="saving"
            />
          </div>
        </div>
      </form>
    </template>
  </UModal>
</template>
