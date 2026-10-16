# 寓智云控 房东端移动原型（纯 HTML/CSS/JS，无构建）
运行：`python3 -m http.server 8080 --bind 0.0.0.0 --directory .`

## 模型
- 一份合同 = 一组账单；合同生效后条款不改。
- 部分退租 / 换房 = 终止原合同（结算到退租日）+ 开始新合同（新一组账单）+ 应退结转抵扣新合同账单。
- 租约串联同一承租人的合同，自身无账单。
- 旧账单只在旧合同页，新账单只在新合同页。

## 文案规则
- 以合同为单位描述：「合同 H1：已终止 · 终止原因：退租（房间 C）· 终止日 2026-04-15 · 后续合同 H2」「合同 H2：生效中 · 来源：合同 H1 退租（房间 C）后续签」「终止原因：换房（C 换 D）」。
- 合同内房间列表只列该合同的房间（H1：A B C；H2：A B），不显示逐房迁移状态。
- 禁用词：转至、已转至H2、房间挂靠。

## 页面
- index.html 合同列表（生效中/已终止/全部；退租/换房/续租入口）· tenancy-list.html 租约列表
- TY-001 张三（部分退租）：contract-h1 · bills-h1 · settlement-h1 · contract-h2 · bills-h2 · tenancy
- TY-002 王五（换房 F 换 G）：contract-h3 · bills-h3 · settlement-h3 · contract-h4 · bills-h4 · tenancy-ty002
- TY-003 李四：contract-h5 · bills-h5 · tenancy-ty003
- TY-004 赵六（到期续租）：contract-h6 · contract-h7 · tenancy-ty004
- 交互流程：checkout-flow（办理退租 5 步，按退租日实时计算结算）· swap-flow（换房）· renew-flow（续租）
- 底部导航：合同→index，租约→tenancy-list，办理→checkout-flow；非顶级页均有返回

## 数据（场景 1）
H1 实际租金 10500（3000×3 + 3000×15/30）；已收租金 18000 → 租金应退 7500 + 押金 3000 = 应退 10500；结转 H2 押金 2000 + 04-16~06-30 租金 5000 = 7000；现金应退 3500。
