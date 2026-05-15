import { defineStore } from 'pinia'
import type { BudgetedCost, FinancialStream } from '~/types/financial'

const STREAMS_KEY = 'retirement-planner-streams'
const COSTS_KEY = 'retirement-planner-costs'
const BASELINE_KEY = 'retirement-planner-expense-baseline'

export const useFinancialStore = defineStore('financial', () => {
  const streams = ref<FinancialStream[]>([])
  const budgetedCosts = ref<BudgetedCost[]>([])
  /** Monthly expense baseline in euros. null = not set (no override). */
  const monthlyExpenseBaseline = ref<number | null>(null)

  function load() {
    if (import.meta.server) return
    const savedStreams = localStorage.getItem(STREAMS_KEY)
    if (savedStreams) {
      try { streams.value = JSON.parse(savedStreams) } catch { /* ignore corrupt data */ }
    }
    const savedCosts = localStorage.getItem(COSTS_KEY)
    if (savedCosts) {
      try { budgetedCosts.value = JSON.parse(savedCosts) } catch { /* ignore corrupt data */ }
    }
    const savedBaseline = localStorage.getItem(BASELINE_KEY)
    if (savedBaseline) {
      try { monthlyExpenseBaseline.value = JSON.parse(savedBaseline) } catch { /* ignore corrupt data */ }
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

  function saveBaseline() {
    if (import.meta.server) return
    if (monthlyExpenseBaseline.value !== null) {
      localStorage.setItem(BASELINE_KEY, JSON.stringify(monthlyExpenseBaseline.value))
    } else {
      localStorage.removeItem(BASELINE_KEY)
    }
  }

  function setMonthlyExpenseBaseline(value: number | null) {
    monthlyExpenseBaseline.value = value
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
  watch(monthlyExpenseBaseline, saveBaseline)

  return {
    streams,
    budgetedCosts,
    monthlyExpenseBaseline,
    incomeStreams,
    expenseStreams,
    addStream,
    updateStream,
    removeStream,
    addBudgetedCost,
    updateBudgetedCost,
    removeBudgetedCost,
    setMonthlyExpenseBaseline,
  }
})
