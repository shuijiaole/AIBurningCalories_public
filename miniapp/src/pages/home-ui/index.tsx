import { useEffect, useMemo, useState } from 'react'

import Taro, { useDidShow } from '@tarojs/taro'
import { Button, Input, Navigator, Picker, Text, View } from '@tarojs/components'

import { FloatingScanButton } from '../../components/floating-scan-button'
import { ProgressRing } from '../../components/progress-ring'
import {
  type MacroItem,
  mealTypeOptions
} from '../../mock/app-data-v2'
import {
  buildMealSectionsFromDashboard,
  clearUserSession,
  dailySignIn,
  fetchDashboard,
  getCachedUserInfo,
  hasCachedUserSession,
  ensureUserSession,
  updateCurrentUserProfile,
  type DashboardResponse,
  deleteAiScan,
  deleteManualMealEntry
} from '../../services/backend'
import {
  formatDateFull,
  formatDateLabel,
  getDateValue
} from '../../utils/date-v2'

import '../home/index.scss'

const toneMap: Record<MacroItem['tone'], string> = {
  protein: 'var(--macro-protein)',
  carbs: 'var(--macro-carbs)',
  fat: 'var(--macro-fat)'
}

export default function HomeUiPage() {
  const [selectedDate, setSelectedDate] = useState(getDateValue())
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginVisible, setLoginVisible] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(hasCachedUserSession())
  const [profileNickname, setProfileNickname] = useState(
    getCachedUserInfo()?.user.nickname?.trim() || ''
  )
  const [profileSaving, setProfileSaving] = useState(false)

  const loadDashboard = async (date: string) => {
    if (!hasCachedUserSession()) {
      setIsLoggedIn(false)
      setLoginVisible(true)
      return
    }

    setLoading(true)

    try {
      const nextDashboard = await fetchDashboard(date)
      setDashboard(nextDashboard)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '首页加载失败',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  const loginAndReload = async () => {
    if (loginLoading) {
      return
    }

    setLoginLoading(true)
    try {
      await ensureUserSession()
      const nickname = getCachedUserInfo()?.user.nickname?.trim() || ''
      setProfileNickname(nickname)
      setIsLoggedIn(true)
      setLoginVisible(false)
      Taro.showToast({
        title: '登录成功',
        icon: 'success'
      })
      await loadDashboard(selectedDate)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '登录失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoginLoading(false)
    }
  }

  const handleLogout = async () => {
    const { confirm } = await Taro.showModal({
      title: '退出登录',
      content: '退出后本机将清除登录状态，再次使用需要重新微信登录。',
      confirmText: '退出',
      confirmColor: '#ff4d4f'
    })

    if (!confirm) {
      return
    }

    clearUserSession()
    setDashboard(null)
    setProfileNickname('')
    setIsLoggedIn(false)
    setLoginVisible(true)
    Taro.showToast({
      title: '已退出登录',
      icon: 'none'
    })
  }

  const handleSaveNickname = async () => {
    const nextNickname = profileNickname.trim()

    if (!nextNickname) {
      Taro.showToast({
        title: '请输入昵称',
        icon: 'none'
      })
      return
    }

    if (profileSaving) {
      return
    }

    setProfileSaving(true)
    try {
      await updateCurrentUserProfile({ nickname: nextNickname })
      setProfileNickname(nextNickname)
      Taro.showToast({
        title: '昵称已保存',
        icon: 'success'
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '昵称保存失败',
        icon: 'none'
      })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleDailySignIn = async () => {
    if (selectedDate !== getDateValue()) {
      Taro.showToast({
        title: '只能签到当天',
        icon: 'none'
      })
      return
    }

    try {
      const result = await dailySignIn(selectedDate)
      Taro.showToast({
        title: result.awarded ? '签到成功 +1 能量币' : '今天已签到',
        icon: 'none'
      })
      await loadDashboard(selectedDate)
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '签到失败',
        icon: 'none'
      })
    }
  }

  const handleDeleteMealEntry = async (entryId: number, aiSessionId: number | null) => {
    try {
      const { confirm } = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这条饮食记录吗?',
        confirmText: '删除',
        confirmColor: '#ff4d4f'
      })

      if (!confirm) return

      Taro.showLoading({ title: '删除中...' })

      // 如果是AI识别的记录,删除AI会话(会级联删除饮食记录)
      if (aiSessionId) {
        await deleteAiScan(aiSessionId)
      } else {
        // 手动记录,调用删除饮食记录API
        await deleteManualMealEntry(entryId)
      }

      Taro.hideLoading()
      Taro.showToast({ title: '删除成功', icon: 'success' })

      // 重新加载仪表盘数据
      await loadDashboard(selectedDate)
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

  useEffect(() => {
    if (isLoggedIn) {
      void loadDashboard(selectedDate)
    } else {
      setLoginVisible(true)
    }
  }, [selectedDate])

  useDidShow(() => {
    if (hasCachedUserSession()) {
      setProfileNickname(getCachedUserInfo()?.user.nickname?.trim() || '')
      setIsLoggedIn(true)
      void loadDashboard(selectedDate)
    } else {
      setIsLoggedIn(false)
      setLoginVisible(true)
    }
  })

  const cachedUser = getCachedUserInfo()
  const userName = cachedUser?.user.nickname?.trim() || ''
  const userInitials = userName ? userName.slice(0, 1).toUpperCase() : 'FC'
  const shouldShowProfileNameEditor = isLoggedIn && (!userName || userName === '微信用户')

  const calories = useMemo(
    () => ({
      target: dashboard?.calories.target ?? 0,
      consumed: dashboard?.calories.consumed ?? 0,
      remaining: dashboard?.calories.remaining ?? 0
    }),
    [dashboard]
  )

  const macros = useMemo(
    () =>
      [
        {
          key: 'protein',
          label: '蛋白质',
          unit: 'g',
          current: dashboard?.macros.protein.current ?? 0,
          target: dashboard?.macros.protein.target ?? 0,
          tone: 'protein'
        },
        {
          key: 'carbs',
          label: '碳水',
          unit: 'g',
          current: dashboard?.macros.carbs.current ?? 0,
          target: dashboard?.macros.carbs.target ?? 0,
          tone: 'carbs'
        },
        {
          key: 'fat',
          label: '脂肪',
          unit: 'g',
          current: dashboard?.macros.fat.current ?? 0,
          target: dashboard?.macros.fat.target ?? 0,
          tone: 'fat'
        }
      ] as MacroItem[],
    [dashboard]
  )

  const meals = useMemo(
    () =>
      dashboard
        ? buildMealSectionsFromDashboard(dashboard)
        : mealTypeOptions.map((mealType) => ({
          type: mealType,
          timeRange: '',
          totalCalories: 0,
          filled: false,
          items: []
        })),
    [dashboard]
  )

  const manualCount = dashboard?.meals.reduce((sum, meal) => sum + meal.item_count, 0) ?? 0
  const progress = calories.target > 0 ? calories.consumed / calories.target : 0
  const isSelectedToday = selectedDate === getDateValue()
  const greetingText = userName ? `欢迎回来，${userName}` : '欢迎使用 AI燃脂'
  const overviewCards = [
    {
      label: '手动记录',
      value: `${manualCount} 条`,
      hint: loading ? '正在同步数据库' : '已同步数据库'
    },
    {
      label: '连续记录',
      value: '0 天',
      hint: '后续接入连续打卡'
    },
    {
      label: '能量币',
      value: `${dashboard?.wallet.coins ?? 0}`,
      hint: '可用于 AI 识别'
    }
  ]

  return (
    <View className='page-shell'>
      <View className='home-header'>
        <View className='home-header__profile'>
          <View className='home-header__avatar'>
            <Text>{userInitials}</Text>
          </View>
          <View>
            <Text className='home-header__greeting'>{greetingText}</Text>
            <Text className='home-header__subtext'>
              {loading ? '正在同步首页数据…' : '当前页面已经接入后端数据。'}
            </Text>
            {isLoggedIn && (
              <View className='home-header__logout' onClick={handleLogout}>
                退出登录
              </View>
            )}
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

      {shouldShowProfileNameEditor && (
        <View className='home-profile surface-card'>
          <View className='home-profile__copy'>
            <Text className='home-profile__title'>设置昵称</Text>
            <Text className='home-profile__hint'>可使用微信昵称，也可以自己填写。</Text>
          </View>
          <View className='home-profile__form'>
            <Input
              className='home-profile__input'
              type='nickname'
              value={profileNickname}
              placeholder='请输入昵称'
              maxlength={20}
              onInput={(event) => {
                setProfileNickname(String(event.detail.value || ''))
              }}
            />
            <Button
              className='home-profile__button'
              loading={profileSaving}
              onClick={handleSaveNickname}
            >
              保存
            </Button>
          </View>
        </View>
      )}

      <View className='home-hero surface-card'>
        <View className='home-hero__top'>
          <View>
            <Text className='home-hero__eyebrow'>今日热量预算</Text>
            <Text className='home-hero__title'>健康控制台</Text>
          </View>
          <Text className='badge-pro'>PRO</Text>
        </View>

        <View className='home-hero__ring'>
          <ProgressRing
            progress={progress}
            value={calories.remaining}
            unit='kcal'
            caption='今日还可摄入'
            hint={`${calories.consumed} / ${calories.target} kcal`}
          />
        </View>

        <View className='home-macros'>
          {macros.map((macro) => {
            const macroProgress =
              macro.target > 0 ? Math.min(macro.current / macro.target, 1) : 0

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
                      width: `${macroProgress > 0 ? Math.max(8, macroProgress * 100) : 0}%`,
                      background: toneMap[macro.tone]
                    }}
                  />
                </View>
              </View>
            )
          })}
        </View>
      </View>

      <View className='home-setup-nudge surface-card'>
        <View className='home-setup-nudge__content'>
          <View className='home-setup-nudge__info'>
            <Text className='home-setup-nudge__tag'>第一步</Text>
            <Text className='home-setup-nudge__title'>目标与身体数据</Text>
            <Text className='home-setup-nudge__desc'>
              完善身高、体重与活动量，为您精准计算每日热量缺口。
            </Text>
          </View>
          <Navigator
            className='home-setup-nudge__button'
            url='/pages/tdee-setup/index'
          >
            立即设置
          </Navigator>
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

      <View className='home-reward surface-card'>
        <View className='home-reward__copy'>
          <Text className='home-reward__tag'>每日奖励</Text>
          <Text className='home-reward__title'>能量币任务</Text>
          <Text className='home-reward__desc'>
            签到 +1 币；当天摄入达到目标热量后自动再得 +1 币。
          </Text>
          <Text className='home-reward__status'>
            {dashboard?.rewards.calorie_goal_awarded ? '今日热量达标奖励已领取' : '今日热量达标后自动发币'}
          </Text>
        </View>
        <View
          className={
            dashboard?.rewards.daily_sign_in_awarded || !isSelectedToday
              ? 'home-reward__button home-reward__button--done'
              : 'home-reward__button'
          }
          onClick={handleDailySignIn}
        >
          {!isSelectedToday ? '仅限今天' : dashboard?.rewards.daily_sign_in_awarded ? '已签到' : '签到领币'}
        </View>
      </View>

      <View className='home-manual surface-card'>
        <View className='home-manual__copy'>
          <Text className='home-manual__eyebrow'>手动新增模块</Text>
          <Text className='home-manual__title'>按包装上的营养表自行填写</Text>
          <Text className='home-manual__desc'>
            支持选择日期、餐次、热量和三大营养素。保存后会自动归到当天记录里，
            后续切换日期也能继续查看。
          </Text>
        </View>
        <Navigator
          className='primary-button home-manual__button'
          url={`/pages/manual-food/index?date=${selectedDate}`}
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
          <Navigator className='home-nav__item home-nav__item--full' url='/pages/wallet-center/index'>
            <Text className='home-nav__title'>钱包 / VIP</Text>
            <Text className='home-nav__desc'>查看能量币余额、充值档位和会员权益。</Text>
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
                  <View
                    className='home-meal__row'
                    key={`${meal.type}-${item.id || item.name}`}
                    onLongPress={() => {
                      const entryId = Number(item.id)
                      if (!entryId) return
                      // 从dashboard中查找对应的ai_session_id
                      const dashboardEntry = dashboard?.meals
                        .find(m => m.meal_type_label === meal.type)
                        ?.items.find(i => String(i.id) === item.id)
                      handleDeleteMealEntry(entryId, dashboardEntry?.ai_session_id ?? null)
                    }}
                  >
                    <View className='home-meal__icon' />
                    <View className='home-meal__content'>
                      <Text className='home-meal__name'>{item.name}</Text>
                      <Text className='home-meal__note'>{item.note}</Text>
                    </View>
                    <View className='home-meal__actions'>
                      <Text className='home-meal__kcal'>{item.calories} kcal</Text>
                      <View
                        className='home-meal__delete'
                        onClick={() => {
                          const entryId = Number(item.id)
                          if (!entryId) return
                          const dashboardEntry = dashboard?.meals
                            .find(m => m.meal_type_label === meal.type)
                            ?.items.find(i => String(i.id) === item.id)
                          handleDeleteMealEntry(entryId, dashboardEntry?.ai_session_id ?? null)
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
                  </View>
                ))}
              </View>
            ) : (
              <View className='home-meal__empty'>
                <Text className='home-meal__empty-title'>这一餐还没有记录</Text>
                <Text className='home-meal__empty-desc'>
                  可以继续使用 AI 识别，也可以手动按营养成分表补录。
                </Text>
                <View className='home-meal__empty-actions'>
                  <Navigator className='secondary-button' url='/pages/ai-preview/index'>
                    AI 识别
                  </Navigator>
                  <Navigator
                    className='primary-button'
                    url={`/pages/manual-food/index?date=${selectedDate}&mealType=${encodeURIComponent(
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

      <FloatingScanButton quotaLabel={`今日免费 ${dashboard?.quota.free_quota_remaining ?? 0} 次`} />
      {loginVisible && (
        <View className='home-login-mask'>
          <View className='home-login-panel'>
            <View className='home-login-panel__handle' />
            <Text className='home-login-panel__title'>登录后同步健康数据</Text>
            <Text className='home-login-panel__desc'>
              保存餐食记录、AI 识别结果、能量币和会员权益。
            </Text>

            <Button
              className='primary-button home-login-panel__button'
              loading={loginLoading}
              onClick={loginAndReload}
            >
              微信授权登录
            </Button>
          </View>
        </View>
      )}
    </View>
  )
}
