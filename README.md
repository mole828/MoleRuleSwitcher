# MoleRuleSwitcher

一个自用分流规则项目，目前同时保留旧版 `subconverter` 配置和面向 `sub-store / Mihomo Party Override` 的 YAML 版本。

`subconverter` 已长期处于放弃维护状态，这个仓库后续以 `sub-store / Mihomo Party Override` 方案为主。

## 规则来源

规则依然主要基于 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，并补充了仓库内的自定义列表。

由于规则遵循“先匹配先命中”，所以顺序非常重要；`MoleRuleOverride.yaml` 已按原 `main_rule.ini` 的顺序进行迁移。

## 文件说明

- `main_rule.ini`: 旧版 `subconverter` 规则配置，仅保留兼容
- `MoleRuleOverride.yaml`: 新版 `sub-store / Mihomo Party` 风格覆写配置，结构参考 `override-hub`，并已合并基础 Clash 配置
- `GeneralClashConfig.yml`: 历史基础配置来源，关键设置已迁入 `MoleRuleOverride.yaml`

## 使用

### subconverter

将 `config` 设置为：

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/main_rule.ini

不建议新接入继续使用。

### sub-store / Mihomo Party

将覆写地址设置为：

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/MoleRuleOverride.yaml

适用于需要 `proxy-groups + rule-providers + rules` 结构的覆写场景，也已经包含基础 DNS / 端口 / CFW 相关设置。
