import { Temporal } from 'temporal-polyfill'
import { defineStore } from 'pinia'
import type { Age, UserProfile } from '~/types/financial'
import { ageAtDate as ageAtDateUtil } from '~/domain/age'

const STORAGE_KEY = 'retirement-planner-profile'

const defaultAowAge: Age = { years: 67, months: 3 }

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile>({
    dateOfBirth: '',
    hasPartner: false,
    partnerDateOfBirth: undefined,
    aowAge: { ...defaultAowAge },
    partnerAowAge: { ...defaultAowAge },
  })

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        Object.assign(profile.value, JSON.parse(saved))
      } catch { /* ignore corrupt data */ }
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile.value))
  }

  function ageAtDate(dob: string, date: string): Age {
    return ageAtDateUtil(dob, date)
  }

  function dateAtAge(dob: string, age: Age): string {
    return Temporal.PlainDate.from(dob).add({ years: age.years, months: age.months }).toString()
  }

  const currentAge = computed(() => {
    if (!profile.value.dateOfBirth) return null
    return ageAtDate(profile.value.dateOfBirth, Temporal.Now.plainDateISO().toString())
  })

  const aowStartDate = computed(() => {
    if (!profile.value.dateOfBirth) return null
    return dateAtAge(profile.value.dateOfBirth, profile.value.aowAge)
  })

  const partnerCurrentAge = computed(() => {
    if (!profile.value.partnerDateOfBirth) return null
    return ageAtDate(profile.value.partnerDateOfBirth, Temporal.Now.plainDateISO().toString())
  })

  const partnerAowStartDate = computed(() => {
    if (!profile.value.partnerDateOfBirth) return null
    return dateAtAge(profile.value.partnerDateOfBirth, profile.value.partnerAowAge)
  })

  load()

  watch(profile, save, { deep: true })

  return {
    profile,
    currentAge,
    aowStartDate,
    partnerCurrentAge,
    partnerAowStartDate,
    ageAtDate,
    dateAtAge,
    load,
    save,
  }
})
