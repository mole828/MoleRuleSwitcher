# MoleRuleSwitcher

一个自用分流规则的项目，使用subconverter

## Clash

Clash 部分直接拿来了 subconverter 的 GeneralClashConfig.yml 稍作修改
使用其中的 DoH 

## Rules

鉴于规则会使用先匹配到的，所以要注意先后次序 

这里主要使用了 blackmatrix7/ios_rule_script 中的规则

## 使用

使用 subconverter 时，将 config 修改为 

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/main_rule.ini

即可正常使用