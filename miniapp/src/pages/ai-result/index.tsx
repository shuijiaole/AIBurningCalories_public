import { useState } from 'react'

import Taro, { useDidShow } from '@tarojs/taro'
import { ScrollView, Text, View } from '@tarojs/components'

import { aiResultData } from '../../mock/app-data'

import './index.scss'

type FoodState = (typeof aiResultData.foods)[number]

const mealOptions = ['早餐', '午餐', '晚餐', '加餐']

export default function AiResultPage() {
  const [selectedMeal, setSelectedMeal] = useState('午餐')
  const [foods, setFoods] = useState<FoodState[]>(aiResultData.foods)

  useDidShow(() => {
    if (process.env.TARO_ENV === 'weapp') {
      Taro.vibrateShort()
    }
  })

  const totals = foods.reduce(
    (summary, item) => ({
      calories: summary.calories + item.calories * item.quantity,
      protein: summary.protein + item.protein * item.quantity,
      carbs: summary.carbs + item.carbs * item.quantity,
      fat: summary.fat + item.fat * item.quantity
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    }
  )

  const handleQuantityChange = (name: string, delta: number) => {
    setFoods((current) =>
      current.map((item) =>
        item.name === name
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      )
    )
  }

  const handleBack = () => {
    Taro.navigateBack({
      fail: () => {
        Taro.redirectTo({
          url: '/pages/home/index'
        })
      }
    })
  }

  const handleSave = () => {
    Taro.showToast({
      title: '页面原型已就绪',
      icon: 'none'
    })
  }

  return (
    <View className='ai-page page-shell'>
      <View className='ai-photo surface-card'>
        <View className='ai-photo__toolbar'>
          <Text className='soft-chip'>Vision + Nutrition JSON</Text>
          <Text className='soft-chip'>精度 94%</Text>
        </View>

        <View className='ai-photo__plate'>
          <View className='ai-photo__food ai-photo__food--egg' />
          <View className='ai-photo__food ai-photo__food--toast' />
          <View className='ai-photo__food ai-photo__food--salad' />
          <View className='ai-photo__food ai-photo__food--avocado' />
        </View>

        <View className='ai-photo__overlay' />
        <View className='ai-photo__scan-line' />

        <View className='ai-photo__caption'>
          <Text className='ai-photo__title'>{aiResultData.imageMeta.title}</Text>
          <Text className='ai-photo__subtitle'>
            {aiResultData.imageMeta.subtitle}
          </Text>
        </View>
      </View>

      <View className='ai-sheet surface-card'>
        <View className='ai-sheet__header'>
          <View>
            <Text className='ai-sheet__eyebrow'>{aiResultData.sessionLabel}</Text>
            <Text className='ai-sheet__title'>总计 {totals.calories} 千卡</Text>
          </View>
          <View className='ai-sheet__quota'>
            <Text className='ai-sheet__quota-top'>
              今日免费 {aiResultData.quota.freeQuota} 次
            </Text>
            <Text className='ai-sheet__quota-bottom'>非会员单次 {aiResultData.quota.coinCost} 币</Text>
          </View>
        </View>

        <View className='ai-sheet__metrics'>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>蛋白质</Text>
            <Text className='ai-sheet__metric-value'>{totals.protein}g</Text>
          </View>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>碳水</Text>
            <Text className='ai-sheet__metric-value'>{totals.carbs}g</Text>
          </View>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>脂肪</Text>
            <Text className='ai-sheet__metric-value'>{totals.fat}g</Text>
          </View>
        </View>

        <View className='ai-sheet__section'>
          <View className='section-heading'>
            <Text className='section-heading__title'>食物成分</Text>
            <Text className='section-heading__hint'>支持手动校准份量</Text>
          </View>

          <ScrollView className='ai-foods' scrollY>
            {foods.map((item) => (
              <View className='ai-food' key={item.name}>
                <View className='ai-food__main'>
                  <View className='ai-food__icon' />
                  <View className='ai-food__content'>
                    <Text className='ai-food__name'>{item.name}</Text>
                    <Text className='ai-food__meta'>
                      {item.unitLabel} · {item.calories} kcal
                    </Text>
                    <Text className='ai-food__macros'>
                      P {item.protein} / C {item.carbs} / F {item.fat}
                    </Text>
                  </View>
                </View>

                <View className='ai-food__stepper'>
                  <View
                    className='ai-food__stepper-button'
                    onClick={() => handleQuantityChange(item.name, -1)}
                  >
                    <Text>-</Text>
                  </View>
                  <Text className='ai-food__stepper-value'>{item.quantity}</Text>
                  <View
                    className='ai-food__stepper-button'
                    onClick={() => handleQuantityChange(item.name, 1)}
                  >
                    <Text>+</Text>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        <View className='ai-sheet__section'>
          <View className='section-heading'>
            <Text className='section-heading__title'>记录到哪一餐</Text>
            <Text className='section-heading__hint'>默认推荐午餐</Text>
          </View>

          <View className='ai-meal-tabs'>
            {mealOptions.map((meal) => (
              <View
                className={
                  meal === selectedMeal ? 'ai-meal-tab ai-meal-tab--active' : 'ai-meal-tab'
                }
                key={meal}
                onClick={() => setSelectedMeal(meal)}
              >
                <Text>{meal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='ai-sheet__actions'>
          <View className='secondary-button' onClick={handleBack}>
            重新拍摄
          </View>
          <View className='primary-button' onClick={handleSave}>
            记录到 {selectedMeal}
            {aiResultData.quota.isVip ? '（VIP 免费）' : `（扣除 ${aiResultData.quota.coinCost} 币）`}
          </View>
        </View>
      </View>
    </View>
  )
}
