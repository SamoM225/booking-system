<script setup lang="ts">
defineProps<{ eyebrow: string, title: string, description: string }>()
</script>

<template>
  <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div><p class="mb-2 text-xs font-semibold tracking-widest text-primary uppercase">{{ eyebrow }}</p><h1 class="text-3xl font-bold tracking-tight text-highlighted sm:text-4xl">{{ title }}</h1><p class="mt-2 text-sm leading-6 text-muted">{{ description }}</p></div>
    <div class="flex flex-wrap items-center gap-2"><slot /></div>
  </div>
</template>
