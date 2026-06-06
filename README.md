# MoleRuleSwitcher

一个自用分流规则项目，面向 `sub-store / Mihomo Party Override` 的 YAML 覆写配置。

## 规则来源

规则依然主要基于 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，并补充了仓库内的自定义列表。

由于规则遵循“先匹配先命中”，所以顺序非常重要。

`X` 相关域名会优先命中独立策略组，默认走香港节点。

## 文件说明

- `MoleRuleOverride.yaml`: 新版 `sub-store / Mihomo Party` 风格覆写配置，结构参考 `override-hub`，并已合并基础 Clash 配置
- `GeneralClashConfig.yml`: 历史基础配置来源，关键设置已迁入 `MoleRuleOverride.yaml`

## 使用

将覆写地址设置为：

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/MoleRuleOverride.yaml

适用于需要 `proxy-groups + rule-providers + rules` 结构的覆写场景，也已经包含基础 DNS / 端口 / CFW 相关设置。
