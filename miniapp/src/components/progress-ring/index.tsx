import { Text, View } from '@tarojs/components'

import './index.scss'

type ProgressRingProps = {
  progress: number
  value: number
  unit: string
  caption: string
  hint: string
}

function resolveColor(progress: number) {
  if (progress > 1) {
    return 'var(--error)'
  }

  if (progress >= 0.8) {
    return 'var(--warning)'
  }

  return 'var(--primary)'
}

export function ProgressRing(props: ProgressRingProps) {
  const { progress, value, unit, caption, hint } = props
  const normalized = Math.max(0, Math.min(progress, 1.2))
  const color = resolveColor(progress)
  const degree = `${normalized * 360}deg`

  return (
    <View
      className='progress-ring'
      style={{
        background: `conic-gradient(${color} ${degree}, rgba(229, 231, 235, 0.92) ${degree} 360deg)`
      }}
    >
      <View className='progress-ring__core'>
        <Text className='progress-ring__caption'>{caption}</Text>
        <Text className='progress-ring__value'>{value}</Text>
        <Text className='progress-ring__unit'>{unit}</Text>
        <Text className='progress-ring__hint'>{hint}</Text>
      </View>
    </View>
  )
}
