// 业务核心（唯一逻辑来源）：浏览器与校验脚本共用。依据：租客登记 / 租赁账单生成 / 账单收支 / 退租 / 出租业务模型调整（草案）及用户规则。
(function(root){
const TODAY='2026-10-17';
const BUILDINGS={'中山南路2-14号':['301','302','303','304','305','306','307'],'漕溪北路88弄5号':['501','502','601'],'虹桥路1号3号楼':['101','102','103'],'张江Lofts B栋':['B101','B102','B103','B201','B202','B203','B301','B302','B303','B401']};
const allRooms=()=>Object.entries(BUILDINGS).flatMap(([b,rs])=>rs.map(r=>({b,r,addr:b+r})));
// 模糊搜索：地址/楼栋/房号部分匹配，不区分大小写；空格分隔的多个关键字须全部命中
function searchRooms(q){const ks=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);if(!ks.length)return [];return allRooms().filter(x=>ks.every(k=>(x.addr+' '+x.r).toLowerCase().includes(k)))}
const r2=x=>Math.round((x+(x>=0?1e-9:-1e-9))*100)/100;
const pd=s=>new Date(s+'T00:00:00Z'),ds=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return ds(d)};
const dim=(y,m)=>new Date(Date.UTC(y,m+1,0)).getUTCDate();
const days=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
// 计租月：以合同开始日日号为基准，目标月无该日取月末（租赁账单生成·计租月）
const ms=(anchor,k)=>{const d=pd(anchor),y=d.getUTCFullYear(),m=d.getUTCMonth()+k;return ds(new Date(Date.UTC(y,m,Math.min(d.getUTCDate(),dim(y,m)))))};
// 区间租金：完整计租月数×月租＋不足整月天数×月租÷30（含首尾日）
function rentIn(rent,anchor,a,b){if(!a||!b||a>b)return 0;let j=0;while(ms(anchor,j)<a)j++;let base=anchor,j0=j;if(ms(anchor,j)!=a){base=a;j0=0}
 let k=0;while(addD(ms(base,j0+k+1),-1)<=b)k++;const rem=days(ms(base,j0+k),b)+1;return r2(k*rent+(rem>0?rent*rem/30:0))}
function periods(start,end,N){const out=[];let i=0,s=start;while(s<=end&&i<400){let e=addD(ms(start,(i+1)*N),-1);if(e>end)e=end;out.push([s,e]);s=addD(e,1);i++}return out}
function dueOf(rule,s,i,start){if(i==0)return start;if(rule.type=='fixed'){const d=pd(s),y=d.getUTCFullYear(),m=d.getUTCMonth();return ds(new Date(Date.UTC(y,m,Math.min(rule.day,dim(y,m)))))}return addD(s,-rule.days)}
const sum=a=>r2(a.reduce((x,y)=>x+y,0));
const billTotal=b=>sum(b.items.map(i=>i.amount));
const billPaid=b=>sum(b.pays.map(p=>p.amount));
const billOut=b=>r2(billTotal(b)-billPaid(b));
function billStatus(b){if(b.done)return '已完成';const t=billTotal(b),p=billPaid(b);if(p>=t-1e-9)return '已收';if(p>0)return '部分收款';return '待收'}
function odays(b,today){const st=billStatus(b);return (st=='待收'||st=='部分收款')&&b.due<today?days(b.due,today):0}
const payT=c=>`付${c.payN}押${c.depM}`;
const ruleT=r=>r.type=='fixed'?`每期账单开始月份 ${r.day} 日支付（押金与第1期为合同开始日）`:`账单开始日期前 ${r.days} 天支付（押金与第1期为合同开始日）`;
function cStatus(c,today){if(c.term)return '已终止';if(c.end<today)return '已到期';return '生效中'}
const activeRooms=c=>c.rooms.filter(x=>!x.out);
const addrOf=(c,r)=>bldOf(r)+r;
function titleText(c){const bs=[...new Set(c.rooms.map(x=>bldOf(x.r)))];return bs.length==1?bs[0]+c.rooms.map(x=>x.r).join('、'):c.rooms.map(x=>bldOf(x.r)+x.r).join('、')}
// 租赁状态（prd-租客登记 租赁记录状态表）：已退租 / 待搬入 / 已入住
function leaseSt(st,c,x,today){if(x.out)return '已退租';if(today<c.start)return '待搬入';
 const prev=st.contracts.some(o=>o!==c&&o.start<c.start&&o.rooms.some(y=>y.r==x.r&&!y.out));return prev?'待搬入':'已入住'}
function empty(){return {v:2,today:TODAY,seq:1,contracts:[],bills:[],payables:[],settlements:[],events:[]}}
const nid=(st,p)=>p+(st.seq++);
const C=(st,id)=>st.contracts.find(c=>c.id==id);
const billsOf=(st,cid)=>st.bills.filter(b=>b.cid==cid);
function bldOf(r){return Object.keys(BUILDINGS).find(b=>BUILDINGS[b].includes(r))}
// 租期冲突（租客登记·租期冲突）：同一房间未退租的租赁，合同期间不得交集（含首尾日）
function conflicts(st,r,start,end){return st.contracts.filter(c=>!c.term&&c.rooms.some(x=>x.r==r&&!x.out)&&!(end<c.start||start>c.end))}
function roomBusy(st,r){return st.contracts.some(c=>!c.term&&c.rooms.some(x=>x.r==r&&!x.out))}
function validateReg(st,f){const e=[];
 if(!/^1\d{10}$/.test(f.phone||''))e.push('承租人手机号必填，11 位');
 const idf=[f.who,f.idType,f.idNo].filter(x=>x&&String(x).trim());if(idf.length&&idf.length<3)e.push('姓名、证件类型、证件号码须全部填写，或全部留空由承租人实名补充');
 if(!idf.length&&f.idPhotos>0)e.push('由承租人后续实名补充时，证件照片也须留空');
 if(f.bills){f.bills.forEach(b=>{b.items.forEach(i=>{if(!isFinite(i.amount)||i.amount<0)e.push('账单项金额须为不小于 0 的数字')});if(!b.due)e.push('支付日必填')})}
 if(!f.rooms||!f.rooms.length)e.push('至少选择 1 间房');
 (f.rooms||[]).forEach(x=>{if(!(x.rent>0))e.push(x.r+' 月租金须大于 0')});
 if(new Set((f.rooms||[]).map(x=>x.r)).size!=(f.rooms||[]).length)e.push('房间不能重复');
 if(!f.start||!f.end)e.push('合同开始日期、结束日期必填');else if(f.end<f.start)e.push('结束日期不能早于开始日期');
 if(!['纸质合同','电子合同'].includes(f.sign))e.push('请选择签约方式');
 if(!(Number.isInteger(f.payN)&&f.payN>=1&&f.payN<=12))e.push('付款方式：每次支付月数为 1–12 的整数');
 if(!(Number.isInteger(f.depM)&&f.depM>=0))e.push('付款方式：押金月数为不小于 0 的整数');
 if(!(f.dep>=0))e.push('押金不能为负');
 if(!f.payRule||!(f.payRule.type=='before'?f.payRule.days>=0:(f.payRule.day>=1&&f.payRule.day<=31)))e.push('请设置支付时间');
 (f.fees||[]).forEach(x=>{if(!x.name||!(x.amount>0)||!['一次付清','随租金付'].includes(x.mode))e.push('其他费用须填写名称、支付方式和金额')});
 const em=f.emergency;if(em&&[em.rel,em.phone,em.name].some(Boolean)&&!(em.rel&&em.name&&/^1\d{10}$/.test(em.phone||'')))e.push('紧急联系人：关系、手机号、姓名须完整填写');
 if(f.start&&f.end)(f.rooms||[]).forEach(x=>{const k=conflicts(st,x.r,f.start,f.end);if(k.length)e.push(`${bldOf(x.r)}${x.r} 租期冲突：与 ${k[0].start} 至 ${k[0].end} 的未退租合同重叠`)});
 return e}
function buildBills(c){const out=[{k:'dep',n:0,s:null,e:null,due:c.start,items:[{name:'押金',amount:r2(c.dep),kind:'dep'}]}];
 periods(c.start,c.end,c.payN).forEach(([s,e],i)=>{const items=c.rooms.map(x=>({name:x.r+'租金',amount:rentIn(x.rent,c.start,s,e),kind:'rent',room:x.r}));
  (c.fees||[]).forEach(f=>{if(f.mode=='随租金付')items.push({name:f.name,amount:rentIn(f.amount,c.start,s,e),kind:'fee'});else if(i==0)items.push({name:f.name,amount:r2(f.amount),kind:'fee'})});
  out.push({k:'rent',n:i+1,s,e,due:dueOf(c.payRule,s,i,c.start),items})});return out}
function previewBills(f){return buildBills({...f,rooms:f.rooms.map(x=>({...x}))})}
function register(st,f,at){const err=validateReg(st,f);if(err.length)throw new Error(err.join('；'));
 const c={id:nid(st,'c'),who:f.who||'',phone:f.phone,idType:f.idType||'',idNo:f.idNo||'',emergency:f.emergency&&f.emergency.name?f.emergency:null,
  rooms:f.rooms.map(x=>({r:x.r,rent:r2(x.rent),in:null,out:null})),start:f.start,end:f.end,sign:f.sign,payN:f.payN,depM:f.depM,dep:r2(f.dep),payRule:f.payRule,fees:(f.fees||[]).map(x=>({...x,amount:r2(x.amount)})),
  scans:f.scans||0,idPhotos:f.idPhotos||0,terms:f.terms||'',note:f.note||'',op:f.op||'房东',entry:(at||TODAY).slice(0,10),occupants:{},term:null};
 c.rooms.forEach(x=>c.occupants[x.r]=[]);st.contracts.push(c);
 const bl=f.bills?JSON.parse(JSON.stringify(f.bills)):buildBills(c);bl.forEach((b,i)=>{delete b.paid;b.id=nid(st,'b');b.cid=c.id;b.pays=[];b.done=false;st.bills.push(b);
  if((f.prepaid||[]).includes(i)||(f.bills&&f.bills[i].paid))b.pays.push({m:'线下收款',amount:billTotal(b),date:c.entry,note:'登记时预记线下全额收款'})});
 log(st,c.id,at,f.op,'租客登记',`${c.sign} · ${c.rooms.length} 间房 · ${c.start} 至 ${c.end}`,[]);return c}
function log(st,cid,at,by,type,text,changes,extra){const ev={id:nid(st,'e'),cid,at:at||TODAY+' 10:00',by:by||'房东',type,text,changes:changes||[],...(extra||{})};st.events.push(ev);return ev}
function collect(st,bid,amount,date,by){const b=st.bills.find(x=>x.id==bid);if(!b)throw new Error('账单不存在');const s=billStatus(b);if(s=='已完成'||s=='已收')throw new Error('账单已无待收金额');
 amount=r2(+amount);if(!(amount>0))throw new Error('收款金额须大于 0');if(amount>billOut(b)+1e-9)throw new Error('收款金额不能超过待收 '+billOut(b));if(!date||date>TODAY)throw new Error('收款日期不能晚于今天');
 b.pays.push({m:'线下收款',amount,date});log(st,b.cid,date+' 10:00',by,'收款',`${b.k=='dep'?'押金':'租金第'+b.n+'期'} 收款 ${amount}`,[]);return b}
function itemsEditable(b){const s=billStatus(b);return s=='待收'||s=='部分收款'}
function setItems(st,bid,items,by){const b=st.bills.find(x=>x.id==bid);if(!itemsEditable(b))throw new Error('已收 / 已完成账单不可调整');
 for(const i of items){if(!String(i.name||'').trim())throw new Error('账单项名称必填');if(!isFinite(+i.amount))throw new Error('金额无效')}
 const t=sum(items.map(i=>+i.amount));if(t<billPaid(b)-1e-9)throw new Error('调整后账单金额不能低于已收 '+billPaid(b));if(t<0)throw new Error('账单金额不能为负');
 const before=billTotal(b);b.items=items.map(i=>({name:String(i.name).trim(),amount:r2(+i.amount),kind:i.kind||'adj',room:i.room}));log(st,b.cid,TODAY+' 10:00',by,'调整账单',`账单金额 ${before} → ${billTotal(b)}`,[]);return b}
function payPayable(st,pid,date){const p=st.payables.find(x=>x.id==pid);if(p.paid>=p.amount)throw new Error('已完成');if(!date||date>TODAY)throw new Error('付款日期不能晚于今天');p.paid=p.amount;p.date=date;p.status='已完成';return p}
// ---- 部分退租（不产生新合同）----
function checkoutMode(c,rooms){const act=activeRooms(c).map(x=>x.r);return rooms.length&&rooms.length==act.length?'final':'partial'}
function partialPreview(st,cid,rooms,X){const c=C(st,cid);const err=[];const act=activeRooms(c).map(x=>x.r);
 if(!rooms.length)err.push('请至少选择 1 间房');if(rooms.some(r=>!act.includes(r)))err.push('所选房间已退租');if(!X)err.push('请填写实际退租日');else if(X<c.start||X>c.end)err.push(`部分退租的实际退租日须在 ${c.start} 至 ${c.end} 之间`);
 if(err.length)return {err,lines:[]};
 const lines=[];for(const b of billsOf(st,cid).filter(b=>b.k=='rent'&&!b.done)){const props=[];
  for(const r of rooms){const it=b.items.find(i=>i.kind=='rent'&&i.room==r);if(!it)continue;let credit=0;
   if(b.s>X)credit=it.amount;else if(b.s<=X&&X<b.e){const room=c.rooms.find(x=>x.r==r);credit=r2(it.amount-rentIn(room.rent,c.start,b.s,X))}
   if(credit>0)props.push({room:r,name:r+'退租',credit})}
  if(props.length)lines.push({bid:b.id,n:b.n,s:b.s,e:b.e,status:billStatus(b),total:billTotal(b),paid:billPaid(b),props})}
 return {err:[],lines}}
function splitLines(st,lines){let excess=0;const res=lines.map(l=>{const b=st.bills.find(x=>x.id==l.bid);const st0=billStatus(b);let room=st0=='已收'?0:billOut(b);const items=[];let ex=0;
 for(const p of l.props){const cr=r2(Math.max(0,+p.credit||0));const ap=r2(Math.min(cr,room));room=r2(room-ap);if(ap>0)items.push({name:p.name,amount:-ap,kind:'checkout',room:p.room});ex=r2(ex+cr-ap)}
 excess=r2(excess+ex);return {bid:l.bid,items,excess:ex,before:billTotal(b),after:r2(billTotal(b)+sum(items.map(i=>i.amount)))}});return {res,excess}}
function partialApply(st,cid,rooms,X,lines,mode,by,at){const c=C(st,cid);const chk=partialPreview(st,cid,rooms,X);if(chk.err.length)throw new Error(chk.err.join('；'));
 for(const l of lines)for(const p of l.props){if(!String(p.name||'').trim())throw new Error('账单项名称必填');if(!(+p.credit>=0))throw new Error('退租减免金额不能为负')}
 const {res,excess}=splitLines(st,lines);const changes=[];
 for(const r of res){const b=st.bills.find(x=>x.id==r.bid);const before=billTotal(b);r.items.forEach(i=>b.items.push(i));changes.push({bid:b.id,label:'租金第'+b.n+'期',before,after:billTotal(b),items:r.items.map(i=>`${i.name} ${i.amount}`),excess:r.excess})}
 let left=excess;const deduct=[];let payable=null;
 if(mode=='deduct'&&left>0){for(const b of billsOf(st,cid).filter(b=>!b.done&&billOut(b)>0).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:a.n-b.n)){if(left<=0)break;const a=r2(Math.min(left,billOut(b)));b.pays.push({m:'抵扣',amount:a,date:X,note:'退租多收款抵扣'});deduct.push({bid:b.id,label:b.k=='dep'?'押金':'租金第'+b.n+'期',amount:a});left=r2(left-a)}}
 if(left>0){payable={id:nid(st,'p'),cid,amount:left,paid:0,due:X,date:null,status:'待付款',reason:`${rooms.join('、')} 退租多收款退还`};st.payables.push(payable)}
 rooms.forEach(r=>{const x=c.rooms.find(y=>y.r==r);x.out=X;c.occupants[r]=c.occupants[r].map(o=>({...o,ended:X}))});
 const ev=log(st,cid,at,by,'部分退租',`${rooms.map(r=>addrOf(c,r)).join('、')} 退租 · 实际退租日 ${X}`,changes,{rooms,X,excess,deduct,payable:payable&&payable.id,mode});return ev}
// ---- 最后一次退租：整份合同结算（草案 §十）----
function finalPreview(st,cid,X){const c=C(st,cid);const err=[];if(!X)err.push('请填写实际退租日');else if(X<c.start)err.push('实际退租日不能早于合同开始日');else if(c.end>=TODAY&&X>c.end)err.push('实际退租日不能晚于合同结束日');else if(c.end<TODAY&&X>TODAY)err.push('已到期合同的实际退租日不能晚于今天');
 const lastOut=c.rooms.filter(x=>x.out).map(x=>x.out).sort().pop();if(X&&lastOut&&X<lastOut)err.push('实际退租日不能早于已退租房间的退租日 '+lastOut);
 if(err.length)return {err};
 const bl=billsOf(st,cid);const cash=sum(bl.flatMap(b=>b.pays).filter(p=>p.m=='线下收款').map(p=>p.amount));const refunded=sum(st.payables.filter(p=>p.cid==cid).map(p=>p.amount));
 const received=r2(cash-refunded);
 const rentLines=c.rooms.map(x=>{const to=x.out||X;return {r:x.r,to,amount:rentIn(x.rent,c.start,c.start,to)}});const actual=sum(rentLines.map(l=>l.amount));
 const other=sum((c.fees||[]).map(f=>f.mode=='随租金付'?rentIn(f.amount,c.start,c.start,X):f.amount));
 return {err:[],cash,refunded,received,rentLines,actual,other}}
function finalApply(st,cid,X,other,ded,dedr,by,at){const c=C(st,cid);const p=finalPreview(st,cid,X);if(p.err.length)throw new Error(p.err.join('；'));
 other=r2(+other);ded=r2(+ded);if(other<0||ded<0)throw new Error('金额不能为负');if(ded>0&&!String(dedr||'').trim())throw new Error('请填写扣款原因');
 const result=r2(p.received-p.actual-other-ded);
 const act=activeRooms(c).map(x=>x.r);act.forEach(r=>{c.rooms.find(x=>x.r==r).out=X;c.occupants[r]=c.occupants[r].map(o=>({...o,ended:o.ended||X}))});
 billsOf(st,cid).forEach(b=>b.done=true);
 const sid=nid(st,'s');const s={id:sid,cid,X,cash:p.cash,refunded:p.refunded,received:p.received,rentLines:p.rentLines,actual:p.actual,other,ded,dedr:dedr||'',result,payable:null,receivable:null};
 if(result>0){const pb={id:nid(st,'p'),cid,amount:result,paid:0,due:X,date:null,status:'待付款',reason:'结算应退',sid};st.payables.push(pb);s.payable=pb.id}
 if(result<0){const b={id:nid(st,'b'),cid,k:'settle',n:0,s:null,e:null,due:X,items:[{name:'结算应收',amount:-result,kind:'settle'}],pays:[],done:false,sid};st.bills.push(b);s.receivable=b.id}
 st.settlements.push(s);c.term={X,at:at||TODAY+' 10:00',by:by||'房东',sid,reason:act.length==c.rooms.length?'全部退租':'退租（最后 '+act.join('、')+'）'};
 const ev=log(st,cid,at,by,'全部退租',`${act.map(r=>addrOf(c,r)).join('、')} 退租 · 实际退租日 ${X} · 结算结果 ${result>=0?'应退':'应收'} ${Math.abs(result)}`,[],{rooms:act,X,sid});return ev}
function moveIn(st,cid,r,date){const c=C(st,cid);const x=c.rooms.find(y=>y.r==r);if(x.in)throw new Error('已记录实际入住时间');if(!date||date>TODAY)throw new Error('实际入住时间不能晚于今天');x.in=date;log(st,cid,date+' 10:00','房东','记录实际入住时间',`${addrOf(c,r)} 实际入住时间 ${date}`,[])}
function addOcc(st,cid,r,phone,self){const c=C(st,cid);if(!/^1\d{10}$/.test(phone))throw new Error('请输入 11 位手机号');c.occupants[r].push({phone,self:!!self,how:'手机号',st:'已生效'})}
function agreeOcc(st,cid,r,i){C(st,cid).occupants[r][i].st='已生效'}
function delOcc(st,cid,r,i){C(st,cid).occupants[r].splice(i,1)}
// ---- 示例数据：按业务动作逐步生成 ----
function payDue(st,cid,upto){for(const b of billsOf(st,cid).filter(b=>!b.done&&b.due<=upto)){const o=billOut(b);if(o>0)b.pays.push({m:'线下收款',amount:o,date:b.due})}}
function seed(){const st=empty();const R=(f,at)=>register(st,{sign:'电子合同',payRule:{type:'before',days:7},depM:1,fees:[],op:'刘管家',...f},at);
 // 1 多房，已有已收账单（用于测试部分退租）
 const a=R({who:'张三',phone:'13800001001',idType:'身份证',idNo:'310101199001011234',rooms:[{r:'301',rent:1000},{r:'302',rent:1000},{r:'303',rent:1300}],start:'2026-01-01',end:'2026-12-31',payN:3,dep:3300,fees:[{name:'物业费',mode:'随租金付',amount:100}],emergency:{rel:'父亲',phone:'13800001009',name:'张父'}},'2025-12-20 10:00');
 payDue(st,a.id,TODAY);const a4=billsOf(st,a.id).find(b=>b.n==4);a4.pays=[];// 第4期（10-01 起）逾期未收
 a.rooms.forEach(x=>x.in=x.r=='303'?'2026-01-05':'2026-01-01');a.occupants={'301':[{phone:a.phone,self:true,how:'手机号',st:'已生效'}],'302':[{phone:'13800002011',self:false,how:'手机号',st:'已生效'}],'303':[{phone:'13800002012',self:false,how:'手机号',st:'已生效'}]};
 // 2 多房，已部分退租（306 于 08-15 退租，多收款抵扣下一期）
 const b=R({who:'王五',phone:'13900002002',idType:'身份证',idNo:'310101198805052222',rooms:[{r:'305',rent:1000},{r:'306',rent:1200}],start:'2026-03-01',end:'2027-02-28',payN:1,dep:2200,op:'陈管家'},'2026-02-25 10:00');
 b.rooms.forEach(x=>x.in='2026-03-01');b.occupants={'305':[{phone:b.phone,self:true,how:'手机号',st:'已生效'}],'306':[{phone:'13900002021',self:false,how:'手机号',st:'已生效'}]};
 payDue(st,b.id,'2026-08-15');const pv=partialPreview(st,b.id,['306'],'2026-08-15');partialApply(st,b.id,['306'],'2026-08-15',pv.lines,'deduct','陈管家','2026-08-15 16:00');payDue(st,b.id,TODAY);
 // 3 单间生效中（用于测试全部退租结算）
 const c3=R({who:'李四',phone:'13700003003',idType:'身份证',idNo:'310101199203033333',rooms:[{r:'501',rent:1500}],start:'2026-03-01',end:'2027-02-28',payN:1,dep:1500,op:'陈管家',payRule:{type:'fixed',day:5}},'2026-02-25 10:00');
 payDue(st,c3.id,TODAY);c3.rooms[0].in='2026-03-02';c3.occupants={'501':[{phone:c3.phone,self:true,how:'手机号',st:'已生效'},{phone:'13700003031',self:false,how:'不记名二维码',st:'待同意'}]};
 // 4 已到期未退租
 const d=R({who:'赵六',phone:'13600004004',idType:'身份证',idNo:'310101198707074444',rooms:[{r:'601',rent:1800}],start:'2025-08-01',end:'2026-07-31',payN:1,dep:1800,sign:'纸质合同'},'2025-07-25 10:00');
 payDue(st,d.id,TODAY);d.rooms[0].in='2025-08-01';d.occupants={'601':[{phone:d.phone,self:true,how:'手机号',st:'已生效'}]};
 // 5 已全部退租并结算，退款已付
 const e=R({who:'吴九',phone:'13300007007',idType:'身份证',idNo:'310101199506065555',rooms:[{r:'502',rent:1500}],start:'2025-06-01',end:'2026-05-31',payN:1,dep:1500,sign:'纸质合同',op:'陈管家'},'2025-05-26 10:00');
 payDue(st,e.id,'2026-05-31');e.rooms[0].in='2025-06-01';e.occupants={'502':[{phone:e.phone,self:true,how:'手机号',st:'已生效'}]};
 finalApply(st,e.id,'2026-05-31',0,0,'','陈管家','2026-05-31 09:30');payPayable(st,st.payables.find(p=>p.cid==e.id).id,'2026-06-02');
 // 6 多房，含一次付清费用、102 未记录实际入住时间
 const f=R({who:'孙七',phone:'13500005005',idType:'身份证',idNo:'310101199101016666',rooms:[{r:'101',rent:1600},{r:'102',rent:1700}],start:'2026-09-01',end:'2027-08-31',payN:3,dep:3300,sign:'纸质合同',op:'王管家',fees:[{name:'卫生费',mode:'一次付清',amount:200}],prepaid:[0,1]},'2026-08-25 10:00');
 f.rooms[0].in='2026-09-01';f.occupants={'101':[{phone:f.phone,self:true,how:'手机号',st:'已生效'}],'102':[]};
 return st}
const API={TODAY,BUILDINGS,allRooms,searchRooms,r2,pd,ds,addD,days,ms,rentIn,periods,dueOf,sum,billTotal,billPaid,billOut,billStatus,odays,payT,ruleT,cStatus,activeRooms,addrOf,titleText,leaseSt,empty,C,billsOf,bldOf,conflicts,roomBusy,validateReg,buildBills,previewBills,register,collect,itemsEditable,setItems,payPayable,checkoutMode,partialPreview,splitLines,partialApply,finalPreview,finalApply,moveIn,addOcc,agreeOcc,delOcc,seed,log};
if(typeof module!=='undefined')module.exports=API;else root.CORE=API;
})(this);
