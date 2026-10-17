// 校验：①示例数据不变量（Node）②无头浏览器流程。用法：node test.js [baseURL]
const K=require('./core.js');const base=process.argv[2]||'http://localhost:8080/';let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
// ---- ① seed ----
const s=K.seed();
ok(s.v===5,'state v5');
for(const c of s.contracts){
 ok(typeof c.rent==='number'&&c.rent>0,'contract rent '+c.who);
 ok(!JSON.stringify(c).match(/H\d{3}/),'no H-code');
 const bl=K.billsOf(s,c.id);const rb=bl.filter(b=>b.k=='rent');
 ok(rb[0].s==c.start&&rb[rb.length-1].e==c.end,'periods cover '+c.who);
 for(let i=1;i<rb.length;i++)ok(K.addD(rb[i-1].e,1)==rb[i].s,'contiguous');
 const rentTot=K.sum(rb.map(b=>(b.items.find(i=>i.kind=='rent')||{amount:0}).amount));
 ok(Math.abs(rentTot-K.rentIn(c.rent,c.start,c.start,c.end))<0.02,'contract rent total '+c.who);
 for(const b of bl){ok(K.billPaid(b)<=K.billTotal(b)+1e-6,'paid<=total');ok(['待收','部分收款','已收','已完成'].includes(K.billStatus(b)),'status');ok(b.k!='rent'||b.items.some(i=>i.name==='租金'),'rent item name')}
 if(c.term)ok(bl.every(b=>b.done),'term→all done');
 ok(!c.rooms.some(x=>x.out&&!c.term),'no partial outs without term');
}
ok(s.settlements[0].result==1500,'吴九 refund 1500');
ok(K.rentIn(1000,'2026-01-01','2026-01-01','2026-02-15')==1500,'prorate 1.5mo');
ok(K.validateReg(s,{phone:'13800000000',rooms:[{r:'301'}],rent:1,start:'2026-11-01',end:'2026-11-30',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('租期冲突')),'conflict detected');
ok(K.validateReg(s,{phone:'13800000000',rooms:[{r:'304'}],rent:0,start:'2027-01-01',end:'2027-01-31',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('月租金')),'rent required');
ok(K.allRooms().length>20&&K.searchRooms('lofts B3').length==3,'search unit');
ok(typeof K.partialPreview==='undefined'&&typeof K.partialApply==='undefined','no partial APIs');
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
 let error='';try{K.addRoom('P0测试',{r:'Q0501',floor:5})}catch(e){error=e.message}ok(!!error,'unique room number');
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
 ok(K.billStatus(nb)==='已完成'&&p.paid===1800&&p.status==='已完成','renew equal deposit offset completed');
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
 ok(K.billStatus(bl[0])==='已完成'&&K.billStatus(bl[1])==='部分收款'&&p.status==='已完成','swap ordered full then partial offset');
 ok(K.sum(bl.flatMap(b=>b.pays).filter(p=>p.m==='抵扣').map(p=>p.amount))===p.offset,'source and target conserved');
 const b=bl[1],out=K.billOut(b);K.collect(t,b.id,out,K.TODAY,'现金经办');ok(K.billStatus(b)==='已完成'&&t.ledger.some(l=>l.bid===b.id&&l.net===out&&l.by==='现金经办'),'partial to complete and collection ledger');
}

console.log('seed checks',pass,'pass',fail,'fail');
// ---- ② flows ----
(async()=>{const pp=require('/tmp/pt/node_modules/puppeteer-core');const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const pg=await br.newPage();await pg.setViewport({width:390,height:844});
 pg.on('dialog',async d=>{if(d.type()=='prompt')await d.accept(d.defaultValue()||'13900009999');else await d.accept()});pg.on('pageerror',e=>ok(0,'pageerror '+e.message));
 const G=async h=>{await pg.goto(base+'#'+h);await pg.waitForSelector('.nav')};const st=()=>pg.evaluate(()=>window.__state());const txt=()=>pg.evaluate(()=>document.body.innerText);
 const clk=async sel=>{await pg.$eval(sel,e=>e.click());await new Promise(r=>setTimeout(r,150))};const typ=async(sel,v)=>{await pg.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},v);await new Promise(r=>setTimeout(r,60))};
 await pg.goto(base);await pg.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await G('home');await clk('#reset');
 // F0 search click
 await G('register?new=1');await pg.waitForSelector('#f-q');await typ('#f-q','B201');
 await pg.click('.sr[data-r="B201"]');await new Promise(r=>setTimeout(r,200));
 ok((await pg.$$eval('.chip',es=>es.map(e=>e.dataset.r))).includes('B201'),'click result row adds');
 // F1 register contract-level rent
 await G('room?r=304');await clk('#room-register');await pg.waitForSelector('#f-q');
 ok((await pg.$$('.chip')).length==1,'room preselected');
 await typ('#f-q','30');ok((await pg.$eval('.sr[data-r="304"]',e=>e.innerText)).includes('空房可租'),'空房可租');
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
 await G('bills?t=全部');ok((await txt()).includes('总金额（元）')&&!(await txt()).includes('批量'),'bills summary no batch');
 ok((await txt()).includes('租金·')&&(await txt()).includes('张三'),'bill title fee·period·tenant');
 const z=S.contracts.find(c=>c.who=='张三');
 await G('contract?id='+z.id+'&tab=账单');
 const cbt=await pg.$eval('.bc .bt',e=>e.textContent);
 ok(cbt.includes('租金·')&&!cbt.includes('张三')&&!cbt.includes('中山南路'),'contract bill title no name/address');
 ok((await txt()).includes('待处理')&&(await txt()).includes('已完成')&&(await txt()).includes('合计'),'pending/done sections');
 ok(!!(await pg.$('#btn-add-bill'))&&!!(await pg.$('#btn-batch-collect'))&&!!(await pg.$('#btn-reset-bills')),'bill tab actions');
 ok(!(await txt()).includes('办理记录'),'no 办理记录 tab');
 await G('contract?id='+z.id+'&tab=物业交割');ok((await txt()).includes('第一版不实现'),'物业交割 stub');
 await G('contract?id='+z.id+'&tab=合同');ok(!!(await pg.$('#btn-checkout'))&&!(await pg.$('#btn-swap'))&&!!(await pg.$('#btn-resign')),'multi: checkout+resign, no swap');
 // collect + edit
 const q4=S.bills.find(b=>b.cid==z.id&&b.n==4);
 await G('bill?id='+q4.id);await typ('#pamt','5000');await clk('#do-collect');ok((await pg.$eval('#bstatus',e=>e.textContent))=='部分收款','partial collect');
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
 await G('buildingAdd');await typ('#bld-name','测试独栋A');await typ('#bld-prefix','T');await clk('#bld-generate');await clk('#do-add-building');await pg.waitForSelector('#btn-add-building');
 S=await st();ok(S.buildings['测试独栋A']&&S.buildings['测试独栋A'].rooms.some(x=>x.r==='T0101'),'building added');

 // P0 mobile CRUD, price prefill, lock, persistence, filters and ledger
 await G('rooms');ok((await pg.$$('.room-card')).length>20,'room cards not chips');
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
 await G('me');await clk('#reset');S=await st();ok(S.contracts.length==6&&S.settlements.length==1,'reset');
 for(const h of ['home','contracts','bills','bills?side=out','rooms','room?r=301','settlement?id='+S.settlements[0].id]){await G(h);ok((await txt()).length>20,'render '+h)}
 ok(!(await txt()).match(/H\d{3}/),'no H codes');
 console.log('total',pass,'pass',fail,'fail');await br.close();process.exit(fail?1:0)})();
