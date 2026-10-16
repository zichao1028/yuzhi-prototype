// 有状态原型：状态保存在 localStorage，首次由 CORE.seed() 生成。所有页面均由状态渲染。
(function(){const K=window.CORE,KEY='yuzhi-proto-state-v2';
let S;function load(){try{S=JSON.parse(localStorage.getItem(KEY))}catch(e){S=null}if(!S||S.v!==2){S=K.seed();save()}}
function save(){localStorage.setItem(KEY,JSON.stringify(S))}
window.resetDemo=function(){if(!confirm('重置后，所有操作将被清除并恢复示例数据，确定？'))return;S=K.seed();save();go('home')};
const T=K.TODAY,esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money=x=>'¥'+(+x).toFixed(2);
function go(p,q){location.hash='#'+p+(q?'?'+new URLSearchParams(q):'')}window.go=go;
function route(){const h=location.hash.slice(1)||'home';const[p,qs]=h.split('?');return{p,q:Object.fromEntries(new URLSearchParams(qs||''))}}
const titleOf=c=>{const rs=c.rooms.map(x=>x.r);return `<span class="ttl"><span class="addr">${esc(c.bld+rs.join('、'))}</span><span class="n">共${rs.length}间房</span></span>`};
const label=b=>b.k=='dep'?'押金':b.k=='settle'?'结算应收':`租金 第${b.n}期`;
const period=b=>b.s?`${b.s} 至 ${b.e}`:'—';
function nav(t,back,spec){return `<div class="nav">${back?`<a class="back" href="javascript:history.back()">‹ 返回</a>`:''}${esc(t)}<a class="speclink" href="spec.html${spec?'#'+spec:''}">功能说明</a></div>`}
const ICON={home:'<path d="M4 11.5 13 4l9 7.5"/><path d="M6.5 10v11h13V10"/>',rooms:'<path d="M6 21V4h8v17"/><path d="M14 9h6v12"/>',bills:'<rect x="5" y="4" width="16" height="18"/><path d="M9 9h8M9 13h8M9 17h5"/>',me:'<circle cx="13" cy="9" r="4"/><path d="M5 22c1-5 4-7 8-7s7 2 8 7"/>'};
function tabbar(a){return `<div class="tabbar">${[['home','首页'],['rooms','房源'],['bills','账单'],['me','我的']].map(([k,n])=>`<a href="#${k}" class="${a==k?'act':''}"><svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="2">${ICON[k]}</svg>${n}</a>`).join('')}</div>`}
const row=(a,b)=>`<div class="row"><span>${a}</span><b>${b}</b></div>`;
function flash(m){const d=document.createElement('div');d.id='toast';d.textContent=m;d.style.cssText='position:fixed;top:60px;left:20px;right:20px;background:#333;color:#fff;padding:10px;z-index:99;text-align:center';document.body.appendChild(d);setTimeout(()=>d.remove(),1800)}
// ---------------- pages ----------------
const P={};
P.home=()=>{const cs=S.contracts,cnt=s=>cs.filter(c=>K.cStatus(c,T)==s).length;const due=S.bills.filter(b=>['待收','部分收款'].includes(K.billStatus(b))&&b.due<=T);
 return nav('首页','', 'home')+`<div class="wrap"><div class="h1">寓智云控</div>
 <a class="btn" id="go-register" href="#register">租客登记</a><div style="height:10px"></div>
 <a class="card entry" href="#contracts"><span><b>合同管理</b><div class="helper">${cnt('生效中')} 份生效中 · ${cnt('待生效')} 份待生效 · ${cnt('已到期')} 份已到期 · ${cnt('已终止')} 份已终止</div></span><span>›</span></a>
 <a class="card entry" href="#rooms"><span><b>房源</b><div class="helper">${Object.values(K.BUILDINGS).flat().length} 间房 · 空置房可直接登记</div></span><span>›</span></a>
 <a class="card entry" href="#bills"><span><b>账单</b><div class="helper">${due.length} 笔已到支付日未收清</div></span><span>›</span></a>
 <a class="card entry" href="spec.html"><span><b>功能说明（PRD）</b><div class="helper">流程、计算规则与示例</div></span><span>›</span></a>
 <button class="btn sec2" id="reset" onclick="resetDemo()">重置示例数据</button><div class="helper">数据保存在本浏览器（localStorage），刷新后保留。示例“今天”固定为 ${T}。</div></div>`+tabbar('home')};
P.me=()=>nav('我的','','me')+`<div class="wrap"><div class="sec">${row('办理人','房东（示例）')}${row('示例今天',T)}</div><button class="btn sec2" id="reset" onclick="resetDemo()">重置示例数据</button></div>`+tabbar('me');
P.contracts=(q)=>{const tabs=['全部','生效中','待生效','已到期','已终止'],t=q.t||'全部';const list=S.contracts.filter(c=>t=='全部'||K.cStatus(c,T)==t).slice().reverse();
 return nav('合同管理',1,'contracts')+`<div class="wrap"><div class="tabs">${tabs.map(x=>`<span class="${x==t?'act':''}" onclick="go('contracts',{t:'${x}'})">${x}</span>`).join('')}</div>
 ${list.map(c=>`<a class="card cc" href="#contract?id=${c.id}" data-cid="${c.id}"><div class="l1">${titleOf(c)}</div><div class="l2"><span>${esc(c.who||'待实名')} ${c.phone}</span><span class="tag ${K.cStatus(c,T)=='生效中'?'on':''}">${K.cStatus(c,T)}</span></div><div class="l2"><span>${c.start} 至 ${c.end}</span><span>月租 ${money(K.sum(K.activeRooms(c).map(x=>x.rent)))}</span></div></a>`).join('')||'<div class="helper">暂无合同</div>'}</div>`+tabbar('home')};
P.contract=(q)=>{const c=K.C(S,q.id);if(!c)return nav('合同',1)+'<div class="wrap">合同不存在</div>';const st=K.cStatus(c,T),tab=q.tab||'合同';const bl=K.billsOf(S,c.id);
 const act=K.activeRooms(c);const rentNow=K.sum(act.map(x=>x.rent));
 let body='';
 if(tab=='合同'){body=`<div class="sec"><h3>合同详情</h3>${row('合同期间',c.start+' 至 '+c.end)}${c.rooms.map(x=>row(c.bld+x.r+' 月租金',money(x.rent)+(x.out?'（已退租 '+x.out+'）':''))).join('')}${row('当前月租金合计',money(rentNow))}${row('押金',money(c.dep))}${row('付款方式',K.payT(c))}${row('支付时间',K.ruleT(c.payRule))}${(c.fees||[]).map(f=>row(esc(f.name),`${money(f.amount)}${f.mode=='随租金付'?'/月 · 随租金付':' · 一次付清'}`)).join('')||row('其他费用','无')}${row('签约方式',c.sign)}</div>
 <div class="sec"><h3>其他信息</h3>${row('办理人',esc(c.op))}${row('登记日期',c.entry)}${row('合同条款',esc(c.terms)||'—')}${row('备注',esc(c.note)||'—')}${c.emergency?row('紧急联系人',`${esc(c.emergency.name)}（${esc(c.emergency.rel)}）${c.emergency.phone}`):''}</div>
 ${c.term?`<div class="sec"><h3>终止信息</h3>${row('终止原因',c.term.reason)}${row('实际退租日',c.term.X)}${row('办理人',esc(c.term.by))}<a class="ref" href="#settlement?id=${c.term.sid}">查看结算单 ›</a></div>`:st=='已到期'?`<div class="sec"><h3>到期信息</h3>${row('到期日',c.end)}<div class="helper">已到期未退租，请办理退租或续租。</div></div>`:''}`}
 if(tab=='账单'){body=bl.map(b=>billCard(b,c)).join('')+S.payables.filter(p=>p.cid==c.id).map(p=>payCard(p,c)).join('')}
 if(tab=='承租人'){body=`<div class="sec"><h3>承租人</h3>${row('姓名',esc(c.who)||'待承租人实名补充')}${row('手机号',c.phone)}${row('证件类型',esc(c.idType)||'—')}${row('证件号码',c.idNo?c.idNo.slice(0,4)+'**********'+c.idNo.slice(-4):'—')}</div>`}
 if(tab=='入住人'){body=c.rooms.map(x=>`<div class="sec"><h3>${esc(c.bld+x.r)} · ${c.term?'本合同入住期间 '+(x.in?x.in+' 至 '+(x.out):'未入住'):K.occSt(x,T)}</h3>
  ${(c.occupants[x.r]||[]).map((o,i)=>`<div class="row"><span>${o.phone}${o.self?' <span class="tag">本人</span>':''} <span class="helper">${o.how}</span></span><b><span class="tag ${o.st=='已生效'?'ok':'warn'}">${o.st}</span> ${!c.term&&!x.out?`${o.st=='待同意'?`<button class="mini" onclick="occAgree('${c.id}','${x.r}',${i})">同意</button>`:''}<button class="mini" onclick="occDel('${c.id}','${x.r}',${i})">删除</button>`:''}</b></div>`).join('')||'<div class="helper">暂无入住人</div>'}
  ${!c.term&&!x.out?`<div class="btns">${!x.in?`<button class="mini mvin" onclick="moveIn('${c.id}','${x.r}')">办理入住</button>`:''}<button class="mini" onclick="occAdd('${c.id}','${x.r}')">手机号添加</button><button class="mini" onclick="alert('展示不记名二维码：入住人扫码申请后出现在列表（待同意）。')">二维码添加</button></div>`:''}</div>`).join('')}
 if(tab=='办理记录'){body='<div class="tl">'+S.events.filter(e=>e.cid==c.id).slice().reverse().map(e=>`<div class="node on"><b>${e.type}</b> <span class="helper">${e.at} · ${esc(e.by)}</span><div>${esc(e.text)}</div>${['部分退租','全部退租'].includes(e.type)?`<a href="#result?ev=${e.id}">查看办理结果</a>`:''}</div>`).join('')+'</div>'}
 const canOut=!c.term&&st!='待生效';
 return nav('合同详情',1,'contract')+`<div class="wrap has-ab"><div class="status ${st=='生效中'?'on':''}"><div class="t" id="cstatus">${st}</div></div>
 <div class="card" onclick="document.getElementById('rm').classList.add('open')">${titleOf(c)}<div class="helper">${esc(c.who||'待实名')} ${c.phone} · 点击查看房间</div></div>
 <div class="mask" id="rm" onclick="this.classList.remove('open')"><div class="sheet"><b>房间</b>${c.rooms.map(x=>row(esc(c.bld+x.r),(x.out?'已退租 '+x.out:K.occSt(x,T))+' · '+money(x.rent)+'/月')).join('')}<div class="btns"><button class="btn sec2">关闭</button></div></div></div>
 <div class="tabs">${['合同','账单','承租人','入住人','办理记录'].map(x=>`<span class="${x==tab?'act':''}" onclick="go('contract',{id:'${c.id}',tab:'${x}'})">${x}</span>`).join('')}</div>${body}</div>
 ${canOut?`<div class="actionbar"><button class="btn sec2" onclick="go('renew',{id:'${c.id}'})">续租</button><button class="btn sec2" onclick="go('swap',{id:'${c.id}'})">换房</button><button class="btn" id="btn-checkout" onclick="go('checkout',{id:'${c.id}'})">退租</button></div>`:''}`+tabbar('home')};
function billCard(b,c){const s=K.billStatus(b),od=K.odays(b,T);return `<a class="card bc" href="#bill?id=${b.id}" data-bid="${b.id}"><div class="bt">${titleOf(c)}<span class="tag ${s=='已收'||s=='已完成'?'ok':'warn'}">${s}</span></div><div class="bb"><span>${label(b)} · ${period(b)}</span><span>${money(K.billTotal(b))}</span></div><div class="bb"><span>支付日 ${b.due}</span><span>待收 ${money(Math.max(0,K.billOut(b)))}${od?` <b class="od">逾期${od}天</b>`:''}</span></div></a>`}
function payCard(p,c){return `<a class="card bc" href="#pay?id=${p.id}" data-pid="${p.id}"><div class="bt">${titleOf(c)}<span class="tag ${p.status=='已完成'?'ok':'warn'}">${p.status}</span></div><div class="bb"><span>付款账单 · ${esc(p.reason)}</span><span>${money(p.amount)}</span></div><div class="bb"><span>支付日 ${p.due}</span><span>${p.date?'已付 '+p.date:''}</span></div></a>`}
P.bills=(q)=>{const side=q.side||'in',bld=q.bld||'全部楼栋';
 if(side=='in'){const tabs=['全部','待收','部分收款','已收','已完成'],t=q.t||'待收';const typ=q.typ||'全部';
  let l=S.bills.filter(b=>{const c=K.C(S,b.cid);return (t=='全部'||K.billStatus(b)==t)&&(bld=='全部楼栋'||c.bld==bld)&&(typ=='全部'||(typ=='租金'?b.k=='rent':typ=='押金'?b.k=='dep':b.k=='settle'))}).sort((a,b)=>a.due<b.due?-1:1);
  const due=K.sum(l.map(b=>Math.max(0,K.billOut(b)))),odn=l.filter(b=>K.odays(b,T)).length;
  return nav('账单',1,'bills')+`<div class="wrap"><div class="bhead"><div class="seg"><b class="act">收款账单</b><b onclick="go('bills',{side:'out'})">付款账单</b></div></div>
  <div class="tabs">${tabs.map(x=>`<span class="${x==t?'act':''}" onclick="go('bills',{side:'in',t:'${x}',bld:'${bld}',typ:'${typ}'})">${x}</span>`).join('')}</div>
  <div class="chips2"><select class="input" style="height:32px" onchange="go('bills',{side:'in',t:'${t}',bld:this.value,typ:'${typ}'})">${['全部楼栋',...Object.keys(K.BUILDINGS)].map(x=>`<option ${x==bld?'selected':''}>${x}</option>`).join('')}</select><select class="input" style="height:32px" onchange="go('bills',{side:'in',t:'${t}',bld:'${bld}',typ:this.value})">${['全部','租金','押金','结算应收'].map(x=>`<option ${x==typ?'selected':''}>${x}</option>`).join('')}</select></div>
  <div class="sumrow"><div>${l.length}<span>笔账单</span></div><div>${money(due)}<span>待收合计</span></div><div>${odn}<span>笔逾期</span></div></div>
  <button class="mini" disabled title="待确认">批量选择（待确认）</button>
  ${l.map(b=>billCard(b,K.C(S,b.cid))).join('')||'<div class="helper">暂无账单</div>'}</div>`+tabbar('bills')}
 const t=q.t||'全部';const l=S.payables.filter(p=>(t=='全部'||p.status==t)&&(bld=='全部楼栋'||K.C(S,p.cid).bld==bld));
 return nav('账单',1,'bills')+`<div class="wrap"><div class="bhead"><div class="seg"><b onclick="go('bills',{side:'in'})">收款账单</b><b class="act">付款账单</b></div></div>
 <div class="tabs">${['全部','待付款','已完成'].map(x=>`<span class="${x==t?'act':''}" onclick="go('bills',{side:'out',t:'${x}'})">${x}</span>`).join('')}</div>
 <div class="sumrow"><div>${l.length}<span>笔</span></div><div>${money(K.sum(l.filter(p=>p.status!='已完成').map(p=>p.amount)))}<span>待付合计</span></div></div>${l.map(p=>payCard(p,K.C(S,p.cid))).join('')||'<div class="helper">暂无付款账单</div>'}</div>`+tabbar('bills')};
P.bill=(q)=>{const b=S.bills.find(x=>x.id==q.id);const c=K.C(S,b.cid);const s=K.billStatus(b),ed=K.itemsEditable(b),editing=q.edit&&ed;
 const items=editing?`<div id="items">${b.items.map(i=>itemRow(i)).join('')}</div><button class="mini" onclick="document.getElementById('items').insertAdjacentHTML('beforeend',itemRowHtml({name:'',amount:''}))">+ 添加账单项</button><div class="err-t" id="ierr"></div><div class="btns"><button class="btn sec2" onclick="go('bill',{id:'${b.id}'})">取消</button><button class="btn" id="save-items" onclick="saveItems('${b.id}')">保存</button></div>`
  :b.items.map(i=>row(esc(i.name),money(i.amount))).join('')+row('<b>账单金额</b>','<b id="btotal">'+money(K.billTotal(b))+'</b>');
 return nav('账单详情',1,'bill')+`<div class="wrap"><div class="status"><div class="t" id="bstatus">${s}</div><div class="s">${label(b)} · ${period(b)} · 支付日 ${b.due}${K.odays(b,T)?' · 逾期'+K.odays(b,T)+'天':''}</div></div>
 <a class="card" href="#contract?id=${c.id}">${titleOf(c)}<div class="helper">${esc(c.who||'待实名')} ${c.phone}</div></a>
 <div class="sec"><h3>账单项 ${ed&&!editing?`<button class="mini" id="edit-items" onclick="go('bill',{id:'${b.id}',edit:1})">调整</button>`:''}</h3>${items}${!ed?'<div class="helper">'+(s=='已收'?'已收账单不可调整':'已完成账单不可调整')+'</div>':''}</div>
 <div class="sec"><h3>收款记录</h3>${row('已收',money(K.billPaid(b)))}${row('待收','<span id="bout">'+money(Math.max(0,K.billOut(b)))+'</span>')}${b.pays.map(p=>row(`${p.date} ${p.m}`,money(p.amount)+(p.note?'<div class="helper">'+esc(p.note)+'</div>':''))).join('')||'<div class="helper">暂无</div>'}</div>
 ${ed&&!editing?`<div class="sec"><h3>收款（线下收款）</h3><label class="f">收款金额<input class="input" id="pamt" type="number" value="${K.billOut(b)}"></label><label class="f">收款日期<input class="input" id="pdate" type="date" value="${T}"></label><div class="err-t" id="perr"></div><button class="btn" id="do-collect" onclick="doCollect('${b.id}')">确认收款</button></div>`:''}</div>`+tabbar('bills')};
const itemRowHtml=i=>`<div class="daterow item"><input class="input iname" placeholder="账单项名称" value="${esc(i.name)}" data-kind="${i.kind||'adj'}" data-room="${i.room||''}"><input class="input iamt" type="number" step="0.01" value="${i.amount}" style="width:110px"><button class="mini" onclick="this.parentNode.remove()">删除</button></div>`;window.itemRowHtml=itemRowHtml;const itemRow=itemRowHtml;
window.saveItems=id=>{const items=[...document.querySelectorAll('#items .item')].map(d=>({name:d.querySelector('.iname').value,amount:d.querySelector('.iamt').value===''?NaN:+d.querySelector('.iamt').value,kind:d.querySelector('.iname').dataset.kind,room:d.querySelector('.iname').dataset.room||undefined}));
 try{K.setItems(S,id,items);save();go('bill',{id});flash('已保存')}catch(e){document.getElementById('ierr').textContent=e.message}};
window.doCollect=id=>{try{K.collect(S,id,document.getElementById('pamt').value,document.getElementById('pdate').value);save();render();flash('已记录线下收款')}catch(e){document.getElementById('perr').textContent=e.message}};
P.pay=(q)=>{const p=S.payables.find(x=>x.id==q.id),c=K.C(S,p.cid);return nav('付款账单',1,'pay')+`<div class="wrap"><div class="status"><div class="t" id="pstatus">${p.status}</div><div class="s">${esc(p.reason)}</div></div><a class="card" href="#contract?id=${c.id}">${titleOf(c)}</a>
 <div class="sec">${row('应付金额',money(p.amount))}${row('支付日',p.due)}${row('付款日期',p.date||'—')}${p.sid?`<a class="ref" href="#settlement?id=${p.sid}">查看结算单 ›</a>`:''}</div>
 ${p.status!='已完成'?`<label class="f">付款日期<input class="input" id="paydate" type="date" value="${T}"></label><div class="err-t" id="perr"></div><button class="btn" id="do-pay" onclick="doPay('${p.id}')">确认已线下付款</button>`:''}</div>`+tabbar('bills')};
window.doPay=id=>{try{K.payPayable(S,id,document.getElementById('paydate').value);save();render()}catch(e){document.getElementById('perr').textContent=e.message}};
P.settlement=(q)=>{const s=S.settlements.find(x=>x.id==q.id),c=K.C(S,s.cid);return nav('结算单',1,'settlement')+`<div class="wrap"><a class="card" href="#contract?id=${c.id}">${titleOf(c)}</a><div class="sec"><h3>结算</h3>${row('实际退租日',s.X)}
 ${row('已收合计（线下收款，含押金）',money(s.cash))}${s.refunded?row('减：已退给租客',money(-s.refunded)):''}${row('= 已收净额',money(s.received))}
 ${s.rentLines.map(l=>row(`实际租金 ${c.bld+l.r}（${c.start} 至 ${l.to}）`,money(-l.amount))).join('')}${row('其他费用',money(-s.other))}${row('扣款'+(s.dedr?'（'+esc(s.dedr)+'）':''),money(-s.ded))}
 ${row('<b>结算结果</b>','<b id="sres">'+(s.result>=0?'应退 ':'应补 ')+money(Math.abs(s.result))+'</b>')}
 ${s.payable?`<a class="ref" href="#pay?id=${s.payable}">付款账单（退给租客）›</a>`:''}${s.receivable?`<a class="ref" href="#bill?id=${s.receivable}">收款账单（租客应补）›</a>`:''}</div></div>`+tabbar('home')};
P.rooms=()=>nav('房源',1,'rooms')+'<div class="wrap">'+Object.entries(K.BUILDINGS).map(([b,rs])=>`<div class="sec"><h3>${b}</h3><div class="rooms">${rs.map(r=>`<a href="#room?r=${r}" data-room="${r}">${r}<span class="helper">&nbsp;${K.roomBusy(S,r)?'在租':'空置'}</span></a>`).join('')}</div></div>`).join('')+'</div>'+tabbar('rooms');
P.room=(q)=>{const r=q.r,b=K.bldOf(r);const cs=S.contracts.filter(c=>c.rooms.some(x=>x.r==r)).reverse();const busy=K.roomBusy(S,r);
 return nav(b+r,1,'room')+`<div class="wrap"><div class="status"><div class="t">${busy?'在租':'空置'}</div></div>${!busy?`<a class="btn" id="room-register" href="#register?r=${r}">租客登记</a><div style="height:10px"></div>`:''}<div class="sec"><h3>租约</h3>${cs.map(c=>{const x=c.rooms.find(y=>y.r==r);return `<a class="ref" href="#contract?id=${c.id}">${esc(c.who||c.phone)} · ${c.start} 至 ${c.end}<span class="helper">${K.cStatus(c,T)} · 本房 ${x.out?'已退租 '+x.out:K.occSt(x,T)} · ${money(x.rent)}/月</span></a>`}).join('')||'<div class="helper">暂无</div>'}</div></div>`+tabbar('rooms')};
// ----- 租客登记 -----
P.register=(q)=>{const pre=q.r?[q.r]:[];const vac=Object.entries(K.BUILDINGS).map(([b,rs])=>`<div class="helper">${b}</div>`+rs.filter(r=>!K.roomBusy(S,r)).map(r=>`<label class="chk"><input type="checkbox" class="rsel" value="${r}" ${pre.includes(r)?'checked':''} onchange="regRooms()"> ${r}</label><div class="rrent" id="rr-${r}" style="display:${pre.includes(r)?'block':'none'}"><input class="input rent" data-r="${r}" type="number" placeholder="${r} 月租金（元）" oninput="regCalc()"></div>`).join('')).join('');
 return nav('租客登记',1,'register')+`<div class="wrap form has-ab">
 <div class="step">1 承租人信息</div><label class="f">手机号 *<input class="input" id="f-phone" maxlength="11"></label><label class="f">姓名<input class="input" id="f-who"></label><label class="f">证件类型<select class="input" id="f-idType"><option value="">请选择</option><option>身份证</option><option>护照</option><option>港澳居民来往内地通行证</option><option>台湾居民来往大陆通行证</option></select></label><label class="f">证件号码<input class="input" id="f-idNo"></label><div class="helper">姓名、证件三项可全部留空，由承租人实名后补充</div>
 <div class="step" style="margin-top:16px">2 房间与租金（每间房单独设置月租金）</div>${vac}
 <div class="step" style="margin-top:16px">3 租期与付款</div><label class="f">合同开始日期 *<input class="input" id="f-start" type="date" onchange="regCalc()"></label><label class="f">合同结束日期 *<input class="input" id="f-end" type="date" onchange="regCalc()"></label>
 <label class="f">签约方式 *<select class="input" id="f-sign"><option value="">请选择</option><option>纸质合同</option><option>电子合同</option></select></label>
 <label class="f">付款方式：付<input class="input" id="f-payN" type="number" value="1" oninput="regCalc()" style="display:inline-block;width:70px">押<input class="input" id="f-depM" type="number" value="1" oninput="regCalc()" style="display:inline-block;width:70px"></label>
 <label class="f">押金（元，默认 押M×月租金合计，可修改）<input class="input" id="f-dep" type="number" oninput="this.dataset.touched=1;regCalc()"></label>
 <label class="f">支付时间<select class="input" id="f-rule" onchange="regCalc()"><option value="before">账单开始日期前 N 天</option><option value="fixed">每期开始月份固定日</option></select><input class="input" id="f-ruleV" type="number" value="7" oninput="regCalc()"></label>
 <div class="step" style="margin-top:16px">4 其他费用</div><div id="fees"></div><button class="mini" id="add-fee" onclick="addFee()">+ 添加费用</button>
 <div class="step" style="margin-top:16px">5 紧急联系人（选填）</div><input class="input" id="e-name" placeholder="姓名"><input class="input" id="e-rel" placeholder="关系"><input class="input" id="e-phone" placeholder="手机号">
 <div class="step" style="margin-top:16px">6 合同其他信息</div><label class="f">合同条款<input class="input" id="f-terms"></label><label class="f">备注<input class="input" id="f-note"></label>
 <div class="sec" style="margin-top:16px"><h3>账单预览</h3><div id="preview" class="helper">填写后自动生成</div></div><div class="err-t" id="rerr"></div></div>
 <div class="actionbar"><button class="btn" id="do-register" onclick="doRegister()">确认登记</button></div>`+tabbar('home')};
window.addFee=()=>document.getElementById('fees').insertAdjacentHTML('beforeend',`<div class="daterow fee"><input class="input fname" placeholder="名称"><select class="input fmode" onchange="regCalc()"><option>随租金付</option><option>一次付清</option></select><input class="input famt" type="number" placeholder="金额" oninput="regCalc()" style="width:90px"><button class="mini" onclick="this.parentNode.remove();regCalc()">删</button></div>`);
window.regRooms=()=>{document.querySelectorAll('.rsel').forEach(x=>document.getElementById('rr-'+x.value).style.display=x.checked?'block':'none');regCalc()};
function regForm(){const v=id=>(document.getElementById(id)||{}).value||'';const rooms=[...document.querySelectorAll('.rsel:checked')].map(x=>({r:x.value,rent:+document.querySelector(`.rent[data-r="${x.value}"]`).value||0}));
 const rt=v('f-rule'),rv=+v('f-ruleV');const depEl=document.getElementById('f-dep');const depM=parseInt(v('f-depM'));const auto=K.r2((depM||0)*K.sum(rooms.map(x=>x.rent)));if(!depEl.dataset.touched)depEl.value=auto;
 return {phone:v('f-phone').trim(),who:v('f-who').trim(),idType:v('f-idType'),idNo:v('f-idNo').trim(),rooms,start:v('f-start'),end:v('f-end'),sign:v('f-sign'),payN:parseInt(v('f-payN')),depM,dep:depEl.value===''?NaN:+depEl.value,
  payRule:rt=='fixed'?{type:'fixed',day:rv}:{type:'before',days:rv},fees:[...document.querySelectorAll('.fee')].map(d=>({name:d.querySelector('.fname').value.trim(),mode:d.querySelector('.fmode').value,amount:+d.querySelector('.famt').value})),
  emergency:{name:v('e-name').trim(),rel:v('e-rel').trim(),phone:v('e-phone').trim()},terms:v('f-terms'),note:v('f-note'),op:'房东'}}
window.regCalc=()=>{const f=regForm();const el=document.getElementById('preview');if(!f.rooms.length||!f.start||!f.end||f.end<f.start||!(f.payN>=1)){el.textContent='填写后自动生成';return}
 el.innerHTML=`月租金合计 ${money(K.sum(f.rooms.map(x=>x.rent)))}`+K.previewBills(f).map(b=>`<div class="bill"><div class="top"><span>${b.k=='dep'?'押金':'租金 第'+b.n+'期 '+b.s+' 至 '+b.e}</span><b>${money(K.sum(b.items.map(i=>i.amount)))}</b></div><div class="sub">支付日 ${b.due} · ${b.items.map(i=>esc(i.name)+' '+i.amount).join('，')}</div></div>`).join('')};
window.doRegister=()=>{const f=regForm();try{const c=K.register(S,f,T+' '+new Date().toTimeString().slice(0,5));save();go('contract',{id:c.id});flash('登记成功，已生成 '+K.billsOf(S,c.id).length+' 笔账单')}catch(e){document.getElementById('rerr').textContent=e.message;window.scrollTo(0,document.body.scrollHeight)}};
// ----- 退租 -----
let CO=null;
P.checkout=(q)=>{const c=K.C(S,q.id);const act=K.activeRooms(c);if(!CO||CO.cid!=c.id)CO={cid:c.id,rooms:act.length==1?[act[0].r]:[],X:'',lines:null,mode:'deduct',other:null,ded:0,dedr:''};
 const mode=K.checkoutMode(c,CO.rooms);let body='';
 if(CO.rooms.length&&CO.X){if(mode=='partial'){const pv=K.partialPreview(S,c.id,CO.rooms,CO.X);if(pv.err.length)body=`<div class="err-t">${pv.err.join('；')}</div>`;else{if(!CO.lines)CO.lines=pv.lines;const sp=K.splitLines(S,CO.lines);
   body=`<div class="sec"><h3>受影响账单（可修改减免金额与名称）</h3>${CO.lines.map((l,li)=>{const r=sp.res[li];return `<div class="bill"><div class="top"><span>租金 第${l.n}期 ${l.s} 至 ${l.e} <span class="tag">${l.status}</span></span><b>${money(r.before)} → ${money(r.after)}</b></div>${l.props.map((p,pi)=>`<div class="daterow"><input class="input" value="${esc(p.name)}" onchange="CO.lines[${li}].props[${pi}].name=this.value"><input class="input credit" type="number" step="0.01" value="${p.credit}" style="width:110px" onchange="CO.lines[${li}].props[${pi}].credit=+this.value;render()"></div>`).join('')}<div class="sub">${r.items.length?'新增账单项：'+r.items.map(i=>esc(i.name)+' '+i.amount).join('，'):'账单不调整'}${r.excess?` · 多收 ${money(r.excess)}（${l.status=='已收'?'账单已收，不修改':'超出待收部分'}）`:''}</div></div>`}).join('')||'<div class="helper">无受影响账单</div>'}</div>
   ${sp.excess>0?`<div class="sec"><h3>多收款 ${money(sp.excess)} 处理方式</h3><label class="chk"><input type="radio" name="xm" value="deduct" ${CO.mode=='deduct'?'checked':''} onchange="CO.mode='deduct'"> 抵扣后续未收账单（不足部分退给租客）</label><label class="chk"><input type="radio" name="xm" id="xm-refund" value="refund" ${CO.mode=='refund'?'checked':''} onchange="CO.mode='refund'"> 退给租客（生成付款账单）</label></div>`:''}<div class="helper">押金与其他费用不变，在最后一次退租结算时处理。</div>`}}
  else{const fp=K.finalPreview(S,c.id,CO.X);if(fp.err.length)body=`<div class="err-t">${fp.err.join('；')}</div>`;else{if(CO.other==null)CO.other=fp.other;const res=K.r2(fp.received-fp.actual-(+CO.other||0)-(+CO.ded||0));
   body=`<div class="sec"><h3>结算（合同将终止）</h3>${row('已收合计（含押金）',money(fp.cash))}${fp.refunded?row('减：已退给租客',money(-fp.refunded)):''}${fp.rentLines.map(l=>row(`实际租金 ${c.bld+l.r}（至 ${l.to}）`,money(-l.amount))).join('')}
   <label class="f">其他费用<input class="input" id="co-other" type="number" value="${CO.other}" onchange="CO.other=+this.value;render()"></label><label class="f">扣款<input class="input" id="co-ded" type="number" value="${CO.ded}" onchange="CO.ded=+this.value;render()"></label><label class="f">扣款原因<input class="input" id="co-dedr" value="${esc(CO.dedr)}" onchange="CO.dedr=this.value"></label>
   ${row('<b>结算结果</b>','<b id="co-res">'+(res>=0?'应退 ':'应补 ')+money(Math.abs(res))+'</b>')}</div>`}}}
 return nav('退租',1,'checkout')+`<div class="wrap form has-ab"><div class="card">${titleOf(c)}</div><div class="step">选择退租房间</div>${act.map(x=>`<label class="chk"><input type="checkbox" class="co-room" value="${x.r}" ${CO.rooms.includes(x.r)?'checked':''} onchange="coRooms()"> ${c.bld+x.r}（${money(x.rent)}/月）</label>`).join('')}
 <div class="helper">${mode=='final'||!CO.rooms.length?'选择全部剩余房间 = 最后一次退租，整份合同结算并终止':'部分退租：不产生新合同，调整后续账单'}</div>
 <label class="f">实际退租日<input class="input" id="co-X" type="date" value="${CO.X}" onchange="CO.X=this.value;CO.lines=null;CO.other=null;render()"></label>${body}<div class="err-t" id="coerr"></div></div>
 <div class="actionbar"><button class="btn" id="do-checkout" onclick="doCheckout()">确认办理</button></div>`+tabbar('home')};
window.coRooms=()=>{CO.rooms=[...document.querySelectorAll('.co-room:checked')].map(x=>x.value);CO.lines=null;CO.other=null;render()};
window.doCheckout=()=>{const c=K.C(S,CO.cid);try{let ev;if(!CO.rooms.length||!CO.X)throw new Error('请选择房间并填写实际退租日');
 if(K.checkoutMode(c,CO.rooms)=='partial'){if(!CO.lines)throw new Error('请检查预览');ev=K.partialApply(S,c.id,CO.rooms,CO.X,CO.lines,CO.mode,'房东',T+' 12:00')}
 else ev=K.finalApply(S,c.id,CO.X,CO.other,CO.ded,CO.dedr,'房东',T+' 12:00');save();CO=null;go('result',{ev:ev.id})}catch(e){document.getElementById('coerr').textContent=e.message}};
P.result=(q)=>{const e=S.events.find(x=>x.id==q.ev),c=K.C(S,e.cid);
 return nav('办理结果',1,'result')+`<div class="wrap"><div class="status on"><div class="t">${e.type}办理成功</div><div class="s">${esc(e.text)}</div></div>
 ${e.type=='部分退租'?`<div class="sec"><h3>账单调整</h3>${e.changes.map(x=>`<a class="ref" href="#bill?id=${x.bid}">${x.label}：${money(x.before)} → ${money(x.after)}<span class="helper">${x.items.join('，')||'不调整'}${x.excess?' · 多收 '+money(x.excess):''}</span></a>`).join('')}</div>
 ${e.deduct.length?`<div class="sec"><h3>抵扣</h3>${e.deduct.map(d=>`<a class="ref" href="#bill?id=${d.bid}">${d.label} 抵扣 ${money(d.amount)}</a>`).join('')}</div>`:''}${e.payable?`<a class="ref" href="#pay?id=${e.payable}">付款账单（退给租客 ${money(S.payables.find(p=>p.id==e.payable).amount)}）›</a>`:''}`
 :`<a class="ref" href="#settlement?id=${e.sid}">查看结算单 ›</a>`}<a class="btn sec2" href="#contract?id=${c.id}">返回合同</a></div>`+tabbar('home')};
P.swap=P.renew=(q,p)=>nav(p=='swap'?'换房':'续租',1,p)+`<div class="wrap"><div class="status"><div class="t">待按新模型重新分析</div><div class="s">按房间计租的新模型下，${p=='swap'?'换房':'续租'}流程待重新分析，原型暂不提供操作。</div></div></div>`+tabbar('home');
// ----- occupants -----
window.moveIn=(cid,r)=>{const d=prompt('实际入住日（YYYY-MM-DD）',T);if(!d)return;try{K.moveIn(S,cid,r,d);save();render()}catch(e){alert(e.message)}};
window.occAdd=(cid,r)=>{const p=prompt('入住人手机号');if(!p)return;try{K.addOcc(S,cid,r,p.trim());save();render()}catch(e){alert(e.message)}};
window.occAgree=(cid,r,i)=>{K.agreeOcc(S,cid,r,i);save();render()};window.occDel=(cid,r,i)=>{if(!confirm('删除该入住人？'))return;K.delOcc(S,cid,r,i);save();render()};
window.CO_get=()=>CO;Object.defineProperty(window,'CO',{get:()=>CO});
function render(){const{p,q}=route();document.body.innerHTML=(P[p]||P.home)(q,p);window.scrollTo(0,0)}window.render=render;
window.addEventListener('hashchange',render);load();render();window.__state=()=>S;
})();
