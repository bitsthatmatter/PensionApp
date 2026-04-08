<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-chart-bar" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Vermogensverloop</h3>
          <p class="text-sm text-(--ui-text-muted)">Cumulatief spaargeld per leeftijd voor elk scenario</p>
        </div>
      </div>
    </template>

    <div class="h-[400px]">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { RetirementScenario } from '~/domain/retirement-projection'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  scenarios: RetirementScenario[]
}>()

const { formatCurrency } = useFormatting()

const colors = ['#6366f1', '#ef4444', '#22c55e', '#a855f7']

const chartData = computed(() => {
  if (props.scenarios.length === 0) return { labels: [], datasets: [] }

  const longestTimeline = props.scenarios.reduce(
    (a, b) => (a.timeline.length > b.timeline.length ? a : b)
  ).timeline

  const step = 12
  const sampledIndices = Array.from(
    { length: Math.ceil(longestTimeline.length / step) },
    (_, i) => i * step
  )

  const labels = sampledIndices.map(i => {
    const snap = longestTimeline[i]
    return snap ? `${snap.age.years}` : ''
  })

  const datasets = props.scenarios.map((scenario, idx) => ({
    label: scenario.label,
    data: sampledIndices.map(i => {
      const snap = scenario.timeline[i]
      return snap ? snap.cumulativeSavings : null
    }),
    borderColor: colors[idx % colors.length],
    backgroundColor: colors[idx % colors.length] + '20',
    tension: 0.4,
    fill: false,
    pointRadius: 0,
    pointHitRadius: 8,
    borderWidth: 2.5,
  }))

  datasets.push({
    label: '€0 lijn',
    data: sampledIndices.map(() => 0),
    borderColor: '#94a3b8',
    backgroundColor: 'transparent',
    tension: 0,
    fill: false,
    pointRadius: 0,
    pointHitRadius: 0,
    borderWidth: 1,
  })

  return { labels, datasets }
})

const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
      labels: {
        usePointStyle: true,
        pointStyle: 'line',
        font: { family: 'system-ui, sans-serif', size: 12 },
      },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.9)',
      titleFont: { family: 'system-ui, sans-serif' },
      bodyFont: { family: 'system-ui, sans-serif' },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context: any) => {
          const val = context.parsed.y
          if (val == null) return ''
          return `${context.dataset.label}: ${formatCurrency(val)}`
        },
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Leeftijd', font: { family: 'system-ui, sans-serif' } },
      grid: { display: false },
    },
    y: {
      title: { display: true, text: 'Vermogen (€)', font: { family: 'system-ui, sans-serif' } },
      ticks: {
        callback: (value: any) => formatCurrency(value),
        font: { family: 'system-ui, sans-serif', size: 11 },
      },
      grid: { color: 'rgba(148, 163, 184, 0.1)' },
    },
  },
}))
</script>
