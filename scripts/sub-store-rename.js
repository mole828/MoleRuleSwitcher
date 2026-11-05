// Sub-Store Script Operator: [订阅显示名] 节点名 [premium_node] [cheap_node]
// 在来源单条订阅添加 premium_node 或 cheap_node 标签（不带方括号）。
// 仅 sub.tag 数组含该标签时添加标记；组合预览前需先保存子订阅标签。
function operator(proxies = [], targetPlatform, context = {}) {
  const managedTags = ["premium_node", "cheap_node"];
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
        throw new Error("Sub-Store 的 subs 数据不是订阅数组，无法判断流量标签");
      }
    }

    const subscription = savedSubscriptions.find(sub => sub.name === name);
    if (!subscription) {
      throw new Error(`找不到来源订阅：${name}，无法判断流量标签`);
    }
    return subscription;
  }

  return proxies.map(proxy => {
    if (!proxy._subName) {
      throw new Error("节点缺少 _subName，无法判断来源订阅标签");
    }
    const subscription = getSubscription(proxy._subName);
    const tags = Array.isArray(subscription.tag) ? subscription.tag : [];
    const provider = String(proxy._subDisplayName || proxy._subName).trim();
    const prefix = `[${provider}] `;
    // 重新生成流量标记；cheap_node 保持末尾，兼容经济组匹配。
    let name = String(proxy.name || "节点").trim()
      .replace(/\s*\[(?:premium_node|cheap_node)\]/g, "").trim();

    if (!name.startsWith(prefix)) {
      name = `${prefix}${name}`;
    }
    proxy.name = name + managedTags.filter(tag => tags.includes(tag))
      .map(tag => ` [${tag}]`).join("");
    return proxy;
  });
}
