/** Public demo accounts (NUXT_PUBLIC_DEMO_MODE=true). The backend creates them in backend/src/demo. */
export const DEMO_PASSWORD = 'demo1234'

export const DEMO_ACCOUNTS = [
  { label: 'Administrator', description: 'Everything: overview, calendar, bookings, services and team', email: 'demo-admin@example.com' },
  { label: 'Specialist', description: 'Own calendar and time off', email: 'demo-worker@example.com' }
]
