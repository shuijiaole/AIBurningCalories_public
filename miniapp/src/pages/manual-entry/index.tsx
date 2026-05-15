import { useEffect, useState } from 'react'

import Taro from '@tarojs/taro'
import { Input, Picker, ScrollView, Text, Textarea, View } from '@tarojs/components'

import { mealTypeOptions, type MealType } from '../../mock/app-data'
import { useMealEntryStore } from '../../store/meal-entry-store'
import { formatDateFull, formatTimeLabel, getDateValue } from '../../utils/date'

import './index.scss'

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

const emptyForm: FormState = {
  foodName: '',
  brand: '',
  serving: '1份',
  calories: '',
  protein: '',
  carbs: '',
  fat: '',
  note: ''
}

function parseMealType(rawValue?: string): MealType {
  const decoded = rawValue ? decodeURIComponent(rawValue) : ''

  return mealTypeOptions.includes(decoded as MealType)
    ? (decoded as MealType)
    : '早餐'
}

export default function ManualEntryPage() {
  const router = Taro.getCurrentInstance().router
  const [selectedDate, setSelectedDate] = useState(router?.params?.date || getDateValue())
  const [mealType, setMealType] = useState<MealType>(parseMealType(router?.params?.mealType))
  const [form, setForm] = useState<FormState>(emptyForm)
  const entries = useMealEntryStore((state) => state.entries)
  const hydrate = useMealEntryStore((state) => state.hydrate)
  const addEntry = useMealEntryStore((state) => state.addEntry)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  const selectedEntries = entries.filter((entry) => entry.date === selectedDate)

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }))
  }

  const handleSave = () => {
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

    const payload = {
      date: selectedDate,
      mealType,
      foodName,
      brand: form.brand.trim(),
      serving: form.serving.trim() || '1份',
      calories,
      protein: Number.isNaN(protein) ? 0 : protein,
      carbs: Number.isNaN(carbs) ? 0 : carbs,
      fat: Number.isNaN(fat) ? 0 : fat,
      note: form.note.trim()
    }

    addEntry(payload)

    Taro.showToast({
      title: '已保存到当天记录',
      icon: 'success'
    })

    setForm({
      ...emptyForm,
      serving: form.serving.trim() || '1份'
    })
  }

  const handleQuickSaveToLunch = () => {
    const foodName = form.foodName.trim()
    const calories = Number(form.calories)

    if (!foodName) {
      Taro.showToast({
        title: '请先填写食物名称',
        icon: 'none'
      })
  const handleBack = () => {
    Taro.navigateBack({
      fail: () => {
        Taro.redirectTo({
          url: '/pages/home/index'
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
          适合零食、饮料、预包装食品。填写后会按你选择的日期和餐次保存。
        </Text>
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
          <View className='manual-field'>
            <Text className='manual-field__label'>份量说明</Text>
            <Input
              className='manual-field__input'
              value={form.serving}
              placeholder='例如：1瓶 / 250ml / 100g'
              placeholderClass='manual-placeholder'
              onInput={(event) => updateField('serving', event.detail.value)}
            />
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
              placeholder='例如：半瓶、减糖版、按标签每100g换算'
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
            添加{mealType}并保存到食物记录
          </View>
        </View>
      </View>

      <View className='surface-card manual-saved'>
        <View className='section-heading'>
          <Text className='section-heading__title'>当天已保存</Text>
          <Text className='section-heading__hint'>{selectedEntries.length} 条</Text>
        </View>

        <ScrollView className='manual-saved__list' scrollY>
          {selectedEntries.length > 0 ? (
            selectedEntries.map((entry) => (
              <View className='manual-saved__item' key={entry.id}>
                <View className='manual-saved__header'>
                  <Text className='manual-saved__title'>{entry.foodName}</Text>
                  <Text className='manual-saved__badge'>{entry.mealType}</Text>
                </View>
                <Text className='manual-saved__meta'>
                  {entry.brand ? `${entry.brand} · ` : ''}
                  {entry.serving} · {entry.calories} kcal
                </Text>
                <Text className='manual-saved__macros'>
                  P {entry.protein} / C {entry.carbs} / F {entry.fat}
                </Text>
                <Text className='manual-saved__time'>
                  保存时间 {formatTimeLabel(new Date(entry.createdAt))}
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
