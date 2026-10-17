# 公共下拉筛统一 · 2026-10-18

房源顶栏为「楼栋 | 状态 | 筛选」。房源状态仅空房、已出租、锁房；重复点击取消，未选即全部，重置清空状态与业务状态。业务状态保留原有多选和匹配语义。旧 status=全部 仍兼容，后续房源筛选确认输出空状态。

filterDropdownSheet 增加 ariaLabel；filterBar 共用单入口草稿控制、遮罩丢弃、重置及确认。房源楼栋按 getBuildings 的键生成，core.matchRoomFilters 增加 bld 匹配，空值与旧「全部楼栋」不过滤。房源状态、楼栋、更多筛选互斥。

账单收款使用楼栋、费用类型、筛选下拉；付款使用楼栋、筛选。筛选中提供仅逾期、应付日区间、关键字，费用类型未选不过滤。工单状态与类型、合同状态、流水合同统一公共下拉；单选均可取消。账单收付款状态 Tab 及业务状态计算保持原逻辑。朝向改 chip；更多筛选的待开放项继续禁用。

修改 app.js、core.js、styles.css、test.js、index.html。资源版本 filter-unify-20261018-0503（Asia/Shanghai）。

测试修正：账单列表关闭状态检查「已收（元）」「作废账单」及 #btn-bills-more；打开筛选 sheet 后检查「仅逾期」。

验证：node test.js **654 pass / 0 fail**（含浏览器）。Commit `f96aab7` 已 push main。

发布：
- https://zichao1028.github.io/yuzhi-prototype/?v=filter-unify-20261018-0503#rooms
- https://zichao1028.github.io/yuzhi-prototype/?v=filter-unify-20261018-0503#bills
- https://zichao1028.github.io/yuzhi-prototype/?v=filter-unify-20261018-0503#contracts
- https://zichao1028.github.io/yuzhi-prototype/?v=filter-unify-20261018-0503#workOrders
- https://zichao1028.github.io/yuzhi-prototype/?v=filter-unify-20261018-0503#ledger
