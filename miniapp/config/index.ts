import { defineConfig } from '@tarojs/cli'

export default defineConfig({
  projectName: 'fitcalorie-miniapp',
  date: '2026-04-13',
  designWidth: 390,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
    390: 1
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  framework: 'react',
  compiler: {
    type: 'webpack5',
    prebundle: {
      enable: false
    }
  },
  alias: {},
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [
      {
        from: 'public/runtime-config.js',
        to: 'dist/runtime-config.js'
      }
    ],
    options: {}
  },
  mini: {
    output: {
      clean: true
    },
    postcss: {
      pxtransform: {
        enable: true,
        config: {
          designWidth: 390
        }
      },
      url: {
        enable: true,
        config: {
          limit: 1024
        }
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]'
        }
      }
    }
  },
  h5: {
    output: {
      clean: false
    },
    publicPath: '/',
    staticDirectory: 'static',
    devServer: {
      host: '127.0.0.1',
      port: 8000,
      open: false,
      hot: false
    }
  }
})
