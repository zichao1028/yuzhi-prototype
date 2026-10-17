// 有状态原型：状态保存在 localStorage，首次由 CORE.seed() 生成。所有页面均由状态渲染。
(function(){const K=window.CORE,KEY='yuzhi-proto-state-v5';
let S;function load(){try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}if(!S||S.v!==5){S=K.seed();save()} else{if(!S.buildings)S.buildings=JSON.parse(JSON.stringify(K.getBuildings()));K.setBuildings(S.buildings);if(!S.workOrders)S.workOrders=[];['bookings','invoices','ownerContracts'].forEach(k=>{if(!Array.isArray(S[k]))S[k]=[]});if(!S.settings)S.settings=K.defaultSettings();if(!S.apartment)S.apartment=K.defaultApartment();if(!Array.isArray(S.intentSigns))S.intentSigns=[];if(!S.onboarding)S.onboarding={done:{}};K.ensureLedger(S);K.fulfillPendingRenewals(S,T);save()}}
function save(){K.ensureLedger(S);S.bills.forEach(b=>b.total=K.billTotal(b));S.buildings=K.getBuildings();localStorage.setItem(KEY,JSON.stringify(S))}
window.resetDemo=function(){if(!confirm('重置后，所有操作将被清除并恢复示例数据，确定？'))return;S=K.seed();K.setBuildings(S.buildings);save();go('home')};
const T=K.TODAY,esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=x=>'¥'+(+x).toFixed(2);
function go(p,q){location.hash='#'+p+(q?'?'+new URLSearchParams(q):'')}window.go=go;
function route(){const h=location.hash.slice(1)||'home';const[p,qs]=h.split('?');return{p,q:Object.fromEntries(new URLSearchParams(qs||''))}}
const titleOf=c=>`<span class="ttl"><span class="addr">${esc(K.titleText(c))}</span><span class="n">共${c.rooms.length}间房</span></span>`;
function billTitle(b,c){const who=c.who||'待承租人实名补充';return b.k=='dep'?`押金·${who}`:b.k=='settle'?`结算应收·${who}`:b.k=='custom'?`${b.items[0]?b.items[0].name:'费用'}·${who}`:`租金·${b.n}期·${who}`}
function contractBillTitle(b){if(b.k=='dep')return '押金';if(b.k=='settle')return '结算应收';if(b.k=='custom')return (b.items[0]&&b.items[0].name)||'费用';return `租金·${b.n}期`}
const label=b=>b.k=='dep'?'押金':b.k=='settle'?'结算应收':`租金 第${b.n}期`;
const period=b=>b.s?`${b.s} 至 ${b.e}`:'—';
function dueLabel(b){const od=K.odays(b,T);if(od)return `逾期${od}天`;if(['待收','部分收款'].includes(K.billStatus(b))&&b.due>T){const n=K.days(T,b.due);return n+`天后`}return ''}
function nav(t,back,spec){return `<div class="nav">${back?`<a class="back" href="javascript:history.back()">‹ 返回</a>`:''}${esc(t)}<a class="speclink" href="spec.html${spec?'#'+spec:''}">功能说明</a></div>`}
const ICON={home:'<path d="M4 11.5 13 4l9 7.5"/><path d="M6.5 10v11h13V10"/>',rooms:'<path d="M6 21V4h8v17"/><path d="M14 9h6v12"/>',bills:'<rect x="5" y="4" width="16" height="18"/><path d="M9 9h8M9 13h8M9 17h5"/>',me:'<circle cx="13" cy="9" r="4"/><path d="M5 22c1-5 4-7 8-7s7 2 8 7"/>'};
function tabbar(a){return `<div class="tabbar">${[['home','首页'],['rooms','房源'],['bills','账单'],['me','我的']].map(([k,n])=>`<a href="#${k}" class="${a==k?'act':''}"><svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2">${ICON[k]}</svg>${n}</a>`).join('')}</div>`}
const row=(a,b)=>`<div class="row"><span>${a}</span><b>${b}</b></div>`;
function flash(m){const d=document.createElement('div');d.id='toast';d.textContent=m;d.style.cssText='position:fixed;top:60px;left:20px;right:20px;background:#333;color:#fff;padding:10px;z-index:99;text-align:center';document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
window.copyPhone=async function(event,phone){
 event.stopPropagation();
 try{await navigator.clipboard.writeText(phone)}catch(e){
  const input=document.createElement('textarea');input.value=phone;input.style.cssText='position:fixed;opacity:0';document.body.appendChild(input);input.select();
  try{if(!document.execCommand('copy'))throw new Error('copy failed')}catch(e){flash('复制失败，请手动复制');return}finally{input.remove()}
 }
 flash('已复制');
};
// ---------------- pages ----------------
const P={};
P.home=()=>{const cs=S.contracts.filter(c=>!c.removed&&!c.voided),cnt=s=>cs.filter(c=>K.cStatus(c,T)==s).length;const due=S.bills.filter(b=>['待收','部分收款'].includes(K.billStatus(b))&&b.due<=T);
 return nav('首页','', 'home')+`<div class="wrap"><div class="h1">寓智云控</div>
 <a class="btn" id="go-register" href="#register?new=1">租客登记</a><div style="height:10px"></div>
 <a class="card entry" href="#contracts"><span><b>合同管理</b><div class="helper">${cnt('生效中')} 份生效中 · ${cnt('已到期')} 份已到期 · ${cnt('已终止')} 份已终止</div></span><span>›</span></a>
 <a class="card entry" href="#rooms"><span><b>房源</b><div class="helper">${K.allRooms().length} 间房 · 无未退租租赁的房间可直接登记</div></span><span>›</span></a>
 <a class="card entry" href="#bills"><span><b>账单</b><div class="helper">${due.length} 笔已到支付日未收清</div></span><span>›</span></a>
 <a class="card entry" href="spec.html"><span><b>功能说明（PRD）</b><div class="helper">流程、计算规则与示例</div></span><span>›</span></a>
 <button class="btn sec2" id="reset" onclick="resetDemo()">重置示例数据</button><div class="helper">数据保存在本浏览器（localStorage），刷新后保留。示例“今天”固定为 ${T}。</div></div>`+tabbar('home')};
P.me=()=>nav('我的','','me')+`<div class="wrap"><div class="sec">${row('办理人','房东（示例）')}${row('示例今天',T)}</div><button class="btn sec2" id="reset" onclick="resetDemo()">重置示例数据</button></div>`+tabbar('me');
P.contracts=(q)=>{const tabs=['全部','生效中','已到期','已终止'],t=q.t||'全部';const list=S.contracts.filter(c=>!c.removed&&!c.voided&&(t=='全部'||K.cStatus(c,T)==t)).slice().reverse();
 return nav('合同管理',1,'contracts')+`<div class="wrap"><div class="tabs">${tabs.map(x=>`<span class="${x==t?'act':''}" onclick="go('contracts',{t:'${x}'})">${x}</span>`).join('')}</div>
 ${list.map(c=>`<a class="card cc" href="#contract?id=${c.id}" data-cid="${c.id}"><div class="l1">${titleOf(c)}</div><div class="l2"><span>${esc(c.who||'待承租人实名补充')} ${c.phone}</span><span class="tag ${K.cStatus(c,T)=='生效中'?'on':''}">${K.cStatus(c,T)}</span></div><div class="l2"><span>${c.start} 至 ${c.end}</span><span>月租 ${money(c.rent)}</span></div></a>`).join('')||'<div class="helper">暂无合同</div>'}</div>`+tabbar('home')};
P.contract=(q)=>{const c=K.C(S,q.id);if(!c||c.removed)return nav('合同',1)+'<div class="wrap">合同不存在</div>';const st=K.cStatus(c,T),_tabs=['合同','账单','承租人','入住人','物业交割','设备账户'],tab=_tabs.includes(q.tab)?q.tab:'合同';const bl=K.billsOf(S,c.id);
 const canAct=!c.voided&&(!c.term||c.term.settled===false); const canBiz=!c.term&&!c.voided;
 let body='',bar='';
 if(tab=='合同'){
  body=`${canBiz?`<button class="btn sec2" id="invite-bind" onclick="go('contract',{id:'${c.id}',tab:'入住人'})">邀请绑定</button><div style="height:8px"></div>`:''}
  <div class="sec"><h3>合同详情</h3>
   ${row('合同期间',c.start+' 至 '+c.end)}
   ${row('月租金（租金单价）',money(c.rent)+'/月')}
   ${row('押金',money(c.dep))}
   ${row('付款方式',K.payT(c))}
   ${row('支付时间',K.ruleT(c.payRule))}
   ${row('签约方式',c.sign)}
   ${(c.fees||[]).map(f=>row(esc(f.name),`${money(f.amount)}${f.mode=='随租金付'?'/月 · 随租金付':' · 一次付清'}`)).join('')||row('其他费用','无')}
   ${row('业务状态',st)}
  </div>
  <div class="sec"><h3>其他信息</h3>
   ${row('办理人',esc(c.op))}
   ${row('录入日期',c.entry)}
   ${row('合同扫描件',c.scans?c.scans+' 个附件':'—')}
   ${row('补充条款',esc(c.terms)||'—')}
   ${row('合同备注',esc(c.note)||'—')}
   ${c.emergency?row('紧急联系人',`${esc(c.emergency.name)}（${esc(c.emergency.rel)}）${c.emergency.phone}`):''}
   ${c.source?row('签约来源',esc(c.source.type)+(c.source.from?` · <a href="#contract?id=${c.source.from}">查看关联合同</a>`:'')):row('签约来源','新签')}
  </div>
  ${c.term?`<div class="sec"><h3>终止信息</h3>${row('实际退租日',c.term.X)}${row('办理人',esc(c.term.by))}${row('结算状态',c.term.settled===false?'待结算':'已结算')}${c.term.sid?`<a class="ref" href="#settlement?id=${c.term.sid}">查看结算单 ›</a>`:c.term.settled===false?`<a class="ref" id="go-settle" href="#checkoutSettle?id=${c.id}">去结算 ›</a>`:''}</div>`:''}
  ${c.voided?`<div class="sec"><h3>作废信息</h3>${row('作废原因','重签')}${row('作废日期',c.voidedAt||'—')}${c.resignTo?`<a class="ref" href="#contract?id=${c.resignTo}">查看新合同 ›</a>`:''}</div>`:''}
  ${!c.term&&!c.voided&&st=='已到期'?`<div class="sec"><h3>到期信息</h3>${row('到期日',c.end)}<div class="helper">已到期未退租，请办理退租或续租。</div></div>`:''}`;
  bar=contractActionBar(c);
 }
 if(tab=='账单'){
  const pending=bl.filter(b=>['待收','部分收款'].includes(K.billStatus(b)));
  const done=bl.filter(b=>['已收','已完成'].includes(K.billStatus(b)));
  const pays=S.payables.filter(p=>p.cid==c.id);
  const sumP=K.sum(pending.map(b=>K.billTotal(b))),sumD=K.sum(done.map(b=>K.billTotal(b)));
  body=`<a class="ref" href="#ledger?cid=${c.id}">流水记录 ›</a><div class="sec"><div class="row"><span><b>待处理（${pending.length}）</b></span><b>${money(sumP)} 合计</b></div>
   ${pending.map(b=>contractBillCard(b)).join('')||'<div class="helper">暂无</div>'}</div>
   <div class="sec"><div class="row"><span><b>已完成（${done.length}）</b></span><b>${money(sumD)} 合计</b></div>
   ${done.map(b=>contractBillCard(b)).join('')||'<div class="helper">暂无</div>'}</div>
   ${pays.length?`<div class="sec"><h3>付款账单</h3>${pays.map(p=>payCard(p,c)).join('')}</div>`:''}`;
  bar=canBiz?`<div class="actionbar bill-actions"><button class="mini" onclick="go('invoices',{cid:'${c.id}'})">发票</button><button class="btn sec2" id="btn-reset-bills" onclick="doResetBills('${c.id}')">重置账单</button><button class="btn sec2" id="btn-add-bill" onclick="doAddBill('${c.id}')">添加账单</button><button class="btn" id="btn-batch-collect" onclick="openBatchCollect('${c.id}')">批量收款</button></div>`:'';
 }
 if(tab=='承租人'){body=`<div class="sec"><h3>承租人</h3>${row('姓名',esc(c.who)||'待承租人实名补充')}${row('手机号',c.phone)}${row('证件类型',esc(c.idType)||'—')}${row('证件照',c.idPhotos?c.idPhotos+' 张':'—')}${row('证件号码',c.idNo?c.idNo.slice(0,4)+'**********'+c.idNo.slice(-4):'—')}</div>`;bar=contractActionBar(c)}
 if(tab=='入住人'){body=c.rooms.map(x=>`<div class="sec"><h3>${esc(K.addrOf(c,x.r))} · ${c.term||c.voided?'本合同入住期间 '+(x.in?x.in:'未记录')+' 至 '+(x.out||'—'):K.leaseSt(S,c,x,T)+(x.in?' · 实际入住时间 '+x.in:'')}</h3>
  ${(c.occupants[x.r]||[]).map((o,i)=>`<div class="row"><span>${o.phone}${o.self?' <span class="tag">本人</span>':''} <span class="helper">${o.how}</span></span><b><span class="tag ${o.st=='已生效'?'ok':'warn'}">${o.st}</span> ${canAct&&!x.out?`${o.st=='待同意'?`<button class="mini" onclick="occAgree('${c.id}','${x.r}',${i})">同意</button>`:''}<button class="mini" onclick="occDel('${c.id}','${x.r}',${i})">删除</button>`:''}</b></div>`).join('')||'<div class="helper">暂无入住人</div>'}
  ${canAct&&!x.out?`<div class="btns">${!x.in?`<button class="mini mvin" onclick="moveIn('${c.id}','${x.r}')">记录实际入住时间</button>`:''}<button class="mini" onclick="occAdd('${c.id}','${x.r}')">手机号添加</button><button class="mini" onclick="alert('展示不记名二维码：入住人扫码申请后出现在列表（待同意）。')">二维码添加</button></div>`:''}</div>`).join('');bar=canAct?contractActionBar(c):''}
 if(tab=='物业交割'){body=`<div class="wrap stub"><div class="sec"><h3>物业交割</h3><div class="helper">第一版不实现。交割清单、钥匙与公区设施等后续版本提供。</div></div>`;bar=''}
 if(tab=='设备账户'){body=`<div class="wrap stub"><div class="sec"><h3>设备账户 / 水电</h3><div class="helper">自定·待方案。</div></div>`;bar=''}
 return nav('合同详情',1,'contract')+`<div class="wrap has-ab"><div class="status ${st=='生效中'?'on':''}"><div class="t" id="cstatus">${st}</div></div>
 <div class="card" onclick="document.getElementById('rm').classList.add('open')">${titleOf(c)}<div class="helper">${esc(c.who||'待承租人实名补充')} ${esc(c.phone)} <span class="act-links"><button type="button" class="mini" data-phone="${esc(c.phone)}" onclick="copyPhone(event,this.dataset.phone)">复制</button><a class="mini" href="tel:${esc(c.phone)}" onclick="event.stopPropagation()">拨打</a></span> · 点击查看房间</div></div>
 <div class="mask" id="rm" onclick="this.classList.remove('open')"><div class="sheet"><b>房间</b>${c.rooms.map(x=>row(esc(K.addrOf(c,x.r)),x.out?'已退租 '+x.out:K.leaseSt(S,c,x,T))).join('')}<div class="btns"><button class="btn sec2">关闭</button></div></div></div>
 <div class="tabs">${_tabs.map(x=>`<span class="${x==tab?'act':''}" onclick="go('contract',{id:'${c.id}',tab:'${x}'})">${x}</span>`).join('')}</div>${body}</div>${bar}`+tabbar('home')};
function contractBillCard(b){const s=K.billStatus(b),rel=dueLabel(b),amt=K.billTotal(b);return `<a class="card bc" href="#bill?id=${b.id}" data-bid="${b.id}"><div class="bt"><span>${esc(contractBillTitle(b))}</span><span class="amount">${amt>=0?'+ ':''}${money(amt)}</span></div><div class="bb"><span>账期 ${period(b)}</span></div><div class="bb"><span>应付日 ${b.due}</span><span><span class="tag ${s=='已完成'||s=='已收'?'ok':s=='已作废'?'':'warn'}">${s}</span> ${rel?`<b class="od">${rel}</b>`:''}</span></div></a>`}
function contractActionBar(c){if(c.voided)return '';
 if(c.term&&c.term.settled===false)return `<div class="actionbar"><button class="btn" id="btn-go-settle" onclick="go('checkoutSettle',{id:'${c.id}'})">去结算</button></div>`;
 if(c.term)return '';
 const swap=c.rooms.length==1?`<button class="btn sec2" id="btn-swap" onclick="go('swap',{id:'${c.id}'})">换房</button>`:'';
 return `<div class="actionbar"><button class="mini" id="btn-more" onclick="openMoreSheet('${c.id}')">更多</button><button class="btn sec2" id="btn-resign" onclick="startResign('${c.id}')">重签</button>${swap}<button class="btn sec2" onclick="go('renew',{id:'${c.id}'})">续租</button><button class="btn" id="btn-checkout" onclick="openCheckoutSheet('${c.id}')">退租</button></div>`}
function billCard(b,c){const s=K.billStatus(b),od=K.odays(b,T);return `<a class="card bc" href="#bill?id=${b.id}" data-bid="${b.id}"><div class="bt"><span>${esc(billTitle(b,c))}</span><span class="amount">${money(K.billTotal(b))}</span></div><div class="bb"><span>账期 ${period(b)}</span><span class="tag ${s=='已收'||s=='已完成'?'ok':'warn'}">${s}</span></div><div class="bb"><span>应付日 ${b.due}</span><span>待收 ${money(Math.max(0,K.billOut(b)))}${od?` <b class="od">逾期${od}天</b>`:''}</span></div><div class="helper">${esc(K.titleText(c))} · 共${c.rooms.length}间房</div></a>`}
function payCard(p,c){return `<a class="card bc" href="#pay?id=${p.id}" data-pid="${p.id}"><div class="bt"><span>付款账单·${esc(c.who||'待承租人实名补充')}</span><span class="amount">${money(p.amount)}</span></div><div class="bb"><span>付款账单 · ${esc(p.reason)}</span><span class="tag ${p.status=='已完成'?'ok':'warn'}">${K.payableStatus(p)}</span></div><div class="bb"><span>支付日 ${p.due}</span><span>${p.date?'已付 '+p.date:''}</span></div><div class="helper">${esc(K.titleText(c))} · 共${c.rooms.length}间房</div></a>`}
P.bills=(q)=>{const side=q.side||'in',bld=q.bld||'全部楼栋',ov=q.ov||'',kw=q.kw||'',dueFrom=q.dueFrom||'',dueTo=q.dueTo||'';
 if(side=='in'){const tabs=['全部','待收','部分收款','已收','已完成','已作废'],t=q.t||'待收';const typ=q.typ||'全部';
  let l=S.bills.filter(b=>{const c=K.C(S,b.cid);if(!c||c.removed)return false;
   if(t==='全部'){if(b.excluded)return false}else if(t==='已作废'){if(!b.excluded)return false}else if(t==='已收'){if(K.billStatus(b)!=='已收')return false}else if(t==='已完成'){if(K.billStatus(b)!=='已完成')return false}else if(K.billStatus(b)!==t)return false;
   if(bld!=='全部楼栋'&&!c.rooms.some(x=>K.bldOf(x.r)==bld))return false;
   if(typ!=='全部'&&!(typ=='租金'?b.k=='rent':typ=='押金'?b.k=='dep':typ=='结算应收'?b.k=='settle':b.k=='custom'))return false;
   if(ov==='1'&&!(K.odays(b,T)>0))return false;
   if(dueFrom&&b.due<dueFrom)return false;if(dueTo&&b.due>dueTo)return false;
   if(kw){const hay=(K.titleText(c)+' '+(c.who||'')+' '+c.phone+' '+(b.k||'')).toLowerCase();if(!hay.includes(String(kw).toLowerCase()))return false}
   return true}).sort((a,b)=>a.due<b.due?-1:1);
  const total=K.sum(l.map(b=>K.billTotal(b))),paid=K.sum(l.map(b=>K.billPaid(b))),due=K.sum(l.map(b=>Math.max(0,K.billOut(b))));
  const qs=(extra)=>go('bills',Object.assign({side:'in',t,bld,typ,ov,kw,dueFrom,dueTo},extra));
  return nav('账单',1,'bills')+`<div class="wrap"><a class="ref" href="#ledger">流水记录 ›</a><div class="bhead"><div class="seg"><b class="act">收款账单</b><b onclick="go('bills',{side:'out'})">付款账单</b></div></div>
  <div class="tabs scroll-tabs">${tabs.map(x=>`<span class="${x==t?'act':''}" onclick="go('bills',{side:'in',t:'${x}',bld:'${esc(bld)}',typ:'${typ}',ov:'${ov}',kw:'${esc(kw)}',dueFrom:'${dueFrom}',dueTo:'${dueTo}'})">${x}</span>`).join('')}</div>
  <div class="chips2 bill-filters"><select class="input" aria-label="楼栋" onchange="go('bills',{side:'in',t:'${t}',bld:this.value,typ:'${typ}',ov:'${ov}',kw:'${esc(kw)}',dueFrom:'${dueFrom}',dueTo:'${dueTo}'})">${['全部楼栋',...Object.keys(K.getBuildings())].map(x=>`<option ${x==bld?'selected':''}>${x}</option>`).join('')}</select>
  <select class="input" aria-label="费用类型" onchange="go('bills',{side:'in',t:'${t}',bld:'${esc(bld)}',typ:this.value,ov:'${ov}',kw:'${esc(kw)}',dueFrom:'${dueFrom}',dueTo:'${dueTo}'})">${['全部','租金','押金','结算应收','其他'].map(x=>`<option ${x==typ?'selected':''}>${x}</option>`).join('')}</select>
  <label class="check tight"><input type="checkbox" ${ov==='1'?'checked':''} onchange="go('bills',{side:'in',t:'${t}',bld:'${esc(bld)}',typ:'${typ}',ov:this.checked?'1':'',kw:'${esc(kw)}',dueFrom:'${dueFrom}',dueTo:'${dueTo}'})">仅逾期</label></div>
  <div class="chips2"><input class="input" placeholder="搜索承租人/房源/手机" value="${esc(kw)}" onchange="go('bills',{side:'in',t:'${t}',bld:'${esc(bld)}',typ:'${typ}',ov:'${ov}',kw:this.value,dueFrom:'${dueFrom}',dueTo:'${dueTo}'})"><input class="input" type="date" aria-label="应付日起" value="${dueFrom}" onchange="go('bills',{side:'in',t:'${t}',bld:'${esc(bld)}',typ:'${typ}',ov:'${ov}',kw:'${esc(kw)}',dueFrom:this.value,dueTo:'${dueTo}'})"><input class="input" type="date" aria-label="应付日止" value="${dueTo}" onchange="go('bills',{side:'in',t:'${t}',bld:'${esc(bld)}',typ:'${typ}',ov:'${ov}',kw:'${esc(kw)}',dueFrom:'${dueFrom}',dueTo:this.value})"></div>
  <div class="sumrow"><div>${money(total)}<span>总金额（元）</span></div><div>${money(paid)}<span>已收（元）</span></div><div>${money(due)}<span>待收（元）</span></div></div>
  ${l.map(b=>billCard(b,K.C(S,b.cid))).join('')||'<div class="helper">暂无账单</div>'}</div>`+tabbar('bills')}
 const t=q.t||'全部';const l=S.payables.filter(p=>{const c=K.C(S,p.cid);if(!c||c.removed)return false;if(!(t==='全部'?K.payableStatus(p)!=='已作废':K.payableStatus(p)===t))return false;if(bld!=='全部楼栋'&&!c.rooms.some(x=>K.bldOf(x.r)==bld))return false;return true});
 const pTotal=K.sum(l.map(p=>p.amount)),pPaid=K.sum(l.map(p=>p.paid)),pDue=K.sum(l.map(p=>p.amount-p.paid));
 return nav('账单',1,'bills')+`<div class="wrap"><a class="ref" href="#ledger">流水记录 ›</a><div class="bhead"><div class="seg"><b onclick="go('bills',{side:'in'})">收款账单</b><b class="act">付款账单</b></div></div>
 <div class="tabs">${['全部','待付款','部分付款','已完成','已作废'].map(x=>`<span class="${x==t?'act':''}" onclick="go('bills',{side:'out',t:'${x}',bld:'${esc(bld)}'})">${x}</span>`).join('')}</div>
 <div class="chips2"><select class="input" onchange="go('bills',{side:'out',t:'${t}',bld:this.value})">${['全部楼栋',...Object.keys(K.getBuildings())].map(x=>`<option ${x==bld?'selected':''}>${x}</option>`).join('')}</select></div>
 <div class="sumrow"><div>${money(pTotal)}<span>总金额（元）</span></div><div>${money(pPaid)}<span>已付（元）</span></div><div>${money(pDue)}<span>待付（元）</span></div></div>${l.map(p=>payCard(p,K.C(S,p.cid))).join('')||'<div class="helper">暂无付款账单</div>'}</div>`+tabbar('bills')};
P.bill=(q)=>{const b=S.bills.find(x=>x.id==q.id);const c=K.C(S,b.cid);const s=K.billStatus(b),ed=K.itemsEditable(b),editing=q.edit&&ed;
 const items=editing?`<div id="items">${b.items.map(i=>itemRow(i)).join('')}</div><button class="mini" onclick="document.getElementById('items').insertAdjacentHTML('beforeend',itemRowHtml({name:'',amount:''}))">+ 添加账单项</button><div class="err-t" id="ierr"></div><div class="btns"><button class="btn sec2" onclick="go('bill',{id:'${b.id}'})">取消</button><button class="btn" id="save-items" onclick="saveItems('${b.id}')">保存</button></div>`
  :b.items.map(i=>row(esc(i.name),money(i.amount))).join('')+row('<b>账单金额</b>','<b id="btotal">'+money(K.billTotal(b))+'</b>');
 return nav('账单详情',1,'bill')+`<div class="wrap"><div class="status"><div class="t" id="bstatus">${s}</div><div class="s">${esc(billTitle(b,c))}</div><div class="s">账期 ${period(b)} · 应付日 ${b.due}${K.odays(b,T)?' · 逾期'+K.odays(b,T)+'天':''}</div></div>
 <a class="card" href="#contract?id=${c.id}">${titleOf(c)}<div class="helper">${esc(c.who||'待承租人实名补充')} ${c.phone}</div></a>
 <div class="sec"><h3>账单项 ${ed&&!editing?`<button class="mini" id="edit-items" onclick="go('bill',{id:'${b.id}',edit:1})">调整</button>`:''}</h3>${items}${!ed?'<div class="helper">'+(s=='已收'?'已收账单不可调整':'已完成账单不可调整')+'</div>':''}</div>
 ${!b.excluded?`<button class="btn sec2" onclick="gapVoid('${b.id}')">作废账单</button>`:''}<a class="ref" href="#ledger?cid=${c.id}">流水记录 ›</a><div class="sec"><h3>收款记录</h3>${row('已收',money(K.billPaid(b)))}${row('待收','<span id="bout">'+money(Math.max(0,K.billOut(b)))+'</span>')}${b.pays.map(p=>row(`${p.date} ${p.m}`,money(p.amount)+(p.note?'<div class="helper">'+esc(p.note)+'</div>':''))).join('')||'<div class="helper">暂无</div>'}</div>
 ${ed&&!editing?`<div class="sec"><h3>收款（线下收款）</h3><label class="f">收款金额<input class="input" id="pamt" type="number" value="${K.billOut(b)}"></label><label class="f">收款日期<input class="input" id="pdate" type="date" value="${T}"></label><div class="err-t" id="perr"></div><button class="btn" id="do-collect" onclick="doCollect('${b.id}')">确认收款</button></div>`:''}</div>`+tabbar('bills')};
const itemRowHtml=i=>`<div class="daterow item"><input class="input iname" placeholder="账单项名称" value="${esc(i.name)}" data-kind="${i.kind||'adj'}" data-room="${i.room||''}"><input class="input iamt" type="number" step="0.01" value="${i.amount}" style="width:110px"><button class="mini" onclick="this.parentNode.remove()">删除</button></div>`;window.itemRowHtml=itemRowHtml;const itemRow=itemRowHtml;
window.saveItems=id=>{const items=[...document.querySelectorAll('#items .item')].map(d=>({name:d.querySelector('.iname').value,amount:d.querySelector('.iamt').value===''?NaN:+d.querySelector('.iamt').value,kind:d.querySelector('.iname').dataset.kind,room:d.querySelector('.iname').dataset.room||undefined}));
 try{K.setItems(S,id,items);save();go('bill',{id});flash('已保存')}catch(e){document.getElementById('ierr').textContent=e.message}};
window.doCollect=id=>{try{K.collect(S,id,document.getElementById('pamt').value,document.getElementById('pdate').value);save();render();flash('已记录线下收款')}catch(e){document.getElementById('perr').textContent=e.message}};
P.pay=(q)=>{const p=S.payables.find(x=>x.id==q.id),c=K.C(S,p.cid);return nav('付款账单',1,'pay')+`<div class="wrap"><div class="status"><div class="t" id="pstatus">${K.payableStatus(p)}</div><div class="s">${esc(p.reason)}</div></div><a class="card" href="#contract?id=${c.id}">${titleOf(c)}</a>
 <div class="sec"><a class="ref" href="#ledger?cid=${c.id}">流水记录 ›</a>${row('应付金额',money(p.amount))}${row('已履行',money(p.paid))}${row('剩余待付',money(p.amount-p.paid))}${row('支付日',p.due)}${row('付款日期',p.date||'—')}${p.sid?`<a class="ref" href="#settlement?id=${p.sid}">查看结算单 ›</a>`:''}</div>
 ${!p.excluded&&!p.voided?`<button class="btn sec2" id="void-payable" onclick="gapVoidPayable('${p.id}')">作废付款账单</button>`:''}${!p.excluded&&!p.voided&&p.status!='已完成'?`<label class="f">付款日期<input class="input" id="paydate" type="date" value="${T}"></label><div class="err-t" id="perr"></div><button class="btn" id="do-pay" onclick="doPay('${p.id}')">确认已线下付款</button>`:''}</div>`+tabbar('bills')};
window.doPay=id=>{try{K.payPayable(S,id,document.getElementById('paydate').value);save();render()}catch(e){document.getElementById('perr').textContent=e.message}};
P.settlement=(q)=>{const s=S.settlements.find(x=>x.id==q.id),c=K.C(S,s.cid);return nav('结算单',1,'settlement')+`<div class="wrap"><a class="card" href="#contract?id=${c.id}">${titleOf(c)}</a><div class="sec"><h3>退租信息</h3>${row('退租原因',esc(s.reason||'—'))}${row('退租后状态',esc(s.afterStatus||'—'))}${row('实际退租时间',s.X)}</div><div class="sec"><h3>结算</h3>${row('应退租客金额',money(s.refundToTenant!=null?s.refundToTenant:Math.max(0,s.result)))}${(s.refundItems||[]).map(i=>row('　'+esc(i.name),money(i.amount))).join('')}${row('扣除租客金额',money(s.ded))}${(s.dedItems||[]).map(i=>row('　'+esc(i.name),money(i.amount))).join('')}${row('总计',(s.result>=0?'':'')+s.result.toFixed(2))}${row('付款方式',esc(s.payMethod||'—'))}${s.note?row('退租备注',esc(s.note)):''}${s.media?row('照片/视频',s.media+' 个'):''}
 ${row('已收净额',money(s.received))}${s.rentLines.map(l=>row(`实际租金（${c.start} 至 ${l.to}）`,money(-l.amount))).join('')}${row('其他费用',money(-s.other))}
 ${s.payable?`<a class="ref" href="#pay?id=${s.payable}">付款账单 ›</a>`:''}${s.receivable?`<a class="ref" href="#bill?id=${s.receivable}">收款账单 ›</a>`:''}</div></div>`+tabbar('home')};
P.rooms=(q)=>{const status=q.status||'全部',floor=q.floor||'',biz=(q.biz?String(q.biz).split('|').filter(Boolean):[]),qstr=q.q||'',minPrice=q.minPrice||'',maxPrice=q.maxPrice||'',orient=q.orient||'全部',vacantDays=q.vd||'',panel=q.panel==='1';
 const STATUSES=['全部','空房可租','空房不可租','已出租','业主退房','维修','锁房','待完善'];
 const BIZ=['已预定','签约中','在租中','将搬入','即将离店','今日到期','到期未退房','待收款','有欠款','退租未结账'];
 const countOf=st=>K.allRooms().filter(x=>K.matchRoomFilters(S,x.r,{status:st},T)).length;
 const f={status,floor,biz,q:qstr,minPrice,maxPrice,orient,vacantDays};
 const goRooms=(extra)=>go('rooms',Object.assign({status,floor,biz:biz.join('|'),q:qstr,minPrice,maxPrice,orient,vd:vacantDays},extra));
 const maxFloor=Math.max(0,...Object.values(K.getBuildings()).map(v=>+v.floors||Math.max(0,...v.rooms.map(r=>+r.floor||0))));
 const filterPanel=panel?`<div class="filter-panel" id="room-filter-panel"><div class="row"><b>房源筛选</b><button class="mini" onclick="goRooms({panel:''})">收起</button></div>
 <div class="helper">房源状态（单选）</div><div class="chips">${STATUSES.map(x=>`<span class="chipf ${status===x?'on':''}" onclick="goRooms({status:'${x}',panel:'1'})">${x}${x==='全部'?'':' '+countOf(x)}</span>`).join('')}</div>
 <div class="helper">业务状态（可多选；数据不足时列表可空）</div><div class="chips">${BIZ.map(x=>`<span class="chipf ${biz.includes(x)?'on':''}" onclick="toggleBiz('${x}')">${x}</span>`).join('')}</div>
 <div class="helper">更多</div><div class="filters"><label>定价下限<input class="input" type="number" value="${esc(minPrice)}" onchange="goRooms({minPrice:this.value,panel:'1'})"></label><label>定价上限<input class="input" type="number" value="${esc(maxPrice)}" onchange="goRooms({maxPrice:this.value,panel:'1'})"></label></div>
 <div class="filters"><label>空置≥天<input class="input" type="number" value="${esc(vacantDays)}" onchange="goRooms({vd:this.value,panel:'1'})"></label><label>朝向<select class="input" onchange="goRooms({orient:this.value,panel:'1'})">${['全部','东','南','西','北','南北'].map(x=>`<option ${orient===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
 <div class="helper">其余（房型风格/居室/图片/备注/业主）第一版筛选项占位</div><div class="chips"><span class="chipf stub">房型风格</span><span class="chipf stub">居室</span><span class="chipf stub">有图</span><span class="chipf stub">有备注</span><span class="chipf stub">业主</span></div>
 </div>`:`<button class="mini" id="btn-room-filter" onclick="goRooms({panel:'1'})">筛选 ›</button>`;
 return nav('房源',1,'rooms')+`<div class="wrap"><div class="helper">按楼栋管理 · 共 ${K.allRooms().length} 间 · 对齐寓小二独栋筛选</div>
 <input class="input" id="room-q" placeholder="搜索楼栋名/房号" value="${esc(qstr)}" onchange="goRooms({q:this.value})">
 <div class="floor-bar">${['全部',...Array.from({length:maxFloor},(_,i)=>String(i+1))].map(x=>`<span class="chipf ${(!floor&&x==='全部')||floor===x?'on':''}" onclick="goRooms({floor:x==='全部'?'':x})">${x==='全部'?'全部':x+'层'}</span>`).join('')}</div>
 ${filterPanel}
 ${biz.length&&!K.allRooms().some(x=>K.matchRoomFilters(S,x.r,f,T))?'<div class="helper">当前业务状态在示例数据中可能不足，列表为空属预期。</div>':''}
 ${Object.entries(K.getBuildings()).map(([b,v])=>{const rs=v.rooms.filter(x=>K.matchRoomFilters(S,x.r,{...f,/* per building search already in q */},T));if(!rs.length&&(status!=='全部'||floor||biz.length||qstr||minPrice||maxPrice||vacantDays||orient!=='全部'))return '';return `<section class="sec"><h3>${esc(b)}</h3><div class="helper">${esc([v.city,v.district,v.community,v.address].filter(Boolean).join(' · ')||v.address||'地址未填写')}</div><a class="ref" href="#roomEdit?b=${encodeURIComponent(b)}">+ 新增房间</a><div class="room-cards">${rs.map(x=>{const c=S.contracts.find(c=>!c.term&&!c.voided&&!c.removed&&c.rooms.some(y=>y.r===x.r&&!y.out));const last=S.contracts.flatMap(c=>c.rooms).filter(y=>y.r===x.r&&y.out).map(y=>y.out).sort().pop()||x.created||T;const flags=K.roomBizFlags(S,x.r,T);return `<a class="room-card" data-room="${esc(x.r)}" href="#room?r=${encodeURIComponent(x.r)}"><div class="row"><strong>${esc(x.r)}</strong><span class="tag">${K.roomStatus(S,x.r)}${K.roomIncomplete(x.r)?' · 待完善':''}${c&&x.locked?' · 已锁定':''}</span></div><div class="price">${x.price?money(x.price.monthly)+'/月':'暂未定价'}</div><div class="helper">${x.floor}楼${x.repair||K.openWorkOrders(S,x.r).length?' · 维修':''}${flags.length?' · '+flags.slice(0,2).join('·'):''}</div><div>${c?esc(c.who||c.phone)+' · 到期 '+c.end:'空置 '+Math.max(0,K.days(last,T))+' 天'}</div></a>`}).join('')||'<div class="helper">暂无匹配房间</div>'}</div></section>`}).join('')}<a class="btn" id="btn-add-building" href="#buildingAdd">新增楼栋（独栋）</a></div>`+tabbar('rooms')};
window.toggleBiz=(x)=>{const q=route().q;const cur=(q.biz?String(q.biz).split('|').filter(Boolean):[]);const i=cur.indexOf(x);if(i>=0)cur.splice(i,1);else cur.push(x);go('rooms',Object.assign({},q,{biz:cur.join('|'),panel:'1'}))};
let BD=null;
const ADDR_PRESETS=[{city:'上海市',district:'徐汇区',community:'漕溪北路小区',address:'漕溪北路88弄'},{city:'上海市',district:'黄浦区',community:'中山南路公寓',address:'中山南路2-14号'},{city:'上海市',district:'浦东新区',community:'张江Lofts',address:'张江高科技园区亮秀路'},{city:'上海市',district:'长宁区',community:'虹桥路公馆',address:'虹桥路1号'}];
P.buildingAdd=()=>{if(!BD)BD={name:'',city:'上海市',district:'',community:'',address:'',floors:3,perFloor:2,prefix:'',skip4:true,min4:true,counts:{},rooms:[]};const d=BD;const cities=[...new Set(ADDR_PRESETS.map(x=>x.city))];const districts=[...new Set(ADDR_PRESETS.filter(x=>x.city===(d.city||'上海市')).map(x=>x.district))];const communities=ADDR_PRESETS.filter(x=>x.city===d.city&&(!d.district||x.district===d.district));
 return nav('新增独栋',1,'rooms')+`<div class="wrap form has-ab"><label class="f">楼栋名称 *<input class="input" id="bld-name" value="${esc(d.name)}" oninput="BDset('name',this.value)"></label>
 <div class="sec"><h3>地址选址</h3><div class="helper">对齐寓小二「选小区+填公寓地址」。地图选点+经纬度见 FOLLOWUPS，后续开发。</div>
 <label class="f">城市<select class="input" id="bld-city" onchange="BDset('city',this.value);BDset('district','');BDset('community','');render()">${cities.map(x=>`<option ${d.city===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="f">区域<select class="input" id="bld-district" onchange="BDset('district',this.value);BDset('community','');render()"><option value="">请选择</option>${districts.map(x=>`<option ${d.district===x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="f">小区 / 地址点<select class="input" id="bld-community" onchange="pickCommunity(this.value)"><option value="">请选择或下方手填</option>${communities.map(x=>`<option value="${esc(x.community)}" ${d.community===x.community?'selected':''}>${esc(x.community)}（${esc(x.address)}）</option>`).join('')}</select></label>
 <label class="f">公寓地址<input class="input" id="bld-address" value="${esc(d.address)}" oninput="BDset('address',this.value)" placeholder="街道门牌等"></label>
 </div>
 <div class="filters"><label>总层高<input class="input" type="number" id="bld-floors" value="${d.floors}" onchange="BDset('floors',+this.value)"></label><label>每层间数<input class="input" type="number" id="bld-per" value="${d.perFloor}" onchange="BDset('perFloor',+this.value)"></label></div><label class="f">房号前缀（1位选填）<input class="input" id="bld-prefix" maxlength="1" value="${esc(d.prefix)}" oninput="BDset('prefix',this.value)"></label><label class="check"><input id="bld-skip4" type="checkbox" ${d.skip4?'checked':''} onchange="BDset('skip4',this.checked)">去4（楼层不跳4）</label><label class="check"><input id="bld-min4" type="checkbox" ${d.min4?'checked':''} onchange="BDset('min4',this.checked)">房号至少4位</label><button class="btn sec2" id="bld-generate" onclick="generateBuilding()">生成 / 重新生成预览</button><div class="helper">重新生成会覆盖预览中的手工调整。房号在同一楼栋内唯一（允许不同楼栋相同房号）。</div>${(d.rooms.length?Array.from({length:+d.floors},(_,i)=>i+1):[]).map(f=>`<div class="sec"><label>${f}楼间数<input class="input" type="number" value="${d.rooms.filter(x=>x.floor===f).length}" onchange="buildingFloor(${f},+this.value)"></label>${d.rooms.map((x,i)=>x.floor===f?`<div class="filters"><input class="input" aria-label="预览房号" value="${esc(x.r)}" oninput="buildingNumber(${i},this.value)"><button class="mini" onclick="buildingDelete(${i})">删除</button></div>`:'').join('')}</div>`).join('')}<div class="err-t" id="blderr"></div></div><div class="actionbar"><button class="btn" id="do-add-building" onclick="doAddBuilding()">确认新增</button></div>`+tabbar('rooms')};
window.BDset=(k,v)=>{BD[k]=v;if(['floors','perFloor','prefix','skip4','min4'].includes(k)){BD.rooms=[];BD.counts={}}};
window.pickCommunity=(name)=>{const p=ADDR_PRESETS.find(x=>x.community===name);if(!p){BDset('community',name);return}BDset('city',p.city);BDset('district',p.district);BDset('community',p.community);BDset('address',p.address);render()};
window.generateBuilding=()=>{try{BD.rooms=K.generateRooms(BD.floors,BD.perFloor,BD,BD.counts);render()}catch(e){document.getElementById('blderr').textContent=e.message}};
window.buildingFloor=(f,n)=>{try{const rs=K.generateRooms(BD.floors,BD.perFloor,BD,{[f]:n}).filter(x=>x.floor===f);BD.rooms=BD.rooms.filter(x=>x.floor!==f).concat(rs).sort((a,b)=>a.floor-b.floor);render()}catch(e){document.getElementById('blderr').textContent=e.message}};
window.buildingNumber=(i,v)=>BD.rooms[i].r=v;window.buildingDelete=i=>{BD.rooms.splice(i,1);render()};
window.doAddBuilding=()=>{try{if(!BD.rooms.length)throw Error('请先生成房间预览，至少保留一间房');K.addBuilding(BD.name,BD.rooms,{floors:+BD.floors,perFloor:+BD.perFloor,city:BD.city,district:BD.district,community:BD.community,address:BD.address,rules:{prefix:BD.prefix,skip4:BD.skip4,min4:BD.min4}});save();BD=null;go('rooms')}catch(e){document.getElementById('blderr').textContent=e.message}};
P.room=q=>{const x=K.room(q.r);if(!x)return nav('房间',1)+'<div class="wrap">房间不存在</div>';const r=x.r,b=K.bldOf(r),cs=S.contracts.filter(c=>c.rooms.some(y=>y.r===r)).slice().reverse();const wos=K.workOrdersOf(S,r).filter(w=>(w.type||'报修')==='报修');return nav(b+' '+r,1,'room')+`<div class="wrap"><div class="status"><div class="t">${K.roomStatus(S,r)}</div>${x.locked?'<div>已锁定 · 禁止新登记</div>':''}${K.openWorkOrders(S,r).some(w=>['报修','设备维保'].includes(w.type||'报修'))?'<div>维修中 · 有未完成维修工单</div>':''}</div><div class="sec">${row('配置月租',x.price?money(x.price.monthly):'暂未定价')}${row('面积 / 朝向',esc(x.area||'—')+' / '+esc(x.orient||'—'))}${row('备注',esc(x.note||'—'))}${row('户号',esc(x.meterNo||'—'))}<a class="ref" href="#roomEdit?r=${encodeURIComponent(r)}">编辑房间 ›</a><a class="ref" href="#roomPrice?r=${encodeURIComponent(r)}">价格配置 ›</a><button class="mini" id="room-lock" onclick="roomFlag('${r}','locked')">${x.locked?'解锁':'锁房'}</button></div>
 <div class="sec" id="room-workorders"><h3>维修工单</h3><a class="ref" href="#workOrders">全部工单 ›</a><div class="helper">维修 = 工单。报修后房态可显示维修。</div>
 <label class="f">报修描述<input class="input" id="wo-desc" placeholder="如：空调不制冷"></label><button class="mini" id="btn-create-wo" onclick="createWO('${r}')">提交报修</button>
 ${wos.map(w=>`<div class="card"><div class="row"><b>${esc(w.desc)}</b><span class="tag">${w.status}</span></div><div class="helper">${w.created} · ${esc(w.by||'')}</div>${!['已完成','已关闭'].includes(w.status)?`<div class="btns"><button class="mini" onclick="setWO('${w.id}','处理中')">处理中</button><button class="mini" onclick="setWO('${w.id}','已完成')">完成</button></div>`:''}</div>`).join('')||'<div class="helper">暂无工单</div>'}</div>
 ${!K.roomBusy(S,r)&&!x.locked?`<a class="btn" id="room-register" href="#register?new=1&r=${encodeURIComponent(r)}">租客登记</a>`:''}<div class="sec" id="room-contracts"><h3>合同列表</h3>${cs.map(c=>`<a class="ref" href="#contract?id=${c.id}">${esc(c.who||c.phone)} · ${K.cStatus(c,T)}<div class="helper">${c.start} 至 ${c.end} · 合同月租 ${money(c.rent)}</div></a>`).join('')||'<div class="helper">暂无合同，可从房间登记租客。</div>'}</div></div>`+tabbar('rooms')};
window.createWO=(r)=>{try{K.createWorkOrder(S,r,document.getElementById('wo-desc').value);save();render();flash('已创建工单')}catch(e){flash(e.message)}};
window.setWO=(id,st)=>{try{K.setWorkOrderStatus(S,id,st);save();render()}catch(e){flash(e.message)}};
window.roomFlag=(r,k)=>{K.editRoom(S,r,{[k]:!K.room(r)[k]});save();render()};
const field=(id,label,value='',type='text')=>`<label class="f">${label}<input class="input" id="${id}" type="${type}" value="${esc(value)}"></label>`;
P.roomEdit=q=>{const x=K.room(q.r)||{},b=q.b||K.bldOf(q.r);return nav(q.r?'编辑房间':'新增房间',1)+`<div class="wrap form"><div class="helper">${esc(b)}</div>${field('re-r','房号 *',x.r)}${field('re-floor','楼层 *',x.floor||1,'number')}${field('re-area','面积（㎡，选填）',x.area,'number')}${field('re-orient','朝向（选填）',x.orient)}${field('re-note','备注（选填）',x.note)}<div class="err-t" id="roomerr"></div><button class="btn" id="save-room" onclick="saveRoom()">保存</button></div>`};
window.saveRoom=()=>{try{const q=route().q,get=id=>document.getElementById(id).value,x={r:get('re-r').trim(),floor:+get('re-floor'),area:get('re-area'),orient:get('re-orient'),note:get('re-note')};if(!Number.isInteger(x.floor)||x.floor<1)throw Error('楼层须为正整数');if(x.area!==''&&+x.area<0)throw Error('面积不能为负');if(q.r)K.editRoom(S,q.r,x);else K.addRoom(q.b,x);save();go('room',{r:x.r})}catch(e){document.getElementById('roomerr').textContent=e.message}};
P.roomPrice=q=>{const x=K.room(q.r),p=x?.price||{monthly:'',depMode:'months',dep:1};if(!x)return nav('价格配置',1)+'房间不存在';return nav('房间价格配置',1)+`<div class="wrap form">${field('rp-monthly','基准月租 *',p.monthly,'number')}<label class="f">押金方式<select class="input" id="rp-mode"><option value="months" ${p.depMode==='months'?'selected':''}>押N个月</option><option value="amount" ${p.depMode==='amount'?'selected':''}>固定金额</option></select></label>${field('rp-dep','押金月数 / 金额',p.dep,'number')}<div class="helper">默认付1。房间价仅为登记建议，多房合同仍须确认合同总月租。</div><div class="err-t" id="roomerr"></div><button class="btn" id="save-price" onclick="savePrice()">保存价格</button></div>`};
window.savePrice=()=>{try{const r=route().q.r;const mv=document.getElementById('rp-monthly').value,dv=document.getElementById('rp-dep').value;if(!mv||!dv)throw Error('月租和押金必填');K.editRoom(S,r,{price:{monthly:+mv,depMode:document.getElementById('rp-mode').value,dep:+dv}});save();go('room',{r})}catch(e){document.getElementById('roomerr').textContent=e.message}};
P.ledger=q=>{const list=K.ensureLedger(S).filter(l=>!q.cid||l.cid===q.cid).slice().reverse();return nav('流水记录',1)+`<div class="wrap"><a class="ref" href="#ledger">查看全部流水</a><label class="f">按合同筛选<select class="input" onchange="go('ledger',this.value?{cid:this.value}:{})"><option value="">全部合同</option>${S.contracts.map(c=>`<option value="${c.id}" ${c.id===q.cid?'selected':''}>${esc(c.who||c.phone)} · ${esc(K.titleText(c))} · ${c.start}</option>`).join('')}</select></label><div class="helper">抵扣仅履行账款，现金净额为0；正数为收款，负数为付款。</div>${list.map(l=>`<a class="card" href="#${l.method==='线下记账'?'ledger':l.method.startsWith('抵扣')&&l.fulfilled<0||l.method==='线下付款'?'pay?id='+l.pid:'bill?id='+l.bid}"><strong>${esc(l.type)} · ${money(l.net)}</strong><div>${l.amount?'抵扣金额 '+money(l.amount):''}</div><div class="helper">支付时间 ${esc(l.at)} · 应支付日 ${l.due}<br>合同 ${l.cid} · ${esc(K.C(S,l.cid)?.who||'待实名')}<br>${esc(l.method)} · 经办 ${esc(l.by)}</div></a>`).join('')||'<div class="helper">暂无流水</div>'}</div>`+tabbar('bills')};
const DK='yuzhi-reg-draft';const newDraft=()=>({rooms:[],sign:'',phone:'',who:'',idNo:'',idType:'',idPhotos:0,start:'',end:'',rent:'',payN:'1',depM:'1',dep:'',depTouched:false,fees:[],ruleType:'before',ruleV:'7',scans:0,terms:'',note:'',eName:'',eRel:'',ePhone:'',q:'',resignFrom:''});
let D=null;function dget(){if(!D){try{D=JSON.parse(sessionStorage.getItem(DK))}catch(e){}if(!D)D=newDraft()}return D}function dsave(){sessionStorage.setItem(DK,JSON.stringify(D))}
window.dset=(k,v)=>{dget()[k]=v;dsave()};window.__draft=()=>dget();
function roomSt(r){return K.roomStatus(S,r)}window.roomSt=roomSt;
const inp=(k,ph,extra)=>`<input class="input" id="f-${k}" value="${esc(dget()[k])}" placeholder="${ph||''}" oninput="dset('${k}',this.value)" ${extra||''}>`;
const sub=(id,label,val,to)=>`<a class="card entry" id="${id}" href="#${to}"><span>${label}</span><span class="helper">${val} ›</span></a>`;
P.register=(q)=>{if(q.new){D=newDraft();if(q.booking){try{const b=K.convertBooking(S,q.booking);D.bookingId=b.bookingId;D.who=b.who;D.phone=b.phone;D.rooms=[{r:b.r}];suggestPrice(D,b.r)}catch(e){return nav('租客登记',1)+'<div class="wrap">'+esc(e.message)+'</div>'}}if(q.r){D.rooms.push({r:q.r});suggestPrice(D,q.r);}dsave();history.replaceState(null,'','#register');}const d=dget();
 const res=K.searchRooms(d.q);
 return nav(d.resignFrom?'重签登记':'租客登记',1,'register')+`<div class="wrap form has-ab">${d.resignFrom?`<div class="helper">重签来源合同已预填，确认登记后原合同作废并关闭其账单。</div>`:''}
 <div class="step">1 添加房源</div><input class="input" id="f-q" placeholder="搜索地址 / 楼栋 / 房号" value="${esc(d.q)}" oninput="dset('q',this.value);regSearch()">
 <div id="sres">${searchHtml(res)}</div>
 <div id="sel">${d.rooms.length?d.rooms.map(x=>`<span class="tag on chip" data-r="${x.r}">${esc(K.bldOf(x.r)+x.r)} · ${roomSt(x.r)} <a href="javascript:regDel('${x.r}')" style="color:#fff">✕</a></span> `).join(''):'<div class="helper">尚未选择房间</div>'}</div>
 <div class="step" style="margin-top:16px">2 签约方式</div><div class="chips">${['纸质合同','电子合同'].map(x=>`<span class="sign ${d.sign==x?'act':''}" onclick="dset('sign','${x}');render()">${x}</span>`).join('')}</div>
 <div class="step" style="margin-top:16px">3 承租方信息</div><label class="f">手机号 *${inp('phone','11 位手机号','maxlength="11"')}</label><label class="f">姓名${inp('who')}</label><label class="f">证件号码${inp('idNo')}</label><label class="f">证件类型${inp('idType')}</label>
 ${sub('go-idphoto','证件照',d.idPhotos?d.idPhotos+' 张':'未上传','reg-idphoto')}<div class="helper">姓名、证件类型、证件号码须全部填写，或全部留空由承租人实名后补充</div>
 <div class="step" style="margin-top:16px">4 合同信息</div><label class="f">开始时间 *${inp('start','','type="date"')}</label><label class="f">结束时间 *${inp('end','','type="date"')}</label>
 <label class="f">付款方式 *</label><div class="daterow">付<input class="input" id="f-payN" type="number" value="${esc(d.payN)}" oninput="dset('payN',this.value);depAuto()">押<input class="input" id="f-depM" type="number" value="${esc(d.depM)}" oninput="dset('depM',this.value);depAuto()"></div>
 <div class="helper" style="margin-top:8px">已选房间：${d.rooms.length?d.rooms.map(x=>esc(K.bldOf(x.r)+x.r)).join('、'):'请先添加房源'}</div>
 <label class="f">月租金（元，整份合同）*<input class="input" id="f-rent" type="number" value="${esc(d.rent)}" oninput="dset('rent',this.value);depAuto()"></label>
 <label class="f">押金（元，整份合同；默认 押M × 月租金）<input class="input" id="f-dep" type="number" value="${esc(d.dep)}" oninput="dset('dep',this.value);dset('depTouched',true)"></label>
 <label class="f">其他费用</label><div id="fees">${d.fees.map((f,i)=>`<div class="daterow fee"><input class="input" value="${esc(f.name)}" placeholder="名称" oninput="feeSet(${i},'name',this.value)"><select class="input" onchange="feeSet(${i},'mode',this.value)">${['随租金付','一次付清'].map(m=>`<option ${f.mode==m?'selected':''}>${m}</option>`).join('')}</select><input class="input" type="number" value="${esc(f.amount)}" placeholder="金额" style="width:90px" oninput="feeSet(${i},'amount',this.value)"><button class="mini" onclick="feeDel(${i})">删</button></div>`).join('')}</div><button class="mini" id="add-fee" onclick="addFee()">+ 添加费用</button>
 <label class="f">支付时间 *<select class="input" id="f-rule" onchange="dset('ruleType',this.value)"><option value="before" ${d.ruleType=='before'?'selected':''}>账单开始日期前 N 天</option><option value="fixed" ${d.ruleType=='fixed'?'selected':''}>账单开始月份固定日</option></select><input class="input" id="f-ruleV" type="number" value="${esc(d.ruleV)}" oninput="dset('ruleV',this.value)"></label>
 ${sub('go-more','更多（合同扫描件、补充条款、合同备注）',[d.scans?d.scans+' 个附件':'',d.terms?'已填补充条款':'',d.note?'已填备注':''].filter(Boolean).join('，')||'选填','reg-more')}
 ${sub('go-emg','紧急联系人',d.eName?esc(d.eName):'选填','reg-emg')}
 <div class="err-t" id="rerr"></div></div><div class="actionbar"><button class="btn" id="to-preview" onclick="toPreview()">去核对账单</button></div>`+tabbar('home')};
function searchHtml(res){const d=dget();if(!d.q.trim())return '<div class="helper">输入关键字搜索全部房间（共 '+K.allRooms().length+' 间）</div>';
 return res.map(x=>{const on=d.rooms.some(y=>y.r==x.r);return on?`<div class="row sr on" data-r="${x.r}"><span>${esc(x.addr)} <span class="tag">${roomSt(x.r)}</span></span><b>已添加</b></div>`:`<div class="row sr" data-r="${x.r}" role="button" tabindex="0" onclick="regAdd('${x.r}')" style="cursor:pointer;min-height:44px;align-items:center"><span>${esc(x.addr)} <span class="tag">${roomSt(x.r)}</span></span><b class="mini" style="pointer-events:none">添加</b></div>`}).join('')||'<div class="helper">无匹配房间</div>'}
window.regSearch=()=>{document.getElementById('sres').innerHTML=searchHtml(K.searchRooms(dget().q))};

function suggestPrice(d,r){const p=K.room(r)?.price;if(p&&d.rooms.length===1&&!d.rent){d.rent=String(p.monthly);d.depM=String(p.depMode==='months'?p.dep:0);d.dep=String(p.depMode==='months'?p.monthly*p.dep:p.dep);d.depTouched=true;d.payN='1'}}
window.regAdd=r=>{if(K.room(r)?.locked){flash('锁房禁止新登记');return}const d=dget();if(!d.rooms.some(x=>x.r==r))d.rooms.push({r});suggestPrice(d,r);dsave();render()};
window.regDel=r=>{const d=dget();d.rooms=d.rooms.filter(x=>x.r!=r);dsave();render()};
window.depAuto=(noDom)=>{const d=dget();if(d.depTouched)return;d.dep=String(K.r2((parseInt(d.depM)||0)*(+d.rent||0)));dsave();const e=document.getElementById('f-dep');if(e&&!noDom)e.value=d.dep};
window.addFee=()=>{dget().fees.push({name:'',mode:'随租金付',amount:''});dsave();render()};window.feeSet=(i,k,v)=>{dget().fees[i][k]=v;dsave()};window.feeDel=i=>{dget().fees.splice(i,1);dsave();render()};
P['reg-idphoto']=()=>{const d=dget();return nav('证件照',1,'register')+`<div class="wrap"><div class="helper">证件照片可空（biz-租客登记）。原型仅占位，不实际上传。</div><div class="rooms" style="margin:10px 0">${Array.from({length:d.idPhotos},(_,i)=>`<a href="javascript:void(0)">证件照${i+1} <span onclick="dset('idPhotos',${d.idPhotos-1});render()">✕</span></a>`).join('')}</div><button class="btn sec2" id="add-photo" onclick="dset('idPhotos',${d.idPhotos+1});render()">+ 上传证件照（占位）</button><div style="height:10px"></div><a class="btn" id="photo-done" href="#register">完成</a></div>`};
P['reg-more']=()=>{const d=dget();return nav('更多',1,'register')+`<div class="wrap form"><label class="f">合同扫描件（可空，最多10个附件；原型占位）</label><div class="helper" id="scan-n">已添加 ${d.scans} 个</div><button class="mini" id="add-scan" onclick="if(${d.scans}<10){dset('scans',${d.scans+1});render()}">+ 添加附件（占位）</button>
 <label class="f">补充条款<textarea class="input" id="f-terms" style="height:80px" oninput="dset('terms',this.value)">${esc(d.terms)}</textarea></label><label class="f">合同备注（最多1000字符）<textarea class="input" id="f-note" maxlength="1000" style="height:80px" oninput="dset('note',this.value)">${esc(d.note)}</textarea></label><div style="height:10px"></div><a class="btn" id="more-done" href="#register">完成</a></div>`};
P['reg-emg']=()=>nav('紧急联系人',1,'register')+`<div class="wrap form"><div class="helper">选填；填写则关系、手机号、姓名须完整。</div><label class="f">关系${inp('eRel')}</label><label class="f">手机号${inp('ePhone','','maxlength="11"')}</label><label class="f">姓名${inp('eName')}</label><div style="height:10px"></div><a class="btn" id="emg-done" href="#register">完成</a></div>`;
function regForm(){const d=dget();return {bookingId:d.bookingId,phone:d.phone.trim(),who:d.who.trim(),idType:d.idType.trim(),idNo:d.idNo.trim(),rooms:d.rooms.map(x=>({r:x.r})),rent:d.rent===''?NaN:+d.rent,start:d.start,end:d.end,sign:d.sign,payN:Number(d.payN),depM:Number(d.depM),dep:d.dep===''?NaN:+d.dep,
 payRule:d.ruleType=='fixed'?{type:'fixed',day:+d.ruleV}:{type:'before',days:+d.ruleV},fees:d.fees.map(f=>({name:String(f.name).trim(),mode:f.mode,amount:+f.amount})),emergency:{name:d.eName.trim(),rel:d.eRel.trim(),phone:d.ePhone.trim()},terms:d.terms,note:d.note,scans:d.scans,idPhotos:d.idPhotos,op:'房东',resignFrom:d.resignFrom||undefined}}
window.toPreview=()=>{const e=K.validateReg(S,regForm());if(e.length){document.getElementById('rerr').textContent=e.join('；');window.scrollTo(0,document.body.scrollHeight);return}go('reg-preview')};
function pvBills(f){const d=dget();const key=JSON.stringify({...f,bills:undefined});if(!d.pv||d.pvKey!==key){d.pv=K.previewBills(f).map(b=>({...b,paid:false}));d.pvKey=key;dsave()}return d.pv}
window.pvSet=(bi,ii,v)=>{const d=dget();if(ii<0)d.pv[bi].due=v;else d.pv[bi].items[ii].amount=v===''?NaN:+v;dsave();const t=document.getElementById('pt'+bi);if(t)t.textContent=money(K.sum(d.pv[bi].items.map(i=>+i.amount||0)))};
window.pvPaid=(bi,v)=>{dget().pv[bi].paid=v;dsave()};
P['reg-preview']=()=>{const f=regForm();const e=K.validateReg(S,f);if(e.length)return nav('核对账单',1,'register')+`<div class="wrap"><div class="err-t">${e.join('；')}</div><a class="btn sec2" href="#register">返回修改</a></div>`;
 const bl=pvBills(f);return nav('核对账单',1,'register')+`<div class="wrap has-ab"><div class="sec">${row('房间',esc(f.rooms.map(x=>K.bldOf(x.r)+x.r).join('、')))}${row('合同期间',f.start+' 至 '+f.end)}${row('付款方式','付'+f.payN+'押'+f.depM)}${row('月租金',money(f.rent))}${row('账单数',bl.length+' 笔')}</div>
 <div class="helper">可修改账单项金额、支付日；勾选「已线下收款」表示整张账单已在线下全额收取。首期结束日期调整：待实现。</div>
 ${bl.map((b,bi)=>`<div class="sec pbill"><h3>${b.k=='dep'?'押金账单':'租金 第'+b.n+'期 · '+b.s+' 至 '+b.e}</h3>${b.items.map((i,ii)=>`<div class="row"><span>${esc(i.name)}</span><b><input class="input pv-amt" style="width:120px;height:32px" type="number" step="0.01" value="${i.amount}" oninput="pvSet(${bi},${ii},this.value)"></b></div>`).join('')}
 <div class="row"><span>支付日</span><b><input class="input pv-due" style="width:150px;height:32px" type="date" value="${b.due}" oninput="pvSet(${bi},-1,this.value)"></b></div>${row('<b>账单金额</b>','<b id="pt'+bi+'">'+money(K.sum(b.items.map(i=>+i.amount||0)))+'</b>')}<label class="chk"><input type="checkbox" class="pv-paid" ${b.paid?'checked':''} onchange="pvPaid(${bi},this.checked)"> 已线下收款</label></div>`).join('')}<div class="err-t" id="rerr"></div></div>
 <div class="actionbar"><button class="btn sec2" onclick="history.back()">返回修改</button><button class="btn" id="do-register" onclick="doRegister()">确认登记</button></div>`+tabbar('home')};
window.doRegister=()=>{try{const f=regForm();f.bills=pvBills(f).map(b=>({...b,items:b.items.map(i=>({...i,amount:K.r2(+i.amount)}))}));const at=T+' '+new Date().toTimeString().slice(0,5);const c=f.resignFrom?K.resignApply(S,f.resignFrom,f,at):K.register(S,f,at);save();sessionStorage.removeItem(DK);D=null;const ev=S.events.filter(e=>e.cid==c.id).pop();go('result',{ev:ev.id})}catch(e){document.getElementById('rerr').textContent=e.message}};
// ----- 退租：弹层双路径 -----
window.openCheckoutSheet=id=>{document.getElementById('co-sheet')?.remove();const d=document.createElement('div');d.id='co-sheet';d.className='mask open';
 d.innerHTML=`<div class="sheet" role="dialog" aria-labelledby="co-sheet-title"><h3 id="co-sheet-title" style="text-align:center">退房操作</h3>
 <div class="tips"><b>温馨提示</b><div>1. 退房后，不可撤销</div><div>2. 确认退房后会立刻退房，将释放房源为可租状态</div><div>3. 退房后请及时与承租人结算账务</div></div>
 <button class="sheet-link rec" id="co-with-settle" onclick="document.getElementById('co-sheet').remove();go('checkoutSettle',{id:'${id}'})">退房，同时结账（推荐）</button>
 <button class="sheet-link" id="co-only" onclick="document.getElementById('co-sheet').remove();go('checkoutOnly',{id:'${id}'})">先退房，后续结账</button>
 <button class="sheet-link cancel" onclick="document.getElementById('co-sheet').remove()">取消</button></div>`;
 d.onclick=e=>{if(e.target===d)d.remove()};document.body.append(d)};
window.CO=null;
const REASONS_ONLY=['到期','违约','转租','协议退租'];
const REASONS_SETTLE=['到期','违约','转租','协议退租','换房','其他'];
const AFTER_ST=['空房可租','锁房','维修','业主退房'];
window.syncCOTotals=function syncCOTotals(){if(!window.CO)return;window.CO.refund=K.itemsSum(window.CO.refundItems||[]);window.CO.ded=K.itemsSum(window.CO.dedItems||[])}
function ensureSettleCO(c){const X=c.term&&c.term.X||T;
 if(!window.CO||window.CO.cid!=c.id||window.CO.mode!='settle'){
  const ri=K.suggestRefundItems(S,c.id,X),di=K.suggestDedItems(S,c.id,X);
  window.CO={cid:c.id,mode:'settle',X,reason:c.term&&c.term.reason||'到期',afterStatus:c.term&&c.term.afterStatus||'空房可租',
   refundItems:ri,dedItems:di,note:c.term&&c.term.note||'',media:c.term&&c.term.media||0,
   payMethod:'生成待收账单',payAt:T+' 12:00',payWay:'线下',op:'房东',inviteSign:false};
  syncCOTotals();
 }else if(!window.CO.refundItems){window.CO.refundItems=K.suggestRefundItems(S,c.id,window.CO.X);window.CO.dedItems=window.CO.dedItems||K.suggestDedItems(S,c.id,window.CO.X);syncCOTotals()}
}
// Path B — 先退房（退租后结算）：无金额
P.checkoutOnly=(q)=>{const c=K.C(S,q.id);if(!c||c.term)return nav('先退租',1)+'<div class="wrap">合同不可退租</div>';
 if(!window.CO||window.CO.cid!=c.id||window.CO.mode!='only')window.CO={cid:c.id,mode:'only',X:T,reason:'到期',afterStatus:'空房可租',note:'',media:0};
 return nav('先退租',1,'checkout')+`<div class="wrap form has-ab"><div class="card">${titleOf(c)}</div>
 <div class="helper">只办理退租：立刻释放房源。不调整账单为已完成，结算请后续办理。</div>
 <label class="f">实际退房时间 *<input class="input" id="co-X" type="date" value="${window.CO.X}" onchange="window.CO.X=this.value"></label>
 <label class="f">退租原因<select class="input" id="co-reason" onchange="window.CO.reason=this.value">${REASONS_ONLY.map(x=>`<option ${window.CO.reason==x?'selected':''}>${x}</option>`).join('')}</select></label>
 <label class="f">退租后状态<select class="input" id="co-after" onchange="window.CO.afterStatus=this.value">${AFTER_ST.map(x=>`<option ${window.CO.afterStatus==x?'selected':''}>${x}</option>`).join('')}</select></label>
 <a class="card entry" href="#checkoutNote"><span>备注</span><span class="helper">${window.CO.note?esc(window.CO.note.slice(0,16))+'…':'请输入'} ›</span></a>
 <a class="card entry" href="#checkoutMedia"><span>照片/视频</span><span class="helper">${window.CO.media?window.CO.media+' 个':'未上传'} ›</span></a>
 <div class="err-t" id="coerr"></div></div><div class="actionbar"><button class="btn" id="do-checkout-only" onclick="doCheckoutOnly()">确认退房</button></div>`+tabbar('home')};
window.doCheckoutOnly=()=>{try{const ev=K.checkoutOnly(S,window.CO.cid,window.CO.X,window.CO.reason,'房东',T+' 12:00',{afterStatus:window.CO.afterStatus,note:window.CO.note,media:window.CO.media});save();window.CO=null;go('result',{ev:ev.id})}catch(e){document.getElementById('coerr').textContent=e.message}};
// Path A — 退租结算单：应退/扣除为跳转子页
P.checkoutSettle=(q)=>{const c=K.C(S,q.id);if(!c)return nav('退租结算单',1)+'<div class="wrap">合同不存在</div>';
 if(c.term&&c.term.settled!==false)return nav('退租结算单',1)+'<div class="wrap">已结算</div>';
 ensureSettleCO(c);
 const pv=K.finalPreview(S,c.id,window.CO.X);syncCOTotals();
 const refund=+window.CO.refund||0,ded=+window.CO.ded||0,total=K.r2(refund-ded);
 const totalHelper=total>=0?`（向租客支付 ¥ ${Math.abs(total).toFixed(2)}元）`:`（向租客收取 ¥ ${Math.abs(total).toFixed(2)}元）`;
 const methods=['生成待收账单','线下收款','线上付款','申请付款'];
 return nav('退租结算单',1,'checkout')+`<div class="wrap form has-ab">
 <div class="sec"><h3>退租信息</h3>
  <label class="f">退租原因<select class="input" onchange="window.CO.reason=this.value;render()">${REASONS_SETTLE.map(x=>`<option ${window.CO.reason==x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="f">退租后状态<select class="input" onchange="window.CO.afterStatus=this.value">${AFTER_ST.map(x=>`<option ${window.CO.afterStatus==x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="f">实际退租时间 *<input class="input" id="co-X" type="date" value="${window.CO.X}" onchange="onSettleXChange(this.value)"></label>
 </div>
 ${pv.err.length?`<div class="err-t">${pv.err.join('；')}</div>`:`<div class="sec">
  <a class="card entry" id="go-refund-items" href="#checkoutRefund"><span>应退租客金额</span><span class="helper" id="co-refund-disp">${money(refund)} ›</span></a>
  <a class="card entry" id="go-ded-items" href="#checkoutDeduct"><span>扣除租客金额</span><span class="helper" id="co-ded-disp">${money(ded)} ›</span></a>
  ${row('<b>总计</b>','<b id="co-total" style="color:'+(total<0?'#b00':'inherit')+'">'+total.toFixed(2)+'</b>')}<div class="helper" id="co-total-h">${totalHelper}</div>
  <div class="helper">参考：已收净额 ${money(pv.received)} − 实际租金 ${money(pv.actual)} − 其他费用 ${money(pv.other)}</div>
 </div>`}
 <div class="sec">
  <a class="card entry" href="#checkoutNote"><span>退租备注</span><span class="helper">${window.CO.note?esc(window.CO.note.slice(0,12))+'…':'请输入'} ›</span></a>
  <a class="card entry" href="#checkoutMedia"><span>退租照片/视频</span><span class="helper">${window.CO.media?window.CO.media+' 个':'未上传'} ›</span></a>
 </div>
 <div class="sec"><h3>付款方式</h3><div class="chips">${methods.map(m=>`<span class="sign ${window.CO.payMethod==m?'act':''}" onclick="window.CO.payMethod='${m}';render()">${m}</span>`).join('')}</div>
  ${['线上付款','申请付款'].includes(window.CO.payMethod)?'<div class="helper">第一版不实现线上/申请付款；确认后仍完成退租结算核心，款项按「生成待收账单」处理。</div>':''}
  <label class="f">支付时间<input class="input" type="datetime-local" value="${(window.CO.payAt||'').replace(' ','T').slice(0,16)}" onchange="window.CO.payAt=this.value.replace('T',' ')"></label>
  <label class="f">支付方式<select class="input" onchange="window.CO.payWay=this.value">${['线下','银行转账','微信','支付宝'].map(x=>`<option ${window.CO.payWay==x?'selected':''}>${x}</option>`).join('')}</select></label>
  <label class="f">经办人<input class="input" value="${esc(window.CO.op||'房东')}" onchange="window.CO.op=this.value"></label>
 </div>
 <div class="err-t" id="coerr"></div></div>
 <div class="actionbar settle-bar"><label class="chk" style="flex:1"><input type="checkbox" ${window.CO.inviteSign?'checked':''} onchange="window.CO.inviteSign=this.checked"> 邀请租客签字</label><a class="mini" href="#checkoutAgree" style="white-space:nowrap">查阅退租协议</a></div>
 <div class="actionbar" style="bottom:56px"><div style="flex:1"><div><b>总计: ${total.toFixed(2)}</b></div><div class="helper">${totalHelper}</div></div><button class="btn" id="do-settle" style="flex:0 0 120px" onclick="doSettle()">确认退租</button></div>`+tabbar('home')};

window.onSettleXChange=v=>{window.CO.X=v;const st=window.__state();window.CO.refundItems=window.CORE.suggestRefundItems(st,window.CO.cid,v);window.CO.dedItems=window.CORE.suggestDedItems(st,window.CO.cid,v);syncCOTotals();render()};

window.doSettle=()=>{try{syncCOTotals();
 const pm=window.CO.payMethod;const payMethod=(pm==='线上付款'||pm==='申请付款')?'生成待收账单':(pm==='线下收款'?'线下付款':(pm==='生成待收账单'?'生成待付账单':pm));
 const ev=K.settleApply(S,window.CO.cid,{X:window.CO.X,refundItems:window.CO.refundItems,dedItems:window.CO.dedItems,reason:window.CO.reason,afterStatus:window.CO.afterStatus,note:window.CO.note,media:window.CO.media,payMethod,payAt:window.CO.payAt,inviteSign:window.CO.inviteSign,payWay:window.CO.payWay,op:window.CO.op},window.CO.op||'房东',T+' 12:00');
 save();window.CO=null;go('result',{ev:ev.id})}catch(e){document.getElementById('coerr').textContent=e.message}};
// 应退明细子页
P.checkoutRefund=()=>{if(!window.CO||window.CO.mode!='settle')return nav('应退租客',1)+'<div class="wrap">请从结算单进入</div>';
 const items=window.CO.refundItems||[];const sum=K.itemsSum(items);
 return nav('应退租客金额',1)+`<div class="wrap form has-ab"><div class="helper">退款项：可改金额、增删行。返回后更新结算单「应退租客金额」。</div>
 <div class="sec" id="refund-table">${items.map((it,i)=>`<div class="daterow item" data-i="${i}"><input class="input iname" value="${esc(it.name)}" onchange="window.CO.refundItems[${i}].name=this.value"><input class="input iamt" type="number" step="0.01" value="${it.amount}" style="width:100px" onchange="window.CO.refundItems[${i}].amount=+this.value;syncCOTotals();document.getElementById('ri-sum').textContent=window.CORE.itemsSum(window.CO.refundItems).toFixed(2)"><button class="mini" onclick="window.CO.refundItems.splice(${i},1);render()">删</button></div>`).join('')||'<div class="helper">暂无应退项</div>'}
 </div>
 <button class="btn sec2" id="add-refund-item" onclick="window.CO.refundItems.push({id:'r'+Date.now(),name:'应退项',amount:0});render()">+ 添加退款项</button>
 <div class="row" style="margin-top:12px"><span><b>应退合计</b></span><b id="ri-sum">${money(sum)}</b></div>
 </div><div class="actionbar"><a class="btn" id="refund-done" href="#checkoutSettle?id=${window.CO.cid}" onclick="syncCOTotals()">完成</a></div>`};
// 扣除明细子页
P.checkoutDeduct=()=>{if(!window.CO||window.CO.mode!='settle')return nav('扣除租客',1)+'<div class="wrap">请从结算单进入</div>';
 const items=window.CO.dedItems||[];const sum=K.itemsSum(items);
 return nav('扣除租客金额',1)+`<div class="wrap form has-ab"><div class="helper">扣款项：损坏赔偿、欠费等。可增删改。返回后更新结算单「扣除租客金额」。</div>
 <div class="sec" id="ded-table">${items.map((it,i)=>`<div class="daterow item" data-i="${i}"><input class="input iname" value="${esc(it.name)}" onchange="window.CO.dedItems[${i}].name=this.value"><input class="input iamt" type="number" step="0.01" value="${it.amount}" style="width:100px" onchange="window.CO.dedItems[${i}].amount=+this.value;syncCOTotals();document.getElementById('di-sum').textContent=window.CORE.itemsSum(window.CO.dedItems).toFixed(2)"><button class="mini" onclick="window.CO.dedItems.splice(${i},1);render()">删</button></div>`).join('')||'<div class="helper">暂无扣除项</div>'}
 </div>
 <button class="btn sec2" id="add-ded-item" onclick="window.CO.dedItems.push({id:'d'+Date.now(),name:'扣除项',amount:0});render()">+ 添加扣款项</button>
 <div class="row" style="margin-top:12px"><span><b>扣除合计</b></span><b id="di-sum">${money(sum)}</b></div>
 </div><div class="actionbar"><a class="btn" id="ded-done" href="#checkoutSettle?id=${window.CO.cid}" onclick="syncCOTotals()">完成</a></div>`};
P.checkoutNote=()=>{if(!window.CO)return nav('退租备注',1)+'<div class="wrap">请从结算进入</div>';
 const back=window.CO.mode=='only'?`#checkoutOnly?id=${window.CO.cid}`:`#checkoutSettle?id=${window.CO.cid}`;
 return nav('退租备注',1)+`<div class="wrap form"><textarea class="input" style="height:120px" oninput="window.CO.note=this.value">${esc(window.CO.note||'')}</textarea><a class="btn" href="${back}">完成</a></div>`};
P.checkoutMedia=()=>{if(!window.CO)return nav('退租照片/视频',1)+'<div class="wrap">请从结算进入</div>';
 const back=window.CO.mode=='only'?`#checkoutOnly?id=${window.CO.cid}`:`#checkoutSettle?id=${window.CO.cid}`;
 return nav('退租照片/视频',1)+`<div class="wrap"><div class="helper">原型占位，不实际上传。</div><div class="helper">已添加 ${window.CO.media||0} 个</div><button class="btn sec2" onclick="window.CO.media=(window.CO.media||0)+1;render()">+ 添加（占位）</button><div style="height:8px"></div><a class="btn" href="${back}">完成</a></div>`};
P.checkoutAgree=()=>nav('退租协议',1)+`<div class="wrap"><div class="sec"><h3>退租协议（占位）</h3><div class="helper">正式协议文本待产品提供。确认退租即表示知悉退房不可撤销等提示。</div></div><button class="btn" onclick="history.back()">返回</button></div>`;
// legacy #checkout → sheet/settle
P.checkout=(q)=>{setTimeout(()=>openCheckoutSheet(q.id),0);return nav('退租',1)+`<div class="wrap"><div class="helper">请选择退房方式</div><button class="btn" onclick="openCheckoutSheet('${q.id}')">打开退房操作</button></div>`+tabbar('home')};
P.result=(q)=>{const e=S.events.find(x=>x.id==q.ev);if(!e)return nav('办理结果',1)+'<div class="wrap">记录不存在</div>';const c=K.C(S,e.cid);
 let body='';
 if(e.type=='租客登记'){body=`<div class="sec">${row('房间',c.rooms.map(x=>esc(K.addrOf(c,x.r))).join('、'))}${row('月租金',money(c.rent))}${row('合同租期',c.start+' 至 '+c.end)}${row('承租人',esc(c.who||'待承租人实名补充')+' '+c.phone)}${row('已生成账单',K.billsOf(S,c.id).length+' 笔')}</div><div class="sec"><h3>邀请二维码</h3><div style="width:120px;height:120px;border:1px dashed #888;display:flex;align-items:center;justify-content:center" class="helper">二维码占位</div></div>`}
 else if(e.type=='换房'){const nc=S.contracts.find(x=>x.id==e.cid);body=`<div class="sec">${row('新合同',titleOf(nc))}${row('租期',nc.start+' 至 '+nc.end)}${row('月租金',money(nc.rent))}</div>${e.sid?`<a class="ref" href="#settlement?id=${e.sid}">原合同结算单 ›</a>`:''}${e.from?`<a class="ref" href="#contract?id=${e.from}">原合同 ›</a>`:''}`}
 else if(e.type=='续租'||e.type=='重签'){body=`<div class="sec">${row('新合同',titleOf(c))}${row('租期',c.start+' 至 '+c.end)}${row('月租金',money(c.rent))}${e.type=='重签'?'<div class="helper">原合同已作废，账单已关闭且不计入汇总。</div>':''}</div>${e.from?`<a class="ref" href="#contract?id=${e.from}">原合同 ›</a>`:''}`}
 else if(e.type=='先退租'){body=`<div class="helper">房源已释放。账单未标记已完成。</div><a class="btn" id="go-settle" href="#checkoutSettle?id=${c.id}">去结算</a>`}
 else {body=`${e.sid?`<a class="ref" href="#settlement?id=${e.sid}">查看结算单 ›</a>`:''}`}
 return nav('办理结果',1,'result')+`<div class="wrap"><div class="status on"><div class="t">${e.type}办理成功</div><div class="s">${esc(e.text)}</div></div>${body}<a class="btn sec2" id="to-contract" href="#contract?id=${c.id}">${e.type=='租客登记'?'查看合同详情':'返回合同'}</a></div>`+tabbar('home')};
// ----- 换房（仅单房） / 续租 -----
window.SW=null;window.RN=null;
P.swap=(q)=>{const c=K.C(S,q.id);if(!c)return nav('换房',1)+'<div class="wrap">合同不存在</div>';if(c.rooms.length!=1)return nav('换房',1)+'<div class="wrap"><div class="err-t">多房合同不支持换房</div><a class="btn sec2" href="#contract?id='+c.id+'">返回</a></div>';if(c.term)return nav('换房',1)+'<div class="wrap">合同已终止</div>';
 if(!window.SW||window.SW.cid!=c.id)window.SW={cid:c.id,X:T,newR:'',end:c.end,rent:String(c.rent),q:''};
 const res=K.searchRooms(window.SW.q);const sw=window.SW;const pv=K.finalPreview(S,c.id,sw.X);let preview=[];if(sw.X&&sw.end&&sw.end>=K.addD(sw.X,1))preview=K.buildBills({...c,start:K.addD(sw.X,1),end:sw.end,rent:+sw.rent});let available=pv.refundToTenant||0;const allocations=preview.map((b,i)=>{const amount=sw.offset?.includes(i)?Math.min(available,K.billTotal(b)):0;available=K.r2(available-amount);return amount});
 return nav('换房',1,'swap')+`<div class="wrap form has-ab"><div class="card">${titleOf(c)}<div class="helper">当前房间 ${esc(K.addrOf(c,c.rooms[0].r))} · 月租 ${money(c.rent)}</div></div>
 <label class="f">实际退租日（原合同结算）*<input class="input" id="sw-X" type="date" value="${window.SW.X}" onchange="window.SW.X=this.value;window.SW.offset=[];render()"></label>
 <label class="f">新合同结束日 *<input class="input" id="sw-end" type="date" value="${window.SW.end}" onchange="window.SW.end=this.value;window.SW.offset=[];render()"></label>
 <label class="f">新月租金<input class="input" id="sw-rent" type="number" value="${esc(window.SW.rent)}" onchange="window.SW.rent=this.value;window.SW.offset=[];render()"></label>
 <div class="step">选择新房间 *</div><input class="input" id="sw-q" placeholder="搜索空房" value="${esc(window.SW.q)}" oninput="window.SW.q=this.value;render()">
 <div id="sw-sres">${!window.SW.q.trim()?'<div class="helper">输入关键字搜索</div>':res.map(x=>{const busy=K.roomBusy(S,x.r)||(window.SW.newR==x.r);return `<div class="row sr ${window.SW.newR==x.r?'on':''}" data-r="${x.r}" onclick="window.SW.newR='${x.r}';render()" style="cursor:pointer"><span>${esc(x.addr)} <span class="tag">${roomSt(x.r)}</span></span><b>${window.SW.newR==x.r?'已选':'选择'}</b></div>`}).join('')||'<div class="helper">无匹配</div>'}</div>
 <div class="helper">已选新房间：${window.SW.newR?esc(K.bldOf(window.SW.newR)+window.SW.newR):'未选'}。确认后原合同整份结算终止，并登记新合同（起租日=退租日次日）。</div>
 <div class="sec"><h3>结算款抵扣</h3><div class="helper">${pv.err.length?esc(pv.err.join('；')):'本次结算应退 '+money(pv.refundToTenant)}。房东可选是否抵扣；确认安排后，新合同成立即履行（电子待签可仅存安排）。顺序：押金 → 第1期 → 第2期，不可跳期。</div>
 <label class="check"><input type="checkbox" ${sw.useOffset!==false?'checked':''} onchange="window.SW.useOffset=this.checked;if(!this.checked)window.SW.offset=[];render()">使用原房结算待退款抵扣新合同</label>
 ${sw.useOffset===false?'':preview.map((b,i)=>`<label class="check"><input class="offset-check" type="checkbox" ${sw.offset?.includes(i)?'checked':''} ${!pv.refundToTenant||K.billTotal(b)<=0?'disabled':''} onchange="swapOffset(${i},this.checked)">${b.k==='dep'?'押金':'租金第'+b.n+'期'} · ${money(K.billTotal(b))} · ${b.due}<br>本次抵扣 ${money(allocations[i])}</label>`).join('')+'<div class="helper">抵扣合计 '+money(K.sum(allocations))+' · 剩余待退 '+money(available)+'</div>'}</div><div class="err-t" id="swerr"></div></div><div class="actionbar"><button class="btn" id="do-swap" onclick="doSwap()">确认换房</button></div>`+tabbar('home')};
window.swapOffset=(i,on)=>{const a=window.SW.offset||[];const c=K.C(S,window.SW.cid);const pending=K.buildBills({...c,start:K.addD(window.SW.X,1),end:window.SW.end,rent:+window.SW.rent}).map((b,i)=>({b,i})).filter(x=>K.billTotal(x.b)>0).map(x=>x.i);if(on){if(i!==pending[a.length]){flash('请先勾选更早账期');render();return}a.push(i)}else a.splice(a.indexOf(i));window.SW.offset=a;const y=window.scrollY;render();window.scrollTo(0,y)};
window.doSwap=()=>{try{const r=K.swapApply(S,window.SW.cid,window.SW.X,window.SW.newR,window.SW.end,window.SW.rent,'房东',T+' 12:00',window.SW.useOffset===false?[]:(window.SW.offset||[]),{useOffset:window.SW.useOffset!==false});save();const ev=S.events.filter(e=>e.cid==r.newContract.id&&e.type=='换房').pop();window.SW=null;go('result',{ev:ev.id})}catch(e){document.getElementById('swerr').textContent=e.message}};
P.renew=(q)=>{const c=K.C(S,q.id);if(!c)return nav('续租',1)+'<div class="wrap">合同不存在</div>';
 const db=K.billsOf(S,c.id).find(b=>b.k==='dep');const paidDep=db?K.billPaid(db):0;
 if(!window.RN||window.RN.cid!=c.id)window.RN={cid:c.id,end:'',rent:String(c.rent),dep:String(c.dep),settle:String(paidDep),useOffset:true,offset:c.dep>0?[0]:[]};
 const rn=window.RN;const start=K.addD(c.end,1);const draft={...c,start,end:rn.end||K.addD(c.end,365),rent:+rn.rent,dep:+rn.dep};let preview=[];try{if(rn.end&&rn.end>c.end)preview=K.buildBills(draft)}catch(e){}
 let left=Math.min(+rn.settle||0, paidDep);const alloc=preview.map((b,i)=>{const a=rn.useOffset&&rn.offset.includes(i)?Math.min(left,K.billTotal(b)):0;left=K.r2(left-a);return a});
 return nav('续租',1,'renew')+`<div class="wrap form has-ab"><div class="card">${titleOf(c)}<div class="helper">原租期 ${c.start} 至 ${c.end} · 月租 ${money(c.rent)}</div></div>
 <div class="helper">按寓小二/文档：确认的是结算与抵扣<strong>安排</strong>；正式结算单+抵扣须新合同已生效且已到开始日（${start}）。${start<=T?'当前已到开始日，确认后将立即履行。':'未到开始日则仅保存安排，可用下方模拟到开始日。'}原押金须已付清；其他未结账单留原合同。</div>
 <label class="f">新结束日 *（须晚于 ${c.end}）<input class="input" id="rn-end" type="date" value="${rn.end}" onchange="window.RN.end=this.value;window.RN.offset=window.RN.dep>0?[0]:[];render()"></label>
 <label class="f">月租金<input class="input" id="rn-rent" type="number" value="${esc(rn.rent)}" onchange="window.RN.rent=this.value;render()"></label>
 <label class="f">新合同押金<input class="input" id="rn-dep" type="number" value="${esc(rn.dep)}" onchange="window.RN.dep=this.value;window.RN.offset=+this.value>0?[0]:[];render()"></label>
 <div class="sec"><h3>原押金结算与抵扣安排</h3>
 <label class="f">原押金结算额（可改，已付 ${money(paidDep)}）<input class="input" id="rn-settle" type="number" value="${esc(rn.settle)}" onchange="window.RN.settle=this.value;render()"></label>
 <label class="check"><input type="checkbox" ${rn.useOffset?'checked':''} onchange="window.RN.useOffset=this.checked;render()">使用结算款抵扣新合同账单（按押金→1期→2期顺序）</label>
 ${rn.useOffset?preview.map((b,i)=>`<label class="check"><input class="offset-check" type="checkbox" ${rn.offset.includes(i)?'checked':''} ${K.billTotal(b)<=0?'disabled':''} onchange="renewOffset(${i},this.checked)">${b.k==='dep'?'押金':'租金第'+b.n+'期'} · ${money(K.billTotal(b))}<br>安排抵扣 ${money(alloc[i])}</label>`).join('')+'<div class="helper">抵扣合计 '+money(K.sum(alloc))+' · 结算剩余 '+money(left)+'</div>':''}
 </div>
 ${start>T?`<button class="btn sec2" id="sim-renew-start" onclick="simRenewStart()">模拟到开始日并履行待安排续租</button>`:''}
 <div class="err-t" id="rnerr"></div></div><div class="actionbar"><button class="btn" id="do-renew" onclick="doRenew()">确认续租安排</button></div>`+tabbar('home')};
window.renewOffset=(i,on)=>{const a=window.RN.offset||[];const c=K.C(S,window.RN.cid);const preview=K.buildBills({...c,start:K.addD(c.end,1),end:window.RN.end,rent:+window.RN.rent,dep:+window.RN.dep});const pending=preview.map((b,i)=>({b,i})).filter(x=>K.billTotal(x.b)>0).map(x=>x.i);if(on){if(i!==pending[a.length]){flash('请先勾选更早账期');render();return}a.push(i)}else a.splice(a.indexOf(i),1);window.RN.offset=a;render()};
window.doRenew=()=>{try{const rn=window.RN;const nc=K.renewApply(S,rn.cid,rn.end,rn.rent,rn.dep,'房东',T+' 12:00',{settleAmount:+rn.settle,useOffset:!!rn.useOffset,offsetIndices:rn.useOffset?rn.offset:[],offsetAmount:undefined});save();const ev=S.events.filter(e=>e.cid==nc.id&&e.type=='续租').pop();window.RN=null;go('result',{ev:ev.id})}catch(e){document.getElementById('rnerr').textContent=e.message}};
window.simRenewStart=()=>{try{const n=K.fulfillPendingRenewals(S,K.addD(K.C(S,window.RN.cid).end,1));save();flash(n.length?'已履行 '+n.length+' 笔续租安排':'没有待履行安排');render()}catch(e){flash(e.message)}};

// ----- 合同详情操作 -----
window.openMoreSheet=id=>{document.getElementById('more-sheet')?.remove();const d=document.createElement('div');d.id='more-sheet';d.className='mask open';d.innerHTML=`<div class="sheet"><b>更多</b><button class="btn sec2" id="btn-delete" onclick="doSoftDelete('${id}')">删除</button><div class="btns"><button class="btn sec2" onclick="document.getElementById('more-sheet').remove()">取消</button></div></div>`;d.onclick=e=>{if(e.target===d)d.remove()};document.body.append(d)};
window.doSoftDelete=id=>{if(!confirm('从列表移除该合同？（软删除，可重置示例数据恢复）'))return;try{K.softDelete(S,id,'房东');save();document.getElementById('more-sheet')?.remove();go('contracts');flash('已删除')}catch(e){alert(e.message)}};
window.startResign=id=>{const c=K.C(S,id);D=newDraft();D.resignFrom=id;D.rooms=c.rooms.map(x=>({r:x.r}));D.sign=c.sign;D.phone=c.phone;D.who=c.who||'';D.idType=c.idType||'';D.idNo=c.idNo||'';D.idPhotos=c.idPhotos||0;D.start=c.start;D.end=c.end;D.rent=String(c.rent);D.payN=String(c.payN);D.depM=String(c.depM);D.dep=String(c.dep);D.depTouched=true;D.fees=(c.fees||[]).map(f=>({...f,amount:String(f.amount)}));D.ruleType=c.payRule.type=='fixed'?'fixed':'before';D.ruleV=String(c.payRule.day||c.payRule.days||7);D.scans=c.scans||0;D.terms=c.terms||'';D.note=c.note||'';if(c.emergency){D.eName=c.emergency.name||'';D.eRel=c.emergency.rel||'';D.ePhone=c.emergency.phone||''}dsave();go('register')};
window.doAddBill=id=>{const name=prompt('费用名称（如：卫生费）');if(name==null)return;const amount=prompt('金额');if(amount==null)return;const due=prompt('应付日 YYYY-MM-DD',T);if(due==null)return;try{K.addCustomBill(S,id,name,amount,due,'房东');save();render();flash('已添加账单')}catch(e){alert(e.message)}};
window.doResetBills=id=>{if(!confirm('重置账单：删除未收款的租金账单，按合同条款重新生成；已收款账单保留并标为已完成。确定？'))return;try{K.resetBills(S,id,'房东');save();render();flash('已重置账单')}catch(e){alert(e.message)}};
window.openBatchCollect=id=>{const c=K.C(S,id);const pending=K.billsOf(S,id).filter(b=>['待收','部分收款'].includes(K.billStatus(b)));if(!pending.length){flash('没有待处理账单');return}
 document.getElementById('batch-sheet')?.remove();const d=document.createElement('div');d.id='batch-sheet';d.className='mask open';
 d.innerHTML=`<div class="sheet"><b>批量收款</b><div class="helper">勾选待处理账单，确认后按待收金额记线下全额收款。</div>${pending.map(b=>`<label class="chk"><input type="checkbox" class="batch-bill" value="${b.id}" checked> ${esc(contractBillTitle(b))} · 待收 ${money(K.billOut(b))}</label>`).join('')}<label class="f">收款日期<input class="input" id="batch-date" type="date" value="${T}"></label><div class="err-t" id="batcherr"></div><div class="btns"><button class="btn sec2" onclick="document.getElementById('batch-sheet').remove()">取消</button><button class="btn" id="confirm-batch" onclick="doBatchCollect()">确认收款</button></div></div>`;
 d.onclick=e=>{if(e.target===d)d.remove()};document.body.append(d)};
window.doBatchCollect=()=>{try{const ids=[...document.querySelectorAll('.batch-bill:checked')].map(e=>e.value);K.batchCollect(S,ids,document.getElementById('batch-date').value,'房东');save();document.getElementById('batch-sheet')?.remove();render();flash('批量收款完成')}catch(e){document.getElementById('batcherr').textContent=e.message}};
// ----- occupants -----
window.moveIn=(cid,r)=>{const d=prompt('实际入住时间（YYYY-MM-DD）',T);if(!d)return;try{K.moveIn(S,cid,r,d);save();render()}catch(e){alert(e.message)}};
window.occAdd=(cid,r)=>{const p=prompt('入住人手机号');if(!p)return;try{K.addOcc(S,cid,r,p.trim());save();render()}catch(e){alert(e.message)}};
window.occAgree=(cid,r,i)=>{K.agreeOcc(S,cid,r,i);save();render()};window.occDel=(cid,r,i)=>{if(!confirm('删除该入住人？'))return;K.delOcc(S,cid,r,i);save();render()};
// 本批次入口与最小业务闭环
const val=id=>document.getElementById(id).value;
const select=(id,label,options,chosen='')=>`<label class="f">${label}<select class="input" id="${id}">${options.map(v=>`<option value="${esc(v)}" ${v===chosen?'selected':''}>${esc(({months:'押N个月',amount:'固定金额',in:'收入',out:'支出'})[v]||v||'不关联房间')}</option>`).join('')}</select></label>`;
const link=(url,text)=>`<a class="card entry" href="#${url}">${text} ›</a>`;
const page=(title,body)=>nav(title,1)+`<div class="wrap form">${body}</div>`;
const submit=(text,action)=>`<button class="btn" onclick="gapRun('${action}')">${text}</button><div class="err-t" id="gaperr"></div>`;
const roomPick=()=>`${field('gap-q','搜索房间（输入楼栋或房号）')}<div id="gap-results"></div>${select('gap-r','关联房间（推荐）',['',...K.allRooms().map(x=>x.r)])}`;
window.gapSearch=()=>{document.getElementById('gap-results').innerHTML=K.searchRooms(val('gap-q')).map(x=>`<button class="mini" onclick="document.getElementById('gap-r').value=this.dataset.r" data-r="${esc(x.r)}">${esc(x.addr)}</button>`).join('')};
P.workOrders=q=>page('工单中心',link('workOrderNew','新建工单')+`<div class="tabs">${['全部',...K.WO_STATUSES].map(x=>`<a href="#workOrders?status=${x}&type=${encodeURIComponent(q.type||'全部')}" class="${(q.status||'全部')===x?'act':''}">${x}</a>`).join('')}</div>`+select('wo-filter','工单类型',['全部',...K.WO_TYPES],q.type||'全部')+K.workOrdersOf(S).filter(w=>(!q.status||q.status==='全部'||w.status===q.status)&&(!q.type||q.type==='全部'||(w.type||'报修')===q.type)).map(w=>link('workOrder?id='+w.id,`${esc(w.type||'报修')} · ${esc(w.r||'未关联房间')} · ${esc(w.desc)} <span class="tag">${w.status}</span>`)).join(''));
P.workOrderNew=()=>page('新建工单',select('gap-type','类型',K.WO_TYPES)+roomPick()+field('gap-desc','描述 *')+field('gap-contact','联系人（选填）')+field('gap-phone','手机号（选填）')+submit('提交工单','wo'));
P.workOrder=q=>{const w=K.workOrdersOf(S).find(w=>w.id===q.id);return page('工单详情',w?`<div class="sec">${row('类型',esc(w.type||'报修'))}${row('房间',esc(w.r||'未关联'))}${row('描述',esc(w.desc))}${row('联系人',esc((w.contact||'')+' '+(w.phone||'')))}${row('状态',w.status)}${row('创建日期',esc(w.created))}</div><div class="btns">${K.WO_STATUSES.map(x=>`<button class="mini" onclick="setWO('${w.id}','${x}')">${x}</button>`).join('')}</div>`:'工单不存在')};
P.bookings=()=>page('租客预定',link('bookingNew','新建预定')+K.bookingsOf(S).slice().reverse().map(b=>`<div class="card"><b>${esc(K.bldOf(b.r)+b.r)} · ${esc(b.who)}</b><div>${esc(b.phone)} · ${b.status}</div><div class="helper">预定金 ${money(b.deposit||0)} · 起租 ${esc(b.start||'待定')} · ${esc(b.note||'')}</div>${b.status==='有效'?`<div class="btns"><button class="mini" onclick="gapCancel('${b.id}')">取消预定</button><a class="btn sec2" href="#register?new=1&booking=${b.id}">转登记</a></div>`:b.cid?link('contract?id='+b.cid,'查看合同'):''}</div>`).join(''));
P.bookingNew=()=>page('新建预定',roomPick()+field('gap-who','预定人 *')+field('gap-phone','手机号 *')+field('gap-deposit','预定金（仅记录金额）',0,'number')+field('gap-start','拟起租日','','date')+field('gap-note','备注')+submit('保存预定','booking'));
P.vacant=()=>page('空房快查',`<div class="helper">空房可租 ${K.vacantRooms(S).length} / 共 ${K.allRooms().length} 间</div>`+link('batchPrice','批量定价')+link('batchEdit','批量编辑')+K.vacantRooms(S).map(x=>link('room?r='+encodeURIComponent(x.r),`${esc(x.addr)} · ${x.price?money(x.price.monthly):'未定价'} ${K.roomBizFlags(S,x.r,T).join(' · ')}`)).join(''));
const batchRooms=()=>K.allRooms().map(x=>`<label class="check"><input type="checkbox" class="gap-room" value="${esc(x.r)}">${esc(x.addr)} · ${K.roomStatus(S,x.r)}</label>`).join('');
P.batchPrice=()=>page('批量定价',field('gap-monthly','月租 *','','number')+select('gap-mode','押金方式',['months','amount'])+field('gap-dep','押金月数 / 金额',1,'number')+batchRooms()+submit('应用价格','price'));
P.batchEdit=()=>page('批量编辑',field('gap-orient','朝向')+field('gap-note','备注')+select('gap-unrentable','空房不可租',['保持','是','否'])+'<div class="helper">空白朝向与备注保持原值。</div>'+batchRooms()+submit('应用修改','edit'));
P.invoices=q=>page('发票',select('gap-cid','关联合同',S.contracts.map(c=>c.id),q.cid)+field('gap-title','发票抬头 *')+field('gap-amount','金额 *','','number')+submit('创建待开发票','invoice')+(S.invoices||[]).filter(i=>!q.cid||i.cid===q.cid).map(i=>`<div class="card">${esc(i.title)} · ${money(i.amount)} · ${i.status}${i.status==='待开'?`<button class="mini" onclick="gapIssue('${i.id}')">标记已开</button>`:''}</div>`).join(''));
P.ownerContracts=()=>page('业主合同',link('ownerContractNew','新建业主合同')+S.ownerContracts.map(c=>link('ownerContract?id='+c.id,`${esc(c.building)} · ${esc(c.who)} · ${c.status}`)).join(''));
P.ownerContractNew=()=>page('新建业主合同',select('gap-building','楼栋',Object.keys(K.getBuildings()))+field('gap-who','业主姓名 *')+field('gap-phone','手机号 *')+field('gap-rent','租金（选填）','','number')+field('gap-start','开始日 *','','date')+field('gap-end','结束日 *','','date')+field('gap-note','备注')+submit('保存合同','owner'));
P.ownerContract=q=>{const c=S.ownerContracts.find(c=>c.id===q.id);return page('业主合同',c?`${row('楼栋',esc(c.building))}${row('业主',esc(c.who)+' '+esc(c.phone))}${row('租期',esc(c.start)+' 至 '+esc(c.end))}${row('租金',c.rent?money(c.rent):'—')}${row('备注',esc(c.note))}${row('状态',c.status)}${c.status==='生效中'?submit('终止合同','terminate'):''}`:'合同不存在')};
P.ledgerNote=()=>page('记账',select('gap-dir','方向',['in','out'])+field('gap-name','名称 *')+field('gap-amount','金额 *','','number')+field('gap-date','日期 *',T,'date')+submit('保存记账','ledger'));
P.meterAccount=()=>page('录户号',roomPick()+field('gap-meter','户号 *')+submit('保存户号','meter'));
P.addBill=()=>page('加账单',S.contracts.filter(c=>!c.term&&!c.voided&&!c.removed).map(c=>`<button class="btn sec2" onclick="doAddBill('${c.id}')">${esc(c.who||c.phone)} · ${esc(K.titleText(c))}</button>`).join(''));
window.gapRun=action=>{try{const ids=()=>[...document.querySelectorAll('.gap-room:checked')].map(x=>x.value);let dest='home';if(action==='wo'){const w=K.createWorkOrder(S,{type:val('gap-type'),r:val('gap-r')||undefined,desc:val('gap-desc'),contact:val('gap-contact'),phone:val('gap-phone')});dest='workOrder?id='+w.id}
 if(action==='booking'){K.createBooking(S,{r:val('gap-r'),who:val('gap-who'),phone:val('gap-phone'),deposit:val('gap-deposit'),start:val('gap-start'),note:val('gap-note')});dest='bookings'}
 if(action==='price'){K.batchPrice(S,ids(),{monthly:val('gap-monthly'),depMode:val('gap-mode'),dep:val('gap-dep')});dest='vacant'}
 if(action==='edit'){if(!ids().length)throw Error('请选择房间');const p={};if(val('gap-orient'))p.orient=val('gap-orient');if(val('gap-note'))p.note=val('gap-note');if(val('gap-unrentable')!=='保持')p.unrentable=val('gap-unrentable')==='是';ids().forEach(r=>K.editRoom(S,r,p));dest='vacant'}
 if(action==='invoice'){K.createInvoice(S,{cid:val('gap-cid'),title:val('gap-title'),amount:val('gap-amount')});dest='invoices?cid='+val('gap-cid')}
 if(action==='owner'){K.createOwnerContract(S,{building:val('gap-building'),who:val('gap-who'),phone:val('gap-phone'),rent:val('gap-rent'),start:val('gap-start'),end:val('gap-end'),note:val('gap-note')});dest='ownerContracts'}
 if(action==='terminate'){if(!confirm('确认终止业主合同？'))return;K.terminateOwnerContract(S,route().q.id);dest='ownerContracts'}
 if(action==='ledger'){K.addLedgerNote(S,{dir:val('gap-dir'),name:val('gap-name'),amount:val('gap-amount'),date:val('gap-date')});dest='ledger'}
 if(action==='meter'){if(!val('gap-r')||!val('gap-meter').trim())throw Error('请选择房间并填写户号');K.editRoom(S,val('gap-r'),{meterNo:val('gap-meter').trim()});dest='room?r='+val('gap-r')}
 save();location.hash='#'+dest;flash('已保存')}catch(e){document.getElementById('gaperr').textContent=e.message}};
window.gapCancel=id=>{if(!confirm('取消该预定？'))return;try{K.cancelBooking(S,id);save();render()}catch(e){flash(e.message)}};
window.gapIssue=id=>{S.invoices.find(i=>i.id===id).status='已开';save();render()};
window.gapVoid=id=>{if(!confirm('作废此账单？已收款仍保留在流水中。'))return;try{K.voidBill(S,id,'房东');save();render()}catch(e){flash(e.message)}};
window.openCreate=()=>{const d=document.createElement('div');d.className='mask open';d.innerHTML=`<div class="sheet"><b>+ 新建</b>${[['buildingAdd','新建房源'],['register?new=1','合同单房'],['register?new=1','合同多房'],['bookingNew','预定'],['ledgerNote','记账']].map(([u,t])=>link(u,t)).join('')}<b>批量</b>${[['batchPrice','改房价'],['batchEdit','批量编辑'],['buildingAdd','录房源'],['register?new=1','录合同'],['meterAccount','录户号'],['addBill','加账单']].map(([u,t])=>link(u,t)).join('')}<button class="btn sec2" onclick="this.closest('.mask').remove()">关闭</button></div>`;d.onclick=e=>{if(e.target===d||e.target.closest('a'))d.remove()};document.body.append(d)};
const baseHome=P.home;P.home=()=>{const open=K.openWorkOrders(S).length,book=K.bookingsOf(S).filter(b=>b.status==='有效').length,over=S.bills.filter(b=>K.odays(b,T)>0).length,ls=K.ensureLedger(S).filter(l=>(l.at||'').slice(0,7)===T.slice(0,7));return baseHome().replace('<div class="h1">寓智云控</div>',`<div class="h1">寓智云控</div><div class="gap-stats">${row('待办',over+open+book)}<div class="helper">逾期账单 ${over} · 未结工单 ${open} · 有效预定 ${book}</div>${row('空置',K.vacantRooms(S).length+' / '+K.allRooms().length)}${row('本月收入',money(K.sum(ls.filter(l=>l.net>0).map(l=>l.net))))}${row('本月支出',money(-K.sum(ls.filter(l=>l.net<0).map(l=>l.net))))}${row('本月净收支',money(K.sum(ls.map(l=>l.net))))}${row('续租率','—')}<div class="helper">续租率：低保真占位，暂无统计口径</div></div>${link('workOrders','工单中心 · '+open+' 笔未结')}${link('vacant','空房快查')}${link('bookings','租客预定')}${link('ownerContracts','业主合同')}`)+`<button class="fab" id="home-fab" aria-label="新建" onclick="openCreate()">+</button>`};
window.gapVoidPayable=id=>{if(!confirm('作废此付款账单？已付款仍保留在流水中。'))return;try{K.voidPayable(S,id,'房东');save();render()}catch(e){flash(e.message)}};
const meLinks=[['settings','设置'],['apartment','公寓资料'],['accountSecurity','账号安全'],['services','服务购买'],['downloads','下载中心'],['opLog','操作日志'],['onboarding','新手上路'],['intentSigns','意愿签署']];
P.me=()=>nav('我的','','me')+`<div class="wrap"><div class="sec">${row('公寓',esc(S.apartment.name))}${row('办理人','房东（示例）')}${row('示例今天',T)}</div>${meLinks.map(([u,t])=>link(u,t)).join('')}<button class="btn sec2" id="reset" onclick="resetDemo()">重置示例数据</button></div>`+tabbar('me');
const settingsPages=[['Subjects','subjects','财务科目'],['Ledger','ledger','账单流水设置'],['OnlinePay','onlinePay','线上支付'],['BillRules','billRules','账单生成规则'],['Property','property','房源相关'],['WorkOrder','workOrder','工单相关'],['Meters','meters','水表电表']];
P.settings=()=>{S.onboarding.visitedSettings=true;save();return page('设置',settingsPages.map(([u,k,t])=>link('settings'+u,t)).join('')+'<div class="helper">设置目前以持久化展示为主，账单引擎尚未全面读取设置。</div>')};
const settingLabels={showOffset:'显示抵扣',requireNote:'流水备注必填',defaultMethod:'默认收款方式',enabled:'启用线上支付（占位）',channel:'支付渠道（占位）',tip:'支付说明',genOnRegister:'登记时生成账单',includeFeesWithRent:'费用随租金生成',allowCrossBuildingSameNo:'允许跨楼栋同房号',defaultUnrentable:'新房源默认不可租',requirePriceBeforeRegister:'登记前须定价',repairAffectsRoom:'维修影响房源状态',deviceMaintAffectsRoom:'设备维护影响房源状态',defaultStatus:'默认工单状态',days:'提前天数',type:'默认支付日规则'};
const settingControl=(key,value)=>typeof value==='boolean'?`<label class="check"><input data-setting="${key}" type="checkbox" ${value?'checked':''}>${settingLabels[key]||key}</label>`:field('set-'+key,settingLabels[key]||key,value,typeof value==='number'?'number':'text').replace('<input ','<input data-setting="'+key+'" ');
settingsPages.forEach(([u,k,t])=>{P['settings'+u]=()=>{if(k==='meters')return page(t,'<div class="sec"><h3>水表电表 · 自定·待方案</h3><div class="helper">设备方案尚未就绪，暂不提供水表电表或抄表操作。</div></div>');const v=S.settings[k];let body=k==='subjects'?`<div id="subject-rows">${v.map(x=>subjectEditor(x)).join('')}</div><button class="mini" onclick="addSubjectRow()">+ 添加科目</button>`:Object.entries(v).map(([key,val])=>key==='payRuleDefault'?`<div class="helper">默认支付日规则（before：提前天数；fixed：固定日）</div>${settingControl('type',val.type)}${settingControl('days',val.days||7)}`:settingControl(key,val)).join('');return page(t,body+`<button class="btn" id="save-settings" onclick="saveSettings('${k}')">保存</button>`)} });
function subjectEditor(x){return `<div class="daterow subject-edit" data-id="${esc(x.id)}"><input class="input subject-name" aria-label="科目名称" value="${esc(x.name)}"><select class="input subject-dir"><option value="in" ${x.dir==='in'?'selected':''}>收入</option><option value="out" ${x.dir==='out'?'selected':''}>支出</option></select></div>`}
window.addSubjectRow=()=>document.getElementById('subject-rows').insertAdjacentHTML('beforeend',subjectEditor({id:'subject-'+Date.now()+'-'+document.querySelectorAll('.subject-edit').length,name:'',dir:'in'}));
window.saveSettings=k=>{try{let v={};if(k==='subjects'){v=[...document.querySelectorAll('.subject-edit')].map(e=>({id:e.dataset.id,name:e.querySelector('.subject-name').value.trim(),dir:e.querySelector('select').value}));if(v.some(x=>!x.name))throw Error('请填写科目名称')}else document.querySelectorAll('[data-setting]').forEach(e=>{const key=e.dataset.setting,value=e.type==='checkbox'?e.checked:e.type==='number'?+e.value:e.value;if(e.type==='number'&&(!Number.isInteger(value)||value<0))throw Error('天数须为非负整数');if(k==='billRules'&&['type','days'].includes(key)){v.payRuleDefault=v.payRuleDefault||{};v.payRuleDefault[key]=value}else v[key]=value});K.updateSettings(S,{[k]:v});save();flash('已保存')}catch(e){flash(e.message)}};
P.apartment=()=>page('公寓资料',field('apt-name','公寓名称',S.apartment.name)+field('apt-phone','联系电话',S.apartment.phone)+field('apt-address','地址',S.apartment.address)+field('apt-city','城市',S.apartment.city)+'<button class="btn" id="save-apartment" onclick="saveApartment()">保存</button>');
window.saveApartment=()=>{const v={};['name','phone','address','city'].forEach(k=>v[k]=document.getElementById('apt-'+k).value.trim());if(!v.name)return flash('请填写公寓名称');S.apartment=v;save();flash('已保存')};
window.gapStub=()=>flash('原型占位，暂未接入');
P.accountSecurity=()=>page('账号安全',row('办理人','房东（示例）')+row('示例今天',T)+'<button class="btn sec2" onclick="gapStub()">修改密码（占位）</button>');
P.services=()=>page('服务购买',row('基础版','已开通')+row('智能设备','自定·待方案')+row('网签备案','v2'));
P.downloads=()=>page('下载中心',['房源清单.xlsx','账单导出.csv'].map(t=>`<div class="sec">${row(t,'占位')}<button class="mini" onclick="gapStub()">生成（占位）</button></div>`).join(''));
P.opLog=()=>page('操作日志',S.events.slice().reverse().map(e=>`<div class="sec"><b>${esc(e.type)}</b><div>${esc(e.text)}</div><div class="helper">${esc(e.at)} · ${esc(e.by)}</div>${e.cid?link('contract?id='+encodeURIComponent(e.cid),'查看合同'):''}</div>`).join('')||'<div class="helper">暂无操作日志</div>');
P.intentSigns=q=>{const list=S.intentSigns.filter(x=>!q.cid||x.cid===q.cid);const contracts=S.contracts.filter(c=>!c.removed);return page('意愿签署',list.map(x=>link('intentSign?id='+x.id,esc(x.title)+' · '+x.status)).join('')+(!list.length?'<div class="helper">暂无意愿签署</div>':'')+'<div class="sec"><h3>新建意愿签署</h3><select class="input" id="intent-cid">'+contracts.map(c=>`<option value="${c.id}" ${q.cid===c.id?'selected':''}>${esc(K.titleText(c))} · ${esc(c.who)}</option>`).join('')+'</select>'+field('intent-title','标题','租赁意愿确认')+'<button class="btn" id="create-intent" onclick="createIntent()">创建</button></div>')};
window.createIntent=()=>{try{const x=K.createIntentSign(S,{cid:document.getElementById('intent-cid').value,title:document.getElementById('intent-title').value,by:'房东'});save();go('intentSign',{id:x.id})}catch(e){flash(e.message)}};
P.intentSign=q=>{const x=S.intentSigns.find(x=>x.id===q.id);if(!x)return page('意愿签署','记录不存在');return page('意愿签署',row('标题',esc(x.title))+row('状态',x.status)+row('创建日期',x.created)+row('办理人',esc(x.by))+row('签署日期',x.signedAt||'—')+link('contract?id='+x.cid,'查看合同')+(x.status==='待签署'?`<button class="btn" id="sign-intent" onclick="intentAction('${x.id}','sign')">确认签署</button><button class="btn sec2" onclick="intentAction('${x.id}','withdraw')">撤回</button>`:''))};
window.intentAction=(id,act)=>{try{(act==='sign'?K.signIntent:K.withdrawIntent)(S,id,'房东');save();render()}catch(e){flash(e.message)}};
P.onboarding=()=>{const p=K.onboardingProgress(S);return page('新手上路',`<h3>已完成 ${p.count}/6</h3>`+[['building','已有楼栋？','rooms'],['price','至少一间已定价','batchPrice'],['register','至少一份生效中合同','contracts'],['collect','至少一笔线下收款','bills'],['workOrder','至少一笔工单','workOrders'],['settings','打开过设置','settings']].map(([id,t,u])=>link(u,(p.done[id]?'✅':'○')+' '+t)).join(''))};
const gap2Contract=P.contract;P.contract=q=>gap2Contract(q).replace('<div class="wrap">',`<div class="wrap">${link('intentSigns?cid='+encodeURIComponent(q.id),'意愿签署')}`);
function render(){const{p,q}=route();document.body.classList.remove('bill-editor');document.body.innerHTML=(P[p]||P.home)(q,p);window.scrollTo(0,0);document.getElementById('gap-q')?.addEventListener('input',window.gapSearch);document.getElementById('wo-filter')?.addEventListener('change',e=>go('workOrders',{...q,type:e.target.value}))}window.render=render;
window.addEventListener('hashchange',render);load();render();window.__state=()=>S;
})();
