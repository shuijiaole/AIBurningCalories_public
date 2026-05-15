import Taro from '@tarojs/taro'
import { API_CONFIG } from '../env-config'

import { mealTypeOptions, mealTimeRanges, type MealType } from '../mock/app-data-v2'

const STORAGE_KEYS = {
  apiBaseUrl: 'fitcalorie-api-base-url',
  userId: 'fitcalorie-user-id',
  userInfo: 'fitcalorie-user-info'
} as const

const DEFAULT_API_BASE_URL = API_CONFIG.apiBaseUrl

type RuntimeAppConfig = {
  apiBaseUrl?: string
}

const mealTypeMap: Record<MealType, 'breakfast' | 'lunch' | 'dinner' | 'snack'> = {
  早餐: 'breakfast',
  午餐: 'lunch',
  晚餐: 'dinner',
  加餐: 'snack'
}

const reverseMealTypeMap: Record<'breakfast' | 'lunch' | 'dinner' | 'snack', MealType> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

type ApiEnvelope<T> = {
  code: number
  message: string
  data: T
}

type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

type CachedUserInfo = {
  user_id: number
  user: {
    wx_openid?: string | null
    unionid?: string | null
    nickname?: string | null
    avatar_url?: string | null
    gender?: string | null
  }
}

const TEST_USER = {
  wx_openid: 'fitcalorie-test-user',
  nickname: '测试用户'
} as const

function isWeappRuntime() {
  try {
    return Taro.getEnv() === Taro.ENV_TYPE.WEAPP
  } catch {
    return false
  }
}

export type DashboardMealItem = {
  id: number
  entry_source: 'manual' | 'ai'
  entry_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_type_label: MealType
  food_name: string
  brand: string | null
  serving_desc: string | null
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  note: string | null
  ai_session_id: number | null
  consumed_at: string | null
  created_at: string
  updated_at: string
}

export type DashboardResponse = {
  date: string
  calories: {
    target: number
    consumed: number
    remaining: number
  }
  macros: {
    protein: {
      current: number
      target: number
    }
    carbs: {
      current: number
      target: number
    }
    fat: {
      current: number
      target: number
    }
  }
  quota: {
    free_quota_total: number
    free_quota_used: number
    free_quota_remaining: number
    paid_scan_count: number
  }
  wallet: {
    coins: number
  }
  rewards: {
    daily_sign_in_awarded: boolean
    calorie_goal_awarded: boolean
  }
  meals: Array<{
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    meal_type_label: MealType
    item_count: number
    total_calories: number
    items: DashboardMealItem[]
  }>
}

export type GoalProfilePayload = {
  gender: 'male' | 'female'
  age: number
  height_cm: number
  weight_kg: number
  activity_level: number
  goal: 'cut' | 'maintain' | 'bulk'
  bmr: number
  tdee: number
  target_calories: number
  target_protein_g: number
  target_carbs_g: number
  target_fat_g: number
  effective_from: string
}

export type GoalProfileResponse = GoalProfilePayload & {
  id: number
  user_id: number
  is_active: number
  created_at: string
  updated_at: string
}

export type WalletOverviewResponse = {
  balance: number
  total_recharged: number
  total_bonus: number
  total_spent: number
  monthly_spent: number
  membership: {
    plan_name: string
    status: string
    started_at: string | null
    expires_at: string | null
  } | null
  transactions: Array<{
    id: number
    txn_type: string
    biz_type: string
    biz_id: number | null
    coins_delta: number
    balance_after: number
    amount_cny: number | null
    remark: string | null
    created_at: string
  }>
}

export type DailyQuotaResponse = {
  date: string
  free_quota_total: number
  free_quota_used: number
  free_quota_remaining: number
  paid_scan_count: number
}

export type DailyRewardsResponse = {
  date: string
  awarded?: boolean
  coins?: number
  balance?: number | null
  daily_sign_in_awarded: boolean
  calorie_goal_awarded: boolean
}

export type RechargePackageResponse = {
  id: number
  package_code: string
  package_name: string
  coins: number
  bonus_coins: number
  price_cny: number
  sort_no: number
}

export type MembershipPlanResponse = {
  id: number
  plan_code: string
  plan_name: string
  duration_days: number
  price_cny: number
  original_price_cny: number | null
  ai_scan_limit_per_day: number | null
  description: string | null
  sort_no: number
}

export type MuscleBoostJobResponse = {
  id: number
  job_no: string
  title: string
  subtitle: string
  source_image_url: string | null
  result_image_url: string | null
  status: 'pending' | 'success' | 'failed'
  enhancement_focus: string[]
  is_membership_free: boolean
  coin_cost: number
  created_at: string
}

export type MuscleBoostOverviewResponse = {
  feature_code: string
  feature_name: string
  membership_active: boolean
  membership_plan_name: string | null
  coin_cost: number
  quota: {
    date: string
    free_quota_total: number
    free_quota_used: number
    free_quota_remaining: number
    paid_use_count: number
  }
  recent_jobs: MuscleBoostJobResponse[]
}

export type MuscleBoostCreateResponse = {
  job: MuscleBoostJobResponse
  membership_active: boolean
  coin_cost: number
  image_meta: {
    width: number
    height: number
  }
  quota: {
    date: string
    free_quota_total: number
    free_quota_used: number
    free_quota_remaining: number
    paid_use_count: number
  }
}

export type ManualMealEntryPayload = {
  entry_date: string
  meal_type: MealType
  food_name: string
  brand: string
  serving_desc: string
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  note: string
}

export type ManualMealEntryResponse = {
  id: number
  entry_source: 'manual' | 'ai'
  entry_date: string
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  meal_type_label: MealType
  food_name: string
  brand: string | null
  serving_desc: string | null
  quantity: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  note: string | null
  ai_session_id: number | null
  consumed_at: string | null
  created_at: string
  updated_at: string
}

export type ManualFoodHistoryItem = {
  template_id: number
  food_name: string
  brand: string | null
  serving_desc: string | null
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  note: string | null
  last_used_at: string
}

export type AiDemoFoodResponse = {
  food_name: string
  unit_label: string | null
  base_calories: number
  base_protein_g: number
  base_carbs_g: number
  base_fat_g: number
  quantity: number
  sort_no: number
}

export type AiDemoScanResponse = {
  session_id: number
  session_no: string
  title: string
  subtitle: string
  quota: {
    free_quota_total: number
    free_quota_used: number
    free_quota_remaining: number
    coin_cost: number
  }
  foods: AiDemoFoodResponse[]
  total_calories: number
  total_protein_g: number
  total_carbs_g: number
  total_fat_g: number
}

function getApiBaseUrl() {
  if (typeof window !== 'undefined') {
    const runtimeConfig = (window as typeof window & {
      __AI_RANZHI_CONFIG__?: RuntimeAppConfig
    }).__AI_RANZHI_CONFIG__
    if (typeof runtimeConfig?.apiBaseUrl === 'string' && runtimeConfig.apiBaseUrl.trim()) {
      return runtimeConfig.apiBaseUrl.trim()
    }
  }

  try {
    // 优先使用代码中的 DEFAULT_API_BASE_URL (来自 API_CONFIG)
    // 只有当代码配置显式为空时，才尝试从存储中读取自定义地址
    let activeUrl = DEFAULT_API_BASE_URL

    const customBaseUrl = Taro.getStorageSync(STORAGE_KEYS.apiBaseUrl)
    if ((!activeUrl || !activeUrl.trim()) && typeof customBaseUrl === 'string' && customBaseUrl.trim()) {
      activeUrl = customBaseUrl.trim()
    }
    
    console.log('--- API Environment ---')
    console.log('Active Base URL:', activeUrl)
    console.log('-----------------------')
    
    return activeUrl
  } catch {
    return DEFAULT_API_BASE_URL
  }
}

function getApiOrigin() {
  return getApiBaseUrl().replace(/\/api\/?$/, '')
}

function resolveAssetUrl(value: string | null) {
  if (!value) {
    return null
  }
  if (/^https?:\/\//.test(value)) {
    return value
  }
  return `${getApiOrigin()}${value.startsWith('/') ? value : `/${value}`}`
}

function mapMuscleBoostJob(job: MuscleBoostJobResponse): MuscleBoostJobResponse {
  return {
    ...job,
    source_image_url: resolveAssetUrl(job.source_image_url),
    result_image_url: resolveAssetUrl(job.result_image_url)
  }
}

function getCachedUserId() {
  try {
    const value = Taro.getStorageSync(STORAGE_KEYS.userId)
    return typeof value === 'number' && value > 0 ? value : null
  } catch {
    return null
  }
}

export function getCachedUserInfo() {
  try {
    const cached = Taro.getStorageSync(STORAGE_KEYS.userInfo)
    return cached && typeof cached === 'object' ? (cached as CachedUserInfo) : null
  } catch {
    return null
  }
}

export function hasCachedUserSession() {
  const cachedUserId = getCachedUserId()
  const cachedOpenid = getCachedUserInfo()?.user?.wx_openid

  if (!cachedUserId || !cachedOpenid) {
    return false
  }

  return !isWeappRuntime() || cachedOpenid !== TEST_USER.wx_openid
}

function persistUserSession(payload: CachedUserInfo) {
  Taro.setStorageSync(STORAGE_KEYS.userId, payload.user_id)
  Taro.setStorageSync(STORAGE_KEYS.userInfo, payload)
}

export function clearUserSession() {
  Taro.removeStorageSync(STORAGE_KEYS.userId)
  Taro.removeStorageSync(STORAGE_KEYS.userInfo)
}

async function requestApi<T>(
  path: string,
  options: {
    method?: RequestMethod
    data?: Record<string, unknown>
  } = {}
) {
  const { method = 'GET', data } = options
  const url = `${getApiBaseUrl()}${path}`
  let response: Taro.request.SuccessCallbackResult<ApiEnvelope<T>>

  try {
    response = await Taro.request<ApiEnvelope<T>>({
      url,
      method,
      data,
      timeout: 8000,
      header: {
        'content-type': 'application/json'
      }
    })
  } catch (error) {
    const message =
      error && typeof error === 'object' && 'errMsg' in error
        ? String((error as { errMsg?: unknown }).errMsg)
        : error instanceof Error
          ? error.message
          : '网络请求失败'

    throw new Error(`${message}：${url}`)
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      typeof response.data === 'object' && response.data && 'detail' in response.data
        ? String(response.data.detail)
        : `请求失败：${response.statusCode}`
    )
  }

  if (!response.data || typeof response.data !== 'object') {
    throw new Error('接口返回格式异常')
  }

  if (response.data.code !== 0) {
    throw new Error(response.data.message || '接口请求失败')
  }

  return response.data.data
}

export async function ensureUserSession() {
  const cachedUserId = getCachedUserId()
  const cachedUserInfo = getCachedUserInfo()
  if (cachedUserId && cachedUserInfo?.user?.wx_openid && hasCachedUserSession()) {
    return cachedUserId
  }

  if (isWeappRuntime()) {
    const loginResult = await Taro.login()
    if (!loginResult.code) {
      throw new Error('微信登录失败，请稍后重试')
    }

    const loginPayload = await requestApi<CachedUserInfo>('/auth/weapp-login', {
      method: 'POST',
      data: {
        js_code: loginResult.code,
        nickname: null,
        avatar_url: null,
        gender: 'unknown'
      }
    })

    persistUserSession(loginPayload)
    return loginPayload.user_id
  }

  const loginPayload = await requestApi<CachedUserInfo>('/auth/weapp-login', {
    method: 'POST',
    data: {
      wx_openid: TEST_USER.wx_openid,
      unionid: null,
      nickname: TEST_USER.nickname,
      avatar_url: null,
      gender: 'unknown'
    }
  })

  persistUserSession(loginPayload)
  return loginPayload.user_id
}

export async function updateCurrentUserProfile(payload: {
  nickname?: string
  avatar_url?: string | null
}) {
  const userId = await ensureUserSession()
  const updatedProfile = await requestApi<CachedUserInfo>('/users/profile', {
    method: 'PUT',
    data: {
      user_id: userId,
      nickname: payload.nickname?.trim(),
      avatar_url: payload.avatar_url ?? null
    }
  })

  persistUserSession(updatedProfile)
  return updatedProfile
}

export async function fetchDashboard(date: string) {
  const userId = await ensureUserSession()
  return requestApi<DashboardResponse>(
    `/dashboard?user_id=${userId}&date=${encodeURIComponent(date)}`
  )
}

export async function fetchMealEntries(date: string) {
  const userId = await ensureUserSession()
  return requestApi<ManualMealEntryResponse[]>(
    `/meal-entries?user_id=${userId}&date=${encodeURIComponent(date)}`
  )
}

export async function createManualMealEntry(payload: ManualMealEntryPayload) {
  const userId = await ensureUserSession()
  return requestApi<ManualMealEntryResponse>('/meal-entries/manual', {
    method: 'POST',
    data: {
      user_id: userId,
      entry_date: payload.entry_date,
      meal_type: mealTypeMap[payload.meal_type],
      food_name: payload.food_name,
      brand: payload.brand || null,
      serving_desc: payload.serving_desc || null,
      quantity: payload.quantity,
      calories: payload.calories,
      protein_g: payload.protein_g,
      carbs_g: payload.carbs_g,
      fat_g: payload.fat_g,
      note: payload.note || null
    }
  })
}

export async function fetchManualFoodHistory(limit = 12) {
  const userId = await ensureUserSession()
  return requestApi<ManualFoodHistoryItem[]>(
    `/meal-entries/history?user_id=${userId}&limit=${limit}`
  )
}

export async function deleteManualFoodHistoryItem(templateId: number) {
  const userId = await ensureUserSession()
  return requestApi<{ deleted: boolean; template_id: number }>(
    `/meal-entries/history/${templateId}?user_id=${userId}`,
    {
      method: 'DELETE'
    }
  )
}

export async function fetchActiveGoalProfile() {
  const userId = await ensureUserSession()
  return requestApi<GoalProfileResponse>(`/goal-profile/active?user_id=${userId}`)
}

export async function saveGoalProfile(payload: GoalProfilePayload) {
  const userId = await ensureUserSession()
  return requestApi<GoalProfileResponse>('/goal-profile', {
    method: 'POST',
    data: {
      user_id: userId,
      ...payload
    }
  })
}

export async function fetchWalletOverview() {
  const userId = await ensureUserSession()
  return requestApi<WalletOverviewResponse>(`/wallet/overview?user_id=${userId}`)
}

export async function fetchRechargePackages() {
  return requestApi<RechargePackageResponse[]>('/recharge-packages')
}

export async function fetchMembershipPlans() {
  return requestApi<MembershipPlanResponse[]>('/membership/plans')
}

export async function fetchMuscleBoostOverview(date: string) {
  const userId = await ensureUserSession()
  const overview = await requestApi<MuscleBoostOverviewResponse>(
    `/membership/features/muscle-boost?user_id=${userId}&date=${encodeURIComponent(date)}`
  )

  return {
    ...overview,
    recent_jobs: overview.recent_jobs.map(mapMuscleBoostJob)
  }
}

export async function fetchDailyQuota(date: string) {
  const userId = await ensureUserSession()
  return requestApi<DailyQuotaResponse>(
    `/quota/daily?user_id=${userId}&date=${encodeURIComponent(date)}`
  )
}

export async function fetchDailyRewards(date: string) {
  const userId = await ensureUserSession()
  return requestApi<DailyRewardsResponse>(
    `/rewards/daily?user_id=${userId}&date=${encodeURIComponent(date)}`
  )
}

export async function dailySignIn(date: string) {
  const userId = await ensureUserSession()
  return requestApi<DailyRewardsResponse>('/rewards/daily-sign-in', {
    method: 'POST',
    data: {
      user_id: userId,
      sign_date: date
    }
  })
}

export async function createDemoAiScan(date: string) {
  const userId = await ensureUserSession()
  return requestApi<AiDemoScanResponse>(
    `/ai-scans/demo?user_id=${userId}&date=${encodeURIComponent(date)}`,
    {
      method: 'POST'
    }
  )
}

export async function analyzeImageWithAi(payload: {
  filePath: string
  entryDate: string
  sourceType: 'camera' | 'album' | 'other'
}) {
  const userId = await ensureUserSession()

  const response = await Taro.uploadFile({
    url: `${getApiBaseUrl()}/ai-scans/analyze`,
    filePath: payload.filePath,
    name: 'file',
    formData: {
      user_id: `${userId}`,
      entry_date: payload.entryDate,
      source_type: payload.sourceType
    },
    timeout: 15000
  })

  if (response.statusCode < 200 || response.statusCode >= 300) {
    let message = `上传识别失败：${response.statusCode}`
    try {
      const errorData = JSON.parse(response.data)
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        message = String(errorData.detail)
      }
    } catch {
      // Ignored
    }
    throw new Error(message)
  }

  const parsed = JSON.parse(response.data) as ApiEnvelope<AiDemoScanResponse>
  if (parsed.code !== 0) {
    throw new Error(parsed.message || 'AI 识别失败')
  }

  return parsed.data
}

export async function analyzeTextWithAi(payload: {
  entryDate: string
  description: string
}) {
  const userId = await ensureUserSession()
  return requestApi<AiDemoScanResponse>('/ai-scans/analyze-text', {
    method: 'POST',
    data: {
      user_id: userId,
      entry_date: payload.entryDate,
      description: payload.description
    }
  })
}

export async function createMuscleBoostJob(payload: {
  filePath: string
  useDate: string
  sourceType: 'camera' | 'album' | 'other'
  promptType?: 'natural' | 'fitness'
}) {
  const userId = await ensureUserSession()

  let response: Taro.uploadFile.SuccessCallbackResult
  try {
    response = await Taro.uploadFile({
      url: `${getApiBaseUrl()}/membership/features/muscle-boost/create`,
      filePath: payload.filePath,
      name: 'file',
      formData: {
        user_id: `${userId}`,
        use_date: payload.useDate,
        source_type: payload.sourceType,
        prompt_type: payload.promptType || 'natural'
      },
      timeout: 120000
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    const normalizedMessage = message.toLowerCase()
    const isTimeout =
      normalizedMessage.includes('timeout') ||
      normalizedMessage.includes('超时') ||
      normalizedMessage.includes('uploadfile:fail')

    if (isTimeout) {
      throw new Error('图片增强处理较慢，结果可能已生成，请稍后重新进入本页查看')
    }

    throw error
  }

  if (response.statusCode < 200 || response.statusCode >= 300) {
    let message = `图片增强失败：${response.statusCode}`
    try {
      const errorData = JSON.parse(response.data)
      if (errorData && typeof errorData === 'object' && 'detail' in errorData) {
        message = String(errorData.detail)
      }
    } catch {
      // Ignored
    }
    throw new Error(message)
  }

  const parsed = JSON.parse(response.data) as ApiEnvelope<MuscleBoostCreateResponse>
  if (parsed.code !== 0) {
    throw new Error(parsed.message || '变大变强处理失败')
  }

  return {
    ...parsed.data,
    job: mapMuscleBoostJob(parsed.data.job)
  }
}

export async function saveAiScanResult(
  sessionId: number,
  payload: {
    entry_date: string
    meal_type: MealType
    foods: AiDemoFoodResponse[]
  }
) {
  const userId = await ensureUserSession()
  return requestApi<{
    saved: boolean
    session_id: number
    entry_date: string
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
    coin_cost: number
    total_calories: number
    total_protein_g: number
    total_carbs_g: number
    total_fat_g: number
  }>(`/ai-scans/${sessionId}/save`, {
    method: 'POST',
    data: {
      user_id: userId,
      entry_date: payload.entry_date,
      meal_type: mealTypeMap[payload.meal_type],
      foods: payload.foods
    }
  })
}

export async function deleteAiScan(sessionId: number) {
  const userId = await ensureUserSession()
  return requestApi<{ deleted: boolean; session_id: number }>(
    `/ai-scans/${sessionId}?user_id=${userId}`,
    {
      method: 'DELETE'
    }
  )
}

export async function deleteMuscleBoostJob(jobId: number) {
  const userId = await ensureUserSession()
  return requestApi<{ deleted: boolean; job_id: number; job_no: string }>(
    `/membership/features/muscle-boost/${jobId}?user_id=${userId}`,
    {
      method: 'DELETE'
    }
  )
}

export async function deleteManualMealEntry(entryId: number) {
  const userId = await ensureUserSession()
  return requestApi<{ deleted: boolean; entry_id: number }>(
    `/meal-entries/${entryId}?user_id=${userId}`,
    {
      method: 'DELETE'
    }
  )
}

export function buildMealSectionsFromDashboard(dashboard: DashboardResponse) {
  return mealTypeOptions.map((mealType) => {
    const dashboardMeal = dashboard.meals.find((meal) => meal.meal_type_label === mealType)

    return {
      type: mealType,
      timeRange: mealTimeRanges[mealType],
      totalCalories: dashboardMeal?.total_calories ?? 0,
      filled: (dashboardMeal?.items.length ?? 0) > 0,
      items:
        dashboardMeal?.items.map((item) => ({
          id: String(item.id),
          name: item.food_name,
          note: [
            item.brand,
            item.serving_desc,
            item.note
          ]
            .filter(Boolean)
            .join(' · '),
          calories: item.calories,
          source: item.entry_source
        })) ?? []
    }
  })
}

export function mapBackendMealType(mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') {
  return reverseMealTypeMap[mealType]
}
