/**
 * 环境配置切换
 * 修改 ACTIVE_ENV 即可切换开发 (dev) 和 生产 (prod) 环境
 */

type EnvType = 'dev' | 'prod'

const ACTIVE_ENV: EnvType = 'prod' // <-- 在这里切换环境

const CONFIG = {
  dev: {
    apiBaseUrl: 'http://127.0.0.1:8080/api',
  },
  // https://api.example.com/api
  prod: {
    apiBaseUrl: 'http://api.example.com/api',
    // apiBaseUrl: 'https://api.example.com/api',
  }
}

export const API_CONFIG = CONFIG[ACTIVE_ENV]

export default API_CONFIG
