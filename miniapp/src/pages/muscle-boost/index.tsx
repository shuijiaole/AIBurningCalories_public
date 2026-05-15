import { useEffect, useRef, useState } from 'react'

import Taro from '@tarojs/taro'
import { Image, ScrollView, Text, View } from '@tarojs/components'

import {
  createMuscleBoostJob,
  deleteMuscleBoostJob,
  fetchMuscleBoostOverview,
  type MuscleBoostJobResponse,
  type MuscleBoostOverviewResponse
} from '../../services/backend'
import { getDateValue } from '../../utils/date-v2'

import './index.scss'

const focusLabelMap: Record<string, string> = {
  shoulders: '肩宽',
  chest: '胸廓',
  arms: '手臂',
  back: '背阔'
}

type ProcessingState = 'idle' | 'uploading' | 'waiting'

export default function MuscleBoostPage() {
  const [today] = useState(getDateValue())
  const [overview, setOverview] = useState<MuscleBoostOverviewResponse | null>(null)
  const [activeJob, setActiveJob] = useState<MuscleBoostJobResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [processingState, setProcessingState] = useState<ProcessingState>('idle')
  const [saving, setSaving] = useState(false)
  const [promptType, setPromptType] = useState<'natural' | 'fitness'>('natural')
  const pollingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const baseJobNoRef = useRef<string | null>(null)
  const completedByPollingRef = useRef(false)

  const stopPolling = () => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
    }
  }

  const applyFinishedJob = (
    nextOverview: MuscleBoostOverviewResponse,
    job: MuscleBoostJobResponse,
    toastTitle = '图片已生成'
  ) => {
    setOverview(nextOverview)
    setActiveJob(job)
    setSubmitting(false)
    setProcessingState('idle')
    completedByPollingRef.current = true
    stopPolling()
    Taro.showToast({ title: toastTitle, icon: 'success' })
  }

  const loadOverview = async (preferLatest = false) => {
    const nextOverview = await fetchMuscleBoostOverview(today)
    setOverview(nextOverview)
    setActiveJob((current) => {
      if (preferLatest) {
        return nextOverview.recent_jobs[0] || current
      }
      return current || nextOverview.recent_jobs[0] || null
    })
    return nextOverview
  }

  useEffect(() => {
    const init = async () => {
      setLoading(true)

      try {
        await loadOverview()
      } catch (error) {
        Taro.showToast({
          title: error instanceof Error ? error.message : '会员能力加载失败',
          icon: 'none'
        })
      } finally {
        setLoading(false)
      }
    }

    void init()

    return () => {
      stopPolling()
    }
  }, [today])

  const startResultPolling = () => {
    stopPolling()
    pollingTimerRef.current = setInterval(() => {
      void (async () => {
        try {
          const nextOverview = await fetchMuscleBoostOverview(today)
          const latestJob = nextOverview.recent_jobs[0]
          setOverview(nextOverview)

          if (
            latestJob?.status === 'success' &&
            latestJob.result_image_url &&
            latestJob.job_no !== baseJobNoRef.current
          ) {
            applyFinishedJob(nextOverview, latestJob)
          }
        } catch {
          // Keep the local processing state visible while the network is unstable.
        }
      })()
    }, 5000)
  }

  const handleCreate = async () => {
    if (submitting) return

    try {
      const chooseResult = await Taro.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera']
      })
      const filePath = chooseResult.tempFilePaths[0]

      if (!filePath) {
        throw new Error('没有选择图片')
      }

      baseJobNoRef.current = overview?.recent_jobs[0]?.job_no ?? null
      completedByPollingRef.current = false
      setSubmitting(true)
      setProcessingState('uploading')
      startResultPolling()

      const created = await createMuscleBoostJob({
        filePath,
        useDate: today,
        sourceType: 'camera',
        promptType
      })

      if (completedByPollingRef.current) {
        return
      }

      const nextOverview = await loadOverview(true)
      const latestJob =
        nextOverview.recent_jobs.find((job) => job.job_no === created.job.job_no) ||
        created.job

      applyFinishedJob(
        {
          ...nextOverview,
          membership_active: created.membership_active,
          quota: created.quota
        },
        latestJob,
        created.coin_cost > 0 ? `图片已生成，扣除 ${created.coin_cost} 币` : '图片已生成'
      )
    } catch (error) {
      if (completedByPollingRef.current) {
        return
      }

      const message = error instanceof Error ? error.message : '图片增强失败'
      const normalizedMessage = message.toLowerCase()
      const maybeStillProcessing =
        normalizedMessage.includes('timeout') ||
        normalizedMessage.includes('超时') ||
        normalizedMessage.includes('uploadfile:fail') ||
        message.includes('结果可能已生成') ||
        message.includes('閲嶆柊杩涘叆')

      if (maybeStillProcessing) {
        setProcessingState('waiting')
        Taro.showToast({
          title: '仍在后台生成，完成后会自动显示',
          icon: 'none'
        })
        return
      }

      setSubmitting(false)
      setProcessingState('idle')
      stopPolling()
      Taro.showToast({
        title: message,
        icon: 'none'
      })
    }
  }

  const handlePreview = (job: MuscleBoostJobResponse) => {
    if (!job.result_image_url) {
      Taro.showToast({
        title: '暂无可预览图片',
        icon: 'none'
      })
      return
    }

    Taro.previewImage({
      current: job.result_image_url,
      urls: [job.result_image_url]
    })
  }

  const handleSave = async () => {
    if (!activeJob?.result_image_url) {
      Taro.showToast({
        title: '暂无可保存结果',
        icon: 'none'
      })
      return
    }

    try {
      setSaving(true)
      const downloadResult = await Taro.downloadFile({
        url: activeJob.result_image_url
      })

      await Taro.saveImageToPhotosAlbum({
        filePath: downloadResult.tempFilePath
      })

      Taro.showToast({
        title: '已保存到相册',
        icon: 'success'
      })
    } catch (error) {
      Taro.showToast({
        title: error instanceof Error ? error.message : '保存失败，请检查相册权限',
        icon: 'none'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteJob = async (jobId: number) => {
    try {
      const { confirm } = await Taro.showModal({
        title: '确认删除',
        content: '确定要删除这张变大变强结果吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#ff4d4f'
      })

      if (!confirm) return

      Taro.showLoading({ title: '删除中...' })
      await deleteMuscleBoostJob(jobId)
      Taro.hideLoading()
      Taro.showToast({ title: '删除成功', icon: 'success' })

      if (activeJob?.id === jobId) {
        setActiveJob(null)
      }

      await loadOverview(true)
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

  const focusLabels =
    activeJob?.enhancement_focus.map((item) => focusLabelMap[item] || item) ?? []
  const processingTitle =
    processingState === 'waiting' ? '图片还在后台生成' : '正在生成增强图片'

  return (
    <View className='muscle-page page-shell'>
      <View className='muscle-hero surface-card'>
        <Text className='muscle-hero__badge'>会员模式</Text>
        <Text className='muscle-hero__title'>变大变强</Text>
        <Text className='muscle-hero__desc'>
          上传肌肉相关照片，系统会先识别是不是健身展示图，再自动增强肩背胸臂的横向视觉。
        </Text>

        <View className='muscle-hero__stats'>
          <View className='muscle-hero__stat'>
            <Text className='muscle-hero__stat-label'>今日免费</Text>
            <Text className='muscle-hero__stat-value'>
              {overview?.quota.free_quota_remaining ?? 0} 次
            </Text>
          </View>
          <View className='muscle-hero__stat'>
            <Text className='muscle-hero__stat-label'>非免费消耗</Text>
            <Text className='muscle-hero__stat-value'>{overview?.coin_cost ?? 12} 币</Text>
          </View>
        </View>
      </View>

      <View className='muscle-panel surface-card'>
        <View className='muscle-panel__top'>
          <View>
            <Text className='muscle-panel__eyebrow'>上传即处理</Text>
            <Text className='muscle-panel__title'>
              {loading ? '正在同步会员能力' : overview?.feature_name || '变大变强'}
            </Text>
          </View>
          <Text className='muscle-panel__hint'>
            {overview?.membership_active
              ? `当前会员：${overview.membership_plan_name || '已开通'}`
              : '当前未开通会员，超出免费次数会消耗能量币'}
          </Text>
        </View>

        <View className='muscle-style-selector'>
          <Text className='muscle-style-selector__label'>增强风格</Text>
          <View className='muscle-styles'>
            <View
              className={`muscle-style ${promptType === 'natural' ? 'is-active' : ''}`}
              onClick={() => setPromptType('natural')}
            >
              <Text className='muscle-style__name'>自然</Text>
              <Text className='muscle-style__desc'>细化线条，克制增强</Text>
            </View>
            <View
              className={`muscle-style ${promptType === 'fitness' ? 'is-active' : ''}`}
              onClick={() => setPromptType('fitness')}
            >
              <Text className='muscle-style__name'>健美</Text>
              <Text className='muscle-style__desc'>极致围度，震撼视觉</Text>
            </View>
          </View>
        </View>

        <View className='muscle-panel__actions'>
          <View className={`primary-button ${submitting ? 'is-disabled' : ''}`} onClick={handleCreate}>
            {submitting ? '生成中...' : '上传肌肉照片'}
          </View>
          <View className='secondary-button' onClick={handleSave}>
            {saving ? '保存中...' : '保存下载结果'}
          </View>
        </View>

        {submitting ? (
          <View className='muscle-processing'>
            <View className='muscle-processing__spinner' />
            <Text className='muscle-processing__title'>{processingTitle}</Text>
            <Text className='muscle-processing__desc'>
              生成通常需要几十秒。你可以退出当前页面，处理完成后再次进入会显示最新图片。
            </Text>
            <Text className='muscle-processing__status'>
              {processingState === 'waiting'
                ? '手机请求已断开，正在继续帮你刷新结果...'
                : '正在上传并处理，请保持网络可用...'}
            </Text>
          </View>
        ) : activeJob?.result_image_url ? (
          <View className='muscle-result'>
            <View className='muscle-result__grid'>
              <View className='muscle-result__card'>
                <Text className='muscle-result__label'>原图</Text>
                <Image
                  className='muscle-result__image'
                  src={activeJob.source_image_url || ''}
                  mode='aspectFill'
                  onClick={() => handlePreview(activeJob)}
                />
              </View>
              <View className='muscle-result__card'>
                <Text className='muscle-result__label'>增强后</Text>
                <Image
                  className='muscle-result__image'
                  src={activeJob.result_image_url}
                  mode='aspectFill'
                  onClick={() => handlePreview(activeJob)}
                />
              </View>
            </View>

            <View className='muscle-result__summary'>
              <Text className='muscle-result__summary-title'>图片已生成</Text>
              <Text className='muscle-result__summary-text'>{activeJob.subtitle}</Text>
              <View className='muscle-tags'>
                {focusLabels.map((label) => (
                  <Text className='muscle-tag' key={label}>
                    {label}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View className='muscle-empty'>
            <Text className='muscle-empty__title'>还没有处理结果</Text>
            <Text className='muscle-empty__desc'>
              直接上传肌肉相关图片即可，不用写提示词。处理完成后这里会展示对比图，并支持保存下载。
            </Text>
          </View>
        )}
      </View>

      <View className='muscle-history surface-card'>
        <View className='section-heading'>
          <Text className='section-heading__title'>最近结果</Text>
          <Text className='section-heading__hint'>保留最近 6 次</Text>
        </View>

        <ScrollView className='muscle-history__list' scrollX>
          {(overview?.recent_jobs ?? []).map((job) => (
            <View
              className='muscle-history__item'
              key={job.job_no}
              onClick={() => setActiveJob(job)}
            >
              <View className='muscle-history__item-wrapper'>
                <Image
                  className='muscle-history__thumb'
                  src={job.result_image_url || job.source_image_url || ''}
                  mode='aspectFill'
                />
                <View
                  className='muscle-history__delete'
                  onClick={(event) => {
                    event.stopPropagation()
                    void handleDeleteJob(job.id)
                  }}
                >
                  x
                </View>
              </View>
              <Text className='muscle-history__title'>{job.title || '变大变强'}</Text>
              <Text className='muscle-history__meta'>
                {job.is_membership_free ? '会员免费' : `${job.coin_cost} 币`} · {job.created_at}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  )
}
