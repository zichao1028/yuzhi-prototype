// 业务核心（唯一逻辑来源）：浏览器与校验脚本共用。
// 模型：合同级月租金；退租=整份合同结算；换房仅单房；续租开新合同。
(function(root){
const TODAY='2026-10-17';
let BUILDINGS={'中山南路2-14号':['301','302','303','304','305','306','307'],'漕溪北路88弄5号':['501','502','601'],'虹桥路1号3号楼':['101','102','103'],'张江Lofts B栋':['B101','B102','B103','B201','B202','B203','B301','B302','B303','B401']};
function normalize(b){return Object.fromEntries(Object.entries(b).map(([name,v])=>[name,Array.isArray(v)?{name,floors:0,perFloor:0,rules:{},address:'',rooms:v.map(r=>({r,floor:Number(String(r).replace(/\D/g,'').slice(0,-2))||1,locked:false,repair:false,price:null,created:TODAY}))}:{...v,name,rooms:v.rooms.map(r=>({...r}))}]))}
BUILDINGS=normalize(BUILDINGS);
const allRooms=()=>Object.entries(BUILDINGS).flatMap(([b,v])=>v.rooms.map(x=>({...x,b,addr:b+x.r})));
function getBuildings(){return BUILDINGS}
function setBuildings(b){if(b&&typeof b==='object')BUILDINGS=normalize(b);return BUILDINGS}
function room(r){return Object.values(BUILDINGS).flatMap(b=>b.rooms).find(x=>x.r===r)}
function generateRooms(floors,perFloor,rules={},counts={}){if(!Number.isInteger(+floors)||floors<1||floors>99||!Number.isInteger(+perFloor)||perFloor<1||perFloor>99)throw Error('楼层及每层间数须为1–99整数');if(!/^[A-Za-z0-9]?$/.test(rules.prefix||''))throw Error('前缀为一位字母或数字');let out=[];for(let f=1;f<=floors;f++){const n=counts[f]??+perFloor;if(!Number.isInteger(+n)||n<0||n>99)throw Error('每层间数须为0–99整数');for(let j=1,k=0;k<n;j++){if(rules.skip4&&String(j).includes('4'))continue;out.push({r:(rules.prefix||'')+String(f).padStart(rules.min4===false?1:2,'0')+String(j).padStart(2,'0'),floor:f,created:TODAY});k++}}return out}
function addBuilding(name,rooms,meta={}){name=String(name||'').trim();if(!name)throw Error('请填写楼栋名称');if(Object.hasOwn(BUILDINGS,name))throw Error('楼栋名称已存在');if(!rooms.length)throw Error('请至少添加一间房');const taken=new Set();const rs=rooms.map(x=>typeof x==='string'?{r:x.trim(),floor:1}:({...x,r:String(x.r).trim()}));for(const x of rs){if(!/^[\w-]+$/.test(x.r))throw Error('房号仅支持字母、数字、下划线、横线');if(taken.has(x.r))throw Error('本栋房间号已存在：'+x.r);taken.add(x.r)}BUILDINGS[name]={...meta,name,rooms:rs};return BUILDINGS[name]}
function addRoom(b,x){if(!BUILDINGS[b])throw Error('楼栋不存在');const nr=String(x.r||'').trim();if(!/^[\w-]+$/.test(nr))throw Error('房号无效');if(BUILDINGS[b].rooms.some(y=>y.r===nr))throw Error('本栋房间号已存在：'+nr);if(!Number.isInteger(+x.floor)||x.floor<1)throw Error('楼层须为正整数');BUILDINGS[b].rooms.push({...x,r:nr,created:TODAY});return BUILDINGS[b].rooms.find(y=>y.r===nr)}
function editRoom(st,r,patch){const x=room(r);if(!x)throw Error('房间不存在');const b=bldOf(r);const nr=String(patch.r||r).trim();if(!/^[\w-]+$/.test(nr))throw Error('房号无效');if(nr!==r&&BUILDINGS[b].rooms.some(y=>y.r===nr))throw Error('本栋房间号已存在：'+nr);if(patch.area!==undefined&&patch.area!==''&&(!Number.isFinite(+patch.area)||+patch.area<0))throw Error('面积须为非负数字');if(patch.price){const p=patch.price;if(!Number.isFinite(p.monthly)||p.monthly<=0||!Number.isFinite(p.dep)||p.dep<0||!['months','amount'].includes(p.depMode)||(p.depMode==='months'&&!Number.isInteger(p.dep)))throw Error('请填写有效月租与押金（押N须为整数）')}
 if(nr!==r)st.contracts.forEach(c=>{c.rooms.forEach(y=>{if(y.r===r)y.r=nr});if(c.occupants&&c.occupants[r]){c.occupants[nr]=c.occupants[r];delete c.occupants[r]}});Object.assign(x,patch,{r:nr});return x}
function openWorkOrders(st,r){return (st.workOrders||[]).filter(w=>(!r||w.r===r)&&!['已完成','已关闭'].includes(w.status))}
function roomIncomplete(r){const x=room(r);return !x||!x.price}
function roomStatus(st,r){const x=room(r);if(!x)return '待完善';if(roomBusy(st,r))return '已出租';if(x.locked)return '锁房';if(openWorkOrders(st,r).some(w=>['报修','设备维保'].includes(w.type||'报修'))||x.repair)return '维修';const ownerOut=st.contracts.some(c=>c.term&&(c.term.afterStatus||'').includes('业主退房')&&c.rooms.some(y=>y.r===r));if(ownerOut&&!roomBusy(st,r))return '业主退房';if(x.unrentable)return '空房不可租';return '空房可租'}
function roomBizFlags(st,r,today){const flags=[];if(bookingsOf(st,r).some(b=>b.status==='有效'))flags.push('已预定');const cs=st.contracts.filter(c=>!c.removed&&!c.voided&&c.rooms.some(y=>y.r===r&&!y.out));const c=cs[0];if(!c){const term=st.contracts.filter(c=>c.term&&!c.voided&&c.rooms.some(y=>y.r===r)).sort((a,b)=>(b.term.X||'').localeCompare(a.term.X||''))[0];if(term&&term.term&&term.term.settled===false)flags.push('退租未结账');return flags}
 if(c.sign==='电子合同'&&c.pendingSign)flags.push('签约中');
 if(today<c.start)flags.push('将搬入');
 else if(!c.term)flags.push('在租中');
 if(c.end===today)flags.push('今日到期');
 if(c.end<today&&!c.term)flags.push('到期未退房');
 const daysLeft=days(today,c.end);if(daysLeft>=0&&daysLeft<=7&&c.end>today)flags.push('即将离店');
 const bl=billsOf(st,c.id);if(bl.some(b=>billStatus(b)==='待收'))flags.push('待收款');
 if(bl.some(b=>odays(b,today)>0))flags.push('有欠款');
 if(c.term&&c.term.settled===false)flags.push('退租未结账');
 if(c.reserved)flags.push('已预定');
 return flags}
function matchRoomFilters(st,r,f,today){f=f||{};const stt=roomStatus(st,r);const x=room(r);if(f.status&&f.status!=='全部'){if(f.status==='待完善'){if(!roomIncomplete(r)||roomBusy(st,r))return false}else if(stt!==f.status)return false}if(f.floor&&String(x.floor)!==String(f.floor))return false;if(f.biz&&f.biz.length){const flags=roomBizFlags(st,r,today);if(!f.biz.every(b=>flags.includes(b)))return false}
 if(f.q){const ks=String(f.q).toLowerCase().split(/\s+/).filter(Boolean);const hay=(bldOf(r)+' '+r+' '+(BUILDINGS[bldOf(r)]?.name||'')).toLowerCase();if(!ks.every(k=>hay.includes(k)))return false}
 if(f.minPrice!=null&&f.minPrice!==''&&(!(x.price)||x.price.monthly<+f.minPrice))return false;if(f.maxPrice!=null&&f.maxPrice!==''&&(!(x.price)||x.price.monthly>+f.maxPrice))return false;
 if(f.orient&&f.orient!=='全部'&&(x.orient||'')!==f.orient)return false;
 if(f.vacantDays!=null&&f.vacantDays!==''){if(roomBusy(st,r))return false;const last=st.contracts.flatMap(c=>c.rooms).filter(y=>y.r===r&&y.out).map(y=>y.out).sort().pop()||x.created||today;if(days(last,today)<+f.vacantDays)return false}
 return true}

function searchRooms(q){const ks=String(q||'').toLowerCase().split(/\s+/).filter(Boolean);if(!ks.length)return [];return allRooms().filter(x=>ks.every(k=>(x.addr+' '+x.r).toLowerCase().includes(k)))}
const r2=x=>Math.round((x+(x>=0?1e-9:-1e-9))*100)/100;
const pd=s=>new Date(s+'T00:00:00Z'),ds=d=>d.toISOString().slice(0,10);
const addD=(s,n)=>{const d=pd(s);d.setUTCDate(d.getUTCDate()+n);return ds(d)};
const dim=(y,m)=>new Date(Date.UTC(y,m+1,0)).getUTCDate();
const days=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const ms=(anchor,k)=>{const d=pd(anchor),y=d.getUTCFullYear(),m=d.getUTCMonth()+k;return ds(new Date(Date.UTC(y,m,Math.min(d.getUTCDate(),dim(y,m)))))};
function rentIn(rent,anchor,a,b){if(!a||!b||a>b)return 0;let j=0;while(ms(anchor,j)<a)j++;let base=anchor,j0=j;if(ms(anchor,j)!=a){base=a;j0=0}
 let k=0;while(addD(ms(base,j0+k+1),-1)<=b)k++;const rem=days(ms(base,j0+k),b)+1;return r2(k*rent+(rem>0?rent*rem/30:0))}
function periods(start,end,N){const out=[];let i=0,s=start;while(s<=end&&i<400){let e=addD(ms(start,(i+1)*N),-1);if(e>end)e=end;out.push([s,e]);s=addD(e,1);i++}return out}
function dueOf(rule,s,i,start){if(i==0)return start;if(rule.type=='fixed'){const d=pd(s),y=d.getUTCFullYear(),m=d.getUTCMonth();return ds(new Date(Date.UTC(y,m,Math.min(rule.day,dim(y,m)))))}return addD(s,-rule.days)}
const sum=a=>r2(a.reduce((x,y)=>x+y,0));
const billTotal=b=>sum(b.items.map(i=>i.amount));
function syncTotal(b){b.total=billTotal(b);return b}
const billPaid=b=>sum(b.pays.map(p=>p.amount));
const billOut=b=>b.done?0:r2(billTotal(b)-billPaid(b));
function billStatus(b){if(b.excluded)return '已作废';const t=billTotal(b),p=billPaid(b);if(b.done)return '已完成';if(p>=t-1e-9)return '已完成';return '待收'}
function billStatusMatch(b,tab){if(tab==='全部')return !b.excluded;if(tab==='已作废')return !!b.excluded;if(tab==='逾期')return odays(b,TODAY)>0;return billStatus(b)===(tab==='待收款'?'待收':tab)}
function odays(b,today){const st=billStatus(b);return st=='待收'&&b.due<today?days(b.due,today):0}
const payT=c=>`付${c.payN}押${c.depM}`;
const ruleT=r=>r.type=='fixed'?`每期账单开始月份 ${r.day} 日支付（押金与第1期为合同开始日）`:`账单开始日期前 ${r.days} 天支付（押金与第1期为合同开始日）`;
function cStatus(c,today){if(c.removed)return '已删除';if(c.voided)return '已作废';if(c.term)return '已终止';if(c.end<today)return '已到期';return '生效中'}
const activeRooms=c=>c.rooms.filter(x=>!x.out);
const addrOf=(c,r)=>bldOf(r)+r;
function titleText(c){const bs=[...new Set(c.rooms.map(x=>bldOf(x.r)))];return bs.length==1?bs[0]+c.rooms.map(x=>x.r).join('、'):c.rooms.map(x=>bldOf(x.r)+x.r).join('、')}
function leaseSt(st,c,x,today){if(x.out)return '已退租';if(today<c.start)return '待搬入';
 const prev=st.contracts.some(o=>o!==c&&o.start<c.start&&o.rooms.some(y=>y.r==x.r&&!y.out));return prev?'待搬入':'已入住'}
function defaultSettings(){return {subjects:[{id:'rent',name:'租金',dir:'in'},{id:'dep',name:'押金',dir:'in'},{id:'fee',name:'其他费用',dir:'in'},{id:'refund',name:'应退租客',dir:'out'},{id:'opex',name:'运营支出',dir:'out'}],ledger:{showOffset:true,requireNote:false,defaultMethod:'线下收款'},onlinePay:{enabled:false,channel:'未开通',tip:'原型占位：不接真实支付'},billRules:{payRuleDefault:{type:'before',days:7},genOnRegister:true,includeFeesWithRent:true},property:{allowCrossBuildingSameNo:true,defaultUnrentable:false,requirePriceBeforeRegister:false},workOrder:{repairAffectsRoom:true,deviceMaintAffectsRoom:true,defaultStatus:'待处理'},meters:{stub:true,label:'自定·待方案'}}}
function defaultApartment(){return {name:'寓智云控',phone:'13800000000',address:'示例公寓地址',city:'上海市'}}
function updateSettings(st,patch){const merge=(a,b)=>{for(const k of Object.keys(b)){if(b[k]&&typeof b[k]==='object'&&!Array.isArray(b[k]))a[k]=merge(a[k]||{},b[k]);else a[k]=JSON.parse(JSON.stringify(b[k]))}return a};st.settings=merge(st.settings||defaultSettings(),patch);return st.settings}
function createIntentSign(st,o){if(!C(st,o.cid)||!String(o.title||'').trim())throw Error('请选择合同并填写标题');const x={id:nid(st,'is'),cid:o.cid,title:o.title.trim(),status:'待签署',created:TODAY,by:o.by||'房东'};(st.intentSigns||(st.intentSigns=[])).push(x);log(st,x.cid,TODAY,x.by,'创建意愿签署',x.title,[]);return x}
function intentAction(st,id,by,status){const x=(st.intentSigns||[]).find(x=>x.id===id);if(!x||x.status!=='待签署')throw Error('仅待签署记录可操作');x.status=status;x.updatedBy=by||'房东';if(status==='已签署')x.signedAt=TODAY;log(st,x.cid,TODAY,by,status,x.title,[]);return x}
function signIntent(st,id,by){return intentAction(st,id,by,'已签署')}
function withdrawIntent(st,id,by){return intentAction(st,id,by,'已撤回')}
function payableStatus(p){if(p.excluded||p.voided||p.status==='已作废')return '已作废';if(p.status==='已完成'||p.paid>=p.amount-1e-9)return '已完成';return p.paid>0||p.status==='付款中'||p.status==='部分付款'?'付款中':'待付款'}
function voidPayable(st,id,by,reason){const p=st.payables.find(x=>x.id===id);if(!p||payableStatus(p)==='已作废')throw Error('付款账单不存在或已作废');ensureLedger(st);p.excluded=true;p.voidedAt=TODAY;p.status='已作废';log(st,p.cid,TODAY,by,'作废付款账单',reason||'作废付款账单，已付款保留',[]);return p}
function onboardingProgress(st){const done={building:Object.keys(st.buildings||{}).length>0,price:Object.values(st.buildings||{}).some(b=>(b.rooms||[]).some(r=>r.price&&r.price.monthly>0)),register:st.contracts.some(c=>!c.removed&&cStatus(c,TODAY)==='生效中'),collect:st.bills.some(b=>b.pays.some(p=>p.m==='线下收款'&&p.amount>0)),workOrder:(st.workOrders||[]).length>0,settings:!!st.onboarding?.visitedSettings};return {done,count:Object.values(done).filter(Boolean).length,total:6}}
function empty(){return {v:5,settings:defaultSettings(),apartment:defaultApartment(),intentSigns:[],onboarding:{done:{}},today:TODAY,seq:1,buildings:JSON.parse(JSON.stringify(BUILDINGS)),contracts:[],bills:[],payables:[],settlements:[],events:[],ledger:[],workOrders:[],bookings:[],invoices:[],ownerContracts:[]}}
const nid=(st,p)=>p+(st.seq++);
const C=(st,id)=>st.contracts.find(c=>c.id==id);
const billsOf=(st,cid)=>st.bills.filter(b=>b.cid==cid);
function bldOf(r){return Object.keys(BUILDINGS).find(b=>BUILDINGS[b].rooms.some(x=>x.r===r))}
function conflicts(st,r,start,end,skipId){return st.contracts.filter(c=>c.id!=skipId&&!c.term&&!c.voided&&!c.removed&&c.rooms.some(x=>x.r==r&&!x.out)&&!(end<c.start||start>c.end))}
function roomBusy(st,r){return st.contracts.some(c=>!c.term&&!c.voided&&!c.removed&&c.rooms.some(x=>x.r==r&&!x.out))}
function validateReg(st,f){const e=[];if(f.bookingId){const b=bookingsOf(st).find(b=>b.id===f.bookingId);if(!b||b.status!=='有效'||!(f.rooms||[]).some(x=>x.r===b.r))e.push('预定无效或未包含预定房间')}
 (f.rooms||[]).forEach(x=>{if(bookingsOf(st,x.r).some(b=>b.status==='有效'&&b.id!==f.bookingId))e.push('房间已有有效预定，请从预定转登记');if(!room(x.r))e.push('房间不存在');else if(room(x.r).locked)e.push('锁房禁止新登记')});
 if(!/^1\d{10}$/.test(f.phone||''))e.push('承租人手机号必填，11 位');
 const idf=[f.who,f.idType,f.idNo].filter(x=>x&&String(x).trim());if(idf.length&&idf.length<3)e.push('姓名、证件类型、证件号码须全部填写，或全部留空由承租人实名补充');
 if(!idf.length&&f.idPhotos>0)e.push('由承租人后续实名补充时，证件照片也须留空');
 if(f.bills){f.bills.forEach(b=>{b.items.forEach(i=>{if(!isFinite(i.amount)||i.amount<0)e.push('账单项金额须为不小于 0 的数字')});if(!b.due)e.push('支付日必填')})}
 if(!f.rooms||!f.rooms.length)e.push('至少选择 1 间房');
 if(new Set((f.rooms||[]).map(x=>x.r)).size!=(f.rooms||[]).length)e.push('房间不能重复');
 if(!(f.rent>0))e.push('月租金须大于 0');
 if(!f.start||!f.end)e.push('合同开始日期、结束日期必填');else if(f.end<f.start)e.push('结束日期不能早于开始日期');
 if(!['纸质合同','电子合同'].includes(f.sign))e.push('请选择签约方式');
 if(!(Number.isInteger(f.payN)&&f.payN>=1&&f.payN<=12))e.push('付款方式：每次支付月数为 1–12 的整数');
 if(!(Number.isInteger(f.depM)&&f.depM>=0))e.push('付款方式：押金月数为不小于 0 的整数');
 if(!(f.dep>=0))e.push('押金不能为负');
 if(!f.payRule||!(f.payRule.type=='before'?f.payRule.days>=0:(f.payRule.day>=1&&f.payRule.day<=31)))e.push('请设置支付时间');
 (f.fees||[]).forEach(x=>{if(!x.name||!(x.amount>0)||!['一次付清','随租金付'].includes(x.mode))e.push('其他费用须填写名称、支付方式和金额')});
 const em=f.emergency;if(em&&[em.rel,em.phone,em.name].some(Boolean)&&!(em.rel&&em.name&&/^1\d{10}$/.test(em.phone||'')))e.push('紧急联系人：关系、手机号、姓名须完整填写');
 if(f.start&&f.end)(f.rooms||[]).forEach(x=>{const k=conflicts(st,x.r,f.start,f.end,f.resignFrom);if(k.length)e.push(`${bldOf(x.r)}${x.r} 租期冲突：与 ${k[0].start} 至 ${k[0].end} 的未退租合同重叠`)});
 return e}
function buildBills(c){const out=[{k:'dep',n:0,s:c.start,e:c.end,due:c.start,items:[{name:'押金',amount:r2(c.dep),kind:'dep'}]}];
 periods(c.start,c.end,c.payN).forEach(([s,e],i)=>{const items=[{name:'租金',amount:rentIn(c.rent,c.start,s,e),kind:'rent'}];
  (c.fees||[]).forEach(f=>{if(f.mode=='随租金付')items.push({name:f.name,amount:rentIn(f.amount,c.start,s,e),kind:'fee'});else if(i==0)items.push({name:f.name,amount:r2(f.amount),kind:'fee'})});
  out.push({k:'rent',n:i+1,s,e,due:dueOf(c.payRule,s,i,c.start),items})});return out}
function previewBills(f){return buildBills({...f,rooms:(f.rooms||[]).map(x=>({r:x.r})),rent:f.rent})}
function register(st,f,at){const err=validateReg(st,f);if(err.length)throw new Error(err.join('；'));
 const c={id:nid(st,'c'),who:f.who||'',phone:f.phone,idType:f.idType||'',idNo:f.idNo||'',emergency:f.emergency&&f.emergency.name?f.emergency:null,
  rooms:f.rooms.map(x=>({r:x.r,in:null,out:null})),rent:r2(f.rent),start:f.start,end:f.end,sign:f.sign,payN:f.payN,depM:f.depM,dep:r2(f.dep),payRule:f.payRule,fees:(f.fees||[]).map(x=>({...x,amount:r2(x.amount)})),
  scans:f.scans||0,idPhotos:f.idPhotos||0,terms:f.terms||'',note:f.note||'',op:f.op||'房东',entry:(at||TODAY).slice(0,10),occupants:{},term:null};
 c.rooms.forEach(x=>c.occupants[x.r]=[]);st.contracts.push(c);
 const bl=f.bills?JSON.parse(JSON.stringify(f.bills)):buildBills(c);bl.forEach((b,i)=>{delete b.paid;b.id=nid(st,'b');b.cid=c.id;b.pays=[];b.done=false;syncTotal(b);st.bills.push(b);
  if((f.prepaid||[]).includes(i)||(f.bills&&f.bills[i].paid))b.pays.push({m:'线下收款',amount:billTotal(b),date:c.entry,note:'登记时预记线下全额收款',by:c.op})});
 if(f.source)c.source=f.source;
 if(f.bookingId){const b=(st.bookings||[]).find(b=>b.id===f.bookingId);if(b&&b.status==='有效'){b.status='已转登记';b.cid=c.id}}
 ensureLedger(st);if(f.resignFrom)c.source={type:'重签',from:f.resignFrom};log(st,c.id,at,f.op,'租客登记',`${c.sign} · ${c.rooms.length} 间房 · 月租 ${c.rent} · ${c.start} 至 ${c.end}`,[]);return c}
function log(st,cid,at,by,type,text,changes,extra){const ev={id:nid(st,'e'),cid,at:at||TODAY+' 10:00',by:by||'房东',type,text,changes:changes||[],...(extra||{})};st.events.push(ev);return ev}
function collect(st,bid,amount,date,by){const b=st.bills.find(x=>x.id==bid);if(!b)throw new Error('账单不存在');const s=billStatus(b);if(b.excluded||s=='已完成')throw new Error('账单已无待收金额');
 amount=r2(+amount);if(!(amount>0))throw new Error('收款金额须大于 0');if(amount>billOut(b)+1e-9)throw new Error('收款金额不能超过待收 '+billOut(b));if(!date||date>TODAY)throw new Error('收款日期不能晚于今天');
 b.pays.push({m:'线下收款',amount,date,by:by||'房东'});ensureLedger(st);log(st,b.cid,date+' 10:00',by,'收款',`${b.k=='dep'?'押金':'租金第'+b.n+'期'} 收款 ${amount}`,[]);return b}
function itemsEditable(b){const s=billStatus(b);return s=='待收'}
function setItems(st,bid,items,by){const b=st.bills.find(x=>x.id==bid);if(!itemsEditable(b))throw new Error('已完成或已作废账单不可调整');
 for(const i of items){if(!String(i.name||'').trim())throw new Error('账单项名称必填');if(!isFinite(+i.amount))throw new Error('金额无效')}
 const t=sum(items.map(i=>+i.amount));if(t<billPaid(b)-1e-9)throw new Error('调整后账单金额不能低于已收 '+billPaid(b));if(t<0)throw new Error('账单金额不能为负');
 const before=billTotal(b);b.items=items.map(i=>({name:String(i.name).trim(),amount:r2(+i.amount),kind:i.kind||'adj',room:i.room}));syncTotal(b);log(st,b.cid,TODAY+' 10:00',by,'调整账单',`账单金额 ${before} → ${billTotal(b)}`,[]);return b}
function payPayable(st,pid,date,by){const p=st.payables.find(x=>x.id==pid);if(!p||payableStatus(p)==='已作废')throw Error('付款账单不存在或已作废');if(p.paid>=p.amount)throw new Error('已完成');if(!date||date>TODAY)throw new Error('付款日期不能晚于今天');p.paid=p.amount;p.date=date;p.by=by||'房东';p.status='已完成';ensureLedger(st);return p}
// ---- 退租：整份合同结算 ----
function applyAfterStatus(c,status){if(!status)return;c.rooms.forEach(x=>{const r=room(x.r);if(r){r.locked=status.includes('锁房');r.repair=status.includes('维修');if(status.includes('业主退房'))r.unrentable=false}})}
function needsSettle(c){return c.term&&c.term.settled===false}
function finalPreview(st,cid,X){const c=C(st,cid);const err=[];
 if(c.voided)err.push('合同已作废');
 if(c.term&&c.term.settled!==false)err.push('合同已结算或已终止');
 if(!X)err.push('请填写实际退租日');else{
  const startX=c.term&&c.term.X?c.term.X:c.start;
  if(X<c.start)err.push('实际退租日不能早于合同开始日');
  else if(!c.term&&c.end>=TODAY&&X>c.end)err.push('实际退租日不能晚于合同结束日');
  else if(!c.term&&c.end<TODAY&&X>TODAY)err.push('已到期合同的实际退租日不能晚于今天');
 }
 if(err.length)return {err};
 const bl=billsOf(st,cid);const cash=sum(bl.flatMap(b=>b.pays).filter(p=>p.m=='线下收款'||p.m=='抵扣').map(p=>p.amount));const refunded=sum(st.payables.filter(p=>p.cid==cid&&!p.sid).map(p=>p.amount));
 const received=r2(cash-refunded);
 const actual=rentIn(c.rent,c.start,c.start,X);
 const rentLines=[{r:'合同',to:X,amount:actual}];
 const other=sum((c.fees||[]).map(f=>f.mode=='随租金付'?rentIn(f.amount,c.start,c.start,X):f.amount));
 const refundToTenant=r2(Math.max(0,received-actual-other)); // 应退（未扣款前）
 const chargeTenant=r2(Math.max(0,actual+other-received)); // 应收（未收足）
 return {err:[],cash,refunded,received,rentLines,actual,other,refundToTenant,chargeTenant}}
// 只办理退租：退房释放房源，不关账单、不出结算单
function checkoutOnly(st,cid,X,reason,by,at,extra){const c=C(st,cid);if(c.term)throw new Error('合同已退租');if(c.voided)throw new Error('合同已作废');
 if(!X)throw new Error('请填写实际退租日');if(X<c.start)throw new Error('实际退租日不能早于合同开始日');
 if(c.end>=TODAY&&X>c.end)throw new Error('实际退租日不能晚于合同结束日');if(c.end<TODAY&&X>TODAY)throw new Error('已到期合同的实际退租日不能晚于今天');
 extra=extra||{};
 c.rooms.forEach(x=>{x.out=X;c.occupants[x.r]=(c.occupants[x.r]||[]).map(o=>({...o,ended:o.ended||X}))});
 applyAfterStatus(c,extra.afterStatus);c.term={X,at:at||TODAY+' 10:00',by:by||'房东',reason:reason||'到期',afterStatus:extra.afterStatus||'空房可租',note:extra.note||'',media:extra.media||0,settled:false};
 const ev=log(st,cid,at,by,'先退租',`${titleText(c)} · 实际退租日 ${X} · 账单待后续结算`,[],{X,settled:false});return ev}
function suggestRefundItems(st,cid,X){const p=finalPreview(st,cid,X);if(p.err.length)return [];
 const depB=billsOf(st,cid).find(b=>b.k=='dep');const depPaid=depB?Math.max(0,r2(billPaid(depB)-sum(st.payables.filter(p=>p.cid===cid&&p.renewTo).map(p=>p.amount)))):0;const R=r2(p.refundToTenant);
 if(R<=0)return [];
 if(depPaid<=0)return [{id:'r1',name:'应退租客',amount:R}];
 if(depPaid>=R)return [{id:'dep',name:'押金退还',amount:R}];
 return [{id:'dep',name:'押金退还',amount:depPaid},{id:'rent',name:'租金及其他多收',amount:r2(R-depPaid)}]}
function suggestDedItems(st,cid,X){const p=finalPreview(st,cid,X);if(p.err.length)return [];
 if(p.chargeTenant>0)return [{id:'owing',name:'未收足租金',amount:r2(p.chargeTenant)}];
 return []}
function itemsSum(items){return r2(sum((items||[]).map(i=>+i.amount||0)))}
// 退租并结算 / 后续结算
function settleApply(st,cid,opts,by,at){const c=C(st,cid);const X=opts.X||(c.term&&c.term.X);const p=finalPreview(st,cid,X);if(p.err.length)throw new Error(p.err.join('；'));
 const refundItems=(opts.refundItems||[]).map((i,idx)=>({id:i.id||('ri'+idx),name:String(i.name||'').trim()||'应退项',amount:r2(+i.amount||0)}));
 const dedItems=(opts.dedItems||[]).map((i,idx)=>({id:i.id||('di'+idx),name:String(i.name||'').trim()||'扣除项',amount:r2(+i.amount||0)}));
 let refund=r2(opts.refundItems?itemsSum(refundItems):(opts.refund!=null?+opts.refund:p.refundToTenant));
 let ded=r2(opts.dedItems?itemsSum(dedItems):(opts.ded!=null?+opts.ded:0));
 let charge=r2(opts.charge!=null?+opts.charge:0);
 if(refund<0||ded<0||charge<0)throw new Error('金额不能为负');
 if(refundItems.some(i=>i.amount<0)||dedItems.some(i=>i.amount<0))throw new Error('金额不能为负');
 const result=r2(refund-ded-charge);
 const net=result;
 if(!c.term){c.rooms.forEach(x=>{x.out=X;c.occupants[x.r]=(c.occupants[x.r]||[]).map(o=>({...o,ended:o.ended||X}))})}
 applyAfterStatus(c,opts.afterStatus);billsOf(st,cid).forEach(b=>{b.done=true;b.completedAt=TODAY});
 const sid=nid(st,'s');
 const s={id:sid,cid,X,cash:p.cash,refunded:p.refunded,received:p.received,rentLines:p.rentLines,actual:p.actual,other:p.other,
  refundToTenant:refund,ded,dedr:opts.dedr||'',result:net,reason:opts.reason||(c.term&&c.term.reason)||'到期',
  afterStatus:opts.afterStatus||'转为空房可租',note:opts.note||'',media:opts.media||0,
  payMethod:(opts.payMethod=='生成待收账单'?'生成待付账单':opts.payMethod)||'生成待付账单',payAt:opts.payAt||(X+' 12:00'),inviteSign:!!opts.inviteSign,payWay:opts.payWay||'线下',op:opts.op||by||'房东',
  refundItems,dedItems,payable:null,receivable:null};
 if(net>0){const pb={id:nid(st,'p'),cid,amount:net,paid:0,due:X,date:null,status:'待付款',reason:'结算应退',sid};
  if(opts.payMethod=='线下付款'||opts.payMethod=='线下收款'){pb.paid=net;pb.date=opts.payAt||X;pb.by=opts.op||by||'房东';pb.status='已完成'}
  st.payables.push(pb);s.payable=pb.id}
 if(net<0){const b={id:nid(st,'b'),cid,k:'settle',n:0,s:null,e:null,due:X,items:[{name:'结算应收',amount:-net,kind:'settle'}],pays:[],done:false,sid};syncTotal(b);st.bills.push(b);s.receivable=b.id}
 st.settlements.push(s);ensureLedger(st);
 c.term={X,at:at||TODAY+' 10:00',by:by||'房东',sid,reason:s.reason,settled:true};
 const ev=log(st,cid,at,by,'退租结算',`${titleText(c)} · ${X} · ${net>=0?'应退':'应收'} ${Math.abs(net)}`,[],{X,sid});return ev}
function finalApply(st,cid,X,other,ded,dedr,by,at){ // 兼容旧调用：并结算快捷路径
 const p=finalPreview(st,cid,X);if(p.err.length)throw new Error(p.err.join('；'));
 const oth=other!=null?+other:p.other;
 const raw=r2(p.received-p.actual-oth);
 const refund=r2(Math.max(0,raw));
 const charge=r2(Math.max(0,-raw));
 return settleApply(st,cid,{X,refund,ded:ded||0,charge,dedr:dedr||'',reason:'退租',payMethod:'生成待付账单'},by,at)}
function swapApply(st,cid,X,newRoom,end,rent,by,at,offsetIndices=[],opts={}){const c=C(st,cid);if(c.rooms.length!==1)throw new Error('多房合同不支持换房');if(c.term)throw new Error('合同已终止');
 if(newRoom===c.rooms[0].r)throw Error('新房间须不同于原房间');if(!newRoom)throw new Error('请选择新房间');if(!end)throw new Error('请填写新合同结束日');
 const pv=finalPreview(st,cid,X);if(pv.err.length)throw new Error(pv.err.join('；'));
 const start=addD(X,1);if(end<start)throw new Error('新合同结束日不能早于换房次日');
 const nr=rent!=null&&rent!==''?+rent:c.rent;if(!(nr>0))throw new Error('月租金须大于 0');
 const useOffset=opts.useOffset!==false&&(offsetIndices||[]).length>0;
 const draft={phone:c.phone,who:c.who,idType:c.idType,idNo:c.idNo,rooms:[{r:newRoom}],rent:nr,start,end,sign:opts.sign||c.sign,payN:c.payN,depM:c.depM,dep:opts.dep!=null?+opts.dep:c.dep,payRule:c.payRule,fees:c.fees||[],emergency:c.emergency,op:by||c.op,scans:0,idPhotos:0,terms:'',note:`换房自 ${titleText(c)}`,pendingSign:!!opts.pendingSign};
 const verr=validateReg(st,draft);if(verr.length)throw new Error(verr.join('；'));
 const preview=buildBills(draft);if(useOffset)validateOffset(preview,offsetIndices,pv.refundToTenant);
 const oldEv=finalApply(st,cid,X,pv.other,0,'',by,at);
 const nc=register(st,draft,at||TODAY+' 12:30');
 nc.source={type:'换房',from:cid};
 const payable=st.payables.find(p=>p.sid===oldEv.sid);
 const arrangement={kind:'swap',useOffset,indices:(offsetIndices||[]).slice(),available:pv.refundToTenant,fulfilled:false};
 nc.pendingOffset=arrangement;
 // 新合同成立后才履行；电子待签则仅存安排
 if(payable&&useOffset&&!opts.pendingSign){applyOffset(st,payable,billsOf(st,nc.id),offsetIndices,at,by);arrangement.fulfilled=true}
 const ev=log(st,nc.id,at,by,'换房',`${addrOf(c,c.rooms[0].r)} → ${bldOf(newRoom)+newRoom} · ${start} 至 ${end}`+(useOffset&&!opts.pendingSign?' · 已抵扣':useOffset?' · 抵扣已安排未履行':''),[],{from:cid,X,sid:oldEv.sid});
 return {oldEv,newContract:nc,ev}}
function fulfillPendingSwapOffset(st,ncid,by,at){const nc=C(st,ncid);const po=nc&&nc.pendingOffset;if(!po||po.fulfilled||po.kind!=='swap'||!po.useOffset||!po.indices.length)return null;const from=nc.source&&nc.source.from;const payable=st.payables.find(p=>p.cid===from&&p.sid);if(!payable)throw Error('找不到换房结算应退');applyOffset(st,payable,billsOf(st,ncid),po.indices,at,by);po.fulfilled=true;nc.pendingSign=false;log(st,ncid,at,by,'换房抵扣履行',`按安排抵扣 ${po.indices.length} 笔`,[]);return po}
function renewApply(st,cid,end,rent,dep,by,at,opts={}){const c=C(st,cid);if(c.term)throw new Error('合同已终止');if(c.voided)throw new Error('合同已作废');
 if(!end)throw new Error('请填写新结束日');if(end<=c.end)throw new Error('新结束日须晚于原合同结束日');
 const start=addD(c.end,1);const nr=rent!=null&&rent!==''?+rent:c.rent;const nd=dep!=null&&dep!==''?+dep:c.dep;
 if(!(nr>0))throw new Error('月租金须大于 0');if(!(nd>=0))throw new Error('押金不能为负');
 const draft={phone:c.phone,who:c.who,idType:c.idType,idNo:c.idNo,rooms:c.rooms.map(x=>({r:x.r})),rent:nr,start,end,sign:c.sign,payN:c.payN,depM:c.depM,dep:nd,payRule:c.payRule,fees:c.fees||[],emergency:c.emergency,op:by||c.op,scans:0,idPhotos:0,terms:c.terms||'',note:c.note||'',source:{type:'续租',from:cid}};
 const db=billsOf(st,cid).find(b=>b.k==='dep');if(c.dep>0&&(!db||billPaid(db)<billTotal(db)))throw Error('原合同押金未付清，须先收齐押金再续租');
 const paidDep=db?billPaid(db):0;const settleAmt=r2(opts.settleAmount!=null?+opts.settleAmount:paidDep);if(settleAmt<0)throw Error('原押金结算额不能为负');if(settleAmt>paidDep+1e-9)throw Error('原押金结算额不能超过已付押金');
 const useOffset=opts.useOffset!==false&&settleAmt>0;
 const preview=buildBills(draft);
 const indices=useOffset?(opts.offsetIndices!=null?opts.offsetIndices.slice():(nd>0?[0]:[])):[];
 let offsetAmount=0;
 if(useOffset&&indices.length){
  offsetAmount=r2(opts.offsetAmount!=null?+opts.offsetAmount:Math.min(settleAmt,sum(indices.map(i=>billTotal(preview[i])))));
  validateOffset(preview,indices,offsetAmount);
  let left=offsetAmount;for(const i of indices)left=r2(left-Math.min(left,billTotal(preview[i])));
  if(left>1e-9)throw Error('确认抵扣金额须按顺序全部分配完');
 }
 const nc=register(st,draft,at||TODAY+' 12:00');
 nc.pendingOffset={kind:'renew',from:cid,settleAmount:settleAmt,offsetAmount,indices,useOffset:!!(useOffset&&indices.length),arrangedAt:at||TODAY+' 12:00',by:by||'房东',fulfilled:false};
 c.renewTo=nc.id;c.pendingRenew={to:nc.id,start};
 log(st,nc.id,at,by,'续租',`续自 ${titleText(c)} · ${start} 至 ${end} · 已确认押金结算/抵扣安排（未履行）`,[],{from:cid,pending:true});
 fulfillPendingRenewals(st,TODAY,by,at);
 return nc}
function fulfillPendingRenewals(st,today,by,at){today=today||TODAY;const out=[];for(const nc of st.contracts){const po=nc.pendingOffset;if(!po||po.fulfilled||po.kind!=='renew')continue;if(nc.start>today)continue;const c=C(st,po.from);if(!c||c.voided)continue;
  let pb=st.payables.find(p=>p.renewTo===nc.id);
  if(!pb){pb={id:nid(st,'p'),cid:c.id,amount:po.settleAmount,paid:0,due:c.end,status:po.settleAmount?'待付款':'已完成',reason:'续租押金应退',renewTo:nc.id};st.payables.push(pb)}
  const db=billsOf(st,c.id).find(b=>b.k==='dep');if(db){db.done=true;db.completedAt=today};
  if(po.useOffset&&po.indices.length){
    // 仅用结算额中按顺序可抵部分：先把应付金额截到「已付+本次拟抵」再抵，再恢复总额以保留未抵余额
    const want=r2(Math.min(po.offsetAmount||po.settleAmount,pb.amount-pb.paid));
    if(want>0){const full=pb.amount;pb.amount=r2(pb.paid+want);applyOffset(st,pb,billsOf(st,nc.id),po.indices,at||today+' 12:00',by||po.by);pb.amount=full;pb.status=pb.paid>=pb.amount-1e-9?'已完成':pb.paid>0?'付款中':'待付款'}
  }
  if(!c.term){c.rooms.forEach(x=>{x.out=c.end;c.occupants[x.r]=(c.occupants[x.r]||[]).map(o=>({...o,ended:o.ended||c.end}))});
   c.term={X:c.end,at:at||today+' 10:00',by:by||po.by||'房东',reason:'续租',afterStatus:'空房可租',settled:false,renewTo:nc.id};
   log(st,c.id,at||today+' 10:00',by||po.by,'续租退租',`${titleText(c)} · 原合同于 ${c.end} 自动退租；押金结算/抵扣已按安排履行`,[],{X:c.end,renewTo:nc.id})}
  po.fulfilled=true;out.push(nc.id);log(st,nc.id,at||today+' 12:00',by||po.by,'续租抵扣履行',`原押金结算 ${po.settleAmount} · 抵扣 ${po.offsetAmount}`,[],{from:po.from})}
 return out}
// 历史收付按稳定来源键迁移；重复加载不会产生重复流水。
function ensureLedger(st){st.ledger=st.ledger||[];const add=(key,data)=>{if(!st.ledger.some(l=>l.key===key))st.ledger.push({id:nid(st,'l'),key,by:'房东',...data})};st.bills.forEach(b=>b.pays.forEach((p,i)=>{if(p.m==='抵扣')return;add('bill:'+b.id+':'+i,{cid:b.cid,bid:b.id,at:p.date,due:b.due,type:'租客-'+(b.k==='dep'?'押金':'租金/费用'),method:p.m||'线下收款',net:p.amount,by:p.by||'历史记录（经办未记录）'})}));st.payables.forEach(p=>{const cash=r2(p.paid-(p.offset||0));if(cash>0)add('pay:'+p.id+':'+cash,{cid:p.cid,pid:p.id,at:p.date,due:p.due,type:p.reason||'租客-退款',method:'线下付款',net:-cash,by:p.by||'历史记录（经办未记录）'})});return st.ledger}
function validateOffset(bills,indices,available){if(!Array.isArray(indices)||new Set(indices).size!==indices.length)throw Error('抵扣选择无效');const pending=bills.map((b,i)=>({b,i})).filter(({b})=>b.pays?billOut(b)>0:billTotal(b)>0).map(x=>x.i);if(indices.some((i,k)=>i!==pending[k]))throw Error('须按押金、第1期、第2期顺序抵扣，不可跳过更早账期');if(indices.length&&available<=0)throw Error('没有可用于抵扣的待退款')}
function applyOffset(st,p,bills,indices,at,by){if(payableStatus(p)==='已作废')throw Error('付款账单已作废');if(!st.payables.includes(p)||bills.some(b=>!st.bills.includes(b))||new Set(bills.map(b=>b.cid)).size!==1||C(st,p.cid)?.phone!==C(st,bills[0]?.cid)?.phone)throw Error('抵扣须为同一承租人的合同账款');validateOffset(bills,indices,p.amount-p.paid);let left=r2(p.amount-p.paid);for(const i of indices){const b=bills[i],a=Math.min(left,billOut(b));if(a<=0)break;b.pays.push({m:'抵扣',amount:a,date:(at||TODAY).slice(0,10),source:p.id});p.paid=r2(p.paid+a);p.offset=r2((p.offset||0)+a);left=r2(left-a);st.ledger=st.ledger||[];const pair=nid(st,'o');for(const side of [-1,1])st.ledger.push({id:nid(st,'l'),cid:side<0?p.cid:b.cid,pid:p.id,bid:b.id,at:at||TODAY,due:side<0?p.due:b.due,type:side<0?'租客-应退抵扣':'租客-'+(b.k==='dep'?'押金抵扣':'租金抵扣'),method:'抵扣（非现金）',amount:a,net:0,fulfilled:side*a,pair,by:by||'房东'})}p.date=(at||TODAY).slice(0,10);p.status=p.paid>=p.amount?'已完成':p.paid>0?'付款中':'待付款';return p}
function moveIn(st,cid,r,date){const c=C(st,cid);const x=c.rooms.find(y=>y.r==r);if(x.in)throw new Error('已记录实际入住时间');if(!date||date>TODAY)throw new Error('实际入住时间不能晚于今天');x.in=date;log(st,cid,date+' 10:00','房东','记录实际入住时间',`${addrOf(c,r)} 实际入住时间 ${date}`,[])}
function addOcc(st,cid,r,phone,self){const c=C(st,cid);if(!/^1\d{10}$/.test(phone))throw new Error('请输入 11 位手机号');c.occupants[r].push({phone,self:!!self,how:'手机号',st:'已生效'})}
function agreeOcc(st,cid,r,i){C(st,cid).occupants[r][i].st='已生效'}
function delOcc(st,cid,r,i){C(st,cid).occupants[r].splice(i,1)}


const WO_TYPES=['报修','保洁','投诉','预约看房','物业交割','续租申请','退租申请','设备维保'];
const WO_STATUSES=['待处理','处理中','已挂起','已完成','已关闭'];
function createWorkOrder(st,r,desc,by,at){const o=typeof r==='object'?r:{r,desc,by,at};const type=o.type||'报修';if(!WO_TYPES.includes(type))throw Error('工单类型无效');if(o.r&&!room(o.r))throw Error('房间不存在');if(!String(o.desc||'').trim())throw Error('请填写工单描述');const w={...o,type,desc:String(o.desc).trim(),id:nid(st,'w'),status:'待处理',created:(o.at||TODAY).slice(0,10),updated:TODAY,by:o.by||'房东'};(st.workOrders||(st.workOrders=[])).push(w);if(o.r&&['报修','设备维保'].includes(type))room(o.r).repair=true;return w}
function setWorkOrderStatus(st,wid,status,by){const w=(st.workOrders||[]).find(x=>x.id===wid);if(!w)throw Error('工单不存在');if(!WO_STATUSES.includes(status))throw Error('工单状态无效');w.status=status;w.updated=TODAY;w.by=by||w.by;if(w.r&&['报修','设备维保'].includes(w.type||'报修'))room(w.r).repair=openWorkOrders(st,w.r).some(x=>['报修','设备维保'].includes(x.type||'报修'));return w}
function workOrdersOf(st,r){return (st.workOrders||[]).filter(w=>!r||w.r===r).slice().sort((a,b)=>b.created.localeCompare(a.created))}

function closeForResign(st,cid,by,at,newCid){const c=C(st,cid);if(!c||c.voided)return;c.voided=true;c.voidedAt=(at||TODAY).slice(0,10);c.voidedBy=by||'房东';c.resignTo=newCid||null;
 billsOf(st,cid).forEach(b=>{b.done=true;b.excluded=true;b.voidedAt=TODAY});
 log(st,cid,at,by,'重签关闭',`原合同作废 · 新合同 ${newCid||''}`,[],{newCid})}
function resignApply(st,oldCid,f,at){const old=C(st,oldCid);if(!old)throw new Error('原合同不存在');if(old.voided||old.removed)throw new Error('原合同已关闭');// 生效中/已到期/已终止均可重签；已作废不可
 if(old.voided)throw new Error('已作废合同不能重签');
 f={...f,resignFrom:oldCid};const nc=register(st,f,at);closeForResign(st,oldCid,f.op||'房东',at,nc.id);
 nc.source={type:'重签',from:oldCid};log(st,nc.id,at,f.op||'房东','重签',`重签自 ${titleText(old)}`,[],{from:oldCid});return nc}
function addCustomBill(st,cid,name,amount,due,by){const c=C(st,cid);if(!c||c.voided||c.term)throw new Error('合同不可添加账单');
 name=String(name||'').trim();amount=r2(+amount);if(!name)throw new Error('请填写费用名称');if(!(amount>0))throw new Error('金额须大于 0');if(!due)throw new Error('请填写应付日');
 const b={id:nid(st,'b'),cid,k:'custom',n:0,s:null,e:null,due,items:[{name,amount,kind:'custom'}],pays:[],done:false};syncTotal(b);st.bills.push(b);
 log(st,cid,TODAY+' 10:00',by,'添加账单',`${name} ${amount}`,[]);return b}
function batchCollect(st,bids,date,by){if(!bids||!bids.length)throw new Error('请选择账单');if(!date||date>TODAY)throw new Error('收款日期不能晚于今天');
 const out=[];for(const id of bids){const b=st.bills.find(x=>x.id==id);if(!b)continue;const o=billOut(b);if(o>0&&itemsEditable(b)){b.pays.push({m:'线下收款',amount:o,date,by:by||'房东'});out.push(b.id)}}
 if(!out.length)throw new Error('没有可收款的待处理账单');log(st,st.bills.find(b=>b.id==out[0]).cid,date+' 10:00',by,'批量收款',`共 ${out.length} 笔`,[]);ensureLedger(st);return out}
function resetBills(st,cid,by){const c=C(st,cid);if(!c||c.voided||c.term)throw new Error('合同不可重置账单');
 // 已有到账或已完成的账单保留；删除未收款的租金账单后按条款重算未到期部分
 const keep=billsOf(st,cid).filter(b=>b.k!='rent'||billPaid(b)>0||b.done);
 const drop=billsOf(st,cid).filter(b=>b.k=='rent'&&billPaid(b)<=0&&!b.done);
 drop.forEach(b=>{const i=st.bills.indexOf(b);if(i>=0)st.bills.splice(i,1)});
 const fresh=buildBills(c).filter(b=>b.k=='rent');
 // only add periods that don't overlap kept paid rent bills' period numbers OR due in future unpaid
 const keptNs=new Set(keep.filter(b=>b.k=='rent').map(b=>b.n));
 fresh.forEach(b=>{if(keptNs.has(b.n))return; // skip periods that already have paid bill
  // also skip if period entirely in past and somehow missing? still regenerate unpaid
  b.id=nid(st,'b');b.cid=c.id;b.pays=[];b.done=false;syncTotal(b);st.bills.push(b)});
 // 已收的租金账单标为已完成以便进「已完成」区（用户：keep already-paid as 已完成）
 keep.filter(b=>b.k=='rent'&&billPaid(b)>=billTotal(b)-1e-9).forEach(b=>{b.done=true;b.completedAt=b.pays.map(p=>p.date).filter(Boolean).sort().pop()||TODAY});
 log(st,cid,TODAY+' 10:00',by,'重置账单','按合同条款重算未收租金账单，已收款账单保留为已完成',[]);return billsOf(st,cid)}
function softDelete(st,cid,by){const c=C(st,cid);if(!c)throw new Error('合同不存在');if(c.removed)return c;c.removed=true;c.removedAt=TODAY;c.removedBy=by||'房东';
 log(st,cid,TODAY+' 10:00',by,'删除合同','合同已从列表移除（软删除）',[]);return c}

function payDue(st,cid,upto){for(const b of billsOf(st,cid).filter(b=>!b.done&&b.due<=upto)){const o=billOut(b);if(o>0)b.pays.push({m:'线下收款',amount:o,date:b.due})}}
function seed(){const st=empty();st.buildings=JSON.parse(JSON.stringify(BUILDINGS));const R=(f,at)=>register(st,{sign:'电子合同',payRule:{type:'before',days:7},depM:1,fees:[],op:'刘管家',...f},at);
 const a=R({who:'张三',phone:'13800001001',idType:'身份证',idNo:'310101199001011234',rooms:[{r:'301'},{r:'302'},{r:'303'}],rent:3300,start:'2026-01-01',end:'2026-12-31',payN:3,dep:3300,fees:[{name:'物业费',mode:'随租金付',amount:100}],emergency:{rel:'父亲',phone:'13800001009',name:'张父'}},'2025-12-20 10:00');
 payDue(st,a.id,TODAY);const a4=billsOf(st,a.id).find(b=>b.n==4);a4.pays=[];
 a.rooms.forEach(x=>x.in=x.r=='303'?'2026-01-05':'2026-01-01');a.occupants={'301':[{phone:a.phone,self:true,how:'手机号',st:'已生效'}],'302':[{phone:'13800002011',self:false,how:'手机号',st:'已生效'}],'303':[{phone:'13800002012',self:false,how:'手机号',st:'已生效'}]};
 const b=R({who:'王五',phone:'13900002002',idType:'身份证',idNo:'310101198805052222',rooms:[{r:'305'},{r:'306'}],rent:2200,start:'2026-03-01',end:'2027-02-28',payN:1,dep:2200,op:'陈管家'},'2026-02-25 10:00');
 b.rooms.forEach(x=>x.in='2026-03-01');b.occupants={'305':[{phone:b.phone,self:true,how:'手机号',st:'已生效'}],'306':[{phone:'13900002021',self:false,how:'手机号',st:'已生效'}]};
 payDue(st,b.id,TODAY);
 const c3=R({who:'李四',phone:'13700003003',idType:'身份证',idNo:'310101199203033333',rooms:[{r:'501'}],rent:1500,start:'2026-03-01',end:'2027-02-28',payN:1,dep:1500,op:'陈管家',payRule:{type:'fixed',day:5}},'2026-02-25 10:00');
 payDue(st,c3.id,TODAY);c3.rooms[0].in='2026-03-02';c3.occupants={'501':[{phone:c3.phone,self:true,how:'手机号',st:'已生效'},{phone:'13700003031',self:false,how:'不记名二维码',st:'待同意'}]};
 const d=R({who:'赵六',phone:'13600004004',idType:'身份证',idNo:'310101198707074444',rooms:[{r:'601'}],rent:1800,start:'2025-08-01',end:'2026-07-31',payN:1,dep:1800,sign:'纸质合同'},'2025-07-25 10:00');
 payDue(st,d.id,TODAY);d.rooms[0].in='2025-08-01';d.occupants={'601':[{phone:d.phone,self:true,how:'手机号',st:'已生效'}]};
 const e=R({who:'吴九',phone:'13300007007',idType:'身份证',idNo:'310101199506065555',rooms:[{r:'502'}],rent:1500,start:'2025-06-01',end:'2026-05-31',payN:1,dep:1500,sign:'纸质合同',op:'陈管家'},'2025-05-26 10:00');
 payDue(st,e.id,'2026-05-31');e.rooms[0].in='2025-06-01';e.occupants={'502':[{phone:e.phone,self:true,how:'手机号',st:'已生效'}]};
 finalApply(st,e.id,'2026-05-31',0,0,'','陈管家','2026-05-31 09:30');payPayable(st,st.payables.find(p=>p.cid==e.id).id,'2026-06-02');
 const f=R({who:'孙七',phone:'13500005005',idType:'身份证',idNo:'310101199101016666',rooms:[{r:'101'},{r:'102'}],rent:3300,start:'2026-09-01',end:'2027-08-31',payN:3,dep:3300,sign:'纸质合同',op:'王管家',fees:[{name:'卫生费',mode:'一次付清',amount:200}],prepaid:[0,1]},'2026-08-25 10:00');
 f.rooms[0].in='2026-09-01';f.occupants={'101':[{phone:f.phone,self:true,how:'手机号',st:'已生效'}],'102':[]};
 createIntentSign(st,{cid:a.id,title:'租赁意愿确认',by:'房东'});return st}
function bookingsOf(st,r){return (st.bookings||[]).filter(b=>!r||b.r===r)}
function createBooking(st,o){const x=room(o.r);if(!x||x.locked||roomBusy(st,o.r)||bookingsOf(st,o.r).some(b=>b.status==='有效'))throw Error('房间不存在、已锁定、已出租或已有有效预定');if(!String(o.who||'').trim()||!/^1\d{10}$/.test(o.phone||''))throw Error('请填写姓名与11位手机号');if(o.deposit!==undefined&&(!Number.isFinite(+o.deposit)||+o.deposit<0))throw Error('预定金须为非负金额');const b={...o,deposit:+o.deposit||0,id:nid(st,'bk'),status:'有效',created:o.at||TODAY,by:o.by||'房东'};(st.bookings||(st.bookings=[])).push(b);return b}
function cancelBooking(st,id,by){const b=bookingsOf(st).find(b=>b.id===id);if(!b||b.status!=='有效')throw Error('预定无效');b.status='已取消';b.updatedBy=by||'房东';return b}
function convertBooking(st,id){const b=bookingsOf(st).find(b=>b.id===id);if(!b||b.status!=='有效')throw Error('预定无效');return {r:b.r,who:b.who,phone:b.phone,bookingId:b.id}}
function vacantRooms(st){return allRooms().filter(x=>roomStatus(st,x.r)==='空房可租')}
function batchPrice(st,rs,price){if(!rs.length)throw Error('请选择房间');rs.forEach(r=>{if(!room(r))throw Error('房间不存在')});const p={monthly:+price.monthly,depMode:price.depMode,dep:+price.dep};if(!(p.monthly>0)||!Number.isFinite(p.monthly)||!Number.isFinite(p.dep)||p.dep<0||!['months','amount'].includes(p.depMode)||(p.depMode==='months'&&!Number.isInteger(p.dep)))throw Error('价格或押金无效');return rs.map(r=>editRoom(st,r,{price:{...p}}))}
function voidBill(st,id,by,reason){const b=st.bills.find(b=>b.id===id);if(!b||b.excluded)throw Error('账单不存在或已作废');b.excluded=true;b.done=true;b.voidedAt=TODAY;log(st,b.cid,TODAY,by,'作废账单',reason||'作废账单',[]);return b}
function createInvoice(st,o){if(!C(st,o.cid)||!String(o.title||'').trim()||!Number.isFinite(+o.amount)||!(+o.amount>0))throw Error('请选择合同并填写抬头、有效金额');if(o.bid&&!st.bills.some(b=>b.id===o.bid&&b.cid===o.cid&&billPaid(b)>0))throw Error('请选择本合同已收款账单');const i={...o,amount:r2(+o.amount),id:nid(st,'inv'),status:'待开',created:TODAY};(st.invoices||(st.invoices=[])).push(i);return i}
function createOwnerContract(st,o){if(!BUILDINGS[o.building]||!String(o.who||'').trim()||!/^1\d{10}$/.test(o.phone||'')||!o.start||!o.end||o.end<o.start)throw Error('请填写楼栋、业主、手机号及有效租期');if(o.rent!==''&&o.rent!=null&&(!Number.isFinite(+o.rent)||+o.rent<0))throw Error('租金无效');const c={...o,id:nid(st,'oc'),status:'生效中',created:TODAY};(st.ownerContracts||(st.ownerContracts=[])).push(c);return c}
function terminateOwnerContract(st,id){const c=(st.ownerContracts||[]).find(c=>c.id===id);if(!c||c.status!=='生效中')throw Error('合同不存在或已终止');c.status='已终止';return c}
function addLedgerNote(st,o){if(!['in','out'].includes(o.dir)||!Number.isFinite(+o.amount)||!(+o.amount>0)||!String(o.name||'').trim()||!o.date||o.date>TODAY)throw Error('请填写收支名称、有效金额与日期');const l={id:nid(st,'l'),at:o.date,type:o.name,net:r2(+o.amount)*(o.dir==='in'?1:-1),method:'线下记账',by:o.by||'房东'};st.ledger.push(l);return l}
const API={defaultSettings,defaultApartment,updateSettings,createIntentSign,signIntent,withdrawIntent,voidPayable,payableStatus,onboardingProgress,WO_TYPES,WO_STATUSES,bookingsOf,createBooking,cancelBooking,convertBooking,vacantRooms,batchPrice,voidBill,createInvoice,createOwnerContract,terminateOwnerContract,addLedgerNote,room,roomStatus,roomIncomplete,roomBizFlags,matchRoomFilters,openWorkOrders,createWorkOrder,setWorkOrderStatus,workOrdersOf,generateRooms,addRoom,editRoom,ensureLedger,applyOffset,validateOffset,fulfillPendingRenewals,fulfillPendingSwapOffset,TODAY,BUILDINGS,allRooms,searchRooms,r2,pd,ds,addD,days,ms,rentIn,periods,dueOf,sum,billTotal,billPaid,billOut,billStatus,billStatusMatch,odays,payT,ruleT,cStatus,activeRooms,addrOf,titleText,leaseSt,empty,C,billsOf,bldOf,conflicts,roomBusy,validateReg,buildBills,previewBills,register,collect,itemsEditable,setItems,payPayable,finalPreview,finalApply,checkoutOnly,settleApply,needsSettle,suggestRefundItems,suggestDedItems,itemsSum,getBuildings,setBuildings,addBuilding,swapApply,renewApply,resignApply,closeForResign,addCustomBill,batchCollect,resetBills,softDelete,moveIn,addOcc,agreeOcc,delOcc,seed,log};
if(typeof module!=='undefined')module.exports=API;else root.CORE=API;
})(this);
