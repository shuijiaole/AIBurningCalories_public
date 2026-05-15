import { Navigator, Text, View } from '@tarojs/components'

import { FloatingScanButton } from '../../components/floating-scan-button'
import { ProgressRing } from '../../components/progress-ring'
import { dashboardData } from '../../mock/data'

import './index.scss'

const toneMap = {
  protein: 'var(--macro-protein)',
  carbs: 'var(--macro-carbs)',
  fat: 'var(--macro-fat)'
}

export default function DashboardPage() {
  const progress = dashboardData.calories.consumed / dashboardData.calories.target

  return (
    <View className='dashboard-page page-shell'>
      <View className='ambient-blob ambient-blob--green' />
      <View className='ambient-blob ambient-blob--blue' />

      <View className='dashboard-header'>
        <View className='dashboard-header__profile'>
          <View className='dashboard-header__avatar'>
            <Text>{dashboardData.user.initials}</Text>
          </View>
          <View>
            <Text className='dashboard-header__greeting'>
              {dashboardData.user.greeting}，{dashboardData.user.name}
            </Text>
            <Text className='dashboard-header__subtext'>
              继续把今天吃得清楚，也吃得轻松
            </Text>
          </View>
        </View>

        <View className='dashboard-header__date'>
          <Text className='dashboard-header__date-top'>日期</Text>
          <Text className='dashboard-header__date-bottom'>
            {dashboardData.user.dayLabel}
          </Text>
        </View>
      </View>

      <View className='dashboard-hero surface-card'>
        <View className='dashboard-hero__top'>
          <View>
            <Text className='dashboard-hero__eyebrow'>今日卡路里预算</Text>
            <Text className='dashboard-hero__title'>健康控制台</Text>
          </View>
          <Text className='badge-pro'>PRO</Text>
        </View>

        <View className='dashboard-hero__ring'>
          <ProgressRing
            progress={progress}
            value={dashboardData.calories.remaining}
            unit='千卡'
            caption='今日还可摄入'
            hint={`${dashboardData.calories.consumed} / ${dashboardData.calories.target} kcal`}
          />
        </View>

        <View className='dashboard-macros'>
          {dashboardData.macros.map((macro) => {
            const macroProgress = Math.min(macro.current / macro.target, 1)

            return (
              <View className='dashboard-macros__item' key={macro.key}>
                <View className='dashboard-macros__label-row'>
                  <Text className='dashboard-macros__label'>{macro.label}</Text>
                  <Text className='dashboard-macros__value'>
                    {macro.current}/{macro.target}
                    {macro.unit}
                  </Text>
                </View>
                <View className='dashboard-macros__track'>
                  <View
                    className='dashboard-macros__fill'
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

      <View className='dashboard-overview'>
        {dashboardData.overview.map((item) => (
          <View className='dashboard-overview__card surface-card' key={item.label}>
            <Text className='dashboard-overview__label'>{item.label}</Text>
            <Text className='dashboard-overview__value'>{item.value}</Text>
            <Text className='dashboard-overview__hint'>{item.hint}</Text>
          </View>
        ))}
      </View>

      <View className='dashboard-nav surface-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>快速入口</Text>
          <Text className='section-heading__hint'>页面原型</Text>
        </View>
        <View className='dashboard-nav__grid'>
          <Navigator className='dashboard-nav__item' url='/pages/onboarding/index'>
            <Text className='dashboard-nav__title'>TDEE 设置</Text>
            <Text className='dashboard-nav__desc'>完善资料，实时看到目标热量</Text>
          </Navigator>
          <Navigator className='dashboard-nav__item' url='/pages/wallet/index'>
            <Text className='dashboard-nav__title'>钱包 / VIP</Text>
            <Text className='dashboard-nav__desc'>查看能量币余额和会员权益</Text>
          </Navigator>
        </View>
      </View>

      <View className='dashboard-meals'>
        <View className='section-heading'>
          <Text className='section-heading__title'>饮食记录</Text>
          <Text className='section-heading__hint'>早餐 / 午餐 / 晚餐 / 加餐</Text>
        </View>

        {dashboardData.meals.map((meal) => (
          <View className='dashboard-meal surface-card' key={meal.type}>
            <View className='dashboard-meal__header'>
              <View>
                <Text className='dashboard-meal__title'>{meal.type}</Text>
                <Text className='dashboard-meal__time'>{meal.timeRange}</Text>
              </View>
              <Text className='dashboard-meal__calories'>
                {meal.filled ? `${meal.totalCalories} kcal` : '待记录'}
              </Text>
            </View>

            {meal.filled ? (
              <View className='dashboard-meal__items'>
                {meal.items.map((item) => (
                  <View className='dashboard-meal__row' key={`${meal.type}-${item.name}`}>
                    <View className='dashboard-meal__icon' />
                    <View className='dashboard-meal__content'>
                      <Text className='dashboard-meal__name'>{item.name}</Text>
                      <Text className='dashboard-meal__note'>{item.note}</Text>
                    </View>
                    <Text className='dashboard-meal__kcal'>{item.calories} kcal</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Navigator className='dashboard-meal__empty' url='/pages/ai-result/index'>
                <Text className='dashboard-meal__empty-title'>点击添加</Text>
                <Text className='dashboard-meal__empty-desc'>
                  第一个饮食记录，交给 AI 吧
                </Text>
              </Navigator>
            )}
          </View>
        ))}
      </View>

      <FloatingScanButton quotaLabel={`今日免费 ${dashboardData.user.freeQuota} 次`} />
    </View>
  )
}
