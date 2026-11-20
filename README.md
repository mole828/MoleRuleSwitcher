# MoleRuleSwitcher

一个自用分流规则项目，面向 `sub-store / Mihomo Party Override` 的 YAML 覆写配置。

## 规则来源

规则主要基于 [blackmatrix7/ios_rule_script](https://github.com/blackmatrix7/ios_rule_script)，并补充了仓库内的自定义列表。`X`、`xAI / Grok` 与 `Cursor` 使用 [MetaCubeX/meta-rules-dat](https://github.com/MetaCubeX/meta-rules-dat) 分开维护的域名规则；X 另有单独的 IP 规则。

由于规则遵循“先匹配先命中”，所以顺序非常重要。

`xAI / Grok` 的域名规则排在 `X / Twitter` 之前。`twitter.yaml` 含 `+.x.com`，放在前面会先命中 `grok.x.com`。三者各用一个策略组：`Grok` 默认 `美国自建`，`Cursor` 默认 `DIRECT`，`X` 默认香港节点。X 的 IP 规则单独放在域名规则之后，并使用 `no-resolve`，避免仅有域名的连接被 IP 规则提前触发 DNS 后误判。

规则集保留为可读的 YAML，没有使用 Mihomo 专用的二进制 MRS 格式。整份覆写配置仍然只面向 Mihomo；Shadowrocket 需要使用其自身支持的文本规则配置，不能直接加载该 YAML 覆写。

## 文件说明

- `MoleRuleOverride.yaml`: 新版 `sub-store / Mihomo Party` 风格覆写配置，结构参考 `override-hub`，并已合并基础 Clash 配置
- `GeneralClashConfig.yml`: 历史基础配置来源，关键设置已迁入 `MoleRuleOverride.yaml`
- `scripts/sub-store-ip-trust.js`: 探测美国节点 IPv4 出口，评分严格大于 70 时添加 `[high_score_node]`，保留全部节点；出口缓存 24 小时，评分缓存 48 小时。

## 使用

来源订阅可添加 `premium_node`（贵重流量）或 `cheap_node`（经济流量）标签。`scripts/sub-store-rename.js` 将其写入节点名称，多个标签使用独立方括号，`[cheap_node]` 保持末尾。普通组排除 `[premium_node]`，高分美国组仍按评分标签筛选；赛博云使用 `premium_node`。

`高分美国节点` 由 YAML 按 `[high_score_node]` 匹配，不需要额外的分组脚本。评分脚本放在组合订阅的重命名操作之后，以链接模式使用 `https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/scripts/sub-store-ip-trust.js#minScore=70&probeHours=24&scoreHours=48`，由服务器上的 sub-store 执行并访问本机 HTTP META。脚本修改并推送后，更新时需留意 sub-store 的远程脚本缓存。IPv6 出口尚未评估；未达标或探测失败的节点仅不打标签，不会删除。

服务器组合订阅的流量标签脚本读取 `/opt/app/data/sub-store-rename.js`，`MoleSub` 的覆写读取 `/opt/app/data/MoleRuleOverride.yaml`。修改对应仓库文件后需同步服务器文件，再由客户端更新订阅；仅推送 GitHub 不会更新这两个本地文件。

调试通过 `POST /api/preview/collection` 临时追加脚本操作，直接验证真实节点结果，并确认已保存配置未变化。预览不保存订阅配置，但脚本的缓存写入和网络请求仍会实际发生。

`国外流量`、`Google`、`OpenAI`、`Microsoft`、`Jetbrains`、`Grok`、`Claude` 的默认选择都是 `美国自建`。`美国自建` 只匹配美国自建节点，当前只有洛杉矶这一条，出口不会随 url-test 更换。这些组仍保留原来的地区节点和 `自动选择`，可手动切回。`漏网之鱼` 指向 `国外流量`，因此未命中规则的流量也走这条出口。客户端若保留旧选择，刷新后需要手动切到 `美国自建` 一次。

`Claude` 使用独立策略组，默认选择 `美国自建`，也可手动选择 `高分美国节点`、`美国节点`、`新加坡节点`、`日本节点`。规则使用 blackmatrix7 的 Claude 规则集，并补充 `claude.com`，优先于通用代理规则。`新加坡节点` 自动匹配名称含 `新加坡`、`狮城`、`獅城`、`SG` 或 `Singapore` 的非自建节点，并通过测速选择节点。刷新覆写并重新加载配置后，可在 `Claude` 组中切换地区；客户端若保留旧选择，需手动切换一次。此设置只改变网络出口，不修改系统时区，也不保证账号安全。

`Grok` 使用独立策略组，默认选择 `美国自建`，也可手动选择 `高分美国节点`、`美国节点`、`日本节点`、`新加坡节点`、`香港节点` 或 `国外流量`。规则使用 MetaCubeX 的 `xai` 域名 YAML，覆盖 `grok.com`、`x.ai`、`grok.x.com` 等，并排在 X 的域名规则之前。此组用于 Grok 网页、App 和官方 API。这些域名在大陆不可达，默认不走直连。`api.x.ai` 会拒绝一部分云厂商地址，香港机房节点容易返回 403，所以默认使用自建节点，而不是会更换出口的高分美国节点。刷新覆写并重新加载配置后，这些域名进入 `Grok` 组；没有旧选择时使用列表中的第一项。此设置只改变网络出口。

`Cursor` 使用独立策略组，默认选择 `DIRECT`，也可手动切换香港、日本、美国或高分美国节点。规则使用 MetaCubeX 的 `cursor` 域名 YAML，覆盖 `cursor.com`、`cursor.sh`、`cursorapi.com`、`cursor-cdn.com`、`cursorvm.com`。Cursor 内的 Grok 与 Composer 请求打到 Cursor 自己的服务器，不经过 `api.x.ai`。大陆网络多数时候可以直连；线路被限速时再切换节点。代理出口有时会触发 Cursor 的 suspicious activity 拦截，所以默认保持直连。刷新覆写并重新加载配置后，可在连接面板检查是否命中 `Cursor`。此设置只改变网络出口。

`开发依赖` 策略组目前覆盖 Maven Central 的 `repo.maven.apache.org` 和 `repo1.maven.org`，默认选择 `DIRECT`，可手动切换地区节点、自建节点或其他代理策略，规则优先于通用代理规则。国内镜像沿用现有分流规则。此配置只控制访问出口，不会把 Central 请求改写为国内镜像；使用镜像仍需在 Maven 的 `settings.xml` 中配置。刷新覆写并重新加载配置后，可在连接面板检查 Maven 下载是否命中 `开发依赖`；切换策略后重新发起下载。

Quest 系统更新、商店及登录相关域名使用独立的 `Meta Quest` 策略组，默认选择 `日本节点`，可切换美国、香港或手动选择具体节点。规则使用 MetaCubeX 的 `oculus`、`facebook` 域名 YAML，并补充 `meta.com`，优先于通用代理及游戏规则；Facebook 和共享 CDN 流量也会进入此组。这是域名分流，并不保证覆盖头显的所有第三方连接。

修改发布到远程覆写地址后，需在 sub-store / Mihomo Party 中刷新覆写并重新生成或加载配置；仅刷新节点订阅不一定会更新覆写。也可先将本地 YAML 导入覆写测试。确认使用规则模式，并在连接面板检查 Quest 下载连接是否命中 `Meta Quest`。切换节点后重新发起下载，让新连接使用所选节点。头显本身的流量必须经过运行此配置的代理设备，单独开启电脑系统代理不会自动代理头显。

将覆写地址设置为：

https://raw.githubusercontent.com/mole828/MoleRuleSwitcher/main/MoleRuleOverride.yaml

适用于需要 `proxy-groups + rule-providers + rules` 结构的覆写场景，也已经包含基础 DNS / 端口 / CFW 相关设置。
