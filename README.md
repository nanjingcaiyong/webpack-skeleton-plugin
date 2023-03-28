# webpack 生成骨架屏插件

webpack 自动生成骨架屏插件

## 安装插件

```sh
npm i html5parser -D
npm i ws -D
```
·
## 使用

第一步：引入
```js
const WebpackSkeletonPlugin = require('webpack-skeleton-plugin')

module.exports = {
  ...
  plugins: [
    new WebpackSkeletonPlugin({
      path: 
    })
  ]
}
```

第二步：生成html文件

在浏览器控制台输入 `generate()`


注意：需要在展示骨架的容器的 `class` 上添加 `skl` 样式类
