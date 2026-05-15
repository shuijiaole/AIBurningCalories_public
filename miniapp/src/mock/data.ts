export type MacroItem = {
  key: 'protein' | 'carbs' | 'fat'
  label: string
  unit: string
  current: number
  target: number
  tone: 'protein' | 'carbs' | 'fat'
}

export type MealItem = {
  name: string
  note: string
  calories: number
}

export type MealSection = {
  type: string
  timeRange: string
  totalCalories: number
  filled: boolean
  items: MealItem[]
}

export const dashboardData = {
  user: {
    name: '',
    initials: '--',
    greeting: '欢迎使用 AI燃脂',
    dayLabel: '暂无数据',
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
  ] as MacroItem[],
  overview: [
    {
      label: '手动记录',
      value: '0 条',
      hint: '暂无记录'
    },
    {
      label: '连续记录',
      value: '0 天',
      hint: '暂无数据'
    },
    {
      label: '能量币',
      value: '0',
      hint: '暂无数据'
    }
  ],
  meals: [
    {
      type: '早餐',
      timeRange: '07:30 - 10:00',
      totalCalories: 0,
      filled: false,
      items: []
    },
    {
      type: '午餐',
      timeRange: '11:30 - 14:00',
      totalCalories: 0,
      filled: false,
      items: []
    },
    {
      type: '晚餐',
      timeRange: '17:30 - 20:30',
      totalCalories: 0,
      filled: false,
      items: []
    },
    {
      type: '加餐',
      timeRange: '全天可添加',
      totalCalories: 0,
      filled: false,
      items: []
    }
  ] as MealSection[]
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
