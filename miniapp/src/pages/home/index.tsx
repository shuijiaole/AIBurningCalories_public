import { useEffect, useState } from 'react'

import { Navigator, Picker, Text, View } from '@tarojs/components'

import { FloatingScanButton } from '../../components/floating-scan-button'
import { ProgressRing } from '../../components/progress-ring'
import {
  dashboardData,
  getSampleMealsForDate,
  type MacroItem,
  type ManualMealEntry,
  type MealSection
} from '../../mock/app-data'
import { useMealEntryStore } from '../../store/meal-entry-store'
import {
  formatDateFull,
  formatDateLabel,
  formatTimeLabel,
  getDateValue,
  isTodayDate
} from '../../utils/date'

import './index.scss'

const toneMap = {
  protein: 'var(--macro-protein)',
  carbs: 'var(--macro-carbs)',
  fat: 'var(--macro-fat)'
}

function buildMeals(selectedDate: string, entries: ManualMealEntry[]) {
  const baseMeals = getSampleMealsForDate(selectedDate)
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate)

  return baseMeals.map((meal) => {
    const manualItems = selectedEntries
      .filter((entry) => entry.mealType === meal.type)
      .map((entry) => ({
        id: entry.id,
        name: entry.foodName,
        note: `${entry.brand ? `${entry.brand} · ` : ''}手动新增 · ${
          entry.serving || '自定义份量'
        } · ${formatTimeLabel(new Date(entry.createdAt))}`,
        calories: entry.calories,
        source: 'manual' as const
      }))

    const items = [...meal.items, ...manualItems]
    const totalCalories = items.reduce((sum, item) => sum + item.calories, 0)

    return {
      ...meal,
      items,
      totalCalories,
      filled: items.length > 0
    }
  }) as MealSection[]
}

function buildMacros(selectedDate: string, entries: ManualMealEntry[]) {
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate)
  const manualProtein = selectedEntries.reduce((sum, entry) => sum + entry.protein, 0)
  const manualCarbs = selectedEntries.reduce((sum, entry) => sum + entry.carbs, 0)
  const manualFat = selectedEntries.reduce((sum, entry) => sum + entry.fat, 0)
  const useBase = isTodayDate(selectedDate)

  return dashboardData.macros.map((macro) => {
    const baseCurrent = useBase ? macro.current : 0

    if (macro.key === 'protein') {
      return { ...macro, current: baseCurrent + manualProtein }
    }

    if (macro.key === 'carbs') {
      return { ...macro, current: baseCurrent + manualCarbs }
    }

    return { ...macro, current: baseCurrent + manualFat }
  }) as MacroItem[]
}

function buildCalories(selectedDate: string, entries: ManualMealEntry[]) {
  const selectedEntries = entries.filter((entry) => entry.date === selectedDate)
  const manualCalories = selectedEntries.reduce((sum, entry) => sum + entry.calories, 0)
  const baseConsumed = isTodayDate(selectedDate) ? dashboardData.calories.consumed : 0
  const consumed = baseConsumed + manualCalories
  const remaining = Math.max(dashboardData.calories.target - consumed, 0)

  return {
    target: dashboardData.calories.target,
    consumed,
    remaining
  }
}

export default function HomePage() {
  const [selectedDate, setSelectedDate] = useState(getDateValue())
  const entries = useMealEntryStore((state) => state.entries)
  const hydrate = useMealEntryStore((state) => state.hydrate)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const calories = buildCalories(selectedDate, entries)
  const macros = buildMacros(selectedDate, entries)
  const meals = buildMeals(selectedDate, entries)
  const manualCount = entries.filter((entry) => entry.date === selectedDate).length
  const progress = calories.consumed / calories.target
  const overviewCards = [
    {
      label: '手动记录',
      value: `${manualCount} 条`,
      hint: '按包装数据保存'
    },
    {
      label: '连续记录',
      value: `${dashboardData.user.streakDays} 天`,
      hint: '保持好习惯'
    },
    {
      label: '能量币',
      value: `${dashboardData.user.coins}`,
      hint: '可用于 AI 识别'
    }
  ]

  return (
    <View className='home-page page-shell'>
      <View className='ambient-blob ambient-blob--green' />
      <View className='ambient-blob ambient-blob--blue' />

      <View className='home-header'>
        <View className='home-header__profile'>
          <View className='home-header__avatar'>
            <Text>{dashboardData.user.initials}</Text>
          </View>
          <View>
            <Text className='home-header__greeting'>
              {dashboardData.user.greeting}，{dashboardData.user.name}
            </Text>
            <Text className='home-header__subtext'>
              今天也可以拍照记录，也可以手动补录
            </Text>
          </View>
        </View>

        <Picker
          mode='date'
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.detail.value)}
        >
          <View className='home-header__date'>
            <Text className='home-header__date-top'>记录日期</Text>
            <Text className='home-header__date-bottom'>
              {formatDateLabel(selectedDate)}
            </Text>
            <Text className='home-header__date-full'>{formatDateFull(selectedDate)}</Text>
          </View>
        </Picker>
      </View>

      <View className='home-hero surface-card'>
        <View className='home-hero__top'>
          <View>
            <Text className='home-hero__eyebrow'>今日卡路里预算</Text>
            <Text className='home-hero__title'>健康控制台</Text>
          </View>
          <Text className='badge-pro'>PRO</Text>
        </View>

        <View className='home-hero__ring'>
          <ProgressRing
            progress={progress}
            value={calories.remaining}
            unit='千卡'
            caption='今日还可摄入'
            hint={`${calories.consumed} / ${calories.target} kcal`}
          />
        </View>

        <View className='home-macros'>
          {macros.map((macro) => {
            const macroProgress = Math.min(macro.current / macro.target, 1)

            return (
              <View className='home-macros__item' key={macro.key}>
                <View className='home-macros__label-row'>
                  <Text className='home-macros__label'>{macro.label}</Text>
                  <Text className='home-macros__value'>
                    {macro.current}/{macro.target}
                    {macro.unit}
                  </Text>
                </View>
                <View className='home-macros__track'>
                  <View
                    className='home-macros__fill'
                    style={{
                      width: `${Math.max(8, macroProgress * 100)}%`,
                      background: toneMap[macro.tone]
                    }}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <View className='home-overview'>
        {overviewCards.map((item) => (
          <View className='home-overview__card surface-card' key={item.label}>
            <Text className='home-overview__label'>{item.label}</Text>
            <Text className='home-overview__value'>{item.value}</Text>
            <Text className='home-overview__hint'>{item.hint}</Text>
          </View>
        ))}
      </View>

      <View className='home-manual surface-card'>
        <View className='home-manual__copy'>
          <Text className='home-manual__eyebrow'>手动新增模块</Text>
          <Text className='home-manual__title'>按包装上的营养数据填写</Text>
          <Text className='home-manual__desc'>
            支持选择日期、餐次、热量和三大营养素，保存后会归到当天记录。
          </Text>
        </View>
        <Navigator
          className='primary-button home-manual__button'
          url={`/pages/manual-entry/index?date=${selectedDate}`}
        >
          手动新增食物
        </Navigator>
      </View>

      <View className='home-nav surface-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>快速入口</Text>
          <Text className='section-heading__hint'>页面原型</Text>
        </View>
        <View className='home-nav__grid'>
          <Navigator className='home-nav__item' url='/pages/onboarding/index'>
            <Text className='home-nav__title'>TDEE 设置</Text>
            <Text className='home-nav__desc'>完善资料，实时看到目标热量</Text>
          </Navigator>
          <Navigator className='home-nav__item' url='/pages/wallet/index'>
            <Text className='home-nav__title'>钱包 / VIP</Text>
            <Text className='home-nav__desc'>查看能量币余额和会员权益</Text>
          </Navigator>
        </View>
      </View>

      <View className='home-meals'>
        <View className='section-heading'>
          <Text className='section-heading__title'>饮食记录</Text>
          <Text className='section-heading__hint'>按所选日期查看</Text>
        </View>

        {meals.map((meal) => (
          <View className='home-meal surface-card' key={meal.type}>
            <View className='home-meal__header'>
              <View>
                <Text className='home-meal__title'>{meal.type}</Text>
                <Text className='home-meal__time'>{meal.timeRange}</Text>
              </View>
              <Text className='home-meal__calories'>
                {meal.filled ? `${meal.totalCalories} kcal` : '待记录'}
              </Text>
            </View>

            {meal.filled ? (
              <View className='home-meal__items'>
                {meal.items.map((item) => (
                  <View className='home-meal__row' key={`${meal.type}-${item.id || item.name}`}>
                    <View className='home-meal__icon' />
                    <View className='home-meal__content'>
                      <Text className='home-meal__name'>{item.name}</Text>
                      <Text className='home-meal__note'>{item.note}</Text>
                    </View>
                    <Text className='home-meal__kcal'>{item.calories} kcal</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View className='home-meal__empty'>
                <Text className='home-meal__empty-title'>还没有记录</Text>
                <Text className='home-meal__empty-desc'>
                  可以继续用 AI 识别，也可以手动按营养表补录。
                </Text>
                <View className='home-meal__empty-actions'>
                  <Navigator className='secondary-button' url='/pages/ai-result/index'>
                    AI 识别
                  </Navigator>
                  <Navigator
                    className='primary-button'
                    url={`/pages/manual-entry/index?date=${selectedDate}&mealType=${encodeURIComponent(
                      meal.type
                    )}`}
                  >
                    手动新增
                  </Navigator>
                </View>
              </View>
            )}
          </View>
        ))}
      </View>

      <FloatingScanButton quotaLabel={`今日免费 ${dashboardData.user.freeQuota} 次`} />
    </View>
  )
}
