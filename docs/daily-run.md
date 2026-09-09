# 每日研究操作

1. 通过 Sites 的 get_site 读取 `.openai/hosting.json` 的 project_id。沿用返回的 current_live_url 和已有 siwc_bypass_bearer_token，不生成或旋转令牌。
2. 只在本次进程环境设置 QUANT_SITE_URL 与 QUANT_SITE_TOKEN，不打印、不落盘、不提交凭据。
3. 在此项目运行 `node scripts/daily.mjs`。它读取已存账户，采集真实行情与财报，校验输入，然后通过私有站点写入D1账本，再读回验证。
4. 如果连接令牌不可用，使用已登录网页的“执行每日研究”，遇到来源限制则报告失败，不伪造采集结果。
5. 依据脚本输出总结资金、盈亏、新成交、计划及来源错误。每天香港时间08:30，由本任务的heartbeat触发；电脑与Codex需可用。

重要：保持原始报价、财报、汇率日期；新计划等待下一完整交易日，不补记错过的成交；遵循用户2026-09-09授权的v2多空策略（docs/upgrade-v2.md），不擅自修改策略、历史交易或本金。失败时不得把缓存当成新行情。网页、CLI共享同一账本和交易引擎。

持续行情服务：scripts/quotes-watch.mjs，每轮结束60秒后再次读取公开报价，单独保存报价表，不触发交易。电脑需保持运行，网页超过两分钟未收到桌面更新会提示中断。本环境拒绝独立Start-Process启动与Win32_Process查询；使用工具管理的exec_command运行会话。会话信息保存在work/quotes-session.json，不含凭据。每日研究后通过/api/quotes检查asOf、transport和错误；桌面数据仍持续更新时不要启动第二个进程。数据停止时可用write_stdin查询已知会话；仅确认原进程已退出才通过exec_command重新运行脚本并记录新session_id。无法确认原进程状态时报告中断，避免重复启动。令牌只保留在进程环境，不写文件。不要创建第二个自动任务。

已创建的每日自动任务 ID：20。更新现有任务，不重复创建。
