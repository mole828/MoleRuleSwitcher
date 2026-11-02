// Sub-Store / Node + HTTP META：只给评分 >70 的美国节点添加 [high_score_node]。
// 保留全部节点。只评估 IPv4 出口，不能保证机场之后使用相同出口。
async function operator(proxies = []) {
  const args = $arguments || {};
  const mode = args.mode || "tag";
  const minScore = Number(args.minScore ?? 70);
  const probeTTL = Number(args.probeHours ?? 24) * 3600000;
  const scoreTTL = Number(args.scoreHours ?? 48) * 3600000;
  const failureTTL = 30 * 60000;
  const samples = 2, concurrency = 3, timeout = 10000;
  const probeURL = "https://api.ipify.org?format=json";
  const scoreAPI = "https://ip.net.coffee/api/ip/lookup/";
  const metaURL = "http://127.0.0.1:9876";
  const prefix = "mole-ip-trust-v1:";
  const usName = /美国|美國|🇺🇸|\bUS(?:A)?\b|United States/i;
  const crypto = require("node:crypto");
  const process = require("node:process");
  const isIP = require("node:net").isIP;
  const metrics = { probes: 0, scoreRequests: 0, probeHits: 0, scoreHits: 0 };
  let lastScoreRequest = 0;

  if (!["tag", "audit"].includes(mode) || !Number.isFinite(minScore) || minScore < 0 || minScore > 100 ||
      !Number.isFinite(probeTTL) || probeTTL <= 0 || !Number.isFinite(scoreTTL) || scoreTTL <= 0) {
    throw new Error("请检查 mode、minScore、probeHours 和 scoreHours 参数");
  }
  // 多个设备同时更新时排队，后面的请求可以直接使用前一次的缓存。
  const lock = Symbol.for("mole.ip-trust.queue.v1");
  const previous = process[lock] || Promise.resolve();
  let release;
  process[lock] = new Promise(resolve => { release = resolve; });
  await previous;
  try {
    return await annotateProxies();
  } finally {
    release();
  }

  async function annotateProxies() {
    const { entries, pending } = prepareProbes();
    await probeNodes(pending);
    const ips = [...new Set(entries.flatMap(({ record }) =>
      record.result.error ? [] : record.result.ips))];
    const scores = new Map();
    for (const ip of ips) scores.set(ip, await getTrustScore(ip));
    const ratings = new Map();
    const rows = entries.map(({ proxy, record }) => {
      const observed = (record.result.ips || []).map(ip => ({ ip, ...scores.get(ip) }));
      const known = !record.result.error && observed.length > 0 &&
        observed.every(item => Number.isFinite(item.score) && !item.error);
      const score = known ? Math.min(...observed.map(item => item.score)) : null;
      const pass = known && score > minScore;
      ratings.set(proxy, pass);
      return { name: proxy.name, score, pass, error: record.result.error, observed };
    });
    const report = { mode, minScore, addressFamily: 4, checkedAt: Date.now(), metrics, rows };
    scriptResourceCache.set(`${prefix}report`, report, 7 * 86400000);
    $substore.info(`[IP Trust] ${rows.filter(row => row.pass).length}/${rows.length} 美国节点达标，${JSON.stringify(metrics)}`);
    if (mode === "audit") return proxies;
    return proxies.map(proxy => ratings.has(proxy) ? applyScoreTag(proxy, ratings.get(proxy)) : proxy);
  }

  function prepareProbes() {
    const entries = [], pending = [], records = new Map();
    for (const proxy of proxies.filter(proxy => usName.test(proxy.name || ""))) {
      try {
        if (proxy["dialer-proxy"] || proxy["underlying-proxy"]) throw new Error("暂不支持链式代理");
        // 转换器会原地修改 TLS 等字段，必须使用副本。
        const converted = ProxyUtils.produce([JSON.parse(JSON.stringify(proxy))], "ClashMeta", "internal");
        if (!Array.isArray(converted) || converted.length !== 1) throw new Error("无法转换节点");
        const node = { ...converted[0], name: "probe" };
        const cacheKey = `${prefix}exit:${samples}:${hash(probeURL)}:${hash(JSON.stringify(sortKeys(node)))}`;
        if (!records.has(cacheKey)) {
          const result = scriptResourceCache.get(cacheKey);
          const record = { node, cacheKey, result };
          records.set(cacheKey, record);
          if (result) metrics.probeHits++;
          else pending.push(record);
        }
        entries.push({ proxy, record: records.get(cacheKey) });
      } catch (error) {
        entries.push({ proxy, record: { result: { error: error.message } } });
      }
    }
    return { entries, pending };
  }

  async function probeNodes(records) {
    if (!records.length) return;
    let instance;
    try {
      instance = await callProxyService("/start", {
        proxies: records.map(record => record.node),
        timeout: 30000 + Math.ceil(records.length / concurrency) * samples * (timeout + 1000),
      });
      if (!Number.isInteger(instance.pid) || instance.pid <= 0 || !Array.isArray(instance.ports) ||
          instance.ports.length !== records.length || instance.ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)) {
        throw new Error("HTTP META 返回无效的 PID 或端口");
      }
      await sleep(1500);
      let next = 0;
      async function worker() {
        while (next < records.length) {
          const index = next++;
          const record = records[index];
          record.result = await detectEgressAddresses(instance.ports[index]);
          scriptResourceCache.set(record.cacheKey, record.result, record.result.error ? failureTTL : probeTTL);
        }
      }
      await Promise.all(Array.from({ length: Math.min(concurrency, records.length) }, worker));
    } catch (error) {
      for (const record of records) {
        if (record.result) continue;
        record.result = { error: error.message };
        scriptResourceCache.set(record.cacheKey, record.result, failureTTL);
      }
    } finally {
      // 只关闭自己创建的实例；清理失败时由 HTTP META 按超时回收。
      if (Number.isInteger(instance?.pid) && instance.pid > 0) {
        try { await callProxyService("/stop", { pid: instance.pid }); }
        catch (error) { $substore.info(`[IP Trust] 临时实例清理失败：${error.message}`); }
      }
    }
  }

  async function detectEgressAddresses(port) {
    const ips = new Set();
    try {
      for (let i = 0; i < samples; i++) {
        metrics.probes++;
        const data = await requestJson(probeURL, {
          proxy: `http://127.0.0.1:${port}`,
          headers: { Connection: "close", "Cache-Control": "no-cache" },
        });
        if (isIP(data.ip) !== 4) throw new Error("探测接口未返回 IPv4 地址");
        ips.add(data.ip);
      }
      return { ips: [...ips], checkedAt: Date.now() };
    } catch (error) {
      return { ips: [...ips], error: error.message, checkedAt: Date.now() };
    }
  }

  async function getTrustScore(ip) {
    const key = `${prefix}score:${hash(scoreAPI)}:${ip}`;
    const cached = scriptResourceCache.get(key);
    if (cached) { metrics.scoreHits++; return cached; }
    await sleep(Math.max(0, 1000 - (Date.now() - lastScoreRequest)));
    lastScoreRequest = Date.now();
    metrics.scoreRequests++;
    let result;
    try {
      const data = await requestJson(scoreAPI + encodeURIComponent(ip));
      if (data.ip !== ip) throw new Error("评分响应 IP 不一致");
      if (typeof data.trust_score !== "number" || !Number.isFinite(data.trust_score) ||
          data.trust_score < 0 || data.trust_score > 100) throw new Error("无效的 trust_score");
      result = { score: data.trust_score, checkedAt: Date.now() };
    } catch (error) {
      result = { error: error.message, checkedAt: Date.now() };
    }
    scriptResourceCache.set(key, result, result.error ? failureTTL : scoreTTL);
    return result;
  }

  function applyScoreTag(proxy, highScore) {
    const name = String(proxy.name || "").replace(/\s*\[high_score_node\]/g, "");
    const cheapTag = name.match(/(?:\s*\[cheap_node\])+$/)?.[0] || "";
    const base = name.slice(0, name.length - cheapTag.length).trimEnd();
    return { ...proxy, name: base + (highScore ? " [high_score_node]" : "") + cheapTag };
  }

  async function requestJson(url, options = {}) {
    const { method = "get", ...request } = options;
    const response = await $substore.http[method]({ url, timeout, ...request });
    if (Number(response.statusCode ?? response.status) !== 200) throw new Error(`HTTP ${response.statusCode ?? response.status}`);
    return JSON.parse(response.body);
  }

  function callProxyService(path, body) {
    return requestJson(metaURL + path, {
      method: "post", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
  }

  function sortKeys(value) {
    if (Array.isArray(value)) return value.map(sortKeys);
    if (value && typeof value === "object") return Object.fromEntries(
      Object.keys(value).sort().map(key => [key, sortKeys(value[key])]),
    );
    return value;
  }
  function hash(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
}
