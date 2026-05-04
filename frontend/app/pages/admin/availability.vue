<script setup lang="ts">
import type { WorkingDay } from '~/types/admin'
import { defaultSchedule, formatAdminDate } from '~/utils/admin'

definePageMeta({ layout: 'admin' })
const route = useRoute()
const { data, saveSchedule, nextId, saved } = useAdminDemo()
const requested = typeof route.query.member === 'string' ? route.query.member : ''
const member = ref(data.value.members.some(item => item.id === requested) ? requested : data.value.members[0]?.id ?? '')
const draft = ref<WorkingDay[]>([])
const error = ref('')
const closureOpen = ref(false)
const closureDate = ref('')
const closureReason = ref('')
const closureError = ref('')
const removing = ref<number | null>(null)
const removeOpen = computed({
  get: () => removing.value !== null,
  set: (value) => {
    if (!value) removing.value = null
  }
})
const members = computed(() => data.value.members.map(item => ({ label: item.name, value: item.id })))
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(data.value.schedules[member.value] ?? defaultSchedule()))
function load() {
  draft.value = (data.value.schedules[member.value] ?? defaultSchedule()).map(day => ({ ...day }))
  error.value = ''
}
watch(member, load, { immediate: true })
function submit() {
  if (draft.value.some(day => day.enabled && (!day.open || !day.close || day.open >= day.close))) {
    error.value = 'For each working day, closing time must be later than opening time.'
    return
  }
  saveSchedule(member.value, draft.value)
  error.value = ''
}
function addClosure() {
  if (!closureDate.value || !closureReason.value.trim() || data.value.closures.some(item => item.date === closureDate.value)) {
    closureError.value = 'Choose a new date and add a reason for the closure.'
    return
  }
  if (data.value.bookings.some(item => item.date === closureDate.value && item.status !== 'cancelled')) {
    closureError.value = 'This day has bookings. Reschedule or cancel them before closing the business.'
    return
  }
  data.value.closures.push({ id: nextId(data.value.closures), date: closureDate.value, reason: closureReason.value.trim() })
  closureOpen.value = false
  saved('Closure added')
}
function removeClosure() {
  data.value.closures = data.value.closures.filter(item => item.id !== removing.value)
  removing.value = null
  saved('Closure removed')
}
function newClosure() {
  closureDate.value = ''
  closureReason.value = ''
  closureError.value = ''
  closureOpen.value = true
}
</script>

<template>
  <div>
    <AdminPageHeading
      eyebrow="Time, well planned"
      title="Make room for a better day."
      description="Set regular working hours and keep time off clear for everyone."
    />
    <div class="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section class="min-w-0 rounded-2xl border border-default bg-default">
        <div class="flex flex-wrap items-center justify-between gap-4 border-b border-default p-5 sm:p-6">
          <div>
            <h2 class="font-semibold">
              Weekly working hours
            </h2><p class="mt-1 text-xs text-muted">
              Repeats every week · Europe/Bratislava
            </p>
          </div><USelect
            v-model="member"
            :items="members"
            :disabled="dirty"
            aria-label="Choose specialist"
            class="w-48"
          />
        </div>
        <form @submit.prevent="submit">
          <div class="divide-y divide-default px-5 sm:px-6">
            <div
              v-for="day in draft"
              :key="day.day"
              class="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <USwitch
                v-model="day.enabled"
                :label="day.label"
                class="w-36"
              /><div
                v-if="day.enabled"
                class="flex items-center gap-2"
              >
                <UInput
                  v-model="day.open"
                  type="time"
                  :aria-label="`${day.label} opening time`"
                  required
                  class="w-30 sm:w-32"
                /><span class="text-xs text-muted">to</span><UInput
                  v-model="day.close"
                  type="time"
                  :aria-label="`${day.label} closing time`"
                  required
                  class="w-30 sm:w-32"
                />
              </div><span
                v-else
                class="rounded-lg bg-elevated px-4 py-2 text-xs text-muted"
              >Day off</span>
            </div>
          </div>
          <div class="border-t border-default p-5 sm:p-6">
            <p
              v-if="error"
              role="alert"
              class="mb-4 text-sm text-error"
            >
              {{ error }}
            </p><div class="flex flex-wrap items-center justify-between gap-3">
              <p
                class="text-xs text-muted"
                aria-live="polite"
              >
                {{ dirty ? 'Unsaved changes. Save or discard before switching specialist.' : 'Your weekly schedule is up to date in this preview.' }}
              </p><div class="flex gap-2">
                <UButton
                  label="Discard"
                  variant="ghost"
                  color="neutral"
                  :disabled="!dirty"
                  @click="load"
                /><UButton
                  type="submit"
                  label="Save hours"
                  icon="i-lucide-check"
                  :disabled="!dirty"
                />
              </div>
            </div>
          </div>
        </form>
      </section>
      <div class="space-y-5">
        <section class="rounded-2xl border border-default bg-default p-5">
          <div class="flex items-center justify-between gap-2">
            <h2 class="font-semibold">
              Business closures
            </h2><UButton
              icon="i-lucide-plus"
              aria-label="Add closure"
              variant="soft"
              size="sm"
              @click="newClosure"
            />
          </div><p class="mt-2 text-xs leading-5 text-muted">
            Dates when the whole team is unavailable.
          </p><div
            v-if="data.closures.length"
            class="mt-5 space-y-3"
          >
            <div
              v-for="closure in [...data.closures].sort((a, b) => a.date.localeCompare(b.date))"
              :key="closure.id"
              class="flex items-center gap-3 rounded-xl bg-elevated/60 p-3"
            >
              <UIcon
                name="i-lucide-calendar-off"
                class="size-5 shrink-0 text-primary"
              /><div class="min-w-0 flex-1">
                <p class="text-sm font-medium">
                  {{ formatAdminDate(closure.date, true) }}
                </p><p class="mt-0.5 break-words text-xs text-muted">
                  {{ closure.reason }}
                </p>
              </div><UButton
                icon="i-lucide-x"
                :aria-label="`Remove closure ${closure.reason}`"
                color="neutral"
                variant="ghost"
                size="xs"
                @click="removing = closure.id"
              />
            </div>
          </div><p
            v-else
            class="mt-5 rounded-xl bg-elevated/60 p-4 text-sm text-muted"
          >
            No planned closures.
          </p><UButton
            label="Add closed date"
            icon="i-lucide-plus"
            variant="outline"
            block
            class="mt-5"
            @click="newClosure"
          />
        </section>
        <div class="rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 p-5">
          <UIcon
            name="i-lucide-coffee"
            class="size-6 text-primary"
          /><h3 class="mt-3 font-semibold">
            Time off matters, too.
          </h3><p class="mt-2 text-sm leading-6 text-muted">
            A day off switches off regular hours for that weekday. Business closures apply to every specialist.
          </p>
        </div>
      </div>
    </div>
    <UModal
      v-model:open="closureOpen"
      title="Add a closed date"
      description="Block a whole day for everyone in the team."
    >
      <template #body>
        <form
          class="space-y-5"
          @submit.prevent="addClosure"
        >
          <UFormField
            label="Date"
            required
          >
            <UInput
              v-model="closureDate"
              type="date"
              :min="data.today"
              required
              class="w-full"
            />
          </UFormField><UFormField
            label="Reason"
            required
          >
            <UInput
              v-model="closureReason"
              placeholder="Public holiday, team training…"
              maxlength="150"
              required
              class="w-full"
            />
          </UFormField><p
            v-if="closureError"
            role="alert"
            class="text-sm text-error"
          >
            {{ closureError }}
          </p><div class="flex justify-end gap-2">
            <UButton
              label="Cancel"
              color="neutral"
              variant="outline"
              @click="closureOpen = false"
            /><UButton
              label="Add closure"
              type="submit"
            />
          </div>
        </form>
      </template>
    </UModal>
    <UModal
      v-model:open="removeOpen"
      title="Remove this closure?"
      description="The date will use the team’s regular working hours again."
    >
      <template #body>
        <div class="flex justify-end gap-2">
          <UButton
            label="Keep closure"
            color="neutral"
            variant="outline"
            @click="removing = null"
          /><UButton
            label="Remove closure"
            color="error"
            @click="removeClosure"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
