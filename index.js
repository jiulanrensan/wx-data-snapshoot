export function proxyOrigin({
  ignoreCompList: [],
  tabPageList: []
}) {
  const originPage = Page;
  const originComponent = Component;
  const originApp = App;
  App = function (options) {
    handleAppOptions(options);
    originApp.apply(this, arguments);
  };
  Page = (options) => {
    handlePageOptions(options);
    return originPage(options);
  };

  Component = (options) => {
    handleCompOptions(options);
    return originComponent(options);
  };
  let currentRoute = "";
  let curretnIsTab = false;
  function getDefaultDatakey() {
    return {
      pageData: {},
      compData: {},
    };
  }
  const tabData = tabPageList.reduce((acc, cur) => {
    acc[cur] = getDefaultDatakey()
    return acc
  }, {})
  const PAGE_HOOK = {
    ONSHOW: "onShow",
    ONUNLOAD: "onUnload",
  };

  const LIFE_TIMES = "lifetimes";
  const LIFE_TIMES_HOOK = {
    READY: "ready",
    DETACHED: "detached",
  };

  function getRoute() {
    const routes = getCurrentPages();
    const page = routes[routes.length - 1];
    currentRoute = page.route;
    curretnIsTab = tabPageList.includes(currentRoute);
  }

  /**
   * 页面销毁只会触发 onUnload, 不会触发 onHide
   * 组件销毁只会触发 lifetimes.detached, 也不会触发 pageLifetimes.hide
   *
   * 但是tab页不会有销毁事件，只会onHide，对应页面的组件也只会触发onHide
   *
   * 所以tab页只监听onhide，其他页面监听onUnload
   *
   * 组件在ready时(page onshow -> component ready)，判断是否tab页，不是则监听lifetimes.detached
   * 但tab页会频繁onhide，没有发生setData的话去记录会造成浪费
   * 所以tab页应该在 app onHide 去记录 this.data
   * 所以需要用一个全局变量引用tab页的this.data
   *
   * 记录方式：
   */
  function handleAppOptions(options) {
    overrideHook(options, "onHide", appOnHide);
  }

  function handlePageOptions(options) {
    overrideHook(options, PAGE_HOOK.ONSHOW, pageOnShow);
    overrideHook(options, PAGE_HOOK.ONUNLOAD, pageOnUnload);
  }

  function handleCompOptions(options) {
    let lifetimes = options[LIFE_TIMES];
    if (!lifetimes) lifetimes = {};
    overrideHook(lifetimes, LIFE_TIMES_HOOK.READY, compReady);
    overrideHook(lifetimes, LIFE_TIMES_HOOK.DETACHED, compDetached);
    if (!lifetimes) {
      options[LIFE_TIMES] = lifetimes;
    }
  }

  function overrideHook(PageObject, hook, overrideFunc) {
    const originHook = PageObject[hook];
    PageObject[hook] = function (...args) {
      overrideFunc.apply(this, ...args);
      // 不一定有这个钩子，所以要判断一下
      if (originHook) originHook.apply(this, args);
    };
  }

  function appOnHide() {
    const keysList = Object.keys(tabData);
    keysList.forEach((key) => {
      const { pageData, compData } = tabData[key];
      recordData({
        route: key,
        pageData: JSON.stringify(pageData),
      });
      const compKeyList = Object.keys(compData);
      compKeyList.forEach((comp) => {
        if (ignoreCompList.some((ig) => ig.includes(comp))) return;
        const cData = compData[comp];
        recordData({
          route: key,
          compName: comp,
          compData: JSON.stringify(cData),
        });
      });
    });
  }

  function pageOnShow() {
    getRoute();
    if (curretnIsTab) {
      tabData[currentRoute].pageData = this.data;
    }
  }

  function pageOnUnload() {
    if (curretnIsTab) return;
    recordData({
      route: currentRoute,
      pageData: JSON.stringify(this.data),
    });
  }

  function compReady() {
    const compName = this.is;
    if (!curretnIsTab) {
      return;
    }
    let compList = tabData[currentRoute].compData[compName];
    if (!compList) {
      tabData[currentRoute].compData[compName] = compList = [this.data];
    } else {
      compList.push(this.data);
    }
  }

  function compDetached() {
    const compName = this.is;
    if (ignoreCompList.some((ig) => ig.includes(compName))) return;
    if (curretnIsTab) return;
    recordData({
      route: currentRoute,
      compName: compName,
      compData: JSON.stringify(this.data),
    });
  }

  /**
   * @param {object} data
   * @param {string} data.route
   * @param {object=} data.pageData
   * @param {string=} data.compName
   * @param {object[]=} data.compData
   */
  function recordData(data) {
    // todo
    console.log("this.data", JSON.stringify(data));
  }
}
