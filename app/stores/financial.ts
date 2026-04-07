import { defineStore } from 'pinia'
import type { BudgetedCost, FinancialStream } from '~/types/financial'

const STREAMS_KEY = 'retirement-planner-streams'
const COSTS_KEY = 'retirement-planner-costs'

export const useFinancialStore = defineStore('financial', () => {
  const streams = ref<FinancialStream[]>([])
  const budgetedCosts = ref<BudgetedCost[]>([])

  function load() {
    if (import.meta.server) return
    const savedStreams = localStorage.getItem(STREAMS_KEY)
    if (savedStreams) {
      try { streams.value = JSON.parse(savedStreams) } catch {}
    }
    const savedCosts = localStorage.getItem(COSTS_KEY)
    if (savedCosts) {
      try { budgetedCosts.value = JSON.parse(savedCosts) } catch {}
    }
  }

  function saveStreams() {
    if (import.meta.server) return
    localStorage.setItem(STREAMS_KEY, JSON.stringify(streams.value))
  }

  function saveCosts() {
    if (import.meta.server) return
    localStorage.setItem(COSTS_KEY, JSON.stringify(budgetedCosts.value))
  }

  function addStream(stream: FinancialStream) {
    streams.value.push(stream)
  }

  function updateStream(id: string, updates: Partial<FinancialStream>) {
    const index = streams.value.findIndex(s => s.id === id)
    if (index !== -1) {
      streams.value[index] = { ...streams.value[index], ...updates }
    }
  }

  function removeStream(id: string) {
    streams.value = streams.value.filter(s => s.id !== id)
  }

  function addBudgetedCost(cost: BudgetedCost) {
    budgetedCosts.value.push(cost)
  }

  function updateBudgetedCost(id: string, updates: Partial<BudgetedCost>) {
    const index = budgetedCosts.value.findIndex(c => c.id === id)
    if (index !== -1) {
      budgetedCosts.value[index] = { ...budgetedCosts.value[index], ...updates }
    }
  }

  function removeBudgetedCost(id: string) {
    budgetedCosts.value = budgetedCosts.value.filter(c => c.id !== id)
  }

  const incomeStreams = computed(() =>
    streams.value.filter(s => s.type !== 'expense')
  )

  const expenseStreams = computed(() =>
    streams.value.filter(s => s.type === 'expense')
  )

  load()

  watch(streams, saveStreams, { deep: true })
  watch(budgetedCosts, saveCosts, { deep: true })

  return {
    streams,
    budgetedCosts,
    incomeStreams,
    expenseStreams,
    addStream,
    updateStream,
    removeStream,
    addBudgetedCost,
    updateBudgetedCost,
    removeBudgetedCost,
  }
})
