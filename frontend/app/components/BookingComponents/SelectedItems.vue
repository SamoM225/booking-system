<script setup lang="ts">
const items = ref<string[]>([])
</script>

<template>
  <div class="space-y-2">
    <p class="text-sm font-medium text-muted">
      Selected items:
    </p>
    <ul class="space-y-1">
      <li v-for="item in items" :key="item" class="text-sm text-muted">
        {{ item }}
      </li>
    </ul>
  </div>
</template>