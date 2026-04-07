<template>
  <header class="sticky top-0 z-50 border-b border-(--ui-border) bg-(--ui-bg)/80 backdrop-blur-lg">
    <div class="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
      <NuxtLink to="/" class="flex items-center gap-2.5 font-bold text-lg tracking-tight text-(--ui-text-highlighted) mr-8">
        <div class="flex size-8 items-center justify-center rounded-lg bg-(--ui-primary) text-white">
          <UIcon name="i-heroicons-building-library" class="size-4" />
        </div>
        Pensioenplanner
      </NuxtLink>

      <nav class="hidden sm:flex items-center gap-1">
        <NuxtLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          :class="[
            $route.path === item.to
              ? 'bg-(--ui-primary)/10 text-(--ui-primary)'
              : 'text-(--ui-text-muted) hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg-elevated)'
          ]"
        >
          <UIcon :name="item.icon!" class="size-4" />
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="ml-auto flex items-center gap-2">
        <UColorModeButton />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const navItems = [
  { label: 'Dashboard', icon: 'i-heroicons-squares-2x2', to: '/' },
  { label: 'Inkomen', icon: 'i-heroicons-wallet', to: '/income' },
  { label: 'Uitgaven', icon: 'i-heroicons-banknotes', to: '/expenses' },
  { label: 'Scenario\'s', icon: 'i-heroicons-scale', to: '/scenarios' },
]
</script>
