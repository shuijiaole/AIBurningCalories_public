export type Gender = 'male' | 'female'
export type Goal = 'cut' | 'maintain' | 'bulk'
export type CarbCycleMode = 'none' | 'three_low_one_high' | 'four_low_one_high'

type TdeeInput = {
  gender: Gender
  age: number
  height: number
  weight: number
  activityLevel: number
  goal: Goal
}

const goalFactors: Record<Goal, number> = {
  cut: 0.8,
  maintain: 1,
  bulk: 1.15
}

const standardMacroFormulaByGoal: Partial<
  Record<
    Goal,
    {
      carbs: { min: number; max: number }
      protein: { min: number; max: number }
      fat: { min: number; max: number }
    }
  >
> = {
  cut: {
    carbs: { min: 2, max: 3 },
    protein: { min: 1.6, max: 2.0 },
    fat: { min: 0.7, max: 0.9 }
  },
  bulk: {
    carbs: { min: 5, max: 5 },
    protein: { min: 1.8, max: 2.2 },
    fat: { min: 0.9, max: 1.1 }
  }
}

type MacroRange = {
  min: number
  max: number
}

type CarbCycleDay = {
  key: string
  label: string
  type: 'low' | 'high'
  calories: MacroRange
  protein: MacroRange
  carbs: MacroRange
  fat: MacroRange
}

type CarbCycleConfig = {
  lowDays: number
}

const carbCycleConfigs: Record<Exclude<CarbCycleMode, 'none'>, CarbCycleConfig> = {
  three_low_one_high: {
    lowDays: 3
  },
  four_low_one_high: {
    lowDays: 4
  }
}

function calculateMacroRange(weight: number, minPerKg: number, maxPerKg = minPerKg) {
  return {
    min: Math.round(weight * minPerKg),
    max: Math.round(weight * maxPerKg)
  }
}

function getRangeMidpoint(range: MacroRange) {
  return Math.round((range.min + range.max) / 2)
}

function calculateCaloriesFromRanges(
  protein: MacroRange,
  carbs: MacroRange,
  fat: MacroRange
) {
  return {
    min: protein.min * 4 + carbs.min * 4 + fat.min * 9,
    max: protein.max * 4 + carbs.max * 4 + fat.max * 9
  }
}

export function calculateTdeeTargets(input: TdeeInput) {
  const { gender, age, height, weight, activityLevel, goal } = input
  const base =
    10 * weight + 6.25 * height - 5 * age + (gender === 'male' ? 5 : -161)

  const tdee = Math.round(base * activityLevel)
  const targetCalories = Math.round(tdee * goalFactors[goal])
  const standardFormula = standardMacroFormulaByGoal[goal]

  let targetProtein = 0
  let targetFat = 0
  let targetCarbs = 0
  let macroRanges:
    | {
        protein: MacroRange
        carbs: MacroRange
        fat: MacroRange
      }
    | null = null

  if (standardFormula) {
    macroRanges = {
      protein: calculateMacroRange(
        weight,
        standardFormula.protein.min,
        standardFormula.protein.max
      ),
      carbs: calculateMacroRange(weight, standardFormula.carbs.min, standardFormula.carbs.max),
      fat: calculateMacroRange(weight, standardFormula.fat.min, standardFormula.fat.max)
    }
    targetProtein = getRangeMidpoint(macroRanges.protein)
    targetCarbs = getRangeMidpoint(macroRanges.carbs)
    targetFat = getRangeMidpoint(macroRanges.fat)
  } else {
    targetProtein = Math.round(weight * 1.6)
    targetFat = Math.round(weight * 0.9)
    targetCarbs = Math.max(
      0,
      Math.round((targetCalories - targetProtein * 4 - targetFat * 9) / 4)
    )
  }

  return {
    bmr: Math.round(base),
    tdee,
    targetCalories,
    targetProtein,
    targetFat,
    targetCarbs,
    macroRanges,
    formulaLabel:
      goal === 'cut'
        ? '减脂公式：碳水 2-3g/kg，蛋白 1.6-2.0g/kg，脂肪 0.7-0.9g/kg'
        : goal === 'bulk'
          ? '增肌公式：碳水 5g/kg，蛋白 1.8-2.2g/kg，脂肪 0.9-1.1g/kg'
          : '维持模式：使用系统默认稳定配比'
  }
}

export function calculateCarbCyclePlan(weight: number, mode: CarbCycleMode) {
  if (mode === 'none') {
    return null
  }

  const config = carbCycleConfigs[mode]
  const totalDays = config.lowDays + 1

  const lowCarbs = calculateMacroRange(weight, 1.5)
  const lowProtein = calculateMacroRange(weight, 1.8, 2)
  const lowFat = calculateMacroRange(weight, 0.8, 1)
  const highCarbs = calculateMacroRange(weight, 4, 5)
  const highProtein = calculateMacroRange(weight, 1.2, 1.3)
  const highFat = calculateMacroRange(weight, 0.3)
  const lowCalories = calculateCaloriesFromRanges(lowProtein, lowCarbs, lowFat)
  const highCalories = calculateCaloriesFromRanges(highProtein, highCarbs, highFat)
  const averageCalories = {
    min: Math.round((lowCalories.min * config.lowDays + highCalories.min) / totalDays),
    max: Math.round((lowCalories.max * config.lowDays + highCalories.max) / totalDays)
  }

  const days: CarbCycleDay[] = [
    ...Array.from({ length: config.lowDays }, (_, index) => ({
      key: `low-${index + 1}`,
      label: `低碳日 ${index + 1}`,
      type: 'low' as const,
      calories: lowCalories,
      protein: lowProtein,
      carbs: lowCarbs,
      fat: lowFat
    })),
    {
      key: 'high-1',
      label: '高碳日',
      type: 'high' as const,
      calories: highCalories,
      protein: highProtein,
      carbs: highCarbs,
      fat: highFat
    }
  ]

  return {
    mode,
    averageCalories,
    formula: {
      low: {
        carbs: '1.5 g/kg',
        protein: '1.8-2.0 g/kg',
        fat: '0.8-1.0 g/kg'
      },
      high: {
        carbs: '4.0-5.0 g/kg',
        protein: '1.2-1.3 g/kg',
        fat: '0.3 g/kg'
      }
    },
    days
  }
}
