# 公共下拉筛统一 · 2026-10-18

房源顶栏为「楼栋 | 状态 | 筛选」。房源状态仅空房、已出租、锁房；重复点击取消，未选即全部，重置清空状态与业务状态。业务状态保留原有多选和匹配语义。旧 status=全部 仍兼容，后续房源筛选确认输出空状态。

filterDropdownSheet 增加 ariaLabel；filterBar 共用单入口草稿控制、遮罩丢弃、重置及确认。房源楼栋按 getBuildings 的键生成，core.matchRoomFilters 增加 bld 匹配，空值与旧「全部楼栋」不过滤。房源状态、楼栋、更多筛选互斥。

账单收款使用楼栋、费用类型、筛选下拉；付款使用楼栋、筛选。筛选中提供仅逾期、应付日区间、关键字，费用类型未选不过滤。工单状态与类型、合同状态、流水合同统一公共下拉；单选均可取消。账单收付款状态 Tab 及业务状态计算保持原逻辑。朝向改 chip；更多筛选的待开放项继续禁用。

修改 app.js、core.js、styles.css、test.js、index.html。资源版本 filter-unify-20261018-0503（Asia/Shanghai）。

验证：语法检查与 git diff --check 通过。node test.js 的核心及 VM 渲染/交互检查 446 pass / 0 fail，覆盖楼栋匹配、旧链接、各页公共 sheet、确认/重置/遮罩丢弃、入口互斥及房源单选取消。浏览器用例已补齐，但全量测试未完成：沙箱禁止 socket，Chrome 在 setsockopt 处启动失败；本地 HTTP 服务同样无法启动。未将这些检查冒充浏览器验证。

测试修正：账单列表关闭状态继续检查「已收（元）」「作废账单」及筛选入口；点击 #btn-bills-more 后，在 .filter-dd-sheet 内检查「仅逾期」，再关闭弹层。扫描 test.js 未发现其他依赖关闭页面展示筛选选项的过期断言；费用类型、工单类型、合同状态等已有打开公共 sheet 后的交互覆盖。未修改账单业务状态语义。

本次复验：node test.js 为核心及 VM 检查 446 pass / 0 fail，Puppeteer 启动 Chrome 仍报 setsockopt: Operation not permitted (1)，因此无法确认浏览器全量通过。保留原有未跟踪 rooms-mobile-after.png，不纳入提交。

交付阻塞（本次复验）：git add 指定的六个文件时失败：fatal: Unable to create '/workspace/yuzhi-prototype/.git/index.lock': Read-only file system。因此未能创建提交或推送，本次变更尚未部署。
