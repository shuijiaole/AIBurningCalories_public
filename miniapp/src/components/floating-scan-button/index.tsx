import Taro from '@tarojs/taro'
import { Text, View } from '@tarojs/components'

import './index.scss'

type FloatingScanButtonProps = {
  quotaLabel: string
}

export function FloatingScanButton(props: FloatingScanButtonProps) {
  const { quotaLabel } = props

  const handleClick = () => {
    Taro.navigateTo({
      url: '/pages/ai-preview/index'
    })
  }

  return (
    <View className='floating-scan'>
      <Text className='floating-scan__quota'>{quotaLabel}</Text>
      <View className='floating-scan__action' onClick={handleClick}>
        <View className='floating-scan__ring floating-scan__ring--outer' />
        <View className='floating-scan__ring floating-scan__ring--inner' />
        <View className='floating-scan__lens'>
          <View className='floating-scan__dot' />
        </View>
      </View>
    </View>
  )
}
