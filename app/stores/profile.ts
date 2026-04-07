import { defineStore } from 'pinia'
import type { Age, UserProfile } from '~/types/financial'

const STORAGE_KEY = 'retirement-planner-profile'

const defaultAowAge: Age = { years: 67, months: 3 }

export const useProfileStore = defineStore('profile', () => {
  const profile = ref<UserProfile>({
    dateOfBirth: '',
    hasPartner: false,
    partnerDateOfBirth: undefined,
    aowAge: { ...defaultAowAge },
  })

  function load() {
    if (import.meta.server) return
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        Object.assign(profile.value, JSON.parse(saved))
      } catch {}
    }
  }

  function save() {
    if (import.meta.server) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile.value))
  }

  function ageAtDate(dob: string, date: string): Age {
    const birth = new Date(dob)
    const target = new Date(date)
    let years = target.getFullYear() - birth.getFullYear()
    let months = target.getMonth() - birth.getMonth()
    if (target.getDate() < birth.getDate()) months--
    if (months < 0) {
      years--
      months += 12
    }
    return { years, months }
  }

  function dateAtAge(dob: string, age: Age): string {
    const birth = new Date(dob)
    const target = new Date(birth)
    target.setFullYear(target.getFullYear() + age.years)
    target.setMonth(target.getMonth() + age.months)
    return target.toISOString().slice(0, 10)
  }

  const currentAge = computed(() => {
    if (!profile.value.dateOfBirth) return null
    return ageAtDate(profile.value.dateOfBirth, new Date().toISOString().slice(0, 10))
  })

  const aowStartDate = computed(() => {
    if (!profile.value.dateOfBirth) return null
    return dateAtAge(profile.value.dateOfBirth, profile.value.aowAge)
  })

  const partnerAowStartDate = computed(() => {
    if (!profile.value.partnerDateOfBirth) return null
    return dateAtAge(profile.value.partnerDateOfBirth, profile.value.aowAge)
  })

  load()

  watch(profile, save, { deep: true })

  return {
    profile,
    currentAge,
    aowStartDate,
    partnerAowStartDate,
    ageAtDate,
    dateAtAge,
    load,
    save,
  }
})
