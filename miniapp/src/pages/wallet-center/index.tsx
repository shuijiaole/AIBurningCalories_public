import { useEffect, useState } from 'react'

import Taro from '@tarojs/taro'
import { Navigator, Text, View } from '@tarojs/components'

import {
  fetchDailyQuota,
  fetchMembershipPlans,
  fetchRechargePackages,
  fetchWalletOverview,
  type DailyQuotaResponse,
  type MembershipPlanResponse,
  type RechargePackageResponse,
  type WalletOverviewResponse
} from '../../services/backend'
import { getDateValue } from '../../utils/date-v2'

import '../wallet/index.scss'

export default function WalletCenterPage() {
  const [selectedCoins, setSelectedCoins] = useState<number | null>(null)
  const [overview, setOverview] = useState<WalletOverviewResponse | null>(null)
  const [quota, setQuota] = useState<DailyQuotaResponse | null>(null)
  const [rechargePackages, setRechargePackages] = useState<RechargePackageResponse[]>([])
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlanResponse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadWalletData = async () => {
      setLoading(true)

      try {
        const [nextOverview, nextQuota] = await Promise.all([
          fetchWalletOverview(),
          fetchDailyQuota(getDateValue())
        ])
        const [nextRechargePackages, nextMembershipPlans] = await Promise.all([
          fetchRechargePackages(),
          fetchMembershipPlans()
        ])

        setOverview(nextOverview)
        setQuota(nextQuota)
        setRechargePackages(nextRechargePackages)
        setMembershipPlans(nextMembershipPlans)
      } catch (error) {
        Taro.showToast({
          title: error instanceof Error ? error.message : '钱包加载失败',
          icon: 'none'
        })
      } finally {
        setLoading(false)
      }
    }

    void loadWalletData()
  }, [])

  const transactions = overview?.transactions ?? []
  const membershipText = overview?.membership?.plan_name || '未开通'
  const rechargeOptions = rechargePackages.map((item) => ({
    coins: item.coins,
    price: item.price_cny,
    bonus: item.bonus_coins
  }))
  const primaryMembershipPlan = membershipPlans[0] || null

  const handleRecharge = () => {
    if (selectedCoins === null) {
      Taro.showToast({
        title: '暂无可用充值方案',
        icon: 'none'
      })
      return
    }

    Taro.showToast({
      title: `已选 ${selectedCoins} 币充值包`,
      icon: 'none'
    })
  }

  const handleVip = () => {
    Taro.showToast({
      title: 'VIP 页面当前还是原型',
      icon: 'none'
    })
  }

  return (
    <View className='wallet-page page-shell'>
      <View className='wallet-balance surface-card'>
        <Text className='wallet-balance__eyebrow'>资产总览</Text>
        <Text className='wallet-balance__title'>能量币余额 {overview?.balance ?? 0} 币</Text>
        <Text className='wallet-balance__sub'>
          {loading ? '正在同步钱包数据。' : `本月已经使用 ${overview?.monthly_spent ?? 0} 币。`}
        </Text>

        <View className='wallet-balance__stats'>
          <View className='wallet-balance__stat'>
            <Text className='wallet-balance__stat-label'>会员状态</Text>
            <Text className='wallet-balance__stat-value'>{membershipText}</Text>
          </View>
          <View className='wallet-balance__stat'>
            <Text className='wallet-balance__stat-label'>今日免费</Text>
            <Text className='wallet-balance__stat-value'>
              {quota?.free_quota_remaining ?? 0} 次
            </Text>
          </View>
        </View>
      </View>

      <View className='surface-card wallet-recharge'>
        <View className='section-heading'>
          <Text className='section-heading__title'>能量币充值</Text>
          <Text className='section-heading__hint'>1 元 = 10 币</Text>
        </View>

        {rechargeOptions.length > 0 ? (
          <>
            <View className='wallet-recharge__grid'>
              {rechargeOptions.map((option) => (
                <View
                  className={
                    option.coins === selectedCoins
                      ? 'wallet-recharge__item wallet-recharge__item--active'
                      : 'wallet-recharge__item'
                  }
                  key={option.coins}
                  onClick={() => setSelectedCoins(option.coins)}
                >
                  <Text className='wallet-recharge__coins'>{option.coins} 币</Text>
                  <Text className='wallet-recharge__price'>¥{option.price}</Text>
                  <Text className='wallet-recharge__bonus'>
                    {option.bonus > 0 ? `额外赠送 ${option.bonus} 币` : '标准充值包'}
                  </Text>
                </View>
              ))}
            </View>

            <View className='primary-button wallet-recharge__button' onClick={handleRecharge}>
              立即充值
            </View>
          </>
        ) : (
          <View className='wallet-history__row'>
            <View className='wallet-history__content'>
              <Text className='wallet-history__title'>暂无充值方案</Text>
              <Text className='wallet-history__time'>后续接入真实定价后展示</Text>
            </View>
          </View>
        )}
      </View>

      <View className='wallet-vip surface-card'>
        <View className='wallet-vip__glow' />
        <Text className='wallet-vip__badge'>VIP HERO CARD</Text>
        <Text className='wallet-vip__title'>开通 VIP，无限次拍照识别</Text>
        <Text className='wallet-vip__sub'>
          {overview?.membership
            ? '当前会员已开通'
            : primaryMembershipPlan?.description || '会员套餐已接入'} · 当前价格{' '}
          {primaryMembershipPlan ? `¥${primaryMembershipPlan.price_cny}` : '--'}
        </Text>

        <View className='wallet-vip__benefits'>
          {overview?.membership ? (
            [
              `会员方案：${overview.membership.plan_name}`,
              `有效期至：${overview.membership.expires_at || '--'}`
            ].map((benefit) => (
              <View className='wallet-vip__benefit' key={benefit}>
                <View className='wallet-vip__check' />
                <Text className='wallet-vip__benefit-text'>{benefit}</Text>
              </View>
            ))
          ) : primaryMembershipPlan ? (
            [
              `方案名称：${primaryMembershipPlan.plan_name}`,
              `有效期：${primaryMembershipPlan.duration_days} 天`,
              primaryMembershipPlan.description || '无限次拍照识别'
            ].map((benefit) => (
              <View className='wallet-vip__benefit' key={benefit}>
                <View className='wallet-vip__check' />
                <Text className='wallet-vip__benefit-text'>{benefit}</Text>
              </View>
            ))
          ) : (
            <View className='wallet-vip__benefit'>
              <Text className='wallet-vip__benefit-text'>暂无会员权益数据</Text>
            </View>
          )}
        </View>

        <View className='wallet-vip__actions'>
          <View className='secondary-button wallet-vip__secondary'>先看看权益</View>
          <View className='primary-button wallet-vip__primary' onClick={handleVip}>
            开通 VIP
          </View>
        </View>
      </View>

      <Navigator className='wallet-feature surface-card' url='/pages/muscle-boost/index'>
        <View className='wallet-feature__content'>
          <Text className='wallet-feature__badge'>会员模式</Text>
          <Text className='wallet-feature__title'>变大变强</Text>
          <Text className='wallet-feature__desc'>
            上传肌肉相关照片，自动识别肩背胸臂并增强横向视觉。
          </Text>
          <Text className='wallet-feature__meta'>
            {overview?.membership ? '会员每日 1 次免费' : '未开通会员时按次消耗能量币'}
          </Text>
        </View>
        <View className='wallet-feature__cta'>立即体验</View>
      </Navigator>

      <View className='surface-card wallet-history'>
        <View className='section-heading'>
          <Text className='section-heading__title'>最近账单</Text>
          <Text className='section-heading__hint'>最近 3 条</Text>
        </View>

        {transactions.length > 0 ? (
          transactions.slice(0, 3).map((transaction) => (
            <View className='wallet-history__row' key={`${transaction.id}-${transaction.created_at}`}>
              <View className='wallet-history__icon' />
              <View className='wallet-history__content'>
                <Text className='wallet-history__title'>
                  {transaction.remark || transaction.biz_type}
                </Text>
                <Text className='wallet-history__time'>{transaction.created_at}</Text>
              </View>
              <Text
                className={
                  transaction.coins_delta >= 0
                    ? 'wallet-history__delta wallet-history__delta--positive'
                    : 'wallet-history__delta wallet-history__delta--negative'
                }
              >
                {transaction.coins_delta > 0 ? '+' : ''}
                {transaction.coins_delta}
              </Text>
            </View>
          ))
        ) : (
          <View className='wallet-history__row'>
            <View className='wallet-history__content'>
              <Text className='wallet-history__title'>暂无流水记录</Text>
              <Text className='wallet-history__time'>接入真实账单后在这里展示</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}
