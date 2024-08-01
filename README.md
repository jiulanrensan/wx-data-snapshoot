## 微信小程序内容快照
记录页面data快照，方便调试定位问题

### 原理
  
页面销毁只会触发 onUnload, 不会触发 onHide
组件销毁只会触发 lifetimes.detached, 也不会触发 pageLifetimes.hide
但是tab页不会有销毁事件，只会onHide，对应页面的组件也只会触发onHide
tab页只监听onhide，其他页面监听onUnload

### 优化
tab页会频繁onhide，没有发生setData的话去记录会造成浪费。
所以组件在ready时(page onshow -> component ready)，判断是否tab页，不是则监听lifetimes.detached
所以tab页应该在 app onHide 去记录 this.data
所以需要用一个全局变量引用tab页的this.data

### TODO
- [ ] 记录data快照信息