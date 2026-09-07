# 实施计划

目标：真实人民币模拟账本与可审计每日研究。
技术：Vinext/React、Cloudflare D1、纯 JavaScript 计算模块、Node 测试。
设计：docs/design.md。

- [ ] lib/engine.mjs + tests/engine.test.mjs：先运行失败测试；实现评分、下一日线成交、汇率、费用、持仓限制、重复执行、公司行动、净值与基准。用手算期望检查。
- [ ] lib/data.mjs：抓取 Yahoo 日线、SEC 年报指标、Frankfurter 汇率；时间戳过滤；缺失即禁止新买；scripts/collect.mjs 生成首次真实快照。
- [ ] db/schema.ts、lib/store.ts、app/api/account/route.ts：D1 账户、CAS 更新、同源请求校验、每日刷新、暂停、导出；生成并检查迁移。
- [ ] app/page.tsx、app/globals.css：账户、研究列表、详情、日志、指标、空状态与失败提示；首次有效编译后预览。
- [ ] 运行测试、类型检查、构建；推送准确源码并私有发布；建立每天08:30自动任务，报告时间与限制。
