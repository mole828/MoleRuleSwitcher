# MoleRuleSwitcher

一个自用分流规则项目，面向 `sub-store / Mihomo Party Override` 的 YAML 覆写配置。

## 规则来源

规则主要基于 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，并补充了仓库内的自定义列表。`X / xAI` 使用 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 分开维护的域名和 IP 规则。

由于规则遵循“先匹配先命中”，所以顺序非常重要。

`X / Twitter` 与 `xAI / Grok` 的域名会优先命中独立的 `X` 策略组，默认走香港节点。X 的 IP 规则单独放在域名规则之后，并使用 `no-resolve`，避免仅有域名的连接被 IP 规则提前触发 DNS 后误判。

规则集保留为可读的 YAML，没有使用 Mihomo 专用的二进制 MRS 格式。整份覆写配置仍然只面向 Mihomo；Shadowrocket 需要使用其自身支持的文本规则配置，不能直接加载该 YAML 覆写。

## 文件说明

- `MoleRuleOverride.yaml`: 新版 `sub-store / Mihomo Party` 风格覆写配置，结构参考 `override-hub`，并已合并基础 Clash 配置
- `GeneralClashConfig.yml`: 历史基础配置来源，关键设置已迁入 `MoleRuleOverride.yaml`

## 使用

Quest 系统更新、商店及登录相关域名使用独立的 `Meta Quest` 策略组，默认选择 `日本节点`，可切换美国、香港或手动选择具体节点。规则使用 MetaCubeX 的 `oculus`、`facebook` 域名 YAML，并补充 `meta.com`，优先于通用代理及游戏规则；Facebook 和共享 CDN 流量也会进入此组。这是域名分流，并不保证覆盖头显的所有第三方连接。

修改发布到远程覆写地址后，需在 sub-store / Mihomo Party 中刷新覆写并重新生成或加载配置；仅刷新节点订阅不一定会更新覆写。也可先将本地 YAML 导入覆写测试。确认使用规则模式，并在连接面板检查 Quest 下载连接是否命中 `Meta Quest`。切换节点后重新发起下载，让新连接使用所选节点。头显本身的流量必须经过运行此配置的代理设备，单独开启电脑系统代理不会自动代理头显。

将覆写地址设置为：

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/MoleRuleOverride.yaml

适用于需要 `proxy-groups + rule-providers + rules` 结构的覆写场景，也已经包含基础 DNS / 端口 / CFW 相关设置。
