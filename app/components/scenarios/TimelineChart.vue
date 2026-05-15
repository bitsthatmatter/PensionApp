<template>
  <UCard variant="outline">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="flex size-9 items-center justify-center rounded-lg bg-(--ui-primary)/10">
          <UIcon name="i-heroicons-chart-bar" class="size-5 text-(--ui-primary)" />
        </div>
        <div>
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Maandinkomen per leeftijd</h3>
          <p class="text-sm text-(--ui-text-muted)">Bruto maandinkomen per leeftijd voor elk scenario</p>
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
  type TooltipItem,
} from 'chart.js'
import type { RetirementScenario } from '~/domain/retirement-projection'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const props = defineProps<{
  scenarios: RetirementScenario[]
}>()

const { formatCurrency } = useFormatting()

const colors = ['#9fe870', '#326318', '#ffd11a', '#d03238']

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
      return snap ? snap.totalIncome : null
    }),
    borderColor: colors[idx % colors.length],
    backgroundColor: colors[idx % colors.length] + '20',
    tension: 0.4,
    fill: false,
    pointRadius: 0,
    pointHitRadius: 8,
    borderWidth: 2.5,
  }))



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
        font: { family: "'Inter', system-ui, sans-serif", size: 12 },
      },
    },
    tooltip: {
      backgroundColor: '#0e0f0c',
      titleFont: { family: "'Inter', system-ui, sans-serif" },
      bodyFont: { family: "'Inter', system-ui, sans-serif" },
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: ( context: TooltipItem<'line'>) => {
          const val = context.parsed.y
          if (val == null) return ''
          return `${context.dataset.label}: ${formatCurrency(val)}`
        },
      },
    },
  },
  scales: {
    x: {
      title: { display: true, text: 'Leeftijd', font: { family: "'Inter', system-ui, sans-serif" } },
      grid: { display: false },
    },
    y: {
      title: { display: true, text: 'Bruto inkomen (€/mnd)', font: { family: "'Inter', system-ui, sans-serif" } },
      ticks: {
        callback: (value: number | string) => typeof value === 'number' ? formatCurrency(value) : String(value),
        font: { family: "'Inter', system-ui, sans-serif", size: 11 },
      },
      grid: { color: 'rgba(134, 134, 133, 0.1)' },
    },
  },
}))
</script>
