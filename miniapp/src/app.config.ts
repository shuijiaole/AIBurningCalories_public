export default defineAppConfig({
  pages: [
    'pages/home-ui/index',
    'pages/manual-food/index',
    'pages/ai-preview/index',
    'pages/tdee-setup/index',
    'pages/wallet-center/index',
    'pages/muscle-boost/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#f3f4f6',
    navigationBarTitleText: 'AI燃脂',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f3f4f6'
  },
  lazyCodeLoading: 'requiredComponents'
})
