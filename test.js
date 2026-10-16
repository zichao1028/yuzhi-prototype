// 校验：①示例数据不变量（Node）②无头浏览器流程测试。用法：node test.js [baseURL]
const K=require('./core.js');const base=process.argv[2]||'http://localhost:8081/';let pass=0,fail=0;const ok=(c,m)=>{if(c)pass++;else{fail++;console.log('FAIL',m)}};
// ---- ① seed ----
const s=K.seed();
for(const c of s.contracts){const bl=K.billsOf(s,c.id);
 ok(!JSON.stringify(c).match(/H\d{3}/),'no H-code');
 const rb=bl.filter(b=>b.k=='rent');ok(rb[0].s==c.start&&rb[rb.length-1].e==c.end,'periods cover '+c.who);
 for(let i=1;i<rb.length;i++)ok(K.addD(rb[i-1].e,1)==rb[i].s,'contiguous');
 for(const x of c.rooms){const tot=K.sum(rb.map(b=>(b.items.find(i=>i.kind=='rent'&&i.room==x.r)||{amount:0}).amount));ok(Math.abs(tot-K.rentIn(x.rent,c.start,c.start,c.end))<0.02,'room total '+x.r)}
 for(const b of bl){ok(K.billPaid(b)<=K.billTotal(b)+1e-6,'paid<=total');ok(['待收','部分收款','已收','已完成'].includes(K.billStatus(b)),'status')}
 if(c.term)ok(bl.every(b=>b.done),'term→all done')}
const ws=s.contracts.find(c=>c.who=='王五');const aug=K.billsOf(s,ws.id).find(b=>b.n==6),sep=K.billsOf(s,ws.id).find(b=>b.n==7);
ok(K.billTotal(aug)==2200&&K.billStatus(aug)=='已收','paid Aug untouched');ok(sep.pays.some(p=>p.m=='抵扣'&&p.amount==600),'Aug excess 600 deducted Sep');
ok(K.billsOf(s,ws.id).filter(b=>b.n>=7).every(b=>b.items.some(i=>i.name=='306退租'&&i.amount==-1200)),'later bills -1200');
ok(K.rentIn(1000,'2026-01-01','2026-01-01','2026-02-15')==1500,'prorate 1.5mo');ok(K.rentIn(3000,'2026-01-31','2026-01-31','2026-02-27')==3000,'month-end anchor');
ok(s.settlements[0].result==1500,'吴九 refund 1500');ok(K.validateReg(s,{phone:'13800000000',rooms:[{r:'301',rent:1}],start:'2026-11-01',end:'2026-11-30',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('租期冲突')),'conflict detected');
// direct partial on 张三: 301 out 2026-11-15 → Q4 (unpaid 10200) credit 3000-1500=1500
{const t=K.seed();const z=t.contracts[0];const pv=K.partialPreview(t,z.id,['301'],'2026-11-15');ok(pv.lines.length==1&&pv.lines[0].props[0].credit==1500,'partial preview Q4 1500');}
ok(K.validateReg(s,{phone:'13800000000',idPhotos:1,rooms:[{r:'304',rent:1}],start:'2027-01-01',end:'2027-01-31',sign:'纸质合同',payN:1,depM:1,dep:0,payRule:{type:'before',days:1}}).some(e=>e.includes('证件照片')),'photo w/o identity blocked');
ok(K.allRooms().length>20&&K.searchRooms('lofts B3').length==3&&K.searchRooms('漕溪').length==3,'search unit');
console.log('seed checks',pass,'pass',fail,'fail');
// ---- ② flows ----
(async()=>{const pp=require('/tmp/pt/node_modules/puppeteer-core');const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const pg=await br.newPage();await pg.setViewport({width:390,height:844});
 pg.on('dialog',async d=>{if(d.type()=='prompt')await d.accept(d.defaultValue()||'13900009999');else await d.accept()});pg.on('pageerror',e=>ok(0,'pageerror '+e.message));
 const G=async h=>{await pg.goto(base+'#'+h);await pg.waitForSelector('.nav')};const st=()=>pg.evaluate(()=>window.__state());const txt=()=>pg.evaluate(()=>document.body.innerText);
 const clk=async sel=>{await pg.$eval(sel,e=>e.click());await new Promise(r=>setTimeout(r,150))};const typ=async(sel,v)=>{await pg.$eval(sel,(e,v)=>{e.value=v;e.dispatchEvent(new Event('input'));e.dispatchEvent(new Event('change'))},v);await new Promise(r=>setTimeout(r,60))};
 await pg.goto(base);await pg.evaluate(()=>{localStorage.clear();sessionStorage.clear()});await G('home');await clk('#reset');
 // F1 租客登记: from room 304, fuzzy search adds 307, sub-pages keep draft, preview → confirm → result → contract
 await G('room?r=304');await clk('#room-register');await pg.waitForSelector('#f-q');
 ok((await pg.$$('.chip')).length==1,'room preselected');
 await typ('#f-q','LOFTS b2');ok((await pg.$$eval('.sr',es=>es.map(e=>e.dataset.r))).join()=='B201,B202,B203','fuzzy case-insensitive multi-keyword');
 await typ('#f-q','30');ok((await pg.$$('.sr')).length>=7,'partial room number match');ok((await pg.$eval('.sr[data-r="301"]',e=>e.innerText)).includes('已入住'),'search shows doc 租赁状态');ok((await pg.$eval('.sr[data-r="304"]',e=>e.innerText)).includes('无租赁'),'无租赁 term');
 await clk('.sr[data-r="307"] button');ok((await pg.$$('.chip')).length==2,'added 307');
 await clk('.sign:nth-child(2)');await typ('#f-phone','13811112222');await typ('#f-who','钱八');await typ('#f-idType','身份证');await typ('#f-idNo','310101199909099999');
 await typ('#f-start','2026-10-20');await typ('#f-end','2026-10-01');await typ('#f-payN','1');await typ('#f-depM','1');
 await typ('.rent[data-r="304"]','1000');await typ('.rent[data-r="307"]','2000');ok((await pg.$eval('#f-dep',e=>e.value))=='3000','deposit default 押1×合计');
 await clk('#add-fee');await pg.$eval('.fee input',e=>{e.value='物业费';e.dispatchEvent(new Event('input'))});await pg.$eval('.fee input[type=number]',e=>{e.value='60';e.dispatchEvent(new Event('input'))});
 await clk('#to-preview');ok((await pg.$eval('#rerr',e=>e.textContent)).includes('结束日期'),'validation end<start');ok(!(await txt()).includes('账单预览'),'no inline preview');
 await typ('#f-end','2027-01-19');
 // sub-pages: 证件照 then 更多 then 紧急联系人, draft survives
 await clk('#go-idphoto');await pg.waitForSelector('#add-photo');await clk('#add-photo');await clk('#add-photo');await clk('#photo-done');await pg.waitForSelector('#f-q');
 ok((await pg.$eval('#go-idphoto',e=>e.innerText)).includes('2 张'),'id photo count returned');ok((await pg.$eval('#f-who',e=>e.value))=='钱八'&&(await pg.$$('.chip')).length==2,'draft kept after sub-page');
 ok((await pg.$eval('#f-idNo',e=>e.value))=='310101199909099999','idNo kept');
 await clk('#go-more');await pg.waitForSelector('#f-terms');await clk('#add-scan');await typ('#f-terms','禁止转租');await typ('#f-note','钥匙2把');await clk('#more-done');await pg.waitForSelector('#f-q');
 await clk('#go-emg');await pg.waitForSelector('#f-eRel');await typ('#f-eRel','母亲');await typ('#f-ePhone','13811110000');await typ('#f-eName','钱母');await clk('#emg-done');await pg.waitForSelector('#f-q');
 await pg.reload();await pg.waitForSelector('#f-q');ok((await pg.$eval('.rent[data-r="307"]',e=>e.value))=='2000'&&(await pg.$eval('#go-emg',e=>e.innerText)).includes('钱母'),'draft survives reload');
  await clk('#to-preview');await pg.waitForSelector('#do-register');const pb=await pg.$$eval('.pbill',es=>es.map(e=>e.innerText));
 ok(pb.length==4&&pb[0].includes('押金')&&pb[1].includes('304租金')&&pb[1].includes('物业费'),'preview lists bills with items');
 ok((await pg.$$eval('.pv-amt',es=>es.map(e=>e.value))).slice(0,4).join()=='3000,1000,2000,60','preview item amounts');
 await pg.$$eval('.pv-amt',es=>{es[3].value='80';es[3].dispatchEvent(new Event('input'))});await pg.$$eval('.pv-paid',es=>{es[0].checked=true;es[0].dispatchEvent(new Event('change'))});
 await pg.goBack();await pg.waitForSelector('#f-q');ok((await pg.$eval('#f-phone',e=>e.value))=='13811112222'&&(await pg.$$('.chip')).length==2,'back from preview intact');
 await clk('#to-preview');await pg.waitForSelector('#do-register');ok((await pg.$$eval('.pv-amt',es=>es[3].value))=='80','preview edits kept');await clk('#do-register');await pg.waitForSelector('#to-contract');ok((await txt()).includes('租客登记办理成功')&&(await txt()).includes('邀请二维码')&&(await txt()).includes('房间号 307'),'result page');
 await clk('#to-contract');await pg.waitForSelector('#cstatus');
 let S=await st();let nc=S.contracts[S.contracts.length-1];ok(nc.rooms.length==2&&nc.dep==3000&&nc.idPhotos==2&&nc.scans==1&&nc.terms=='禁止转租'&&nc.emergency.name=='钱母','contract fields saved');let nb=S.bills.filter(b=>b.cid==nc.id);
 ok(nb.length==4&&nb[1].items.find(i=>i.name=='304租金').amount==1000&&nb[1].items.find(i=>i.name=='物业费').amount==80,'bills per room + edited fee');ok(K.billStatus(nb[0])=='已收'&&K.billStatus(nb[1])=='待收','已线下收款 prepaid deposit');ok((await pg.$eval('#cstatus',e=>e.textContent))=='生效中','before start: contract 生效中');
 ok(await pg.evaluate(()=>!sessionStorage.getItem('yuzhi-reg-draft')),'draft cleared after confirm');
 await G('contract?id='+nc.id+'&tab=入住人');ok((await txt()).includes('待搬入'),'rooms 待搬入 before start');ok(!!(await pg.$('#btn-checkout')),'checkout allowed before start');
 // 租期冲突: occupied room selectable, blocked on overlap with reason; allowed when no overlap
 await G('register?new=1');await pg.waitForSelector('#f-q');await typ('#f-q','304');await clk('.sr[data-r="304"] button');await clk('.sign:nth-child(1)');await typ('#f-phone','13811114444');await typ('#f-start','2026-12-01');await typ('#f-end','2027-03-31');await typ('.rent[data-r="304"]','900');
 await clk('#to-preview');ok((await pg.$eval('#rerr',e=>e.textContent)).includes('租期冲突'),'overlap blocked with reason');
 await typ('#f-start','2027-01-20');await typ('#f-end','2027-06-30');await clk('#to-preview');ok(!!(await pg.$('#do-register')),'non-overlapping period on occupied room allowed');
 // F1b multi-building registration (no building restriction)
 {const t2=K.seed();const mc=K.register(t2,{phone:'13811113333',rooms:[{r:'307',rent:900},{r:'103',rent:800}],start:'2026-11-01',end:'2027-10-31',sign:'纸质合同',payN:1,depM:1,dep:1700,payRule:{type:'before',days:3},fees:[]});ok(K.titleText(mc)=='中山南路2-14号307、虹桥路1号3号楼103','multi-building title '+K.titleText(mc));}
 // F2 collect partial then full on 张三 Q4
 S=await st();const z=S.contracts[0];const q4=S.bills.find(b=>b.cid==z.id&&b.n==4);
 await G('bill?id='+q4.id);await typ('#pamt','5000');await clk('#do-collect');ok((await pg.$eval('#bstatus',e=>e.textContent))=='部分收款','partial collect');
 await typ('#pamt','99999');await clk('#do-collect');ok((await pg.$eval('#perr',e=>e.textContent)).includes('不能超过'),'overpay blocked');
 // F3 edit items: add 维修费 50 on Q4
 await clk('#edit-items');await pg.waitForSelector('#items');await pg.evaluate(()=>document.getElementById('items').insertAdjacentHTML('beforeend',itemRowHtml({name:'维修费',amount:50})));await clk('#save-items');
 S=await st();ok(S.bills.find(b=>b.id==q4.id).items.some(i=>i.name=='维修费'&&i.amount==50),'item added');
 const q1=S.bills.find(b=>b.cid==z.id&&b.n==1);await G('bill?id='+q1.id);ok(!(await pg.$('#edit-items')),'paid bill not editable');
 // F4 partial checkout 张三 301 X=2026-11-15 → Q4 credit 1500; Q4 outstanding 5250 so applied
 await G('contract?id='+z.id);await clk('#btn-checkout');await pg.waitForSelector('.co-room');await pg.$eval('.co-room[value="301"]',e=>{e.checked=true;e.onchange()});await typ('#co-X','2026-11-15');
 ok((await txt()).includes('¥10250.00 → ¥8750.00'),'partial preview shows before/after');await clk('#do-checkout');await pg.waitForSelector('.status');
 ok((await txt()).includes('部分退租办理成功'),'result page');S=await st();const z2=S.contracts.find(c=>c.id==z.id);ok(!z2.term&&z2.rooms.find(x=>x.r=='301').out=='2026-11-15','301 已退租, contract continues');
 ok(S.contracts.length==7,'no new contract');ok(K.billTotal(S.bills.find(b=>b.id==q4.id))==8750,'Q4 adjusted');
 // F4b partial with excess→refund: 孙七 102 out 2026-10-31; Q1 paid (credit 5100-1700*2=1700 excess) Q2..Q4 -5100
 const sq=S.contracts.find(c=>c.who=='孙七');await G('checkout?id='+sq.id);await pg.$eval('.co-room[value="102"]',e=>{e.checked=true;e.onchange()});await typ('#co-X','2026-10-31');await clk('#xm-refund');await clk('#do-checkout');await pg.waitForSelector('.status');
 S=await st();const pay=S.payables.find(p=>p.cid==sq.id);ok(pay&&pay.amount==1700,'refund payable 1700');ok(S.bills.find(b=>b.cid==sq.id&&b.n==1).items.length==3,'paid bill unmodified');
 await G('pay?id='+pay.id);await clk('#do-pay');ok((await pg.$eval('#pstatus',e=>e.textContent))=='已完成','payable paid');
 // F5 final checkout 李四 501 X=2026-10-17, ded 200
 const ls=S.contracts.find(c=>c.who=='李四');await G('checkout?id='+ls.id);await typ('#co-X','2026-10-17');await typ('#co-ded','200');await typ('#co-dedr','清洁');
 await clk('#do-checkout');await pg.waitForSelector('.status');S=await st();const l2=S.contracts.find(c=>c.id==ls.id);const se=S.settlements[S.settlements.length-1];
 // received: dep1500+8×1500(Mar..Oct)=13500; actual Mar1..Oct17=7mo+17d=10500+850=11350; →13500-11350-200=1950
 ok(l2.term&&se.result==1950,'settlement 1950 got '+se.result);ok(S.bills.filter(b=>b.cid==ls.id).every(b=>b.done),'all bills 已完成');ok(S.payables.some(p=>p.sid==se.id&&p.amount==1950),'refund payable');
 // final checkout of 张三 remaining 302/303 at 2026-11-30 (Q4 partially paid → 应补)
 await G('checkout?id='+z.id);await pg.$$eval('.co-room',es=>es.forEach(e=>e.checked=true));await pg.$eval('.co-room',e=>e.onchange());await typ('#co-X','2026-11-30');await clk('#do-checkout');await pg.waitForSelector('.status');
 S=await st();const se2=S.settlements[S.settlements.length-1];// cash 3300+30600+5000=38900; rent 301 to 11-15:10.5×1000=10500; 302 11mo=11000; 303 14300; fee 1100 → 38900-35800-1100=2000
 ok(se2.result==2000,'张三 settlement '+se2.result);
 // F6 persistence
 await pg.reload();await pg.waitForSelector('.nav');S=await st();ok(S.settlements.length==3&&S.contracts.length==7,'persist after reload');
 // occupants
 await G('contract?id='+nc.id+'&tab=入住人');await clk('.mvin');S=await st();ok(S.contracts.find(c=>c.id==nc.id).rooms[0].in=='2026-10-17','move-in recorded');
 // F7 reset
 await G('me');await clk('#reset');S=await st();ok(S.contracts.length==6&&S.settlements.length==1,'reset');
 for(const h of ['home','contracts','bills','bills?side=out','rooms','room?r=301','swap?id=c1','renew?id=c1','settlement?id='+S.settlements[0].id]){await G(h);ok((await txt()).length>20,'render '+h)}
 ok(!(await txt()).match(/H\d{3}/),'no H codes');
 for(const h of ['home','contracts','contract?id=c1&tab=入住人','contract?id=c8&tab=入住人']){await G(h);ok(!(await txt()).match(/待生效|未入住/),'no invented status '+h)}
 console.log('total',pass,'pass',fail,'fail');await br.close();process.exit(fail?1:0)})();
