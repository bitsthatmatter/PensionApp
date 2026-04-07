<template>
  <div class="min-h-[calc(100vh-4rem)]">
    <!-- Hero section -->
    <div class="relative overflow-hidden border-b border-(--ui-border) bg-gradient-to-br from-(--ui-primary)/5 via-(--ui-bg) to-(--ui-primary)/3">
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--ui-primary)/8,transparent)]" />
      <div class="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div class="max-w-2xl">
          <h1 class="text-3xl font-bold tracking-tight text-(--ui-text-highlighted) sm:text-4xl">Inkomen</h1>
          <p class="mt-2 text-lg text-(--ui-text-muted)">Beheer uw inkomstenbronnen en pensioenoverzicht.</p>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      <IncomePensionUpload />
      <IncomeAowConfig />
      <IncomeStreamList />
    </div>
  </div>
</template>
