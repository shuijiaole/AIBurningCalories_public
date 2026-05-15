import { useState } from 'react'

import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'

import { walletData } from '../../mock/app-data'

import './index.scss'

export default function WalletPage() {
  const [selectedCoins, setSelectedCoins] = useState(200)

  const handleRecharge = () => {
    Taro.showToast({
      title: `已选 ${selectedCoins} 币充值包`,
      icon: 'none'
    })
  }

  const handleVip = () => {
    Taro.showToast({
      title: 'VIP 页面原型已就绪',
      icon: 'none'
    })
  }

  return (
    <View className='wallet-page page-shell'>
      <View className='wallet-balance surface-card'>
        <Text className='wallet-balance__eyebrow'>资产总览</Text>
        <Text className='wallet-balance__title'>能量币余额 {walletData.balance} 币</Text>
        <Text className='wallet-balance__sub'>
          本月已经使用 {walletData.monthlyUse} 币，当前余额仍可支持多次 AI 识别
        </Text>

        <View className='wallet-balance__stats'>
          <View className='wallet-balance__stat'>
            <Text className='wallet-balance__stat-label'>会员状态</Text>
            <Text className='wallet-balance__stat-value'>普通用户</Text>
          </View>
          <View className='wallet-balance__stat'>
            <Text className='wallet-balance__stat-label'>今日免费</Text>
            <Text className='wallet-balance__stat-value'>1 次</Text>
          </View>
        </View>
      </View>

      <View className='surface-card wallet-recharge'>
        <View className='section-heading'>
          <Text className='section-heading__title'>能量币充值</Text>
          <Text className='section-heading__hint'>1 元 = 10 币</Text>
        </View>

        <View className='wallet-recharge__grid'>
          {walletData.rechargeOptions.map((option) => (
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
                {option.bonus > 0 ? `额外赠送 ${option.bonus} 币` : '标准包'}
              </Text>
            </View>
          ))}
        </View>

        <View className='primary-button wallet-recharge__button' onClick={handleRecharge}>
          立即充值
        </View>
      </View>

      <View className='wallet-vip surface-card'>
        <View className='wallet-vip__glow' />
        <Text className='wallet-vip__badge'>VIP HERO CARD</Text>
        <Text className='wallet-vip__title'>开通 VIP，无限次拍照识别</Text>
        <Text className='wallet-vip__sub'>
          {walletData.vipDiscount} · 当前价格 {walletData.vipPrice}
        </Text>

        <View className='wallet-vip__benefits'>
          {walletData.benefits.map((benefit) => (
            <View className='wallet-vip__benefit' key={benefit}>
              <View className='wallet-vip__check' />
              <Text className='wallet-vip__benefit-text'>{benefit}</Text>
            </View>
          ))}
        </View>

        <View className='wallet-vip__actions'>
          <View className='secondary-button wallet-vip__secondary'>先看看权益</View>
          <View className='primary-button wallet-vip__primary' onClick={handleVip}>
            开通 VIP
          </View>
        </View>
      </View>

      <View className='surface-card wallet-history'>
        <View className='section-heading'>
          <Text className='section-heading__title'>最近账单</Text>
          <Text className='section-heading__hint'>最近 3 条</Text>
        </View>

        {walletData.transactions.map((transaction) => (
          <View className='wallet-history__row' key={`${transaction.title}-${transaction.time}`}>
            <View className='wallet-history__icon' />
            <View className='wallet-history__content'>
              <Text className='wallet-history__title'>{transaction.title}</Text>
              <Text className='wallet-history__time'>{transaction.time}</Text>
            </View>
            <Text
              className={
                transaction.delta.startsWith('+')
                  ? 'wallet-history__delta wallet-history__delta--positive'
                  : 'wallet-history__delta wallet-history__delta--negative'
              }
            >
              {transaction.delta}
            </Text>
          </View>
        ))}
      </View>
    </View>
  )
}
