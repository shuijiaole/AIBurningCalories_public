export const mealTypeOptions = ['早餐', '午餐', '晚餐', '加餐'] as const

export type MealType = (typeof mealTypeOptions)[number]

export type MacroItem = {
  key: 'protein' | 'carbs' | 'fat'
  label: string
  unit: string
  current: number
  target: number
  tone: 'protein' | 'carbs' | 'fat'
}

export type MealItem = {
  id?: string
  name: string
  note: string
  calories: number
  source: 'ai' | 'manual'
}

export type MealSection = {
  type: MealType
  timeRange: string
  totalCalories: number
  filled: boolean
  items: MealItem[]
}

export type AiFoodItem = {
  name: string
  unitLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
  quantity: number
}

export type ManualMealEntry = {
  id: string
  date: string
  mealType: MealType
  foodName: string
  brand: string
  serving: string
  calories: number
  protein: number
  carbs: number
  fat: number
  note: string
  createdAt: string
}

export const mealTimeRanges: Record<MealType, string> = {
  早餐: '07:30 - 10:00',
  午餐: '11:30 - 14:00',
  晚餐: '17:30 - 20:30',
  加餐: '全天可添加'
}

function getTodayDateValue() {
  const current = new Date()
  const year = current.getFullYear()
  const month = `${current.getMonth() + 1}`.padStart(2, '0')
  const day = `${current.getDate()}`.padStart(2, '0')

  return `${year}-${month}-${day}`
}

const todaySampleMeals: Record<MealType, MealItem[]> = {
  早餐: [],
  午餐: [],
  晚餐: [],
  加餐: []
}

export const dashboardData = {
  user: {
    name: '',
    initials: '--',
    greeting: '欢迎使用 AI燃脂',
    freeQuota: 0,
    coins: 0,
    streakDays: 0
  },
  calories: {
    target: 0,
    consumed: 0,
    remaining: 0
  },
  macros: [
    {
      key: 'protein',
      label: '蛋白质',
      unit: 'g',
      current: 0,
      target: 0,
      tone: 'protein'
    },
    {
      key: 'carbs',
      label: '碳水',
      unit: 'g',
      current: 0,
      target: 0,
      tone: 'carbs'
    },
    {
      key: 'fat',
      label: '脂肪',
      unit: 'g',
      current: 0,
      target: 0,
      tone: 'fat'
    }
  ] as MacroItem[]
}

export function getSampleMealsForDate(date: string) {
  const isToday = date === getTodayDateValue()

  return mealTypeOptions.map((type) => {
    const items = isToday ? todaySampleMeals[type] : []
    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0)

    return {
      type,
      timeRange: mealTimeRanges[type],
      totalCalories,
      filled: items.length > 0,
      items
    }
  }) as MealSection[]
}

export const aiResultData = {
  sessionLabel: 'AI 识别结果',
  imageMeta: {
    title: '暂无识别结果',
    subtitle: '上传图片后在这里展示识别出的食物和营养信息'
  },
  quota: {
    isVip: false,
    freeQuota: 0,
    coinCost: 0
  },
  foods: [] as AiFoodItem[]
}

export const activityOptions = [
  {
    label: '久坐办公',
    value: 1.2,
    description: '工作以静坐为主，平时几乎不额外运动'
  },
  {
    label: '轻度活动',
    value: 1.375,
    description: '每周运动 1-3 天，生活节奏偏轻'
  },
  {
    label: '中度活动',
    value: 1.55,
    description: '每周运动 3-5 天，已经有较稳定训练'
  },
  {
    label: '高强度活动',
    value: 1.725,
    description: '每周训练 6-7 天，日常活动量也比较高'
  },
  {
    label: '运动员模式',
    value: 1.9,
    description: '高频训练或重体力工作，需要更高热量'
  }
]

export const walletData = {
  balance: 0,
  monthlyUse: 0,
  vipPrice: '--',
  vipDiscount: '暂无活动',
  rechargeOptions: [] as { coins: number; price: number; bonus: number }[],
  benefits: [] as string[],
  transactions: [] as { title: string; time: string; delta: string }[]
}
