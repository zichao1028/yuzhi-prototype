// 校验：①示例数据不变量（Node）②无头浏览器流程。用法：node test.js [baseURL]
const K=require('./core.js');const base=process.argv[2]||'http://localhost:8080/';let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
// ---- ① seed ----
const s=K.seed();
for(const status of ['', '全部'])ok(K.matchRoomFilters(s,'304',{status},K.TODAY),'legacy and empty status no filter');
const building=K.bldOf('304');ok(K.matchRoomFilters(s,'304',{bld:building},K.TODAY)&&!K.matchRoomFilters(s,'304',{bld:'不存在'},K.TODAY),'building match');
ok(K.matchRoomFilters(s,'304',{bld:'全部楼栋'},K.TODAY),'legacy building no filter');
ok(s.v===5,'state v5');
for(const c of s.contracts){
 ok(typeof c.rent==='number'&&c.rent>0,'contract rent '+c.who);
 ok(!JSON.stringify(c).match(/H\d{3}/),'no H-code');
 const bl=K.billsOf(s,c.id);const rb=bl.filter(b=>b.k=='rent');
 ok(rb[0].s==c.start&&rb[rb.length-1].e==c.end,'periods cover '+c.who);
 const dep=bl.find(b=>b.k=='dep');if(dep)ok(dep.s==c.start&&dep.e==c.end,'dep period=contract '+c.who);
 for(let i=1;i<rb.length;i++)ok(K.addD(rb[i-1].e,1)==rb[i].s,'contiguous');
 const rentTot=K.sum(rb.map(b=>(b.items.find(i=>i.kind=='rent')||{amount:0}).amount));
 ok(Math.abs(rentTot-K.rentIn(c.rent,c.start,c.start,c.end))<0.02,'contract rent total '+c.who);
 for(const b of bl){ok(K.billPaid(b)<=K.billTotal(b)+1e-6,'paid<=total');ok(['待收','已完成','已作废'].includes(K.billStatus(b)),'status');ok(b.k!='rent'||b.items.some(i=>i.name==='租金'),'rent item name')}
 if(c.term)ok(bl.every(b=>b.done),'term→all done');
 ok(!c.rooms.some(x=>x.out&&!c.term),'no partial outs without term');
}
ok(s.settlements[0].result==1500,'吴九 refund 1500');
ok(K.rentIn(1000,'2026-01-01','2026-01-01','2026-02-15')==1500,'prorate 1.5mo');
ok(K.validateReg(s,{phone:'13800000000',rooms:[{r:'301'}],rent:1,start:'2026-11-01',end:'2026-11-30',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('租期冲突')),'conflict detected');
ok(K.validateReg(s,{phone:'13800000000',rooms:[{r:'304'}],rent:0,start:'2027-01-01',end:'2027-01-31',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('月租金')),'rent required');
ok(K.allRooms().length>20&&K.searchRooms('lofts B3').length==3,'search unit');
ok(typeof K.partialPreview==='undefined'&&typeof K.partialApply==='undefined','no partial APIs');
{
 const original=JSON.parse(JSON.stringify(K.getBuildings())),t=K.seed();
 const r=t.contracts.find(c=>!c.term&&!c.voided&&!c.removed).rooms[0].r;K.room(r).locked=true;
 ok(K.roomStatus(t,r)==='已出租','locked rented displays rented');
 ok(K.matchRoomFilters(t,r,{status:'锁房'},K.TODAY)&&K.matchRoomFilters(t,r,{status:'已出租'},K.TODAY),'locked rented matches both filters');
 ok(!K.matchRoomFilters(t,r,{status:'空房'},K.TODAY),'rented excluded from vacant filter');
 K.room('304').locked=true;
 ok(K.matchRoomFilters(t,'304',{status:'空房'},K.TODAY)&&!K.vacantRooms(t).some(x=>x.r==='304'),'locked vacant matches 空房 but excluded from vacantRooms');
 ok(K.roomStatus(t,'missing')==='空房','missing room defaults vacant');
 K.setBuildings(original);
}
// swap single room core
{const t=K.seed();const ls=t.contracts.find(c=>c.who=='李四');const r=K.swapApply(t,ls.id,'2026-10-17','304','2027-10-16',1600,'房东','2026-10-17 12:00');
 ok(ls.term&&r.newContract.rooms[0].r=='304'&&r.newContract.rent==1600&&r.newContract.start=='2026-10-18','swap core');}
// renew core
{const t=K.seed();const zs=t.contracts.find(c=>c.who=='赵六');const nc=K.renewApply(t,zs.id,'2027-07-31',1800,1800,'房东','2026-10-17 12:00');
 ok(nc.start=='2026-08-01'&&nc.end=='2027-07-31'&&zs.term&&zs.term.settled===false&&zs.term.reason=='续租','renew core');}
// multi-room swap rejected
{const t=K.seed();const z=t.contracts[0];let err='';try{K.swapApply(t,z.id,'2026-10-17','304','2027-01-01',3300)}catch(e){err=e.message}ok(err.includes('多房'),'multi swap blocked')}
// P0 房源模型 / 迁移 / 编号 / 账款不变量
{
 const original=JSON.parse(JSON.stringify(K.getBuildings()));
 K.setBuildings({'旧楼':['L101','L102']});ok(K.room('L101').floor===1&&K.getBuildings()['旧楼'].rooms.length===2,'legacy building migration');
 K.setBuildings(K.getBuildings());ok(K.allRooms().length===2,'migration idempotent');K.setBuildings(original);
 const rs=K.generateRooms(4,5,{prefix:'Q',skip4:true,min4:true});
 ok(rs.length===20&&rs.some(x=>x.r==='Q0401')&&rs.some(x=>x.r==='Q0106')&&!rs.some(x=>x.r==='Q0104'),'skip4 applies room suffix only');
 ok(K.generateRooms(2,2,{}, {1:0,2:3}).length===3,'per floor counts including zero');
 const t=K.seed();K.addBuilding('P0测试',rs,{floors:4,perFloor:5});K.addRoom('P0测试',{r:'Q0501',floor:5});
 let error='';try{K.addRoom('P0测试',{r:'Q0501',floor:5})}catch(e){error=e.message}ok(error.includes('本栋')||!!error,'unique room within building');
 K.addBuilding('跨栋同号',[{r:'Q0501',floor:1}]);ok(!!K.getBuildings()['跨栋同号'],'cross-building same room number allowed');
 K.editRoom(t,'Q0501',{locked:true,price:{monthly:1234,depMode:'amount',dep:500},area:20,note:'测试'});
 const f={phone:'13800001111',rooms:[{r:'Q0501'}],rent:1000,dep:500,depM:0,payN:1,start:'2026-10-01',end:'2026-12-31',sign:'纸质合同',payRule:{type:'before',days:7}};
 ok(K.roomStatus(t,'Q0501')==='锁房'&&K.validateReg(t,f).some(x=>x.includes('锁房')),'locked register rejected');
 K.editRoom(t,'Q0501',{locked:false});const c=K.register(t,f);K.editRoom(t,'Q0501',{r:'Q0599',locked:true});
 ok(c.rooms[0].r==='Q0599'&&c.occupants.Q0599&&K.roomStatus(t,'Q0599')==='已出租','rename references and occupied takes precedence');
 K.setBuildings(original);
}
{
 const t=K.seed(),c=t.contracts.find(c=>c.who==='赵六'),oldRent=K.billsOf(t,c.id).filter(b=>b.k==='rent');
 oldRent[0].pays=[];oldRent[0].done=false; // 其他欠款不阻止续租也不转移
 const nc=K.renewApply(t,c.id,'2027-07-31',1800,1800,'测试经办');
 const nb=K.billsOf(t,nc.id)[0],p=t.payables.find(p=>p.renewTo===nc.id);
 ok((K.billStatus(nb)==='已完成')&&p.paid===1800&&p.status==='已完成','renew equal deposit offset completed');
 ok(nc.source.from===c.id&&K.billOut(oldRent[0])===1800&&!oldRent[0].done,'renew source and old unpaid preserved');
 const ls=t.ledger.filter(l=>l.pid===p.id);ok(ls.length===2&&ls.every(l=>l.net===0)&&ls[0].fulfilled+ls[1].fulfilled===0,'offset two-sided ledger cash zero');
 const len=t.ledger.length;K.ensureLedger(t);K.ensureLedger(t);ok(t.ledger.length===len,'ledger migration idempotent');
 let e='';try{K.renewApply(t,c.id,'2028-07-31')}catch(x){e=x.message}ok(!!e,'renew cannot repeat');
}
for(const dep of [1000,2500,0]){
 const t=K.seed(),c=t.contracts.find(c=>c.who==='赵六');const nc=K.renewApply(t,c.id,'2027-07-31',1800,dep);const p=t.payables.find(p=>p.renewTo===nc.id),b=K.billsOf(t,nc.id)[0];
 ok(K.billOut(b)===Math.max(0,dep-1800)&&p.amount-p.paid===Math.max(0,1800-dep),'renew unequal deposit '+dep);
 if(p.amount>p.paid){const remaining=p.amount-p.paid;K.payPayable(t,p.id,K.TODAY);ok(t.ledger.filter(l=>l.pid===p.id&&l.method==='线下付款').reduce((a,l)=>a+l.net,0)===-remaining,'only residual paid cash');}
}
{
 const t=K.seed(),c=t.contracts.find(c=>c.who==='赵六'),b=K.billsOf(t,c.id)[0];b.pays=[];const before=JSON.stringify(t);let e='';try{K.renewApply(t,c.id,'2027-07-31')}catch(x){e=x.message}ok(e.includes('押金未付清')&&JSON.stringify(t)===before,'unpaid renewal atomic rejection');
}
{
 const t=K.seed(),c=t.contracts.find(c=>c.who==='李四');const before=JSON.stringify(t);let e='';try{K.swapApply(t,c.id,'2026-10-17','304','2027-10-16',1600,'房东',K.TODAY,[1])}catch(x){e=x.message}ok(e.includes('顺序')&&JSON.stringify(t)===before,'skip earlier bill rejected before swap mutation');
 const result=K.swapApply(t,c.id,'2026-10-17','304','2027-10-16',1600,'测试经办',K.TODAY,[0,1]);const bl=K.billsOf(t,result.newContract.id),p=t.payables.find(p=>p.sid===result.oldEv.sid);
 ok((K.billStatus(bl[0])==='已完成')&&K.billStatus(bl[1])==='待收'&&p.status==='已完成','swap ordered full then partial offset');
 ok(K.sum(bl.flatMap(b=>b.pays).filter(p=>p.m==='抵扣').map(p=>p.amount))===p.offset,'source and target conserved');
 const b=bl[1],out=K.billOut(b);K.collect(t,b.id,out,K.TODAY,'现金经办');ok((K.billStatus(b)==='已完成')&&t.ledger.some(l=>l.bid===b.id&&l.net===out&&l.by==='现金经办'),'partial to complete and collection ledger');
}


// confirm5: bill status labels, renew pending, work order, filters
{
 ok(K.billStatus({excluded:true,done:true,items:[{amount:1}],pays:[]})==='已作废','void status');
 ok(K.billStatus({done:false,items:[{amount:100}],pays:[{amount:100}]})==='已完成','fully paid is completed');
 ok(K.billStatus({done:true,items:[{amount:100}],pays:[{amount:100}]})==='已完成','done is 已完成');
 const t=K.seed(),c=t.contracts.find(c=>c.who==='李四');
 const nc=K.renewApply(t,c.id,'2028-02-28',1500,1500,'测');
 ok(nc.start>'2026-10-17'&&!nc.pendingOffset.fulfilled&&!c.term,'renew future only arranges');
 ok(K.fulfillPendingRenewals(t,'2027-03-01').includes(nc.id)&&c.term&&nc.pendingOffset.fulfilled,'renew fulfill on start day');
 const w=K.createWorkOrder(t,'304','水管漏水');ok(K.roomStatus(t,'304')==='空房'&&K.roomBizFlags(t,'304',K.TODAY).includes('维修')&&w.status==='待处理','work order → 维修');
 K.setWorkOrderStatus(t,w.id,'已完成');ok(K.roomStatus(t,'304')==='空房'&&!K.roomBizFlags(t,'304',K.TODAY).includes('维修'),'work order done clears repair');
 ok(K.matchRoomFilters(t,'304',{status:'空房'},K.TODAY),'filter 空房');
}
// gap 1–8 core regression
{
 const original=JSON.parse(JSON.stringify(K.getBuildings())),t=K.seed();
 t.contracts[0].pendingApprove=true;ok(!K.roomBizFlags(t,'301',K.TODAY).includes('合同待审批'),'approval residue removed');
 const complaint=K.createWorkOrder(t,{type:'投诉',r:'304',desc:'噪声'});ok(!K.room('304').repair&&K.roomStatus(t,'304')==='空房','complaint does not repair');
 K.WO_TYPES.forEach(type=>{const w=K.createWorkOrder(t,{type,desc:'测试'});K.setWorkOrderStatus(t,w.id,'已挂起');ok(K.openWorkOrders(t).some(x=>x.id===w.id),'suspended open '+type);K.setWorkOrderStatus(t,w.id,'已关闭');ok(!K.openWorkOrders(t).some(x=>x.id===w.id),'closed excluded '+type)});
 const w=K.createWorkOrder(t,'304','维修');ok(K.room('304').repair,'repair flips');K.setWorkOrderStatus(t,w.id,'已关闭');ok(!K.room('304').repair,'repair closes despite complaint');
 const b=K.createBooking(t,{r:'304',who:'预定人',phone:'13800001111'});ok(K.roomBizFlags(t,'304',K.TODAY).includes('已预定')&&K.roomStatus(t,'304')==='空房','booking flag only');
 let rejected=false;try{K.createBooking(t,{r:'304',who:'重复',phone:'13800001111'})}catch(e){rejected=true}ok(rejected,'duplicate booking blocked');
 const f={rooms:[{r:'304'}],phone:'13800001111',rent:1000,start:'2026-11-01',end:'2026-12-31',sign:'纸质合同',payN:1,depM:1,dep:1000,payRule:{type:'before',days:7}};
 ok(K.validateReg(t,f).some(e=>e.includes('预定')),'booking blocks registration');const pre=K.convertBooking(t,b.id);ok(pre.who==='预定人'&&b.status==='有效','conversion leaves booking until success');
 const c=K.register(t,{...f,bookingId:b.id});ok(b.status==='已转登记'&&b.cid===c.id,'successful conversion');
 const b2=K.createBooking(t,{r:'307',who:'取消',phone:'13800001111'});K.cancelBooking(t,b2.id);ok(b2.status==='已取消','cancel booking');
 const paid=t.bills.find(b=>K.billPaid(b)>0),cash=K.billPaid(paid);K.voidBill(t,paid.id);ok(K.billStatus(paid)==='已作废'&&K.billPaid(paid)===cash,'void keeps payments');
 ok(K.vacantRooms(t).length===K.allRooms().filter(x=>K.roomStatus(t,x.r)==='空房').length,'vacant count');
 K.batchPrice(t,['307','B101'],{monthly:1234,depMode:'months',dep:2});ok(K.room('307').price.monthly===1234&&K.room('B101').price.dep===2,'batch pricing');
 const oc=K.createOwnerContract(t,{building:Object.keys(K.getBuildings())[0],who:'业主',phone:'13800001111',start:'2026-01-01',end:'2027-01-01'});ok(oc.status==='生效中','owner create');K.terminateOwnerContract(t,oc.id);ok(oc.status==='已终止','owner terminate');
 const inv=K.createInvoice(t,{cid:c.id,title:'个人',amount:100});ok(inv.status==='待开','invoice create');const l=K.addLedgerNote(t,{dir:'out',name:'维护',amount:20,date:K.TODAY});ok(l.net===-20&&l.method==='线下记账','manual ledger');
 K.setBuildings(original);
}
console.log('seed checks',pass,'pass',fail,'fail');
// ---- ② flows ----
// gap2 core
{const t=K.seed();ok(t.settings.subjects.length===5&&t.apartment.name==='寓智云控','gap2 defaults');K.updateSettings(t,{ledger:{requireNote:true},billRules:{payRuleDefault:{days:3}}});const copy=JSON.parse(JSON.stringify(t));ok(copy.settings.ledger.requireNote&&copy.settings.ledger.showOffset&&copy.settings.billRules.payRuleDefault.days===3,'settings merge and serialization');const x=K.createIntentSign(t,{cid:t.contracts[0].id,title:'测试'});K.signIntent(t,x.id,'测试人');ok(x.status==='已签署'&&x.signedAt,'intent sign');const y=K.createIntentSign(t,{cid:t.contracts[0].id,title:'撤回测试'});K.withdrawIntent(t,y.id);ok(y.status==='已撤回','intent withdraw');const p=t.payables[0],paid=p.paid;K.voidPayable(t,p.id);ok(K.payableStatus(p)==='已作废'&&p.paid===paid,'payable void preserves paid');let rejected=false;try{K.payPayable(t,p.id,K.TODAY)}catch(e){rejected=true}ok(rejected,'voided payable cannot pay');rejected=false;try{K.voidPayable(t,p.id)}catch(e){rejected=true}ok(rejected,'repeat payable void rejected');t.onboarding.visitedSettings=true;ok(K.onboardingProgress(t).done.settings&&K.onboardingProgress(t).total===6,'onboarding flags')}
// Room arrears flags follow the current receipt status for all payment states.
{const t=K.seed(),c=t.contracts.find(c=>c.who==='张三'),r=c.rooms[0].r;
 const b={cid:c.id,due:K.addD(K.TODAY,-1),items:[{amount:100}],pays:[]};t.bills=[b];
 for(const paid of [0,20,100]){b.pays=[{amount:paid}];const flags=K.roomBizFlags(t,r,K.TODAY);ok(flags.includes('待收款')===(paid<100)&&flags.includes('有欠款')===(paid<100),'room receipt flags paid '+paid)}
 b.pays=[];b.done=true;ok(!K.roomBizFlags(t,r,K.TODAY).some(f=>['待收款','有欠款'].includes(f)),'completed room bill clears arrears flags');
 b.done=false;b.excluded=true;ok(!K.roomBizFlags(t,r,K.TODAY).some(f=>['待收款','有欠款'].includes(f)),'voided room bill clears arrears flags');
}
// Room arrears flags follow the receipt status through partial, completed and voided bills.
{const c={id:'flags-contract',rooms:[{r:'301'}],start:'2026-01-01',end:'2027-01-01'},b={id:'flags-bill',cid:c.id,due:'2026-01-01',items:[{amount:100}],pays:[]},t={contracts:[c],bills:[b],bookings:[]};
 const flags=()=>K.roomBizFlags(t,'301',K.TODAY);
 ok(flags().includes('待收款')&&flags().includes('有欠款'),'unpaid room has receipt and arrears flags');
 b.pays.push({amount:20});ok(flags().includes('待收款')&&flags().includes('有欠款'),'partial receipt keeps room arrears flags');
 b.pays.push({amount:80});ok(!flags().includes('待收款')&&!flags().includes('有欠款'),'completed receipt clears room arrears flags');
 b.pays=[];b.excluded=true;ok(!flags().includes('待收款')&&!flags().includes('有欠款'),'voided receipt clears room arrears flags');
}
// 寓小二 2026-10-17 确认矩阵：部分到账、付款中、重置及作废优先级。
{const t=K.seed(),c=t.contracts.find(c=>c.who==='张三'),b=K.billsOf(t,c.id).find(b=>b.k==='rent'&&K.billStatus(b)==='待收');
 K.collect(t,b.id,100,K.TODAY);ok(K.billStatus(b)==='待收'&&K.billStatusMatch(b,'待收款')&&K.billOut(b)>0,'partial receipt stays pending');
 K.resetBills(t,c.id);ok(K.billStatus(b)==='待收'&&K.billOut(b)>0,'reset preserves partial pending receipt');
 K.collect(t,b.id,K.billOut(b),K.TODAY);ok(K.billStatus(b)==='已完成'&&!K.itemsEditable(b)&&K.odays(b,K.TODAY)===0,'full receipt completed without overdue');
 K.voidBill(t,b.id);ok(b.voidedAt===K.TODAY&&!K.billStatusMatch(b,'全部')&&!K.billStatusMatch(b,'已完成'),'void receipt excluded from active filters');
 for(const p of [{amount:100,paid:0,status:'待付款'},{amount:100,paid:20,status:'部分付款'},{amount:100,paid:0,status:'付款中'},{amount:100,paid:100,status:'待付款'}])ok(K.payableStatus(p)===(p.paid===100?'已完成':p.paid>0||p.status==='付款中'?'付款中':'待付款'),'payable matrix '+p.status);
}
// Render and exercise filter state transitions without a browser.
{
const vm=require('vm'),fs=require('fs');
const location={hash:'#rooms'},document={body:{classList:{remove(){}},innerHTML:''},getElementById(){return null}},storage={};
const ctx={CORE:require(process.cwd()+'/core.js'),location,document,localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},URLSearchParams,console};ctx.window=ctx;ctx.addEventListener=()=>{};ctx.scrollTo=()=>{};vm.createContext(ctx);vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
const check=(v,m)=>ok(v,'VM '+m),html=()=>document.body.innerHTML;
for(const [page,keys] of [['rooms',['bld']],['bills',['bld','typ','more']],['bills?side=out',['bld','more']],['contracts',['t']],['workOrders',['status','type']],['ledger',['cid']]]){
 location.hash='#'+page;ctx.render();
 for(const key of keys){ctx.openListFilter(key);check((html().match(/<section class="filter-dd-sheet"/g)||[]).length===1,'single sheet');check(html().includes('重置')&&html().includes('确认'),'footer');if(key!=='more'){const value=html().match(/data-value="([^"]*)"/)[1];ctx.setListFilter(key,value);check(!location.hash.includes(key+'='),'draft');ctx.closeListFilter();ctx.openListFilter(key);check(!html().includes('aria-pressed="true"'),'discard');ctx.setListFilter(key,value);ctx.confirmListFilter();ctx.render();check(new URLSearchParams(location.hash.split('?')[1]).get(key)===value,'apply');ctx.openListFilter(key);ctx.resetListFilter();ctx.confirmListFilter();ctx.render();check(!new URLSearchParams(location.hash.split('?')[1]).get(key),'reset')}else{ctx.listFilterInput('ov',{type:'checkbox',checked:true});ctx.listFilterInput('dueFrom',{type:'date',value:'2026-01-01'});ctx.confirmListFilter();ctx.render();check(location.hash.includes('ov=1'),'overdue confirm');ctx.openListFilter(key);ctx.resetListFilter();ctx.confirmListFilter();ctx.render();check(!new URLSearchParams(location.hash.split('?')[1]).get('ov'),'reset overdue')}
 }
}
location.hash='#bills';ctx.render();
check(!html().includes('href="#ledger"'),'bills no ledger entry');
check([...html().matchAll(/<span class="(?:act)?" onclick="go\('bills'.*?>(.*?)<\/span>/g)].map(m=>m[1]).join('|')==='待收款|已完成|全部','receipt status order');
check([...html().matchAll(/id="btn-bills-(bld|typ|more)"[^>]*>(.*?) <span/g)].map(m=>m[2]).join('|')==='楼栋|账单类型|筛选','receipt filter labels');
check(!/btn-bills-(owner|dept)/.test(html())&&!/class="room-filter-row">[\s\S]*?(归属|部门)[\s\S]*?<\/button>/.test(html()),'receipt no owner or department filters');
check(html().includes('bill-room')&&!html().includes('共1间房'),'bill property row');
check(html().includes('逾期')&&html().includes('btn-bills-batch'),'overdue and batch FAB');
check(html().includes('bill-date-row'),'payment date range');
ctx.openListFilter('more');check(html().includes('href="#bills?side=void"'),'void entry in filter');
location.hash='#bills?side=out';ctx.render();
check([...html().matchAll(/<span class="(?:act)?" onclick="go\('bills'.*?>(.*?)<\/span>/g)].map(m=>m[1]).join('|')==='待付款|已完成|全部','payment status order');
check([...html().matchAll(/id="btn-bills-(bld|more)"[^>]*>(.*?) <span/g)].map(m=>m[2]).join('|')==='楼栋|筛选'&&!/btn-bills-(owner|dept|typ)/.test(html()),'payment filter labels');
location.hash='#home';ctx.render();check(html().includes('href="#ledger"'),'home ledger entry');
location.hash='#ledger';ctx.render();check(html().includes('href="#home" class="act"'),'ledger home tab');
location.hash='#rooms';ctx.render();ctx.openListFilter('bld');
check(Object.keys(ctx.CORE.getBuildings()).every(b=>html().includes('data-value="'+b+'"')),'all buildings listed');
const selectedBuilding=Object.keys(ctx.CORE.getBuildings())[0];ctx.setListFilter('bld',selectedBuilding);ctx.confirmListFilter();ctx.render();
check([...html().matchAll(/data-room="([^"]*)"/g)].every(m=>ctx.CORE.bldOf(m[1])===selectedBuilding),'building limits room cards');
location.hash='#workOrders';ctx.render();ctx.openListFilter('status');ctx.setListFilter('status',ctx.CORE.WO_STATUSES[0]);ctx.openListFilter('type');
check((html().match(/<section class="filter-dd-sheet"/g)||[]).length===1&&!html().includes('aria-pressed="true"'),'work order entries exclusive');
location.hash='#rooms';ctx.render();ctx.openRoomSheet('statusMenu');ctx.render();ctx.setRoomDraft('status','空房');ctx.setRoomDraft('status','空房');check(ctx._roomFilterDraft.status==='','deselect');ctx.setRoomDraft('biz','维修');ctx.setRoomDraft('biz','有欠款');check(ctx._roomFilterDraft.biz.length===2,'multi biz');ctx.openListFilter('bld');check(!html().includes('id="room-status-sheet"'),'exclusive building');check(html().includes('id="rooms-filter-sheet"'),'building opened');ctx.openRoomSheet('statusMenu');ctx.render();check(!html().includes('id="rooms-filter-sheet"'),'exclusive status');ctx.resetRoomDraft();ctx.confirmRoomDraft();ctx.render();check(!location.hash.includes('status=%E5%85%A8%E9%83%A8'),'no all URL');

}
console.log('core + VM checks',pass,'pass',fail,'fail');
(async()=>{const pp=require('/tmp/pt/node_modules/puppeteer-core');const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const pg=await br.newPage();await pg.setViewport({width:390,height:844});
 pg.on('dialog',async d=>{if(d.type()=='prompt')await d.accept(d.defaultValue()||'13900009999');else await d.accept()});pg.on('pageerror',e=>ok(0,'pageerror '+e.message));
 const G=async h=>{await pg.goto(base+'#'+h);await pg.waitForSelector('.nav')};const st=()=>pg.evaluate(()=>window.__state());const txt=()=>pg.evaluate(()=>document.body.innerText);
 const clk=async sel=>{await pg.$eval(sel,e=>e.click());await new Promise(r=>setTimeout(r,150))};const typ=async(sel,v)=>{await pg.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},v);await new Promise(r=>setTimeout(r,60))};
 await pg.goto(base);await pg.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await G('home');await clk('#reset');

 await G('bills?side=out');ok((await pg.$$eval('.tabs span',es=>es.map(e=>e.textContent))).join('|')==='待付款|已完成|全部','payment exact tabs');ok((await pg.$$eval('.seg b',es=>es.map(e=>e.textContent))).join('|')==='收款账单|付款账单','two top tabs');
 await pg.evaluate(()=>{const s=window.__state();s.payables.push({id:'matrix-progress',cid:s.contracts[0].id,amount:100,paid:20,status:'部分付款',due:'2026-10-10',reason:'矩阵测试'});render()});
 await G('bills?side=out&t='+encodeURIComponent('全部'));ok(await pg.$$eval('.bc .completed',es=>es.some(e=>e.textContent==='付款中')),'payment in progress card under all');
 ok(await pg.$$eval('.tabs span',es=>es.every(e=>e.textContent!=='付款中')),'no payment in progress tab');
 await G('bills?side=out&t='+encodeURIComponent('付款中'));ok((await pg.$eval('.tabs .act',e=>e.textContent))==='待付款','removed payment tab deep link defaults');
 await G('pay?id=matrix-progress');await clk('#do-pay');ok((await pg.$eval('#pstatus',e=>e.textContent))==='已完成','progress payment completes');
 await G('bills?side=out&t='+encodeURIComponent('已完成'));ok((await txt()).includes('完成日期 2026-10-17'),'payment completion date');
 await pg.evaluate(()=>{const s=window.__state();s.payables=s.payables.filter(p=>p.id!=='matrix-progress');s.ledger=s.ledger.filter(l=>l.pid!=='matrix-progress');localStorage.setItem('yuzhi-proto-state-v5',JSON.stringify(s))});
 // F0 search click
 await G('register?new=1');await pg.waitForSelector('#f-q');await typ('#f-q','B201');
 await pg.click('.sr[data-r="B201"]');await new Promise(r=>setTimeout(r,200));
 ok((await pg.$$eval('.chip',es=>es.map(e=>e.dataset.r))).includes('B201'),'click result row adds');
 // F1 register contract-level rent
 await G('room?r=304');await clk('#room-register');await pg.waitForSelector('#f-q');
 ok((await pg.$$('.chip')).length==1,'room preselected');
 await typ('#f-q','30');ok((await pg.$eval('.sr[data-r="304"]',e=>e.innerText)).includes('空房'),'空房');
 await pg.click('.sr[data-r="307"]');ok((await pg.$$('.chip')).length==2,'added 307');
 await clk('.sign:nth-child(2)');await typ('#f-phone','13811112222');await typ('#f-who','钱八');await typ('#f-idType','身份证');await typ('#f-idNo','310101199909099999');
 await typ('#f-start','2026-10-20');await typ('#f-end','2026-10-01');await typ('#f-payN','1');await typ('#f-depM','1');
 await typ('#f-rent','3000');ok((await pg.$eval('#f-dep',e=>e.value))=='3000','deposit default 押1×月租');
 await clk('#add-fee');await pg.$eval('.fee input',e=>{e.value='物业费';e.dispatchEvent(new Event('input'))});await pg.$eval('.fee input[type=number]',e=>{e.value='60';e.dispatchEvent(new Event('input'))});
 await clk('#to-preview');ok((await pg.$eval('#rerr',e=>e.textContent)).includes('结束日期'),'validation end<start');
 await typ('#f-end','2027-01-19');
 await clk('#go-idphoto');await pg.waitForSelector('#add-photo');await clk('#add-photo');await clk('#photo-done');await pg.waitForSelector('#f-q');
 ok((await pg.$eval('#f-who',e=>e.value))=='钱八','draft kept');
 await clk('#go-more');await pg.waitForSelector('#f-terms');await clk('#add-scan');await typ('#f-terms','禁止转租');await typ('#f-note','钥匙2把');await clk('#more-done');await pg.waitForSelector('#f-q');
 await clk('#go-emg');await pg.waitForSelector('#f-eRel');await typ('#f-eRel','母亲');await typ('#f-ePhone','13811110000');await typ('#f-eName','钱母');await clk('#emg-done');await pg.waitForSelector('#f-q');
 await pg.reload();await pg.waitForSelector('#f-q');ok((await pg.$eval('#f-rent',e=>e.value))=='3000','rent survives reload');
 await clk('#to-preview');await pg.waitForSelector('#do-register');
 const pb=await pg.$$eval('.pbill',es=>es.map(e=>e.innerText));
 ok(pb.length==4&&pb[0].includes('押金')&&pb[1].includes('租金')&&pb[1].includes('物业费'),'preview contract rent item');
 ok((await pg.$$eval('.pv-amt',es=>es.map(e=>e.value))).slice(0,3).join()=='3000,3000,60','preview amounts');
 await pg.$$eval('.pv-amt',es=>{es[2].value='80';es[2].dispatchEvent(new Event('input'))});await pg.$$eval('.pv-paid',es=>{es[0].checked=true;es[0].dispatchEvent(new Event('change'))});
 await clk('#do-register');await pg.waitForSelector('#to-contract');ok((await txt()).includes('租客登记办理成功'),'result page');
 await clk('#to-contract');await pg.waitForSelector('#cstatus');
 let S=await st();let nc=S.contracts[S.contracts.length-1];ok(nc.rooms.length==2&&nc.rent==3000&&nc.dep==3000&&nc.rooms[0].rent===undefined,'contract-level rent saved');
 let nb=S.bills.filter(b=>b.cid==nc.id);ok(nb[1].items.find(i=>i.name=='租金').amount==3000&&nb[1].items.find(i=>i.name=='物业费').amount==80,'bills contract rent');
 // conflict
 await G('register?new=1');await typ('#f-q','304');await pg.click('.sr[data-r="304"]');await clk('.sign:nth-child(1)');await typ('#f-phone','13811114444');await typ('#f-start','2026-12-01');await typ('#f-end','2027-03-31');await typ('#f-rent','900');
 await clk('#to-preview');ok((await pg.$eval('#rerr',e=>e.textContent)).includes('租期冲突'),'overlap blocked');
 // bills list style + contract tab same billTitle
 await G('bills?t=全部');ok((await txt()).includes('总金额（元）')&&!!(await pg.$('#btn-bills-batch')),'bills summary and batch');
 ok((await txt()).includes('已收（元）')&&!(await pg.$('a[href="#ledger"]'))&&!!(await pg.$('#btn-bills-more')),'bills tabs mirror yuxiaoer');
 await clk('#btn-bills-more');
 ok(await pg.$eval('.filter-dd-sheet',e=>e.innerText.includes('仅逾期')),'bills overdue option in filter sheet');
 await clk('.filter-dd-mask');
 await G('bills?t=已完成');ok((await pg.$$eval('.bc .completed',es=>es.every(e=>e.textContent.startsWith('完成日期')))),'completed filter only completed');
 ok((await pg.$$eval('.tabs span',es=>es.map(e=>e.textContent))).join('|')==='待收款|已完成|全部','receipt exact tabs');
 await G('bills?t=全部');ok((await txt()).includes('租金·')&&(await txt()).includes('张三'),'bill title fee·period·tenant');
 await G('rooms');ok(!!(await pg.$('#btn-room-filter'))||(await txt()).includes('筛选'),'room filter entry');
 await G('rooms?panel=1');ok(await pg.$eval('#room-filter-sheet',e=>e.textContent.includes('定价下限')&&e.textContent.includes('朝向')&&!e.textContent.includes('业务状态')),'room more filter fields');
 await G('me');ok(await pg.$eval('.me-page',e=>['公寓','个人认证','服务订购','我的账户','功能建议','关于','设置','专属客户经理'].every(t=>e.textContent.includes(t))),'me screenshot layout');
 ok(await pg.$eval('.me-page',e=>e.querySelector('.me-name').textContent==='公寓'&&[...e.querySelectorAll('.me-label')].map(x=>x.textContent).join('|')==='公寓|我的账户|功能建议|关于|设置'&&!/颜色主题|房东|示例今天|公寓资料|操作日志/.test(e.textContent)&&!e.querySelector('#reset')),'me identity and exact menu');
 await clk('.me-apartment');ok((await txt()).includes('公寓资料'),'me apartment link');await G('me');await clk('.me-menu a[href="#settings"]');ok((await txt()).includes('财务科目'),'me settings link');
 await G('settings');ok((await txt()).includes('财务科目'),'settings hub');await G('settingsLedger');await clk('#save-settings');await pg.reload();await pg.waitForSelector('#save-settings');ok((await st()).settings.ledger.defaultMethod==='线下收款','settings persisted');
 await G('intentSigns');await clk('a[href^="#intentSign?id="]');ok(!!(await pg.$('#sign-intent')),'intent clickable');await clk('#sign-intent');ok((await txt()).includes('已签署'),'intent signed UI');
 await G('onboarding');ok((await txt()).includes('/6')&&(await txt()).includes('至少一笔工单'),'onboarding checklist');S=await st();if(S.payables.length){await G('pay?id='+S.payables[0].id);ok(!!(await pg.$('#void-payable')),'payable void action');await clk('#void-payable');ok((await txt()).includes('已作废')&&!(await pg.$('#do-pay')),'payable void UI');await G('bills?side=void');ok((await pg.$$('[data-direction=out]')).length===1&&(await txt()).includes('作废日期 2026-10-17'),'independent void payable tab')}
 await G('home');ok(!!(await pg.$('#home-fab')),'home FAB');await clk('#home-fab');ok((await txt()).includes('合同多房')&&(await txt()).includes('录户号'),'FAB menu');
 ok(!(await txt()).match(/标为脏|清除脏|脏房状态/),'room filter has no dirty business');
 const z=S.contracts.find(c=>c.who=='张三');
 await G('contract?id='+z.id+'&tab=账单');
 const cbt=await pg.$eval('.bc .bt',e=>e.textContent);
 ok(cbt.includes('租金·')&&!cbt.includes('张三')&&!cbt.includes('中山南路'),'contract bill title no name/address');
 ok((await txt()).includes('待处理')&&(await txt()).includes('已完成')&&(await txt()).includes('合计'),'pending/done sections');
 ok(!!(await pg.$('#btn-add-bill'))&&!!(await pg.$('#btn-batch-collect'))&&!!(await pg.$('#btn-reset-bills')),'bill tab actions');
 ok((await pg.$$eval('.tabs span',es=>es.map(e=>e.textContent))).join('|')==='合同|账单|承租方|入住人|物业交割|设备账户','contract tabs 承租方');
 ok(!(await txt()).includes('办理记录'),'no 办理记录 tab');
 ok(!(await pg.$('#cstatus')),'bills tab hides status strip');
 ok(!!(await pg.$('.call-btn'))&&!!(await pg.$('.icon-copy')),'header call/copy');
 const cards=await pg.$$eval('.bc',es=>es.map(e=>({t:e.textContent,hasTag:!!e.querySelector('.tag')})));
 ok(cards.length&&cards.every(c=>!c.hasTag)&&!cards.some(c=>/待收|已完成|完成日期/.test(c.t)),'contract cards no status/完日期');
 const depTxt=(await pg.$$eval('.bc',es=>es.map(e=>e.textContent).find(t=>t.includes('押金'))))||'';
 ok(depTxt.includes('账期：'+z.start+' 至 '+z.end),'dep 账期 uses contract dates');

 await G('contract?id='+z.id+'&tab=物业交割');ok((await txt()).includes('第一版不实现'),'物业交割 stub');
 await G('contract?id='+z.id+'&tab=合同');ok(!!(await pg.$('#btn-checkout'))&&!(await pg.$('#btn-swap'))&&!!(await pg.$('#btn-resign')),'multi: checkout+resign, no swap');
 // collect + edit (寓小二账单详情)
 const q4=S.bills.find(b=>b.cid==z.id&&b.n==4);
 await G('bill?id='+q4.id);
 ok((await txt()).includes('详情')&&(await txt()).includes('账单明细')&&(await txt()).includes('应收')&&(await txt()).includes('线下收款')&&(await txt()).includes('线上收款'),'bill detail yuxiaoer layout');
 ok((await pg.$eval('#bstatus',e=>e.textContent))==='待收','status label 待收');
 ok((await txt()).includes('权责')&&(await txt()).includes('元/月')&&(await txt()).includes('应收总额'),'accrual period monthly recv');
 await clk('#btn-offline-collect');await pg.waitForSelector('#pamt');await typ('#pamt','5000');await clk('#do-collect');ok((await pg.$eval('#bstatus',e=>e.textContent))=='待收','partial collect');
 await clk('#edit-items');await pg.waitForSelector('#items');await pg.evaluate(()=>document.getElementById('items').insertAdjacentHTML('beforeend',itemRowHtml({name:'维修费',amount:50})));await clk('#save-items');
 S=await st();ok(S.bills.find(b=>b.id==q4.id).items.some(i=>i.name=='维修费'),'item added');
// checkout dual path 李四
 const ls=S.contracts.find(c=>c.who=='李四');
 await G('contract?id='+ls.id);ok(!!(await pg.$('#btn-swap'))&&!!(await pg.$('#btn-resign'))&&!!(await pg.$('#btn-more')),'single has swap/resign/more');
 ok(!(await pg.$$eval('.sec .row span',es=>es.map(e=>e.textContent.trim()))).includes('房间'),'no 房间 field in detail');
 await clk('#btn-checkout');await pg.waitForSelector('#co-sheet');
 ok((await txt()).includes('退房操作')&&(await txt()).includes('同时结账'),'checkout sheet');
 await clk('#co-only');await pg.waitForSelector('#do-checkout-only');await typ('#co-X','2026-10-17');await clk('#do-checkout-only');await pg.waitForSelector('.status');
 ok((await txt()).includes('先退租')&&!!(await pg.$('#go-settle')),'checkout-only result');
 S=await st();const ls2=S.contracts.find(c=>c.id==ls.id);ok(ls2.term&&ls2.term.settled===false&&K.billsOf(S,ls.id).some(b=>!b.done),'checkout-only keeps bills open');
 ok(!K.roomBusy(S,'501'),'room released');
 await clk('#go-settle');await pg.waitForSelector('#do-settle');
 ok((await txt()).includes('退租结算单')&&(await txt()).includes('应退租客金额')&&!(await txt()).includes('收款人'),'settle form no payee');
 ok(!!(await pg.$('#go-refund-items'))&&!!(await pg.$('#go-ded-items'))&&!(await pg.$('#co-refund')),'refund/ded are jumps not inputs');
 await clk('#go-ded-items');await pg.waitForSelector('#add-ded-item');
 await clk('#add-ded-item');await pg.waitForSelector('#ded-table .iamt');
 await pg.$$eval('#ded-table .iamt',es=>{const e=es[es.length-1];e.value='200';e.dispatchEvent(new Event('change'))});
 await clk('#ded-done');await pg.waitForSelector('#do-settle');
 await clk('#do-settle');await pg.waitForSelector('.status');
 S=await st();const se=S.settlements[S.settlements.length-1];ok(S.contracts.find(c=>c.id==ls.id).term.settled&&se.result==1950,'李四 settle 1950 got '+se.result);
 ok((se.dedItems||[]).some(i=>i.amount==200),'ded item persisted');
 // 张三：并结算
 await G('contract?id='+z.id);await clk('#btn-checkout');await pg.waitForSelector('#co-with-settle');await clk('#co-with-settle');await pg.waitForSelector('#do-settle');
 await typ('#co-X','2026-10-17');await clk('#do-settle');await pg.waitForSelector('.status');
 S=await st();ok(S.contracts.find(c=>c.id==z.id).term&&S.contracts.find(c=>c.id==z.id).term.settled,'张三 settled');
 // swap on 王五? multi - disabled. Use 赵六 single expired for renew; use another single for swap - 赵六 is expired single.
 // Seed another: after 李四 gone, use 赵六 for renew
 const zl=S.contracts.find(c=>c.who=='赵六');
 await G('renew?id='+zl.id);await typ('#rn-end','2027-07-31');await clk('#do-renew');await pg.waitForSelector('.status');
 S=await st();ok(S.contracts.some(c=>c.who=='赵六'&&c.start=='2026-08-01'&&c.end=='2027-07-31'&&!c.term),'renew created');
 // swap: create fresh single via seed state — use 孙七? multi. Register a single then swap.
 await G('register?new=1');await typ('#f-q','B401');await pg.click('.sr[data-r="B401"]');await clk('.sign:nth-child(1)');
 await typ('#f-phone','13822223333');await typ('#f-who','周十');await typ('#f-idType','身份证');await typ('#f-idNo','310101199001019999');await typ('#f-start','2026-10-18');await typ('#f-end','2027-04-17');await typ('#f-rent','2000');await typ('#f-dep','2000');
 await clk('#to-preview');await pg.waitForSelector('#do-register');await clk('#do-register');await pg.waitForSelector('#to-contract');await clk('#to-contract');
 S=await st();const sc=S.contracts.find(c=>c.who=='周十');
 await G('swap?id='+sc.id);await typ('#sw-X','2026-10-20');await typ('#sw-end','2027-10-16');await typ('#sw-q','B301');await pg.click('.sr[data-r="B301"]');await clk('#do-swap');
 await pg.waitForSelector('.status');S=await st();
 ok(S.contracts.find(c=>c.id==sc.id).term,'swap old terminated');
 ok(S.contracts.some(c=>c.rooms.length==1&&c.rooms[0].r=='B301'&&c.who=='周十'&&!c.term),'swap new exists');


 // building add
 await G('rooms');ok(!!(await pg.$('#btn-add-building')),'rooms add building');
 await G('buildingAdd');ok((await txt()).includes('地址选址')&&!!(await pg.$('#bld-community')),'address picker');
 await typ('#bld-name','测试独栋A');await typ('#bld-prefix','T');await clk('#bld-generate');await clk('#do-add-building');await pg.waitForSelector('#btn-add-building');
 S=await st();ok(S.buildings['测试独栋A']&&S.buildings['测试独栋A'].rooms.some(x=>x.r==='T0101'),'building added');

 // Unified dropdown drafts, reset, confirmation, and mutual exclusion.
 for(const [path,keys] of [['rooms',['bld']],['bills',['bld','typ','more']],['bills?side=out',['bld','more']],['contracts',['t']],['workOrders',['status','type']],['ledger',['cid']]]){
  await G(path);const page=path.split('?')[0];
  if(page==='bills')ok(await pg.$$eval('.room-filter-row button',(es,labels)=>es.map(e=>e.textContent.replace(/\s|▾/g,'')).join('|')===labels,path.includes('side=out')?'楼栋|筛选':'楼栋|账单类型|筛选'),'exact bills filter labels '+path);
  if(page==='bills')ok(!(await pg.$('#btn-bills-owner, #btn-bills-dept')),'no bills owner or department buttons '+path);
  ok(!(await pg.$('select:not([disabled])')),'no native list filter '+path);
  for(const key of keys){
   await clk('#btn-'+page+'-'+key);
   ok((await pg.$$('.filter-dd-sheet')).length===1,'one common sheet '+path+' '+key);
   const chip=await pg.$('.filter-dd-sheet [data-value]');
   if(chip){const value=await chip.evaluate(e=>e.dataset.value);await chip.click();ok(await pg.evaluate(k=>!new URLSearchParams(location.hash.split('?')[1]).get(k),key),'draft pending '+page+' '+key);await clk('.filter-dd-mask');await clk('#btn-'+page+'-'+key);ok(await pg.$$eval('.filter-dd-sheet [aria-pressed="true"]',es=>!es.length),'mask discards '+page+' '+key);await clk('.filter-dd-sheet [data-value]');await clk('#'+page+'-filter-sheet-confirm');ok(await pg.evaluate(([k,v])=>new URLSearchParams(location.hash.split('?')[1]).get(k)===v,[key,value]),'confirm '+page+' '+key);await clk('#btn-'+page+'-'+key);await clk('#'+page+'-filter-sheet-reset');await clk('#'+page+'-filter-sheet-confirm');ok(await pg.evaluate(k=>!new URLSearchParams(location.hash.split('?')[1]).get(k),key),'reset '+page+' '+key)}else{await clk('.filter-dd-mask')}
  }
 }
 await G('rooms');await clk('#btn-room-status');await clk('#room-status-sheet [data-value="空房"]');await clk('#room-status-sheet [data-value="空房"]');ok(await pg.evaluate(()=>window._roomFilterDraft.status===''),'status chip deselect');await clk('#btn-rooms-bld');ok((await pg.$$('.filter-dd-sheet')).length===1&&!(await pg.$('#room-status-sheet')),'building replaces status sheet');await clk('.filter-dd-mask');
 // P0 mobile CRUD, price prefill, lock, persistence, filters and ledger
 await G('rooms');ok((await pg.$$('.room-card')).length>20,'room cards not chips');
 ok((await pg.$$('.floor-sec')).length>0&&(await pg.$$('.floor-hd')).length>0,'rooms floor sections and headings');
 ok(await pg.$$eval('.building-sec',bs=>bs.every(b=>b.querySelector(':scope > h3')&&b.querySelector('.floor-sec > .floor-hd'))),'each building owns heading and floor sections');
 ok(!(await pg.$('.floor-bar')),'no floor strip');
 ok(!(await txt()).includes('地址未填写'),'no address helper');
 ok(await pg.$$eval('.building-sec',bs=>bs.every(b=>!b.querySelector(':scope > .helper'))),'no building address line');
 ok(await pg.$eval('.room-filter-row',e=>e.textContent.replace(/\s|▾/g,'')==='楼栋状态筛选'),'mobile dropdown labels');
 ok(await pg.$$eval('.room-quick',cs=>cs.map(c=>c.textContent).join('|')==='空房|即将到期|今日到期|签约中|有欠款|维修'),'mobile quick filter labels');
 await clk('#btn-room-status');
 ok(await pg.$$eval('#room-status-sheet .filter-dd-sec-title',es=>es.map(e=>e.textContent).join('|')==='业务状态|房源状态'),'status section order');
 ok(await pg.$$eval('#room-status-sheet [data-section="status"] button',bs=>bs.map(b=>b.textContent).join('|')==='空房|已出租|锁房'),'status dropdown options');
 ok(await pg.$$eval('#room-status-sheet [data-section="biz"] button',bs=>bs.map(b=>b.textContent).join('|')==='已预定|签约中|在租中|将搬入|即将到期|今日到期|到期未退房|待收款|有欠款|退租未结账|维修'),'business locked options');
 await clk('#room-status-sheet [data-value="已出租"]');
 ok(await pg.evaluate(()=>!decodeURIComponent(location.hash).includes('status=已出租')&&window._roomFilterDraft.status==='已出租'),'status draft does not apply');
 await clk('#room-status-sheet-confirm');await pg.waitForSelector('.room-card');
 ok(await pg.$$eval('.room-card',cs=>cs.every(c=>window.CORE.roomStatus(window.__state(),c.dataset.room)==='已出租')),'status dropdown filters rooms');
 await G('rooms');await clk('#btn-room-status');await clk('#room-status-sheet [data-value="有欠款"]');await clk('#room-status-sheet [data-value="在租中"]');
 ok(await pg.evaluate(()=>window._roomFilterDraft.biz.length===2&&!new URLSearchParams(location.hash.split('?')[1]).get('biz')),'business multiple draft');
 await clk('#room-status-sheet-confirm');
 ok(await pg.evaluate(()=>{const biz=new URLSearchParams(location.hash.split('?')[1]).get('biz').split('|');return biz.length===2&&[...document.querySelectorAll('.room-card')].every(c=>window.CORE.matchRoomFilters(window.__state(),c.dataset.room,{biz},window.CORE.TODAY))}),'business confirm URL and rooms');
 await clk('#btn-room-status');await clk('#room-status-sheet-reset');ok(!!(await pg.$('#room-status-sheet')),'reset keeps sheet open');await clk('#room-status-sheet-confirm');
 ok(await pg.evaluate(()=>{const q=new URLSearchParams(location.hash.split('?')[1]);return !q.get('status')&&!q.get('biz')}),'status reset clears applied filters');
 await clk('#btn-room-status');await clk('#room-status-sheet [data-value="维修"]');await clk('.filter-dd-mask');await clk('#btn-room-status');
 ok(await pg.evaluate(()=>window._roomFilterDraft.biz.length===0),'mask discards draft');
 await clk('#room-status-sheet [data-value="维修"]');await clk('#btn-room-status');await clk('#btn-room-status');
 ok(await pg.evaluate(()=>window._roomFilterDraft.biz.length===0),'trigger discards draft');
 await clk('#btn-room-filter');ok(!!(await pg.$('#room-filter-sheet'))&&!(await pg.$('#room-status-sheet')),'filter opens exclusively');
 ok(await pg.$eval('#room-filter-sheet',e=>e.textContent.includes('定价下限')&&e.textContent.includes('朝向')&&!e.textContent.includes('房源状态')&&!e.textContent.includes('业务状态')),'more filter content');
 await typ('#room-filter-minPrice','1000');await clk('#room-filter-orient-南');
 ok(await pg.evaluate(()=>!new URLSearchParams(location.hash.split('?')[1]).get('minPrice')),'more draft does not apply');await clk('#room-filter-sheet-confirm');
 ok(await pg.evaluate(()=>{const q=new URLSearchParams(location.hash.split('?')[1]);return q.get('minPrice')==='1000'&&q.get('orient')==='南'&&!q.get('panel')}),'more confirm applies');
 await clk('#btn-room-filter');await clk('#room-filter-sheet-reset');await clk('#room-filter-sheet-confirm');
 ok(await pg.evaluate(()=>{const q=new URLSearchParams(location.hash.split('?')[1]);return !q.get('minPrice')&&q.get('orient')==='全部'}),'more reset clears');
 await G('rooms');
 for(const label of ['空房','即将到期','今日到期','签约中','有欠款','维修']){
  const selector='.room-quick[data-filter="'+label+'"]';await clk(selector);
  ok(await pg.$eval(selector,e=>e.getAttribute('aria-pressed')==='true'),'quick enabled '+label);
  ok(await pg.evaluate(label=>{const q=Object.fromEntries(new URLSearchParams(location.hash.split('?')[1]));const f={status:q.status,biz:(q.biz||'').split('|').filter(Boolean)};return (label==='空房'?q.status===label:f.biz.includes(label))&&[...document.querySelectorAll('.room-card')].every(c=>window.CORE.matchRoomFilters(window.__state(),c.dataset.room,f,window.CORE.TODAY))},label),'quick filters rooms '+label);
  await clk(selector);ok(await pg.$eval(selector,e=>e.getAttribute('aria-pressed')==='false'),'quick disabled '+label);
 }
 ok(await pg.$$eval('.floor-hd',hs=>hs.every(h=>/^\d+层$/.test(h.textContent))),'floor headings use N层');
 ok(await pg.$$eval('.room-card',cs=>cs.every(c=>!/退:|到期\s*\d{4}|\d+楼/.test(c.textContent))),'room cards omit checkout dates, expiry dates and floor labels');
 ok(await pg.$$eval('.room-card.vacant .mid-l',cs=>cs.some(c=>/^空\d+天$/.test(c.textContent))),'vacant cards show 空N天');
 ok(await pg.$$eval('.room-card.rented',cs=>cs.length>0&&cs.every(card=>{const c=window.__state().contracts.find(c=>!c.term&&!c.voided&&!c.removed&&c.rooms.some(r=>r.r===card.dataset.room&&!r.out));return card.querySelector('.mid-l').textContent===(c.who||c.phone||'租客')&&/^¥\d+(\.\d{2})?\/月$/.test(card.querySelector('.mid-r').textContent)})),'rented cards show tenant in mid left and price in mid right');
 ok(await pg.$$eval('.room-card',cs=>cs.every(c=>c.querySelector('.foot')&&c.querySelector('.hd strong')&&c.querySelector('.hd .layout')&&c.querySelector('.mid')&&[...c.querySelector('.foot').children].every(e=>e.matches('.rbadges')))),'room cards have header, mid row and badges-only foot');
 ok(await pg.$$eval('.room-card',cs=>cs.some(c=>c.classList.contains('rented'))&&cs.some(c=>c.classList.contains('vacant'))),'room cards tone rented/vacant');

 await G('room?r=T0101');ok((await txt()).includes('合同列表')&&(await txt()).includes('暂无合同'),'room contract empty state');
 await G('roomPrice?r=T0101');await typ('#rp-monthly','1350');await typ('#rp-mode','amount');await typ('#rp-dep','600');await clk('#save-price');
 await pg.waitForSelector('#room-register');await clk('#room-register');await pg.waitForSelector('#f-rent');
 ok(await pg.$eval('#f-rent',e=>e.value==='1350')&&await pg.$eval('#f-dep',e=>e.value==='600'),'price suggestion in registration');
 await G('roomEdit?r=T0101');await typ('#re-r','T0199');await typ('#re-area','25');await typ('#re-orient','南');await clk('#save-room');await pg.waitForSelector('#room-lock');
 await clk('#room-lock');ok(!(await pg.$('#room-register')),'locked hides registration');
 await pg.reload();await pg.waitForSelector('#room-lock');ok((await txt()).includes('锁房')&&(await txt()).includes('25'),'room edit lock persist');
 await G('rooms?status=锁房');ok((await pg.$$('.room-card')).length===1,'locked status filter');
 await G('roomEdit?b='+encodeURIComponent('测试独栋A'));await typ('#re-r','T9901');await typ('#re-floor','9');await clk('#save-room');await pg.waitForSelector('#room-lock');
 S=await st();ok(S.buildings['测试独栋A'].rooms.some(x=>x.r==='T9901'),'add room existing building');
 await G('rooms?floor=9');ok((await pg.$$('.room-card')).length===1,'floor filter');
 await G('rooms');ok((await pg.$$('.room-card')).length>1,'clear URL floor filter');

 await G('ledger?cid='+zl.id);ok((await txt()).includes('押金')&&(await txt()).includes('抵扣（非现金）'),'renew ledger visible');
 await G('contract?id='+zl.id+'&tab='+encodeURIComponent('账单'));ok(!!(await pg.$('a[href="#ledger?cid='+zl.id+'"]')),'contract ledger link');
 // paid seed single-room swap: cannot select later period first
 await pg.evaluate(()=>{localStorage.setItem('p0-backup',JSON.stringify(window.__state()));resetDemo()});await G('home');S=await st();const swapC=S.contracts.find(c=>c.who==='李四');
 await G('swap?id='+swapC.id);await typ('#sw-end','2027-10-16');await typ('#sw-q','304');await clk('.sr[data-r="304"]');
 await clk('.offset-check:nth-of-type(1)'); // first checkbox selected below via label-specific selectors
 await pg.evaluate(()=>{window.SW.offset=[];swapOffset(1,true)});
 ok(await pg.evaluate(()=>window.SW.offset.length===0),'UI skip period blocked');
 await pg.evaluate(()=>{swapOffset(0,true);swapOffset(1,true)});await clk('#do-swap');await pg.waitForSelector('.status');S=await st();const swapped=S.contracts[S.contracts.length-1];
 ok(S.bills.some(b=>b.cid===swapped.id&&b.pays.some(p=>p.m==='抵扣')),'swap offset browser persisted');
 await G('ledger?cid='+swapped.id);ok((await txt()).includes('抵扣金额'),'swap ledger visible');
 await pg.evaluate(()=>{localStorage.setItem('yuzhi-proto-state-v5',localStorage.getItem('p0-backup'));localStorage.removeItem('p0-backup')});await pg.reload();await pg.waitForSelector('.nav');S=await st();
 // F resign: 王五重签
 const ww=S.contracts.find(c=>c.who=='王五'&&!c.voided);
 await G('contract?id='+ww.id);await clk('#btn-resign');await pg.waitForSelector('#f-rent');
 ok((await pg.$eval('#f-rent',e=>e.value))=='2200'&&(await txt()).includes('重签'),'resign prefills');
 await typ('#f-rent','2300');await clk('#to-preview');await pg.waitForSelector('#do-register');await clk('#do-register');await pg.waitForSelector('#to-contract');
 S=await st();const oldW=S.contracts.find(c=>c.id==ww.id);const neu=S.contracts.find(c=>c.who=='王五'&&c.source&&c.source.type=='重签');
 ok(oldW.voided&&neu&&neu.rent==2300&&K.billsOf(S,oldW.id).every(b=>b.done&&b.excluded),'resign voids old + excludes bills');
 // reset
 await G('home');await clk('#reset');S=await st();ok(S.contracts.length==6&&S.settlements.length==1,'reset');
 for(const h of ['workOrders','workOrderNew','vacant','bookings','bookingNew','batchPrice','batchEdit','ownerContracts','ownerContractNew','invoices','ledgerNote','meterAccount','home','contracts','bills','bills?side=out','rooms','room?r=301','settlement?id='+S.settlements[0].id]){await G(h);ok((await txt()).length>20,'render '+h)}
 await G('home');ok(!!(await pg.$('#home-fab')),'home FAB');await clk('#home-fab');ok((await txt()).includes('合同多房')&&(await txt()).includes('录户号'),'FAB menu');
 ok(!(await txt()).match(/H\d{3}/),'no H codes');
 await G('rooms');await pg.screenshot({path:require('path').join(__dirname,'rooms-mobile-after.png'),fullPage:true});
 console.log('total',pass,'pass',fail,'fail');await br.close();process.exit(fail?1:0)})();
