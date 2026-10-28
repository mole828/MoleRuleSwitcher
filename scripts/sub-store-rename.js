// Sub-Store Script Operator: [订阅显示名] 节点名 [cheap_node]
// 在来源单条订阅添加 cheap_node 标签（不带方括号），将本脚本用于单条或组合订阅。
// 仅 sub.tag 数组含该标签时添加标记；组合预览前需先保存子订阅标签。
function operator(proxies = [], targetPlatform, context = {}) {
  const tag = "cheap_node";
  const marker = `[${tag}]`;
  const source = context.source || {};
  let savedSubscriptions;

  function getSubscription(name) {
    if (Object.prototype.hasOwnProperty.call(source, name)) {
      return source[name];
    }

    // 组合订阅自己的脚本上下文只有 _collection，需要按来源名称查找。
    if (savedSubscriptions === undefined) {
      if (typeof $substore === "undefined" || typeof $substore.read !== "function") {
        throw new Error("无法读取来源订阅标签，请检查 Sub-Store 脚本上下文");
      }
      savedSubscriptions = $substore.read("subs");
      if (!Array.isArray(savedSubscriptions)) {
        throw new Error("Sub-Store 的 subs 数据不是订阅数组，无法判断经济节点标签");
      }
    }

    const subscription = savedSubscriptions.find(sub => sub.name === name);
    if (!subscription) {
      throw new Error(`找不到来源订阅：${name}，无法判断经济节点标签`);
    }
    return subscription;
  }

  return proxies.map(proxy => {
    if (!proxy._subName) {
      throw new Error("节点缺少 _subName，无法判断来源订阅标签");
    }
    const subscription = getSubscription(proxy._subName);
    const isCheap = Array.isArray(subscription.tag) && subscription.tag.includes(tag);
    const provider = String(proxy._subDisplayName || proxy._subName).trim();
    const prefix = `[${provider}] `;
    // 此脚本管理末尾标记：重复执行不累加，取消订阅标签后也不残留。
    let name = String(proxy.name || "节点").trim()
      .replace(/(?:\s*\[cheap_node\])+$/, "").trim();

    if (!name.startsWith(prefix)) {
      name = `${prefix}${name}`;
    }
    proxy.name = isCheap ? `${name} ${marker}` : name;
    return proxy;
  });
}
