import { useMemo, useState } from 'react'

import Taro, { useDidShow } from '@tarojs/taro'
import { Input, ScrollView, Text, Textarea, View } from '@tarojs/components'

import { mealTypeOptions, type MealType } from '../../mock/app-data-v2'
import {
  analyzeImageWithAi,
  analyzeTextWithAi,
  saveAiScanResult,
  type AiDemoFoodResponse,
  type AiDemoScanResponse
} from '../../services/backend'
import { getDateValue } from '../../utils/date-v2'

import '../ai-result/index.scss'

type FoodAmountMode = 'grams' | 'portion'

type FoodState = AiDemoFoodResponse & {
  amountMode: FoodAmountMode
  baseAmount: number
  amount: number
  amountInput: string
}
type InputMode = 'image' | 'text'

function formatDisplayNumber(value: number, maximumFractionDigits = 1) {
  if (!Number.isFinite(value)) {
    return '0'
  }

  return value
    .toFixed(maximumFractionDigits)
    .replace(/\.0+$|(\.\d*?)0+$/, '$1')
}

function parseFoodAmountMode(unitLabel: string | null) {
  if (!unitLabel) {
    return {
      amountMode: 'portion' as const,
      baseAmount: 1
    }
  }

  // 改进正则：不要求在结尾，支持多种格式如 "100g/包", "每份25g", "1份(50克)"
  const matched = unit_label_clean(unitLabel).match(/(\d+(?:\.\d+)?)\s*(g|gram|grams|克)/i)
  
  if (!matched) {
    return {
      amountMode: 'portion' as const,
      baseAmount: 1
    }
  }

  const baseAmount = Number(matched[1])
  return {
    amountMode: 'grams' as const,
    baseAmount: Number.isFinite(baseAmount) && baseAmount > 0 ? baseAmount : 100
  }
}

function unit_label_clean(label: string) {
  return label.trim()
}

function createFoodState(food: AiDemoFoodResponse): FoodState {
  const quantity = Number.isFinite(food.quantity) && food.quantity > 0 ? food.quantity : 1
  const { amountMode, baseAmount } = parseFoodAmountMode(food.unit_label)
  const amount = amountMode === 'grams' ? baseAmount * quantity : quantity

  return {
    ...food,
    quantity,
    amountMode,
    baseAmount,
    amount,
    amountInput: formatDisplayNumber(amount, amountMode === 'grams' ? 1 : 0)
  }
}

function sanitizeDigitInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, '')
  const [integerPart = '', ...decimalParts] = cleaned.split('.')

  if (decimalParts.length === 0) {
    return integerPart
  }

  return `${integerPart}.${decimalParts.join('')}`
}

function getBaseLabel(item: FoodState) {
  if (item.amountMode === 'grams') {
    return `${formatDisplayNumber(item.baseAmount)}g`
  }

  return item.unit_label || '1份'
}

function getCurrentLabel(item: FoodState) {
  if (item.amountMode === 'grams') {
    return `${formatDisplayNumber(item.amount)}g`
  }

  if (!item.unit_label) {
    return `${formatDisplayNumber(item.quantity)}份`
  }

  const matched = item.unit_label.trim().match(/^(\d+(?:\.\d+)?)\s*(.+)$/)
  if (!matched) {
    return item.quantity === 1 ? item.unit_label : `${formatDisplayNumber(item.quantity)} × ${item.unit_label}`
  }

  const baseCount = Number(matched[1])
  const unitSuffix = matched[2]
  if (!Number.isFinite(baseCount) || baseCount <= 0) {
    return item.quantity === 1 ? item.unit_label : `${formatDisplayNumber(item.quantity)} × ${item.unit_label}`
  }

  return `${formatDisplayNumber(baseCount * item.quantity)}${unitSuffix}`
}

function toSaveFoodPayload(item: FoodState): AiDemoFoodResponse {
  return {
    food_name: item.food_name,
    unit_label: getCurrentLabel(item),
    base_calories: item.base_calories,
    base_protein_g: item.base_protein_g,
    base_carbs_g: item.base_carbs_g,
    base_fat_g: item.base_fat_g,
    quantity: item.quantity,
    sort_no: item.sort_no
  }
}

export default function AiPreviewPage() {
  const router = Taro.getCurrentInstance().router
  const entryDate = router?.params?.date || getDateValue()
  const [inputMode, setInputMode] = useState<InputMode>('image')
  const [selectedMeal, setSelectedMeal] = useState<MealType>('午餐')
  const [scanSession, setScanSession] = useState<AiDemoScanResponse | null>(null)
  const [foods, setFoods] = useState<FoodState[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [textDescription, setTextDescription] = useState('')
  const hasFoods = foods.length > 0

  useDidShow(() => {
    if (process.env.TARO_ENV === 'weapp') {
      Taro.vibrateShort()
    }
  })

  const totals = useMemo(
    () =>
      foods.reduce(
        (summary, item) => ({
          calories: summary.calories + item.base_calories * item.quantity,
          protein: summary.protein + item.base_protein_g * item.quantity,
          carbs: summary.carbs + item.base_carbs_g * item.quantity,
          fat: summary.fat + item.base_fat_g * item.quantity
        }),
        {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0
        }
      ),
    [foods]
  )

  const resetResult = () => {
    setScanSession(null)
    setFoods([])
    setImageReady(false)
  }

  const handleModeChange = (nextMode: InputMode) => {
    setInputMode(nextMode)
    resetResult()
  }

  const handleAnalyzeImage = async () => {
    try {
      const chooseResult = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })

      const tempFilePath = chooseResult.tempFilePaths[0]
      if (!tempFilePath) {
        throw new Error('没有选择图片')
      }

      setLoading(true)
      setImageReady(true)
      const nextSession = await analyzeImageWithAi({
        filePath: tempFilePath,
        entryDate,
        sourceType: 'camera'
      })
      setScanSession(nextSession)
      setFoods(nextSession.foods.map(createFoodState))
    } catch (error) {
      setImageReady(false)
      Taro.showToast({
        title: error instanceof Error ? error.message : '图片识别失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeText = async () => {
    const description = textDescription.trim()
    if (!description) {
      Taro.showToast({
        title: '请先输入食物描述',
        icon: 'none'
      })
      return
    }

    try {
      setLoading(true)
      const nextSession = await analyzeTextWithAi({
        entryDate,
        description
      })
      setScanSession(nextSession)
      setFoods(nextSession.foods.map(createFoodState))
      setImageReady(false)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '文字估算失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuantityChange = (sortNo: number, delta: number) => {
    setFoods((current) =>
      current.map((item) =>
        item.sort_no === sortNo
          ? {
            ...item,
            quantity: Math.max(1, item.quantity + delta),
            amount: Math.max(1, item.quantity + delta),
            amountInput: formatDisplayNumber(Math.max(1, item.quantity + delta), 0)
          }
          : item
      )
    )
  }

  const handleGramInputChange = (sortNo: number, value: string) => {
    const nextValue = sanitizeDigitInput(value)

    setFoods((current) =>
      current.map((item) => {
        if (item.sort_no !== sortNo || item.amountMode !== 'grams') {
          return item
        }

        const nextAmount = Number(nextValue)
        if (!nextValue || !Number.isFinite(nextAmount) || nextAmount <= 0) {
          return {
            ...item,
            amountInput: nextValue
          }
        }

        return {
          ...item,
          amount: nextAmount,
          amountInput: nextValue,
          quantity: nextAmount / item.baseAmount
        }
      })
    )
  }

  const handleGramInputBlur = (sortNo: number) => {
    setFoods((current) =>
      current.map((item) => {
        if (item.sort_no !== sortNo || item.amountMode !== 'grams') {
          return item
        }

        return {
          ...item,
          amountInput: formatDisplayNumber(item.amount)
        }
      })
    )
  }

  const handleSave = async () => {
    if (!hasFoods || !scanSession) {
      Taro.showToast({
        title: '暂无可保存的识别结果',
        icon: 'none'
      })
      return
    }

    const hasInvalidAmount = foods.some((item) => item.quantity <= 0)
    if (hasInvalidAmount) {
      Taro.showToast({
        title: '请先填写有效克数或份量',
        icon: 'none'
      })
      return
    }

    try {
      setSaving(true)
      const result = await saveAiScanResult(scanSession.session_id, {
        entry_date: entryDate,
        meal_type: selectedMeal,
        foods: foods.map(toSaveFoodPayload)
      })

      Taro.showToast({
        title: result.coin_cost > 0 ? `已保存并扣除 ${result.coin_cost} 币` : '已保存到饮食记录',
        icon: 'success'
      })

      setTimeout(() => {
        Taro.redirectTo({
          url: '/pages/home-ui/index'
        })
      }, 500)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleQuickSaveToLunch = async () => {
    if (!hasFoods || !scanSession) {
      Taro.showToast({
        title: '暂无可保存的识别结果',
        icon: 'none'
      })
      return
    }

    // 设置为午餐并保存
    setSelectedMeal('午餐')
    
    try {
      setSaving(true)
      const result = await saveAiScanResult(scanSession.session_id, {
        entry_date: entryDate,
        meal_type: '午餐',
        foods: foods.map(toSaveFoodPayload)
      })

      Taro.showToast({
        title: result.coin_cost > 0 ? `已保存并扣除 ${result.coin_cost} 币` : '一键保存到午餐成功',
        icon: 'success'
      })

      setTimeout(() => {
        Taro.redirectTo({
          url: '/pages/home-ui/index'
        })
      }, 500)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleRetry = () => {
    resetResult()
    if (inputMode === 'image') {
      void handleAnalyzeImage()
      return
    }
    void handleAnalyzeText()
  }

  const statusText = loading
    ? '识别中'
    : hasFoods
      ? '识别完成'
      : inputMode === 'image'
        ? '等待上传'
        : '等待输入'

  const heroTitle =
    scanSession?.title || (inputMode === 'image' ? 'AI 图片识别结果' : 'AI 文字营养估算')
  const heroSubtitle =
    scanSession?.subtitle ||
    (inputMode === 'image'
      ? '上传一张食物图片，AI 会识别食物并估算热量、蛋白质、碳水和脂肪。'
      : '输入一句食物描述，AI 会拆分食物项并估算热量、蛋白质、碳水和脂肪。')

  return (
    <View className='ai-page page-shell'>
      <View
        className={
          inputMode === 'text'
            ? 'ai-photo ai-photo--text surface-card'
            : 'ai-photo surface-card'
        }
      >
        <View className='ai-photo__toolbar'>
          <Text className='soft-chip'>AI Nutrition</Text>
          <Text className='soft-chip'>{statusText}</Text>
        </View>

        <View className='ai-input-switch'>
          <View
            className={inputMode === 'image' ? 'ai-input-switch__tab ai-input-switch__tab--active' : 'ai-input-switch__tab'}
            onClick={() => handleModeChange('image')}
          >
            图片识别
          </View>
          <View
            className={inputMode === 'text' ? 'ai-input-switch__tab ai-input-switch__tab--active' : 'ai-input-switch__tab'}
            onClick={() => handleModeChange('text')}
          >
            文字估算
          </View>
        </View>

        {inputMode === 'image' ? (
          <>
            <View className='ai-photo__plate'>
              <View className='ai-photo__food ai-photo__food--egg' />
              <View className='ai-photo__food ai-photo__food--toast' />
              <View className='ai-photo__food ai-photo__food--salad' />
              <View className='ai-photo__food ai-photo__food--avocado' />
            </View>
            <View className='ai-photo__overlay' />
            <View className='ai-photo__scan-line' />
          </>
        ) : (
          <View className='ai-text-hero'>
            <Text className='ai-text-hero__label'>食物描述</Text>
            <Textarea
              className='ai-text-hero__textarea'
              value={textDescription}
              maxlength={300}
              placeholder='例如：一碗牛肉面，加一个煎蛋，一杯无糖豆浆'
              placeholderClass='ai-text-hero__placeholder'
              onInput={(event) => setTextDescription(event.detail.value)}
            />
            <Text className='ai-text-hero__hint'>
              描述越具体，AI 对蛋白质、脂肪、碳水和热量的估算越准确。
            </Text>
          </View>
        )}

        <View className='ai-photo__caption'>
          <Text className='ai-photo__title'>{heroTitle}</Text>
          <Text className='ai-photo__subtitle'>{heroSubtitle}</Text>
        </View>
      </View>

      <View
        className={
          inputMode === 'text'
            ? 'ai-sheet ai-sheet--text surface-card'
            : 'ai-sheet surface-card'
        }
      >
        <View className='ai-sheet__section ai-sheet__section--compact'>
          <View className='section-heading'>
            <Text className='section-heading__title'>开始识别</Text>
            <Text className='section-heading__hint'>
              {inputMode === 'image' ? '支持拍照或相册上传' : '支持一句话描述整餐'}
            </Text>
          </View>

          <View
            className='primary-button'
            onClick={inputMode === 'image' ? handleAnalyzeImage : handleAnalyzeText}
          >
            {loading
              ? '识别中...'
              : inputMode === 'image'
                ? '上传图片识别'
                : '开始文字估算'}
          </View>
        </View>

        <View className='ai-sheet__header'>
          <View>
            <Text className='ai-sheet__eyebrow'>AI 识别结果</Text>
            <Text className='ai-sheet__title'>总计 {totals.calories.toFixed(1)} kcal</Text>
          </View>
          <View className='ai-sheet__quota'>
            <Text className='ai-sheet__quota-top'>
              今日免费 {scanSession?.quota.free_quota_remaining ?? 0} 次
            </Text>
            <Text className='ai-sheet__quota-bottom'>
              非会员单次 {scanSession?.quota.coin_cost ?? 0} 币
            </Text>
          </View>
        </View>

        <View className='ai-sheet__metrics'>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>蛋白质</Text>
            <Text className='ai-sheet__metric-value'>{totals.protein.toFixed(1)}g</Text>
          </View>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>碳水</Text>
            <Text className='ai-sheet__metric-value'>{totals.carbs.toFixed(1)}g</Text>
          </View>
          <View className='ai-sheet__metric'>
            <Text className='ai-sheet__metric-label'>脂肪</Text>
            <Text className='ai-sheet__metric-value'>{totals.fat.toFixed(1)}g</Text>
          </View>
        </View>

        <View className='ai-sheet__section'>
          <View className='section-heading'>
            <Text className='section-heading__title'>食物成分</Text>
            <Text className='section-heading__hint'>支持修改克数或份量</Text>
          </View>

          <ScrollView className='ai-foods' scrollY>
            {hasFoods ? (
              foods.map((item) => (
                <View className='ai-food' key={`${item.food_name}-${item.sort_no}`}>
                  <View className='ai-food__main'>
                    <View className='ai-food__icon' />
                    <View className='ai-food__content'>
                      <Text className='ai-food__name'>{item.food_name}</Text>
                      <Text className='ai-food__meta'>
                        当前 {getCurrentLabel(item)} · {(item.base_calories * item.quantity).toFixed(1)} kcal
                      </Text>
                      <Text className='ai-food__macros'>
                        P {(item.base_protein_g * item.quantity).toFixed(1)} / C {(item.base_carbs_g * item.quantity).toFixed(1)} / F {(item.base_fat_g * item.quantity).toFixed(1)}
                      </Text>
                      <Text className='ai-food__reference'>
                        基准 {getBaseLabel(item)} · {formatDisplayNumber(item.base_calories)} kcal
                      </Text>
                    </View>
                  </View>

                  {item.amountMode === 'grams' ? (
                    <View className='ai-food__grams'>
                      <Text className='ai-food__grams-label'>当前克数</Text>
                      <View className='ai-food__grams-input-wrap'>
                        <Input
                          className='ai-food__grams-input'
                          type='digit'
                          value={item.amountInput}
                          onInput={(event) => handleGramInputChange(item.sort_no, event.detail.value)}
                          onBlur={() => handleGramInputBlur(item.sort_no)}
                        />
                        <Text className='ai-food__grams-unit'>g</Text>
                      </View>
                    </View>
                  ) : (
                    <View className='ai-food__stepper'>
                      <View
                        className='ai-food__stepper-button'
                        onClick={() => handleQuantityChange(item.sort_no, -1)}
                      >
                        <Text>-</Text>
                      </View>
                      <Text className='ai-food__stepper-value'>{formatDisplayNumber(item.quantity, 0)}</Text>
                      <View
                        className='ai-food__stepper-button'
                        onClick={() => handleQuantityChange(item.sort_no, 1)}
                      >
                        <Text>+</Text>
                      </View>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View className='ai-food'>
                <View className='ai-food__main'>
                  <View className='ai-food__content'>
                    <Text className='ai-food__name'>还没有识别结果</Text>
                    <Text className='ai-food__meta'>
                      先上传图片或输入文字描述，AI 会在这里返回热量、蛋白质、碳水和脂肪估算。
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>
        </View>

        <View className='ai-sheet__section'>
          <View className='section-heading'>
            <Text className='section-heading__title'>记录到哪一餐</Text>
            <Text className='section-heading__hint'>
              {hasFoods ? '识别结果会按所选餐次保存' : '得到结果后再选择餐次'}
            </Text>
          </View>

          <View className='ai-meal-tabs'>
            {mealTypeOptions.map((meal) => (
              <View
                className={meal === selectedMeal ? 'ai-meal-tab ai-meal-tab--active' : 'ai-meal-tab'}
                key={meal}
                onClick={() => setSelectedMeal(meal)}
              >
                <Text>{meal}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className='ai-sheet__actions'>
          <View className='secondary-button' onClick={handleRetry}>
            {inputMode === 'image' ? '重新选图' : '重新估算'}
          </View>
          
          <View className='primary-button' onClick={handleSave}>
            {saving
              ? '保存中...'
              : hasFoods
                ? `添加${selectedMeal}并保存到食物记录${
                    (scanSession?.quota.coin_cost ?? 0) <= 0
                      ? '（本次免费）'
                      : `（扣除${scanSession?.quota.coin_cost ?? 0}币）`
                  }`
                : '暂无结果可保存'}
          </View>
        </View>
      </View>
    </View>
  )
}
