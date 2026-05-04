<script setup lang="ts">
withDefaults(defineProps<{ title: string, description: string, icon?: string }>(), { icon: 'i-lucide-calendar-search' })
</script>

<template>
  <div class="flex flex-col items-center px-5 py-14 text-center"><div class="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UIcon :name="icon" class="size-6" /></div><h3 class="font-semibold text-highlighted">{{ title }}</h3><p class="mt-2 max-w-sm text-sm text-muted">{{ description }}</p><div class="mt-4"><slot /></div></div>
</template>
