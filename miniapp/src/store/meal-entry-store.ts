import Taro from '@tarojs/taro'
import { create } from 'zustand'

import type { ManualMealEntry } from '../mock/app-data-v2'

const STORAGE_KEY = 'fitcalorie-manual-meal-entries'

type NewMealEntry = Omit<ManualMealEntry, 'id' | 'createdAt'>

type MealEntryStore = {
  entries: ManualMealEntry[]
  hydrated: boolean
  hydrate: () => void
  addEntry: (entry: NewMealEntry) => void
}

function readEntries() {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEY)

    return Array.isArray(cached) ? (cached as ManualMealEntry[]) : []
  } catch {
    return []
  }
}

function persistEntries(entries: ManualMealEntry[]) {
  try {
    Taro.setStorageSync(STORAGE_KEY, entries)
  } catch {
    //
  }
}

export const useMealEntryStore = create<MealEntryStore>((set, get) => ({
  entries: [],
  hydrated: false,
  hydrate: () => {
    set({
      entries: readEntries(),
      hydrated: true
    })
  },
  addEntry: (entry) => {
    const nextEntry: ManualMealEntry = {
      ...entry,
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString()
    }
    const nextEntries = [nextEntry, ...get().entries]

    persistEntries(nextEntries)
    set({
      entries: nextEntries
    })
  }
}))
