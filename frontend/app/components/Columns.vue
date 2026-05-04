<script setup lang="ts">
const testimonials = ref([
  {
    user: {
      name: 'Evan You',
      description: 'Author of Vue.js and Vite',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/499550?v=4',
        alt: 'Evan You',
        loading: 'lazy' as const
      }
    },
    quote: 'Booking our stay was quick and effortless. We found the perfect place in just a few clicks.'
  },
  {
    user: {
      name: 'Igor Minar',
      description: 'Software Engineer at Cloudflare',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/216296?v=4',
        alt: 'Igor Minar',
        loading: 'lazy' as const
      }
    },
    quote: 'The booking process was simple, clear, and completely stress-free from start to finish.'
  },
  {
    user: {
      name: 'Charlie Hield',
      description: 'Senior Creative Technologist',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/527849?v=4',
        alt: 'Charlie Hield',
        loading: 'lazy' as const
      }
    },
    quote: 'I loved being able to compare options, check availability, and book my trip all in one place.'
  },
  {
    user: {
      name: 'Israel Ortuño',
      description: 'Co-founder of VueJobs',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/1769417?v=4',
        alt: 'Israel Ortuño',
        loading: 'lazy' as const
      }
    },
    quote: 'The perfect booking platform for planning a weekend away. Everything was easy to understand.'
  },
  {
    user: {
      name: 'Fayaz Ahmed',
      description: 'Indie Hacker',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/15716057?v=4',
        alt: 'Fayaz Ahmed',
        loading: 'lazy' as const
      }
    },
    quote: 'I booked a beautiful room in under a minute and received my confirmation instantly.'
  },
  {
    user: {
      name: 'Tommy J. Vedvik',
      description: 'UX Developer',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/48070?v=4',
        alt: 'Tommy J. Vedvik',
        loading: 'lazy' as const
      }
    },
    quote: 'Great selection of stays and a smooth checkout experience. I will definitely book here again.'
  },
  {
    user: {
      name: 'Dario Piotrowicz',
      description: 'Web Developer at Cloudflare',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/61631103?v=4',
        alt: 'Dario Piotrowicz',
        loading: 'lazy' as const
      }
    },
    quote: 'The availability details and booking information were accurate, which made planning our trip easy.'
  },
  {
    user: {
      name: 'Markus Oberlehner',
      description: 'Web Developer',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/6883314?v=4',
        alt: 'Markus Oberlehner',
        loading: 'lazy' as const
      }
    },
    quote: 'A sleek and reliable way to book accommodation without the usual hassle.'
  },
  {
    user: {
      name: 'Anthony Fu',
      description: 'Core team Vue.js, Vite & Nuxt',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/11247099?v=4',
        alt: 'Anthony Fu',
        loading: 'lazy' as const
      }
    },
    quote: 'From searching to confirming our reservation, the whole experience was fast and intuitive.'
  },
  {
    user: {
      name: 'Jonathan Beckman',
      description: 'Founder of GuaranTee Time',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/90707158?v=4',
        alt: 'Jonathan Beckman',
        loading: 'lazy' as const
      }
    },
    quote: 'Our team can now manage travel bookings easily, with all reservation details in one convenient place.'
  },
  {
    user: {
      name: 'Eckhardt Dreyer',
      description: 'Lead Developer at YG',
      avatar: {
        src: 'https://avatars.githubusercontent.com/u/37825447?v=4',
        alt: 'Eckhardt Dreyer',
        loading: 'lazy' as const
      }
    },
    quote: 'The booking experience is polished, dependable, and saves us time whenever we plan a trip.'
  }
])
</script>

<template>
  <UPageColumns>
    <UPageCard
      variant="solid"
      to="https://cloudflare.com"
      icon="i-lucide-calendar-check"
      title="Book your next stay"
      description="Find the right place, check availability, and confirm your reservation with ease."
      :ui="{ leadingIcon: 'size-10' }"
    />

    <UPageCard
      v-for="(testimonial, index) in testimonials"
      :key="index"
      variant="subtle"
      :description="testimonial.quote"
      :ui="{ description: 'before:content-[open-quote] after:content-[close-quote]' }"
    >
      <template #footer>
        <UUser v-bind="testimonial.user" size="xl" />
      </template>
    </UPageCard>
  </UPageColumns>
</template>

