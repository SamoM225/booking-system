// Demo workspace for the public deployment (DEMO_MODE=true): sign-in accounts, the catalogue, working hours
// and bookings around today. resetDemo() in ./reset.ts rebuilds the database from this.
import { dayOfWeek, fromDate, toDate, toMinutes, WEEK } from '../modules/booking/scheduling.js';

export const DEMO_PASSWORD = 'demo1234';

// Fixed ids: a reset recreates the same users, so the sessions of people trying the demo survive it
export const DEMO_ACCOUNTS = [
    { id: '00000000-0000-4000-8000-0000000000a1', name: 'Alice Morgan', email: 'demo-admin@example.com', role: 'admin' },
    { id: '00000000-0000-4000-8000-0000000000a2', name: 'Bob Williams', email: 'demo-worker@example.com', role: 'worker' }
] as const;

// A third specialist who is not meant for sign-in
export const OTHER_SPECIALIST = { id: '00000000-0000-4000-8000-0000000000a3', name: 'Charlie Davis', email: 'charlie@example.com', role: 'worker' } as const;

export const isDemoAccount = (userId: string) => DEMO_ACCOUNTS.some(account => account.id === userId);

export const CATALOG = {
    Haircut: [
        { name: 'Cut & styling', description: 'A fresh cut, finished your way.', duration: 45, price: 35 },
        { name: 'Hair consultation', description: 'Find the right look with your specialist.', duration: 30, price: 15 }
    ],
    Massage: [
        { name: 'Relaxing massage', description: 'A little time to slow down and unwind.', duration: 60, price: 50 },
        { name: 'Deep tissue massage', description: 'Focused care for tired muscles.', duration: 60, price: 60 }
    ],
    Manicure: [
        { name: 'Classic manicure', description: 'Everyday care, beautifully finished.', duration: 30, price: 25 }
    ]
};

type Weekday = typeof WEEK[number];
type ServiceName = typeof CATALOG[keyof typeof CATALOG][number]['name'];

interface Specialist {
    id: string
    services: ServiceName[]
    // Working hours per day, a missing day is a day off
    hours: Partial<Record<Weekday, string>>
    // Day plans ([start, service]) rotated over the workdays; starts stay on the 30-minute grid and never overlap
    plans: [string, ServiceName][][]
}

const weekdays = (hours: string): Partial<Record<Weekday, string>> =>
    ({ monday: hours, tuesday: hours, wednesday: hours, thursday: hours, friday: hours });

export const SPECIALISTS: Specialist[] = [
    {
        id: DEMO_ACCOUNTS[0].id,
        services: ['Cut & styling', 'Hair consultation'],
        hours: weekdays('09:00-17:00'),
        plans: [
            [['09:00', 'Cut & styling'], ['11:00', 'Hair consultation'], ['14:00', 'Cut & styling']],
            [['10:00', 'Cut & styling'], ['13:30', 'Hair consultation']],
            [['09:30', 'Hair consultation'], ['15:00', 'Cut & styling']]
        ]
    },
    {
        id: DEMO_ACCOUNTS[1].id,
        services: ['Relaxing massage', 'Deep tissue massage'],
        hours: { tuesday: '10:00-18:00', wednesday: '10:00-18:00', thursday: '10:00-18:00', friday: '10:00-18:00', saturday: '09:00-14:00' },
        plans: [
            [['10:00', 'Relaxing massage'], ['13:00', 'Deep tissue massage']],
            [['11:00', 'Deep tissue massage'], ['15:00', 'Relaxing massage'], ['16:30', 'Relaxing massage']]
        ]
    },
    {
        id: OTHER_SPECIALIST.id,
        services: ['Classic manicure', 'Hair consultation'],
        hours: weekdays('08:00-16:00'),
        plans: [
            [['08:30', 'Classic manicure'], ['12:00', 'Classic manicure']],
            [['09:00', 'Hair consultation'], ['14:30', 'Classic manicure']]
        ]
    }
];

const CUSTOMERS = [
    ['Emma', 'Novak'], ['Lucas', 'Horvath'], ['Sofia', 'Kovacova'], ['Daniel', 'Varga'], ['Mia', 'Tothova'],
    ['Adam', 'Kral'], ['Nina', 'Balazova'], ['Peter', 'Simko'], ['Laura', 'Mikulova'], ['Martin', 'Hudak'],
    ['Eva', 'Blahova'], ['Tomas', 'Polak'], ['Kristina', 'Urbanova'], ['Jakub', 'Moravec'], ['Hana', 'Vargova'],
    ['Filip', 'Bartos'], ['Zuzana', 'Krajcova'], ['Michal', 'Benko']
] as const;

const NOTES = ['', '', 'First visit', '', 'Please call if running late', '', 'Sensitive skin'];

const addDays = (date: string, days: number) => fromDate(new Date(toDate(date).getTime() + days * 86_400_000)).date;

const durations = new Map<string, number>(Object.values(CATALOG).flat().map(service => [service.name, service.duration]));

// The appointment must start and end within the day's working hours ("HH:mm-HH:mm")
function fitsHours(hours: string, time: string, service: ServiceName) {
    const [open, close] = hours.split('-').map(toMinutes);
    const start = toMinutes(time);
    return start >= open! && start + durations.get(service)! <= close!;
}

export interface DemoBooking {
    date: string
    time: string
    service: ServiceName
    userId: string
    firstName: string
    lastName: string
    email: string
    phone: string
    note: string
    status: 'confirmed' | 'pending' | 'completed' | 'cancelled'
}

/** Bookings for this week and next (Monday to Sunday) around `today`, plus one afternoon of time off. */
export function buildDemoPlan(today: string) {
    const monday = addDays(today, -((toDate(today).getUTCDay() + 6) % 7));
    const timeOff = { userId: OTHER_SPECIALIST.id, date: addDays(monday, 10), from: '12:00', to: '16:00', reason: 'Training' };
    const bookings: DemoBooking[] = [];

    for (let d = 0; d < 14; d++) {
        const date = addDays(monday, d);
        SPECIALISTS.forEach((specialist, s) => {
            const hours = specialist.hours[dayOfWeek(date) as Weekday];
            // Every fourth workday stays free, so the public booking always has open slots
            const freeDay = (d + s) % 4 === 3;
            const away = specialist.id === timeOff.userId && date === timeOff.date;
            if (!hours || freeDay || away) {
                return;
            }
            const plan = specialist.plans[(d + s) % specialist.plans.length]!;
            for (const [time, service] of plan.filter(([time, service]) => fitsHours(hours, time, service))) {
                const n = bookings.length;
                const [firstName, lastName] = CUSTOMERS[n % CUSTOMERS.length]!;
                const past = date < today;
                bookings.push({
                    date,
                    time,
                    service,
                    userId: specialist.id,
                    firstName,
                    lastName,
                    email: `${firstName}.${lastName}@example.com`.toLowerCase(),
                    phone: `+421 900 000 ${String(100 + n).slice(-3)}`,
                    note: NOTES[n % NOTES.length]!,
                    status: past ? (n % 9 === 4 ? 'cancelled' : 'completed') : (n % 5 === 2 ? 'pending' : 'confirmed')
                });
            }
        });
    }

    return { bookings, timeOff };
}
