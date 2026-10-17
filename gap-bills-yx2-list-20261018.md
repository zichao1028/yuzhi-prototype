# 寓小二账单列表对齐 · 2026-10-18

参考：`/tmp/yx2-bills-in-list.jpg`。

已完成：
- 收款／付款两栏顶栏及搜索 toast；收款子筛待收款、已完成、全部，默认待收款；付款子筛待付款、付款中、已完成、全部，默认待付款。
- 公共 filterBar / filterDropdownSheet 提供部门、归属、账单类型、筛选（付款不含类型）；沿用草稿、遮罩取消、重置、确认。部门与归属仅本公寓 stub，未选为全部；类型不含全部 chip。
- 总金额／已收／待收（付款对应已付／待付），数字优先；应支付日起止行通过公共筛选面板编辑日期。
- 灰底白色圆角卡片：费用·期数·姓名、金额、账期、应支付日、楼栋名 · 房号；用逾期／未来天数弱红字替代待收大标签，完成日期弱化。
- 蓝色批量选择 FAB 点击提示原型批量收款占位。作废入口在筛选面板，保留简版作废列表。
- 删除收付款列表总流水入口；首页增强区新增流水记录入口；流水页底栏归首页。保留单据级合同流水链接。
- core.js 未修改，状态判定、收付金额及业务语义沿用现有逻辑。

原型差异：
- 不模拟手机系统状态栏；保留应用底栏。未实现可选数量胶囊。
- 数据来自现有示例，金额、姓名、日期和截图不同。无日期筛选时显示起始日期／截止日期，表示不限日期。
- 付款记录缺独立账期时显示关联合同租期；搜索与批量按钮为 toast 占位，无真实支付、审批或组织模型。

验证：
- node --check app.js 通过；git diff --check 通过。
- node test.js：完整套件 685 pass、0 fail（核心及 VM 467 pass，Chrome 浏览器 218 pass）。Chrome 在无沙箱限制的环境完成全部浏览器断言。
- 浏览器 receipt exact tabs 已修正为待收款、已完成、全部；附近付款顺序与收款／付款双栏断言正确，保留原有覆盖。
- 发布记录：本次五个指定文件一并提交，推送目标为 origin/main（zichao1028/yuzhi-prototype）；提交及推送结果见本次交付记录。

线上目标地址：
- https://zichao1028.github.io/yuzhi-prototype/?v=bills-yx2-20261018-0516#bills
- https://zichao1028.github.io/yuzhi-prototype/?v=bills-yx2-20261018-0516#home
- https://zichao1028.github.io/yuzhi-prototype/?v=bills-yx2-20261018-0516#ledger

缓存版本：bills-yx2-20261018-0516（Asia/Shanghai UTC+8）。
