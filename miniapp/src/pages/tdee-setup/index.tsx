import { useEffect, useState } from 'react'

import Taro from '@tarojs/taro'
import { Input, Picker, Text, View } from '@tarojs/components'

import { activityOptions } from '../../mock/app-data-v2'
import {
  fetchActiveGoalProfile,
  saveGoalProfile
} from '../../services/backend'
import {
  calculateCarbCyclePlan,
  calculateTdeeTargets,
  type CarbCycleMode,
  type Gender,
  type Goal
} from '../../utils/tdee'
import { getDateValue } from '../../utils/date-v2'

import '../onboarding/index.scss'

const ageOptions = Array.from({ length: 43 }, (_, index) => 18 + index)
const heightOptions = Array.from({ length: 61 }, (_, index) => 145 + index)
const weightOptions = Array.from({ length: 81 }, (_, index) => 40 + index)
const CARB_CYCLE_STORAGE_KEY = 'fitcalorie-carb-cycle-mode'

const goalCards: { key: Goal; label: string; hint: string }[] = [
  { key: 'cut', label: '减脂', hint: '控制热量，优先保留肌肉量' },
  { key: 'maintain', label: '维持', hint: '稳定饮食，维持当前体态与体重' },
  { key: 'bulk', label: '增肌', hint: '适度盈余，支持训练恢复和增长' }
]

const carbCycleOptions: Array<{
  key: CarbCycleMode
  label: string
  subtitle: string
  audience: string
}> = [
  {
    key: 'none',
    label: '标准模式',
    subtitle: '每天同一套热量和宏量营养',
    audience: '适合刚开始建立饮食习惯、训练频率不固定，或希望先把执行稳定下来的人。'
  },
  {
    key: 'three_low_one_high',
    label: '三低一高',
    subtitle: '3 天低碳 + 1 天高碳',
    audience: '更适合有一定系统训练基础、训练频率稳定，能把高碳日配合到腿背等高强度训练日的人群。'
  },
  {
    key: 'four_low_one_high',
    label: '四低一高',
    subtitle: '4 天低碳 + 1 天高碳',
    audience: '更适合系统训练 1 年以内、减脂期希望节奏更稳的人群，波动更温和，也更容易长期执行。'
  }
]

function formatRange(min: number, max: number) {
  return min === max ? `${min}` : `${min}-${max}`
}

function parseNumberInput(value: string, min: number, max: number) {
  if (!value.trim()) {
    return null
  }

  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return null
  }

  return Math.min(Math.max(parsed, min), max)
}

export default function TdeeSetupPage() {
  const [gender, setGender] = useState<Gender | null>(null)
  const [age, setAge] = useState<number | null>(null)
  const [height, setHeight] = useState<number | null>(null)
  const [weight, setWeight] = useState<number | null>(null)
  const [activityLevel, setActivityLevel] = useState<number | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [carbCycleMode, setCarbCycleMode] = useState<CarbCycleMode>('none')
  const [loadingProfile, setLoadingProfile] = useState(true)

  const targets =
    gender && age && height && weight && activityLevel && goal
      ? calculateTdeeTargets({
          gender,
          age,
          height,
          weight,
          activityLevel,
          goal
        })
      : null
  const carbCyclePlan = weight ? calculateCarbCyclePlan(weight, carbCycleMode) : null

  useEffect(() => {
    try {
      const savedMode = Taro.getStorageSync(CARB_CYCLE_STORAGE_KEY)
      if (
        savedMode === 'none' ||
        savedMode === 'three_low_one_high' ||
        savedMode === 'four_low_one_high'
      ) {
        setCarbCycleMode(savedMode)
      }
    } catch {
      //
    }
  }, [])

  useEffect(() => {
    const loadGoalProfile = async () => {
      setLoadingProfile(true)

      try {
        const profile = await fetchActiveGoalProfile()
        setGender(profile.gender)
        setAge(profile.age)
        setHeight(Number(profile.height_cm))
        setWeight(Number(profile.weight_kg))
        setActivityLevel(Number(profile.activity_level))
        setGoal(profile.goal)
      } catch {
        //
      } finally {
        setLoadingProfile(false)
      }
    }

    void loadGoalProfile()
  }, [])

  const handleSave = async () => {
    if (!targets || !gender || !age || !height || !weight || !activityLevel || !goal) {
      Taro.showToast({
        title: '请先填写资料',
        icon: 'none'
      })
      return
    }

    try {
      Taro.setStorageSync(CARB_CYCLE_STORAGE_KEY, carbCycleMode)

      await saveGoalProfile({
        gender,
        age,
        height_cm: height,
        weight_kg: weight,
        activity_level: activityLevel,
        goal,
        bmr: targets.bmr,
        tdee: targets.tdee,
        target_calories: targets.targetCalories,
        target_protein_g: targets.targetProtein,
        target_carbs_g: targets.targetCarbs,
        target_fat_g: targets.targetFat,
        effective_from: getDateValue()
      })

      Taro.showToast({
        title: '目标已保存',
        icon: 'success'
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none'
      })
    }
  }

  const handleAgeInput = (value: string) => {
    setAge(parseNumberInput(value, 1, 120))
  }

  const handleHeightInput = (value: string) => {
    setHeight(parseNumberInput(value, 80, 250))
  }

  const handleWeightInput = (value: string) => {
    setWeight(parseNumberInput(value, 20, 300))
  }

  return (
    <View className='onboarding-page page-shell'>
      <View className='surface-card onboarding-progress'>
        <View className='onboarding-progress__labels'>
          <Text className='onboarding-progress__label'>基础信息</Text>
          <Text className='onboarding-progress__step'>2 / 3</Text>
        </View>
        <View className='onboarding-progress__track'>
          <View className='onboarding-progress__fill' />
        </View>
      </View>

      <View className='surface-card onboarding-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>你的基础资料</Text>
          <Text className='section-heading__hint'>
            {loadingProfile ? '正在加载已保存目标' : '用于实时估算 TDEE'}
          </Text>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>性别</Text>
          <View className='onboarding-card__choice-row'>
            <View
              className={
                gender === 'male'
                  ? 'onboarding-card__choice onboarding-card__choice--active'
                  : 'onboarding-card__choice'
              }
              onClick={() => setGender('male')}
            >
              <Text className='onboarding-card__choice-title'>男</Text>
              <Text className='onboarding-card__choice-desc'>用于估算基础代谢和目标热量</Text>
            </View>
            <View
              className={
                gender === 'female'
                  ? 'onboarding-card__choice onboarding-card__choice--active'
                  : 'onboarding-card__choice'
              }
              onClick={() => setGender('female')}
            >
              <Text className='onboarding-card__choice-title'>女</Text>
              <Text className='onboarding-card__choice-desc'>结合女性基础代谢差异进行估算</Text>
            </View>
          </View>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>身体数据</Text>
          <View className='onboarding-picker-grid'>
            <View className='onboarding-picker-wrap'>
              <Picker
                mode='selector'
                range={ageOptions}
                value={age !== null ? Math.max(ageOptions.indexOf(age), 0) : 0}
                onChange={(event) => setAge(ageOptions[Number(event.detail.value)])}
              >
                <View className='onboarding-picker'>
                  <Text className='onboarding-picker__label'>年龄</Text>
                  <Text className='onboarding-picker__value'>
                    {age !== null ? `${age} 岁` : '请选择'}
                  </Text>
                </View>
              </Picker>
              <Input
                className='onboarding-picker__input'
                type='number'
                value={age !== null ? `${age}` : ''}
                placeholder='手动输入'
                onInput={(event) => {
                  handleAgeInput(String(event.detail.value))
                }}
              />
            </View>

            <View className='onboarding-picker-wrap'>
              <Picker
                mode='selector'
                range={heightOptions}
                value={height !== null ? Math.max(heightOptions.indexOf(height), 0) : 0}
                onChange={(event) => setHeight(heightOptions[Number(event.detail.value)])}
              >
                <View className='onboarding-picker'>
                  <Text className='onboarding-picker__label'>身高</Text>
                  <Text className='onboarding-picker__value'>
                    {height !== null ? `${height} cm` : '请选择'}
                  </Text>
                </View>
              </Picker>
              <Input
                className='onboarding-picker__input'
                type='digit'
                value={height !== null ? `${height}` : ''}
                placeholder='手动输入'
                onInput={(event) => {
                  handleHeightInput(String(event.detail.value))
                }}
              />
            </View>

            <View className='onboarding-picker-wrap'>
              <Picker
                mode='selector'
                range={weightOptions}
                value={weight !== null ? Math.max(weightOptions.indexOf(weight), 0) : 0}
                onChange={(event) => setWeight(weightOptions[Number(event.detail.value)])}
              >
                <View className='onboarding-picker'>
                  <Text className='onboarding-picker__label'>体重</Text>
                  <Text className='onboarding-picker__value'>
                    {weight !== null ? `${weight} kg` : '请选择'}
                  </Text>
                </View>
              </Picker>
              <Input
                className='onboarding-picker__input'
                type='digit'
                value={weight !== null ? `${weight}` : ''}
                placeholder='手动输入'
                onInput={(event) => {
                  handleWeightInput(String(event.detail.value))
                }}
              />
            </View>
          </View>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>娲诲姩姘村钩</Text>
          {activityOptions.map((option) => (
            <View
              className={
                option.value === activityLevel
                  ? 'onboarding-activity onboarding-activity--active'
                  : 'onboarding-activity'
              }
              key={option.value}
              onClick={() => setActivityLevel(option.value)}
            >
              <View>
                <Text className='onboarding-activity__title'>{option.label}</Text>
                <Text className='onboarding-activity__desc'>{option.description}</Text>
              </View>
              <Text className='onboarding-activity__value'>x{option.value}</Text>
            </View>
          ))}
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>鐩爣</Text>
          <View className='onboarding-goals'>
            {goalCards.map((card) => (
              <View
                className={
                  card.key === goal
                    ? 'onboarding-goal onboarding-goal--active'
                    : 'onboarding-goal'
                }
                key={card.key}
                onClick={() => setGoal(card.key)}
              >
                <Text className='onboarding-goal__title'>{card.label}</Text>
                <Text className='onboarding-goal__hint'>{card.hint}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>碳循环</Text>
          <View className='onboarding-cycle-options'>
            {carbCycleOptions.map((option) => (
              <View
                className={
                  option.key === carbCycleMode
                    ? 'onboarding-cycle-option onboarding-cycle-option--active'
                    : 'onboarding-cycle-option'
                }
                key={option.key}
                onClick={() => setCarbCycleMode(option.key)}
              >
                <Text className='onboarding-cycle-option__title'>{option.label}</Text>
                <Text className='onboarding-cycle-option__subtitle'>{option.subtitle}</Text>
                <Text className='onboarding-cycle-option__audience'>{option.audience}</Text>
              </View>
            ))}
          </View>
          <View className='onboarding-cycle-note'>
            <Text className='onboarding-cycle-note__text'>
              公式已按体重计算：低碳日用 1.5g/kg 碳水、1.8-2.0g/kg 蛋白、0.8-1.0g/kg 脂肪；高碳日用 4.0-5.0g/kg 碳水、1.2-1.3g/kg 蛋白、0.3g/kg 脂肪。
            </Text>
          </View>
        </View>
      </View>

      <View className='surface-card onboarding-result'>
        <Text className='onboarding-result__eyebrow'>实时计算结果</Text>
        <Text className='onboarding-result__title'>
          {targets ? `每日建议热量 ${targets.targetCalories} kcal` : '等待填写后自动计算'}
        </Text>
        <Text className='onboarding-result__sub'>
          {targets
            ? `BMR ${targets.bmr} · TDEE ${targets.tdee} · ${targets.formulaLabel}`
            : '选择或输入资料后，会自动生成你的目标热量和宏量营养。'}
        </Text>

        <View className='onboarding-result__grid'>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>蛋白质</Text>
            <Text className='onboarding-result__metric-value'>
              {targets
                ? `${targets.macroRanges
                    ? formatRange(targets.macroRanges.protein.min, targets.macroRanges.protein.max)
                    : targets.targetProtein}g`
                : '--'}
            </Text>
          </View>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>碳水</Text>
            <Text className='onboarding-result__metric-value'>
              {targets
                ? `${targets.macroRanges
                    ? formatRange(targets.macroRanges.carbs.min, targets.macroRanges.carbs.max)
                    : targets.targetCarbs}g`
                : '--'}
            </Text>
          </View>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>脂肪</Text>
            <Text className='onboarding-result__metric-value'>
              {targets
                ? `${targets.macroRanges
                    ? formatRange(targets.macroRanges.fat.min, targets.macroRanges.fat.max)
                    : targets.targetFat}g`
                : '--'}
            </Text>
          </View>
        </View>

        {targets?.macroRanges ? (
          <Text className='onboarding-result__sub'>
            系统保存到目标数据库时会取区间中位，方便首页和每日进度继续自动统计。
          </Text>
        ) : null}

        {targets ? (
          <View className='onboarding-result__cycle'>
            <Text className='onboarding-result__cycle-title'>
              {carbCycleMode === 'none' ? '标准执行建议' : '碳循环执行建议'}
            </Text>
            <Text className='onboarding-result__cycle-desc'>
              {carbCycleMode === 'none'
                ? '如果你现在最重要的是先把饮食和训练稳定下来，标准模式通常最容易长期执行。'
                : `当前为${carbCycleMode === 'three_low_one_high' ? '三低一高' : '四低一高'}。高低碳日已按 g/kg 公式拆分，差异主要来自碳水、蛋白和脂肪的日分配。`}
            </Text>

            {carbCyclePlan ? (
              <>
                <Text className='onboarding-result__cycle-average'>
                  周期平均热量约 {formatRange(carbCyclePlan.averageCalories.min, carbCyclePlan.averageCalories.max)} kcal / 天
                </Text>
                {carbCyclePlan.days.map((day) => (
                  <View className='onboarding-cycle-day' key={day.key}>
                    <View className='onboarding-cycle-day__header'>
                      <Text className='onboarding-cycle-day__label'>{day.label}</Text>
                      <Text
                        className={
                          day.type === 'high'
                            ? 'onboarding-cycle-day__tag onboarding-cycle-day__tag--high'
                            : 'onboarding-cycle-day__tag onboarding-cycle-day__tag--low'
                        }
                      >
                        {day.type === 'high' ? '高碳' : '低碳'}
                      </Text>
                    </View>
                    <Text className='onboarding-cycle-day__macros'>
                      热量 {formatRange(day.calories.min, day.calories.max)} kcal · 蛋白质{' '}
                      {formatRange(day.protein.min, day.protein.max)}g · 碳水{' '}
                      {formatRange(day.carbs.min, day.carbs.max)}g · 脂肪{' '}
                      {formatRange(day.fat.min, day.fat.max)}g
                    </Text>
                  </View>
                ))}
              </>
            ) : (
              <View className='onboarding-cycle-day'>
                <View className='onboarding-cycle-day__header'>
                  <Text className='onboarding-cycle-day__label'>每日固定目标</Text>
                  <Text className='onboarding-cycle-day__tag'>标准</Text>
                </View>
                <Text className='onboarding-cycle-day__macros'>
                  热量 {targets.targetCalories} kcal · 蛋白质{' '}
                  {targets.macroRanges
                    ? formatRange(targets.macroRanges.protein.min, targets.macroRanges.protein.max)
                    : targets.targetProtein}
                  g · 碳水{' '}
                  {targets.macroRanges
                    ? formatRange(targets.macroRanges.carbs.min, targets.macroRanges.carbs.max)
                    : targets.targetCarbs}
                  g · 脂肪{' '}
                  {targets.macroRanges
                    ? formatRange(targets.macroRanges.fat.min, targets.macroRanges.fat.max)
                    : targets.targetFat}
                  g
                </Text>
              </View>
            )}
          </View>
        ) : null}

        <View className='primary-button onboarding-result__button' onClick={handleSave}>
          {loadingProfile ? '读取中...' : '保存我的目标'}
        </View>
      </View>
    </View>
  )
}
