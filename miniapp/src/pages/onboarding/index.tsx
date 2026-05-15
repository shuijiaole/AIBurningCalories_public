import { useState } from 'react'

import Taro from '@tarojs/taro'
import { Picker, Text, View } from '@tarojs/components'

import { activityOptions } from '../../mock/app-data'
import { calculateTdeeTargets, type Gender, type Goal } from '../../utils/tdee'

import './index.scss'

const ageOptions = Array.from({ length: 43 }, (_, index) => 18 + index)
const heightOptions = Array.from({ length: 61 }, (_, index) => 145 + index)
const weightOptions = Array.from({ length: 81 }, (_, index) => 40 + index)

const goalCards: { key: Goal; label: string; hint: string }[] = [
  { key: 'cut', label: '减脂', hint: '控制热量，优先保留肌肉' },
  { key: 'maintain', label: '维持', hint: '稳定饮食，维持当前状态' },
  { key: 'bulk', label: '增肌', hint: '适度盈余，支持训练恢复' }
]

export default function OnboardingPage() {
  const [gender, setGender] = useState<Gender>('male')
  const [age, setAge] = useState(27)
  const [height, setHeight] = useState(173)
  const [weight, setWeight] = useState(68)
  const [activityLevel, setActivityLevel] = useState(1.55)
  const [goal, setGoal] = useState<Goal>('maintain')

  const targets = calculateTdeeTargets({
    gender,
    age,
    height,
    weight,
    activityLevel,
    goal
  })

  const handleSave = () => {
    Taro.showToast({
      title: '资料草稿已保存',
      icon: 'none'
    })
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
          <Text className='section-heading__hint'>用于实时估算 TDEE</Text>
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
              <Text className='onboarding-card__choice-desc'>偏高肌肉量估算</Text>
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
              <Text className='onboarding-card__choice-desc'>更贴合基础代谢差异</Text>
            </View>
          </View>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>身体数据</Text>
          <View className='onboarding-picker-grid'>
            <Picker
              className='onboarding-picker-wrap'
              mode='selector'
              range={ageOptions}
              value={ageOptions.indexOf(age)}
              onChange={(event) => setAge(ageOptions[Number(event.detail.value)])}
            >
              <View className='onboarding-picker'>
                <Text className='onboarding-picker__label'>年龄</Text>
                <Text className='onboarding-picker__value'>{age} 岁</Text>
              </View>
            </Picker>

            <Picker
              className='onboarding-picker-wrap'
              mode='selector'
              range={heightOptions}
              value={heightOptions.indexOf(height)}
              onChange={(event) => setHeight(heightOptions[Number(event.detail.value)])}
            >
              <View className='onboarding-picker'>
                <Text className='onboarding-picker__label'>身高</Text>
                <Text className='onboarding-picker__value'>{height} cm</Text>
              </View>
            </Picker>

            <Picker
              className='onboarding-picker-wrap'
              mode='selector'
              range={weightOptions}
              value={weightOptions.indexOf(weight)}
              onChange={(event) => setWeight(weightOptions[Number(event.detail.value)])}
            >
              <View className='onboarding-picker'>
                <Text className='onboarding-picker__label'>体重</Text>
                <Text className='onboarding-picker__value'>{weight} kg</Text>
              </View>
            </Picker>
          </View>
        </View>

        <View className='onboarding-card__section'>
          <Text className='onboarding-card__section-title'>活动水平</Text>
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
          <Text className='onboarding-card__section-title'>目标</Text>
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
      </View>

      <View className='surface-card onboarding-result'>
        <Text className='onboarding-result__eyebrow'>实时计算结果</Text>
        <Text className='onboarding-result__title'>每日建议热量 {targets.targetCalories} 千卡</Text>
        <Text className='onboarding-result__sub'>
          BMR {targets.bmr} · TDEE {targets.tdee} · 已按目标自动换算宏量营养
        </Text>

        <View className='onboarding-result__grid'>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>蛋白质</Text>
            <Text className='onboarding-result__metric-value'>{targets.targetProtein}g</Text>
          </View>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>碳水</Text>
            <Text className='onboarding-result__metric-value'>{targets.targetCarbs}g</Text>
          </View>
          <View className='onboarding-result__metric'>
            <Text className='onboarding-result__metric-label'>脂肪</Text>
            <Text className='onboarding-result__metric-value'>{targets.targetFat}g</Text>
          </View>
        </View>

        <View className='primary-button onboarding-result__button' onClick={handleSave}>
          保存我的目标
        </View>
      </View>
    </View>
  )
}
