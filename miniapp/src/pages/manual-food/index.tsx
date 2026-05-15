import { useEffect, useMemo, useState } from 'react'

import Taro from '@tarojs/taro'
import { Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components'

import { mealTypeOptions, type MealType } from '../../mock/app-data-v2'
import {
  createManualMealEntry,
  deleteAiScan,
  deleteManualFoodHistoryItem,
  deleteManualMealEntry,
  fetchMealEntries,
  fetchManualFoodHistory,
  mapBackendMealType,
  type ManualFoodHistoryItem,
  type ManualMealEntryResponse
} from '../../services/backend'
import { formatDateFull, formatTimeLabel, getDateValue } from '../../utils/date-v2'

import '../manual-entry/index.scss'

type FormState = {
  foodName: string
  brand: string
  serving: string
  calories: string
  protein: string
  carbs: string
  fat: string
  note: string
}

type BaseNutrition = {
  calories: number
  protein: number
  carbs: number
  fat: number
}

const emptyForm: FormState = {
  foodName: '',
  brand: '',
  serving: '',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  note: ''
}

type CommonFoodCategoryId = 'carbs' | 'protein' | 'fat'

type CommonFoodPreset = {
  id: string
  category: CommonFoodCategoryId
  name: string
  icon: string
  calories: number
  carbs: number
  protein: number
  fat: number
}

type CommonFoodCategory = {
  id: CommonFoodCategoryId
  title: string
  items: CommonFoodPreset[]
}

const commonFoodLibrary: CommonFoodCategory[] = [
  {
    id: 'carbs',
    title: '常用碳水',
    items: [
      {
        id: 'rice',
        category: 'carbs',
        name: '米饭',
        icon: '🍚',
        calories: 116,
        carbs: 25.9,
        protein: 2.6,
        fat: 0.3
      },
      {
        id: 'sweet-potato',
        category: 'carbs',
        name: '红薯',
        icon: '🍠',
        calories: 86,
        carbs: 20.1,
        protein: 1.6,
        fat: 0.1
      },
      {
        id: 'oats',
        category: 'carbs',
        name: '燕麦',
        icon: '🥣',
        calories: 389,
        carbs: 66.3,
        protein: 16.9,
        fat: 6.9
      },
      {
        id: 'corn',
        category: 'carbs',
        name: '玉米',
        icon: '🌽',
        calories: 112,
        carbs: 22.8,
        protein: 4,
        fat: 1.2
      },
      {
        id: 'potato',
        category: 'carbs',
        name: '土豆',
        icon: '🥔',
        calories: 77,
        carbs: 17.8,
        protein: 2,
        fat: 0.1
      },
      {
        id: 'pumpkin',
        category: 'carbs',
        name: '南瓜',
        icon: '🎃',
        calories: 26,
        carbs: 6.5,
        protein: 1,
        fat: 0.1
      },
      {
        id: 'whole-wheat-bread',
        category: 'carbs',
        name: '全麦面包',
        icon: '🍞',
        calories: 247,
        carbs: 41.2,
        protein: 13.1,
        fat: 4.2
      },
      {
        id: 'buckwheat-noodle',
        category: 'carbs',
        name: '荞麦面',
        icon: '🍜',
        calories: 99,
        carbs: 21.4,
        protein: 5.1,
        fat: 0.1
      }
    ]
  },
  {
    id: 'protein',
    title: '常用蛋白质',
    items: [
      {
        id: 'chicken-breast',
        category: 'protein',
        name: '鸡胸肉',
        icon: '🍗',
        calories: 133,
        carbs: 0,
        protein: 24,
        fat: 3
      },
      {
        id: 'egg',
        category: 'protein',
        name: '鸡蛋',
        icon: '🥚',
        calories: 144,
        carbs: 2.8,
        protein: 13.3,
        fat: 8.8
      },
      {
        id: 'shrimp',
        category: 'protein',
        name: '虾仁',
        icon: '🍤',
        calories: 99,
        carbs: 0.2,
        protein: 24,
        fat: 0.3
      },
      {
        id: 'salmon',
        category: 'protein',
        name: '三文鱼',
        icon: '🍣',
        calories: 208,
        carbs: 0,
        protein: 20.4,
        fat: 13.4
      },
      {
        id: 'beef',
        category: 'protein',
        name: '牛里脊',
        icon: '🥩',
        calories: 155,
        carbs: 0,
        protein: 20.2,
        fat: 8.1
      },
      {
        id: 'tuna',
        category: 'protein',
        name: '金枪鱼',
        icon: '🐟',
        calories: 132,
        carbs: 0,
        protein: 28.3,
        fat: 1.3
      },
      {
        id: 'tofu',
        category: 'protein',
        name: '嫩豆腐',
        icon: '🧊',
        calories: 55,
        carbs: 2.6,
        protein: 4.9,
        fat: 3
      },
      {
        id: 'greek-yogurt',
        category: 'protein',
        name: '希腊酸奶',
        icon: '🥛',
        calories: 97,
        carbs: 3.9,
        protein: 9,
        fat: 5
      }
    ]
  },
  {
    id: 'fat',
    title: '常用脂肪',
    items: [
      {
        id: 'avocado',
        category: 'fat',
        name: '牛油果',
        icon: '🥑',
        calories: 171,
        carbs: 8.5,
        protein: 2,
        fat: 15.3
      },
      {
        id: 'almond',
        category: 'fat',
        name: '杏仁',
        icon: '🌰',
        calories: 579,
        carbs: 21.6,
        protein: 21.2,
        fat: 49.9
      },
      {
        id: 'peanut-butter',
        category: 'fat',
        name: '花生酱',
        icon: '🥜',
        calories: 588,
        carbs: 21.3,
        protein: 24,
        fat: 49.9
      },
      {
        id: 'walnut',
        category: 'fat',
        name: '核桃',
        icon: '🌰',
        calories: 654,
        carbs: 13.7,
        protein: 15.2,
        fat: 65.2
      },
      {
        id: 'cashew',
        category: 'fat',
        name: '腰果',
        icon: '🥜',
        calories: 553,
        carbs: 30.2,
        protein: 18.2,
        fat: 43.9
      },
      {
        id: 'sesame',
        category: 'fat',
        name: '芝麻',
        icon: '⚪',
        calories: 573,
        carbs: 23.5,
        protein: 17.7,
        fat: 49.7
      },
      {
        id: 'cheese',
        category: 'fat',
        name: '奶酪',
        icon: '🧀',
        calories: 328,
        carbs: 3.5,
        protein: 25.7,
        fat: 26.9
      },
      {
        id: 'olive-oil',
        category: 'fat',
        name: '橄榄油',
        icon: '🫒',
        calories: 899,
        carbs: 0,
        protein: 0,
        fat: 100
      }
    ]
  }
]

const allCommonFoodPresets = commonFoodLibrary.flatMap((category) => category.items)

const categoryTitleMap: Record<CommonFoodCategoryId, string> = {
  carbs: '常用碳水',
  protein: '常用蛋白质',
  fat: '常用脂肪'
}

function formatNumber(value: number) {
  const rounded = Math.round(value * 10) / 10
  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(1)
}

function dedupeHistoryItems(items: ManualFoodHistoryItem[]) {
  const seen = new Set<string>()

  return items.filter((item) => {
    const key = item.food_name.trim().toLowerCase()
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function parseMealType(rawValue?: string): MealType {
  const decoded = rawValue ? decodeURIComponent(rawValue) : ''

  return mealTypeOptions.includes(decoded as MealType)
    ? (decoded as MealType)
    : '早餐'
}

export default function ManualFoodPage() {
  const router = Taro.getCurrentInstance().router
  const [selectedDate, setSelectedDate] = useState(router?.params?.date || getDateValue())
  const [mealType, setMealType] = useState<MealType>(parseMealType(router?.params?.mealType))
  const [form, setForm] = useState<FormState>(emptyForm)
  const [entries, setEntries] = useState<ManualMealEntryResponse[]>([])
  const [historyItems, setHistoryItems] = useState<ManualFoodHistoryItem[]>([])
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<Record<CommonFoodCategoryId, boolean>>({
    carbs: false,
    protein: false,
    fat: false
  })
  const [baseNutrition, setBaseNutrition] = useState<BaseNutrition | null>(null)
  const [loading, setLoading] = useState(false)

  const loadEntries = async (date: string) => {
    setLoading(true)

    try {
      const [nextEntries, nextHistoryItems] = await Promise.all([
        fetchMealEntries(date),
        fetchManualFoodHistory()
      ])
      setEntries(nextEntries)
      setHistoryItems(dedupeHistoryItems(nextHistoryItems))
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '记录加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true)

      try {
        const [nextEntries, nextHistoryItems] = await Promise.all([
          fetchMealEntries(selectedDate),
          fetchManualFoodHistory()
        ])
        setEntries(nextEntries)
        setHistoryItems(dedupeHistoryItems(nextHistoryItems))
      } catch (error) {
        Taro.showToast({
          title: error instanceof Error ? error.message : '记录加载失败',
          icon: 'none'
        })
      } finally {
        setLoading(false)
      }
    }

    void loadEntries()
  }, [selectedDate])

  const selectedEntries = useMemo(
    () => entries,
    [entries]
  )
  const selectedPreset = useMemo(
    () => allCommonFoodPresets.find((item) => item.id === selectedPresetId) ?? null,
    [selectedPresetId]
  )

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => {
      const next = {
        ...current,
        [key]: value
      }

      // 实时换算逻辑: 如果修改的是克数 且 存在原始比例数据
      if (key === 'serving' && baseNutrition) {
        const grams = parseFloat(value)
        if (!isNaN(grams) && grams > 0) {
          const ratio = grams / 100
          next.calories = formatNumber(baseNutrition.calories * ratio)
          next.protein = formatNumber(baseNutrition.protein * ratio)
          next.carbs = formatNumber(baseNutrition.carbs * ratio)
          next.fat = formatNumber(baseNutrition.fat * ratio)
        }
      }

      return next
    })
  }

  const applyCommonFoodPreset = (preset: CommonFoodPreset, gramsValue: string) => {
    const grams = Number(gramsValue)

    if (!gramsValue.trim() || Number.isNaN(grams) || grams <= 0) {
      return
    }

    const ratio = grams / 100
    const formattedGrams = formatNumber(grams)
    const categoryTitle = categoryTitleMap[preset.category]

    setForm((current) => ({
      ...current,
      foodName: preset.name,
      brand: '公共食物库',
      serving: `${formattedGrams}`,
      calories: formatNumber(preset.calories * ratio),
      protein: formatNumber(preset.protein * ratio),
      carbs: formatNumber(preset.carbs * ratio),
      fat: formatNumber(preset.fat * ratio),
      note: `来自${categoryTitle}预设，已按 ${formattedGrams}g 自动换算`
    }))

    // 存储 100g 的原始比例，用于后续修改克数时换算
    setBaseNutrition({
      calories: preset.calories,
      protein: preset.protein,
      carbs: preset.carbs,
      fat: preset.fat
    })
  }

  const handleSelectPreset = (preset: CommonFoodPreset) => {
    setSelectedPresetId(preset.id)
    applyCommonFoodPreset(preset, '100')
    Taro.showToast({
      title: `已录入${preset.name}`,
      icon: 'none'
    })
  }

  const toggleCategory = (categoryId: CommonFoodCategoryId) => {
    setExpandedCategories((current) => ({
      ...current,
      [categoryId]: !current[categoryId]
    }))
  }

  const applyFoodToForm = (item: {
    food_name: string
    brand?: string | null
    serving_desc?: string | null
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
    note?: string | null
  }) => {
    // 尝试从 serving_desc 中提取纯数字
    const rawServing = item.serving_desc || ''
    const match = rawServing.match(/^([0-9.]+)/)
    const servingValue = match ? match[1] : ''

    setForm({
      foodName: item.food_name,
      brand: item.brand || '',
      serving: servingValue,
      calories: `${item.calories}`,
      protein: `${item.protein_g}`,
      carbs: `${item.carbs_g}`,
      fat: `${item.fat_g}`,
      note: item.note || ''
    })

    // 还原 100g 的百分比基准数据，用于滑动或修改克数时换算
    if (match) {
      const grams = parseFloat(match[1])
      if (!isNaN(grams) && grams > 0) {
        const ratio = grams / 100
        setBaseNutrition({
          calories: item.calories / ratio,
          protein: item.protein_g / ratio,
          carbs: item.carbs_g / ratio,
          fat: item.fat_g / ratio
        })
      } else {
        setBaseNutrition(null)
      }
    } else {
      setBaseNutrition(null)
    }
  }

  const applyHistoryItem = (item: ManualFoodHistoryItem) => {
    applyFoodToForm(item)
    Taro.showToast({
      title: '已录入历史食物',
      icon: 'none'
    })
  }

  const handleApplySavedEntry = (entry: ManualMealEntryResponse) => {
    applyFoodToForm(entry)
    Taro.showToast({
      title: '已重新录入该记录',
      icon: 'none'
    })
  }

  const handleSave = async () => {
    const foodName = form.foodName.trim()
    const calories = Number(form.calories)
    const protein = Number(form.protein || 0)
    const carbs = Number(form.carbs || 0)
    const fat = Number(form.fat || 0)

    if (!foodName) {
      Taro.showToast({
        title: '请先填写食物名称',
        icon: 'none'
      })
      return
    }

    if (Number.isNaN(calories) || calories <= 0) {
      Taro.showToast({
        title: '请填写正确的热量数值',
        icon: 'none'
      })
      return
    }

    try {
      const createdEntry = await createManualMealEntry({
        entry_date: selectedDate,
        meal_type: mealType,
        food_name: foodName,
        brand: form.brand.trim(),
        serving_desc: form.serving.trim() || '1份',
        quantity: 1,
        calories,
        protein_g: Number.isNaN(protein) ? 0 : protein,
        carbs_g: Number.isNaN(carbs) ? 0 : carbs,
        fat_g: Number.isNaN(fat) ? 0 : fat,
        note: form.note.trim()
      })
      const nextHistoryItems = await fetchManualFoodHistory()

      setEntries((current) => [createdEntry, ...current])
      setHistoryItems(dedupeHistoryItems(nextHistoryItems))

      Taro.showToast({
        title: '已保存到数据库',
        icon: 'success'
      })

      setForm({
        ...emptyForm
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none'
      })
    }
  }

  const handleQuickSaveToLunch = async () => {
    const foodName = form.foodName.trim()
    const calories = Number(form.calories)

    if (!foodName) {
      Taro.showToast({
        title: '请先填写食物名称',
        icon: 'none'
      })
      return
    }

    if (Number.isNaN(calories) || calories <= 0) {
      Taro.showToast({
        title: '核心数据热量不能为空',
        icon: 'none'
      })
      return
    }

    try {
      // 设置为午餐并保存
      setMealType('午餐')
      
      const createdEntry = await createManualMealEntry({
        entry_date: selectedDate,
        meal_type: '午餐',
        food_name: foodName,
        brand: form.brand.trim(),
        serving_desc: form.serving.trim() || '1份',
        quantity: 1,
        calories,
        protein_g: Number(form.protein || 0),
        carbs_g: Number(form.carbs || 0),
        fat_g: Number(form.fat || 0),
        note: form.note.trim()
      })
      const nextHistoryItems = await fetchManualFoodHistory()

      setEntries((current) => [createdEntry, ...current])
      setHistoryItems(dedupeHistoryItems(nextHistoryItems))

      Taro.showToast({
        title: '一键保存到午餐成功',
        icon: 'success'
      })

      setForm({
        ...emptyForm
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none'
      })
    }
  }

  const handleDeleteEntry = async (entry: ManualMealEntryResponse) => {
    const isAiEntry = entry.entry_source === 'ai' && !!entry.ai_session_id

    try {
      const { confirm } = await Taro.showModal({
        title: '确认删除',
        content: isAiEntry
          ? '这条记录来自 AI 识别，删除后会同步删除本次识别下的全部饮食记录，确定继续吗？'
          : '确定要删除这条手动记录吗？',
        confirmText: '删除',
        confirmColor: '#ff4d4f'
      })

      if (!confirm) {
        return
      }

      Taro.showLoading({ title: '删除中...' })

      if (isAiEntry) {
        await deleteAiScan(entry.ai_session_id!)
      } else {
        await deleteManualMealEntry(entry.id)
      }

      Taro.hideLoading()
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
      await loadEntries(selectedDate)
    } catch (error) {
      Taro.hideLoading()
      const errorMsg = error instanceof Error ? error.message : '删除失败'
      if (!errorMsg.includes('cancel')) {
        Taro.showToast({
          title: errorMsg,
          icon: 'none'
        })
      }
    }
  }

  const handleDeleteHistoryItem = async (templateId: number) => {
    try {
      const { confirm } = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这条食物记录吗？删除后只会从当前账号的食物记录中移除。',
        confirmText: '删除',
        confirmColor: '#ff4d4f'
      })

      if (!confirm) {
        return
      }

      Taro.showLoading({ title: '删除中...' })
      await deleteManualFoodHistoryItem(templateId)
      Taro.hideLoading()
      Taro.showToast({
        title: '删除成功',
        icon: 'success'
      })
      setHistoryItems((current) =>
        dedupeHistoryItems(current.filter((item) => item.template_id !== templateId))
      )
    } catch (error) {
      Taro.hideLoading()
      const errorMsg = error instanceof Error ? error.message : '删除失败'
      if (!errorMsg.includes('cancel')) {
        Taro.showToast({
          title: errorMsg,
          icon: 'none'
        })
      }
    }
  }

  const handleBack = () => {
    Taro.navigateBack({
      fail: () => {
        Taro.redirectTo({
          url: '/pages/home-ui/index'
        })
      }
    })
  }

  return (
    <View className='manual-page page-shell'>
      <View className='surface-card manual-hero'>
        <Text className='manual-hero__eyebrow'>手动新增</Text>
        <Text className='manual-hero__title'>按食品包装营养表填写</Text>
        <Text className='manual-hero__desc'>
          适合零食、饮料、预包装食品。填写后会按你选择的日期和餐次保存，
          首页切换日期时会自动显示。
        </Text>
      </View>

      <View className='surface-card manual-preset-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>公共食物库</Text>
          <Text className='section-heading__hint'>所有用户可见，数据按每 100g 估算，可展开收起</Text>
        </View>

        {commonFoodLibrary.map((category) => (
          <View className='manual-library-section' key={category.id}>
            <View
              className='manual-library-section__header'
              onClick={() => toggleCategory(category.id)}
            >
              <View className='manual-library-section__header-main'>
                <Text className='manual-library-section__title'>{category.title}</Text>
                <Text className='manual-library-section__meta'>{category.items.length} 个食物</Text>
              </View>
              <Text className='manual-library-section__toggle'>
                {expandedCategories[category.id] ? '收起' : '展开'}
              </Text>
            </View>

            {expandedCategories[category.id] ? (
              <View className='manual-preset-grid'>
                {category.items.map((item) => (
                  <View
                    className={
                      selectedPresetId === item.id
                        ? 'manual-preset-item manual-preset-item--active'
                        : 'manual-preset-item'
                    }
                    key={item.id}
                    onClick={() => handleSelectPreset(item)}
                  >
                    <Text className='manual-preset-item__icon'>{item.icon}</Text>
                    <Text className='manual-preset-item__name'>{item.name}</Text>
                    <Text className='manual-preset-item__meta'>每 100g</Text>
                    <Text className='manual-preset-item__macro'>热量 {item.calories} kcal</Text>
                    <Text className='manual-preset-item__macro'>碳水 {item.carbs}g</Text>
                    <Text className='manual-preset-item__macro'>蛋白 {item.protein}g</Text>
                    <Text className='manual-preset-item__macro'>脂肪 {item.fat}g</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>

      <View className='surface-card manual-form'>
        <View className='section-heading'>
          <Text className='section-heading__title'>记录信息</Text>
          <Text className='section-heading__hint'>可保存到任意一天</Text>
        </View>

        <View className='manual-form__grid'>
          <Picker
            className='manual-form__picker-wrap'
            mode='date'
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.detail.value)}
          >
            <View className='manual-form__picker'>
              <Text className='manual-form__picker-label'>记录日期</Text>
              <Text className='manual-form__picker-value'>
                {formatDateFull(selectedDate)}
              </Text>
            </View>
          </Picker>
        </View>

        <View className='manual-form__section'>
          <Text className='manual-form__section-title'>餐次</Text>
          <View className='manual-form__meal-tabs'>
            {mealTypeOptions.map((option) => (
              <View
                className={
                  mealType === option
                    ? 'manual-form__meal-tab manual-form__meal-tab--active'
                    : 'manual-form__meal-tab'
                }
                key={option}
                onClick={() => setMealType(option)}
              >
                <Text>{option}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='manual-form__section'>
          <Text className='manual-form__section-title'>食物基础信息</Text>
          <View className='manual-field'>
            <Text className='manual-field__label'>食物名称</Text>
            <Input
              className='manual-field__input'
              value={form.foodName}
              placeholder='例如：高蛋白酸奶'
              placeholderClass='manual-placeholder'
              onInput={(event) => updateField('foodName', event.detail.value)}
            />
          </View>
          <View className='manual-field'>
            <Text className='manual-field__label'>品牌 / 型号</Text>
            <Input
              className='manual-field__input'
              value={form.brand}
              placeholder='例如：简醇、元气森林'
              placeholderClass='manual-placeholder'
              onInput={(event) => updateField('brand', event.detail.value)}
            />
          </View>
          <View className='manual-field manual-field--with-suffix'>
            <Text className='manual-field__label'>质量 (克)</Text>
            <View className='manual-field__input-wrap'>
              <Input
                className='manual-field__input'
                type='digit'
                value={form.serving}
                placeholder='0'
                placeholderClass='manual-placeholder'
                onInput={(event) => updateField('serving', event.detail.value)}
              />
              <Text className='manual-field__suffix'>g</Text>
            </View>
          </View>
        </View>

        <View className='manual-form__section'>
          <Text className='manual-form__section-title'>营养数据</Text>
          <View className='manual-macro-grid'>
            <View className='manual-field manual-field--metric'>
              <Text className='manual-field__label'>热量 kcal</Text>
              <Input
                className='manual-field__input'
                type='digit'
                value={form.calories}
                placeholder='0'
                placeholderClass='manual-placeholder'
                onInput={(event) => updateField('calories', event.detail.value)}
              />
            </View>
            <View className='manual-field manual-field--metric'>
              <Text className='manual-field__label'>蛋白质 g</Text>
              <Input
                className='manual-field__input'
                type='digit'
                value={form.protein}
                placeholder='0'
                placeholderClass='manual-placeholder'
                onInput={(event) => updateField('protein', event.detail.value)}
              />
            </View>
            <View className='manual-field manual-field--metric'>
              <Text className='manual-field__label'>碳水 g</Text>
              <Input
                className='manual-field__input'
                type='digit'
                value={form.carbs}
                placeholder='0'
                placeholderClass='manual-placeholder'
                onInput={(event) => updateField('carbs', event.detail.value)}
              />
            </View>
            <View className='manual-field manual-field--metric'>
              <Text className='manual-field__label'>脂肪 g</Text>
              <Input
                className='manual-field__input'
                type='digit'
                value={form.fat}
                placeholder='0'
                placeholderClass='manual-placeholder'
                onInput={(event) => updateField('fat', event.detail.value)}
              />
            </View>
          </View>
        </View>

        <View className='manual-form__section'>
          <Text className='manual-form__section-title'>备注</Text>
          <View className='manual-field manual-field--textarea'>
            <Textarea
              className='manual-field__textarea'
              value={form.note}
              maxlength={120}
              placeholder='例如：减糖版、半瓶、按标签每100g换算'
              placeholderClass='manual-placeholder'
              onInput={(event) => updateField('note', event.detail.value)}
            />
          </View>
        </View>

        <View className='manual-form__actions'>
          <View className='secondary-button' onClick={handleBack}>
            返回首页
          </View>
          <View className='primary-button' onClick={handleSave}>
            添加{mapBackendMealType(mealType)}并保存到食物记录
          </View>
        </View>
      </View>

      <View className='surface-card manual-history-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>我的食物记录</Text>
          <Text className='section-heading__hint'>
            {historyItems.length > 0 ? '点击后自动带入表单' : '暂无历史数据'}
          </Text>
        </View>

        {historyItems.length > 0 ? (
          <View className='manual-history'>
            {historyItems.map((item) => (
              <View
                className='manual-history__item'
                key={item.template_id}
                onClick={() => applyHistoryItem(item)}
              >
                <View className='manual-history__header'>
                  <Text className='manual-history__title'>{item.food_name}</Text>
                  <Text className='manual-history__action'>录入</Text>
                  <View
                    className='manual-history__delete'
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteHistoryItem(item.template_id)
                    }}
                  >
                    <View className='trash-icon'>
                      <View className='trash-icon__handle' />
                      <View className='trash-icon__lid' />
                      <View className='trash-icon__body'>
                        <View className='trash-icon__line' />
                        <View className='trash-icon__line' />
                      </View>
                    </View>
                  </View>
                </View>
                <Text className='manual-history__meta'>
                  {[item.brand, item.serving_desc].filter(Boolean).join(' · ') || '未填写品牌/份量'}
                </Text>
                <Text className='manual-history__nutrition'>
                  {item.calories} kcal · P {item.protein_g} / C {item.carbs_g} / F {item.fat_g}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View className='manual-history__empty'>
            <Text className='manual-history__empty-text'>
              你保存过的手动食物会显示在这里，下次可以一键复用。
            </Text>
          </View>
        )}
      </View>

      <View className='surface-card manual-saved'>
        <View className='section-heading'>
          <Text className='section-heading__title'>当天已保存</Text>
          <Text className='section-heading__hint'>
            {loading ? '同步中' : `${selectedEntries.length} 条，点击即可再次录入数据`}
          </Text>
        </View>

        <ScrollView className='manual-saved__list' scrollY>
          {selectedEntries.length > 0 ? (
            selectedEntries.map((entry) => (
              <View
                className='manual-saved__item'
                key={entry.id}
                onClick={() => handleApplySavedEntry(entry)}
              >
                <View className='manual-saved__header'>
                  <Text className='manual-saved__title'>{entry.food_name}</Text>
                  <View className='manual-saved__actions'>
                    <Text className='manual-saved__badge'>{mapBackendMealType(entry.meal_type)}</Text>
                    <View
                      className='manual-saved__delete'
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleDeleteEntry(entry)
                      }}
                    >
                      <View className='trash-icon'>
                        <View className='trash-icon__handle' />
                        <View className='trash-icon__lid' />
                        <View className='trash-icon__body'>
                          <View className='trash-icon__line' />
                          <View className='trash-icon__line' />
                        </View>
                      </View>
                      删除
                    </View>
                  </View>
                </View>
                <Text className='manual-saved__meta'>
                  {entry.brand ? `${entry.brand} · ` : ''}
                  {entry.serving_desc || '1份'} · {entry.calories} kcal
                </Text>
                <Text className='manual-saved__macros'>
                  P {entry.protein_g} / C {entry.carbs_g} / F {entry.fat_g}
                </Text>
                <Text className='manual-saved__time'>
                  来源 {entry.entry_source === 'ai' ? 'AI 识别' : '手动录入'}
                </Text>
                {entry.note ? (
                  <Text className='manual-saved__time'>备注：{entry.note}</Text>
                ) : null}
                <Text className='manual-saved__time'>
                  保存时间 {formatTimeLabel(new Date(entry.created_at))}
                </Text>
              </View>
            ))
          ) : (
            <View className='manual-saved__empty'>
              <Text className='manual-saved__empty-title'>这一天还没有手动记录</Text>
              <Text className='manual-saved__empty-desc'>
                先填一条试试，首页会按日期自动归类展示。
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </View>
  )
}
