import { useEffect, useState } from 'react'

import Taro from '@tarojs/taro'
import { Button, Image, Text, View } from '@tarojs/components'

import appIcon from '../../assets/brand/app-icon.png'
import { ensureUserSession, hasCachedUserSession } from '../../services/backend'

import './index.scss'

export default function LoginPage() {
  const [loading, setLoading] = useState(false)

  const enterHome = () => {
    Taro.redirectTo({
      url: '/pages/home-ui/index'
    })
  }

  useEffect(() => {
    if (hasCachedUserSession()) {
      enterHome()
    }
  }, [])

  const handleLogin = async () => {
    if (loading) {
      return
    }

    setLoading(true)
    try {
      await ensureUserSession()
      Taro.showToast({
        title: '登录成功',
        icon: 'success'
      })
      enterHome()
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '登录失败，请稍后重试',
        icon: 'none'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='login-card'>
        <Image className='login-card__icon' src={appIcon} mode='aspectFill' />
        <Text className='login-card__title'>AI燃脂</Text>
        <Text className='login-card__subtitle'>记录饮食、管理热量，让每天的健康进度更清楚。</Text>

        <View className='login-card__features'>
          <View className='login-feature'>
            <Text className='login-feature__dot login-feature__dot--blue' />
            <Text className='login-feature__text'>同步你的专属饮食与热量数据</Text>
          </View>
          <View className='login-feature'>
            <Text className='login-feature__dot login-feature__dot--orange' />
            <Text className='login-feature__text'>保存 AI 识别记录和手动餐食</Text>
          </View>
          <View className='login-feature'>
            <Text className='login-feature__dot login-feature__dot--green' />
            <Text className='login-feature__text'>管理能量币、会员权益和每日额度</Text>
          </View>
        </View>
      </View>

      <View className='login-actions'>
        <Button className='primary-button login-actions__button' loading={loading} onClick={handleLogin}>
          微信快捷登录
        </Button>
        <Text className='login-actions__hint'>登录即表示你同意使用微信身份创建并保存账号数据</Text>
      </View>
    </View>
  )
}
