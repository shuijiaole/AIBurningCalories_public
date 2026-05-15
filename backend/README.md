# AI燃脂云服务器部署

这个项目已经整理成单服务部署模式：

- `backend/` 提供 FastAPI 接口
- `backend/frontend-dist/` 放打好的 H5 页面
- 启动后同一个进程同时提供前端页面和 `/api/*` 接口

## 服务器要求

- Linux 云服务器
- Python 3.10+
- MySQL 8

## 首次部署

1. 解压部署包
2. 导入数据库脚本：
   - `sql/fitcalorie_mysql_init.sql`
   - 如果要用肌肉增强功能，再导入 `sql/fitness_muscle_boost_feature.sql`
3. 复制 `backend/.env.example` 为 `backend/.env`
4. 修改 `backend/.env` 里的 MySQL 和 AI 配置
5. 进入 `backend/`
6. 执行 `bash start.sh`

## 启动后访问

- 首页：`http://13.115.217.62:8080/`
- 健康检查：`http://13.115.217.62:8080/api/health`

## 接口地址切换

H5 前端会优先读取 `backend/frontend-dist/runtime-config.js` 里的 `apiBaseUrl`。

如果前端和后端部署在同一个地址下，保持下面这种写法即可：

```js
window.__AI_RANZHI_CONFIG__ = {
  apiBaseUrl: "http://13.115.217.62:8080/api"
}
```

如果你以后把 API 单独拆到别的域名，再把它改成完整地址，例如：

```js
window.__AI_RANZHI_CONFIG__ = {
  apiBaseUrl: "https://api.example.com/api"
}
```
