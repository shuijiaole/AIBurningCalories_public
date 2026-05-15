export type MealType = '早餐' | '午餐' | '晚餐' | '加餐'

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

const mealTypes: MealType[] = ['早餐', '午餐', '晚餐', '加餐']

export const mealTypeOptions = mealTypes

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
  早餐: [
    {
      id: 'sample-breakfast-1',
      name: '鸡蛋三明治',
      note: '08:14 · AI 识别',
      calories: 280,
      source: 'ai'
    },
    {
      id: 'sample-breakfast-2',
      name: '无糖拿铁',
      note: '08:18 · 手动补充',
      calories: 140,
      source: 'manual'
    }
  ],
  午餐: [
    {
      id: 'sample-lunch-1',
      name: '牛肉糙米饭',
      note: '12:21 · AI 识别',
      calories: 430,
      source: 'ai'
    },
    {
      id: 'sample-lunch-2',
      name: '时蔬沙拉',
      note: '12:23 · 调整份量',
      calories: 150,
      source: 'manual'
    }
  ],
  晚餐: [],
  加餐: [
    {
      id: 'sample-snack-1',
      name: '希腊酸奶 + 蓝莓',
      note: '16:05 · AI 识别',
      calories: 260,
      source: 'ai'
    }
  ]
}

export const dashboardData = {
  user: {
    name: '林晨',
    initials: 'LC',
    greeting: '早上好',
    freeQuota: 1,
    coins: 150,
    streakDays: 12
  },
  calories: {
    target: 1850,
    consumed: 1260,
    remaining: 590
  },
  macros: [
    {
      key: 'protein',
      label: '蛋白质',
      unit: 'g',
      current: 72,
      target: 110,
      tone: 'protein'
    },
    {
      key: 'carbs',
      label: '碳水',
      unit: 'g',
      current: 138,
      target: 210,
      tone: 'carbs'
    },
    {
      key: 'fat',
      label: '脂肪',
      unit: 'g',
      current: 44,
      target: 58,
      tone: 'fat'
    }
  ] as MacroItem[]
}

export function createEmptyMealSections() {
  return mealTypes.map((type) => ({
    type,
    timeRange: mealTimeRanges[type],
    totalCalories: 0,
    filled: false,
    items: []
  })) as MealSection[]
}

export function getSampleMealsForDate(date: string) {
  const isToday = date === getTodayDateValue()

  return mealTypes.map((type) => {
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
    title: '午间轻食拼盘',
    subtitle: '扫描完成，已输出结构化营养信息'
  },
  quota: {
    isVip: false,
    freeQuota: 1,
    coinCost: 5
  },
  foods: [
    {
      name: '煎鸡蛋',
      unitLabel: '1 个',
      calories: 80,
      protein: 6,
      carbs: 1,
      fat: 5,
      quantity: 1
    },
    {
      name: '全麦面包',
      unitLabel: '2 片',
      calories: 130,
      protein: 6,
      carbs: 24,
      fat: 2,
      quantity: 1
    },
    {
      name: '牛油果',
      unitLabel: '1/2 个',
      calories: 110,
      protein: 1,
      carbs: 6,
      fat: 10,
      quantity: 1
    },
    {
      name: '生菜沙拉',
      unitLabel: '1 份',
      calories: 62,
      protein: 2,
      carbs: 8,
      fat: 2,
      quantity: 1
    },
    {
      name: '希腊酸奶',
      unitLabel: '120g',
      calories: 68,
      protein: 8,
      carbs: 4,
      fat: 1,
      quantity: 1
    }
  ]
}

export const activityOptions = [
  {
    label: '久坐办公',
    value: 1.2,
    description: '工作以静坐为主，基本不额外运动'
  },
  {
    label: '轻度活动',
    value: 1.375,
    description: '每周运动 1-3 天，生活节奏较轻'
  },
  {
    label: '中度活动',
    value: 1.55,
    description: '每周运动 3-5 天，有规律训练'
  },
  {
    label: '高强度活动',
    value: 1.725,
    description: '每周训练 6-7 天，日常活动量高'
  },
  {
    label: '运动员模式',
    value: 1.9,
    description: '高频训练或重体力劳动'
  }
]

export const walletData = {
  balance: 150,
  monthlyUse: 38,
  vipPrice: '¥28 / 月',
  vipDiscount: '限时立减 30%',
  rechargeOptions: [
    { coins: 50, price: 5, bonus: 0 },
    { coins: 100, price: 10, bonus: 10 },
    { coins: 200, price: 20, bonus: 30 },
    { coins: 300, price: 30, bonus: 60 },
    { coins: 500, price: 50, bonus: 120 },
    { coins: 800, price: 80, bonus: 220 }
  ],
  benefits: [
    '无限次 AI 拍照识别',
    '优先体验新版识别模型',
    '宏量营养分析更加完整',
    '会员专属饮食模板推荐'
  ],
  transactions: [
    {
      title: 'AI 午餐识别',
      time: '今天 12:23',
      delta: '-5 币'
    },
    {
      title: '连续签到奖励',
      time: '今天 08:00',
      delta: '+10 币'
    },
    {
      title: '100 币充值包',
      time: '昨天 20:18',
      delta: '+110 币'
    }
  ]
}
