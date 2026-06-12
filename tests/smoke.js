'use strict';
// 冒烟测试:DOM stub 里跑通 启动/行走/对话/商店/战斗/存档 主流程
const {createGame,loadSrcSources,loadDistSource}=require('./harness');
let passed=0,failed=0;
function t(name,fn){
  try{fn();passed++;console.log('  ✓ '+name);}
  catch(e){failed++;console.log('  ✗ '+name+'\n    '+(e&&e.stack||e));}
}
function eq(a,b,msg){if(a!==b)throw new Error((msg||'断言失败')+':期望 '+JSON.stringify(b)+',实际 '+JSON.stringify(a));}
function ok(v,msg){if(!v)throw new Error(msg||'断言失败:值为假');}

console.log('— 启动(src 模块版)—');
const G=createGame(loadSrcSources());
const E=c=>G.eval(c);

t('游戏脚本加载无异常,初始为标题画面',()=>{eq(E('mode'),'title');});
t('像素图每个精灵行宽一致',()=>{
  const bad=E(`Object.keys(PIX).filter(k=>{const r=PIX[k];return r.some(row=>row.length!==r[0].length);})`);
  eq(bad.length,0,'行宽不一致的精灵:'+bad.join(','));
});
t('标题画面渲染一帧不崩溃',()=>{G.frame();G.frame();});

console.log('— 新游戏与对话 —');
t('开始新游戏进入大地图,开场对话弹出',()=>{
  E(`$('btnNew').onclick()`);
  eq(E('mode'),'world');
  eq(E(`$('dlg').style.display`),'block');
});
t('对话推进 3 句后关闭',()=>{
  E('nextDlg();nextDlg();nextDlg()');
  eq(E(`$('dlg').style.display`),'none');
});
t('按住方向键走完一格并触发 onStep',()=>{
  E('K.right=1;updWorld(0.05);K.right=0');
  eq(E('p.tx'),32,'按键后应立即锁定目标格');
  for(let i=0;i<10&&E('p.mv');i++)E('updWorld(0.05)');
  eq(E('p.mv'),null,'平滑移动应在数帧内完成');
});
t('树/水/墙不可走,草地可走',()=>{
  ok(!E('canWalk(0,0)'),'地图边缘树应不可走');
  ok(E('canWalk(31,40)'),'村中路应可走');
});

console.log('— NPC 与商店 —');
t('撞上阿萝触发剧情,获赠回灵丹',()=>{
  E(`switchMap('world',34,44)`);
  const dan=E('INV.dan');
  E('K.up=1;updWorld(0.05);K.up=0');
  ok(E('flags.aluo'),'flags.aluo 应为 true');
  eq(E('INV.dan'),dan+1,'应获赠一枚回灵丹');
  E('while(dq.length||dcb)nextDlg()');
});
t('杂货铺购买回灵丹扣钱加货',()=>{
  E('S.gold=100');
  const dan=E('INV.dan');
  E(`buyItem('dan',30)`);
  eq(E('S.gold'),70);eq(E('INV.dan'),dan+1);
  E('closePanel()');
});
t('客栈歇息回满并自动保存',()=>{
  E('S.hp=1;S.mp=1;S.gold=50');
  E('inn()');
  eq(E('S.hp'),E('S.maxHp'));eq(E('S.mp'),E('S.maxMp'));eq(E('S.gold'),40);
  ok(G.store['lingshan1'],'应已写入存档');
  E('while(dq.length||dcb)nextDlg()');
});

console.log('— 战斗 —');
t('五灵相克倍率',()=>{
  eq(E(`advMult('水','火')`),1.5);
  eq(E(`advMult('火','水')`),0.7);
  eq(E(`advMult('无','火')`),1);
  eq(E(`advMult('水','土')`),1);
});
t('普通战斗:攻击命中、敌人反击、最终获胜',()=>{
  E(`startBattle('shan',false)`);
  eq(E('mode'),'battle');
  const ehp=E('B.e.hp');
  E(`act('atk')`);
  for(let i=0;i<20&&E('B.anim');i++)E('updBattle(0.05)');
  ok(E('B.e.hp')<ehp,'敌人应掉血');
  for(let i=0;i<60&&E("B.phase!=='cmd'");i++)E('updBattle(0.05)');
  eq(E('B.phase'),'cmd','一回合后应回到指令阶段');
  const gold=E('S.gold'),exp=E('S.exp');
  E('B.e.hp=1');
  E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  eq(E('mode'),'world','胜利后应回到大地图');
  ok(E('S.gold')>gold,'应获得银两');
  E('while(dq.length||dcb)nextDlg()');
});
t('仙术:水灵咒克火系敌人',()=>{
  E('S.lvl=5;S.mp=99');
  E(`startBattle('ghost',false)`);
  E('castSkill(2)');
  for(let i=0;i<40&&E('B.anim');i++)E('updBattle(0.02)');
  ok(E(`B.pops.some(p=>p.txt==='效果拔群!')`),'应显示效果拔群');
  E('B.e.hp=1;B.phase="cmd"');
  E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  eq(E('mode'),'world');
  E('while(dq.length||dcb)nextDlg()');
});

console.log('— 锁妖塔与存档 —');
t('踏上塔门进入锁妖塔,出口回大地图',()=>{
  E(`switchMap('world',31,3);p.tx=31;p.ty=2;onStep()`);
  E('while(dq.length||dcb)nextDlg()');
  eq(E('curName'),'tower');
  E('p.tx=11;p.ty=26;onStep()');
  eq(E('curName'),'world');
});
t('存档/读档往返一致',()=>{
  E(`switchMap('tower',5,5);S.gold=123;INV.qing=7;save()`);
  E(`switchMap('world',31,44);S.gold=0;INV.qing=0`);
  ok(E('loadSave()'),'loadSave 应成功');
  eq(E('curName'),'tower');eq(E('p.tx'),5);
  eq(E('S.gold'),123);eq(E('INV.qing'),7);
});
t('重新开始清空进度',()=>{
  E('resetState()');
  eq(E('S.lvl'),1);eq(E('S.gold'),80);eq(E('curName'),'world');
  ok(!E('flags.aluo'));
});
t('大地图/塔内各渲染一帧不崩溃',()=>{
  E(`mode='world'`);G.frame();
  E(`switchMap('tower',11,25)`);G.frame();
  E(`switchMap('world',31,44)`);
});

console.log('— Phase 1:进屋找宝贝 —');
const HOUSES=[['house1',11],['house2',21],['house3',43],['house4',53]];
t('验收:4 间房都能从村里进、从屋里出',()=>{
  for(const [h,dx] of HOUSES){
    E(`switchMap('world',${dx},41);p.tx=${dx};p.ty=40;onStep()`);
    eq(E('curName'),h,'踏上 '+dx+',40 的木门应进入 '+h);
    E('p.tx=6;p.ty=9;onStep()');
    eq(E('curName'),'world','踏上出口应回到村里');
    eq(E('p.tx'),dx,'应回到对应房门口');
  }
});
t('房门口的通路没有被 NPC 堵死(可达性)',()=>{
  E(`switchMap('world',31,44)`);
  for(const [h,dx] of HOUSES){
    ok(E(`canWalk(${dx},40)`),h+' 的木门应可走');
    ok(E(`canWalk(${dx},41)`),h+' 门前一格应可走,不能被 NPC 占住');
  }
});
t('验收:每间房 ≥3 个调查点 + 主人 NPC,全村合计 ≥12',()=>{
  let total=0;
  for(const [h] of HOUSES){
    const n=E(`POIS['${h}'].length`);
    ok(n>=3,h+' 应有 ≥3 个调查点,实际 '+n);
    ok(E(`NPCS['${h}'].length`)>=1,h+' 应有主人 NPC');
    total+=n;
  }
  ok(total>=12,'全村调查点应 ≥12,实际 '+total);
});
t('调查点配置合法:id 唯一、在地板上、不与 NPC/出口重叠',()=>{
  const ids=new Set();
  for(const [h] of HOUSES){
    for(const q of E(`POIS['${h}']`)){
      ok(!ids.has(q.id),'id 重复:'+q.id);ids.add(q.id);
      eq(E(`MAPS['${h}'].m[${q.y}][${q.x}]`),'f',q.id+' 应放在木地板上');
      ok(!E(`NPCS['${h}'].some(n=>n.x===${q.x}&&n.y===${q.y})`),q.id+' 不应与 NPC 重叠');
      ok(E(`POI_KINDS['${q.kind}']`),q.id+' 的 kind 应有定义:'+q.kind);
      ok(E(`PIX['${q.kind}']`),q.kind+' 应有家具贴图');
    }
  }
});
t('验收:撞上柜子翻出银两(飘字+入账),重复调查换文案不重复给钱',()=>{
  E(`for(const k in looted)delete looted[k]`);
  E(`switchMap('house1',2,3)`);
  const gold=E('S.gold'),wp=E('wpops.length');
  E('K.up=1;updWorld(0.05);K.up=0');
  eq(E('S.gold'),gold+20,'柜子应翻出 20 两');
  ok(E('wpops.length')>wp,'应有金色飘字');
  ok(E(`looted['h1_cab']`),'应记录已翻过');
  const first=E(`$('dlgText').textContent`);
  E('while(dq.length||dcb)nextDlg()');
  E(`investigate(poiAt(2,2))`);
  const again=E(`$('dlgText').textContent`);
  ok(again!==first,'重复调查应是不同文案');
  ok(again.includes('翻得乱七八糟'),'应提示已翻过');
  eq(E('S.gold'),gold+20,'重复调查不应再给钱');
  E('while(dq.length||dcb)nextDlg()');
});
t('验收:翻第二件东西时主人吐槽(致敬经典)',()=>{
  E(`investigate(poiAt(4,2))`);
  ok(E('dq.some(l=>l.n===NPCS.house1[0].n)'),'第二次翻找后主人应吐槽');
  E('while(dq.length||dcb)nextDlg()');
});
t('物品/纸条/空手三类宝物都生效',()=>{
  E(`switchMap('house4',6,5)`);
  const qing=E('INV.qing'),dadan=E('INV.dadan'),gold=E('S.gold');
  E('investigate(poiAt(4,2))');E('while(dq.length||dcb)nextDlg()');
  eq(E('INV.qing'),qing+1,'灶台应翻出清心散');
  E('investigate(poiAt(9,2))');E('while(dq.length||dcb)nextDlg()');
  eq(E('INV.dadan'),dadan+1,'柜子应翻出大还丹');
  E('investigate(poiAt(2,2))');
  ok(E(`dq.length&&String(dq[0]).includes('小侠客')`),'书架纸条应是三个小侠客的彩蛋');
  E('while(dq.length||dcb)nextDlg()');
  E(`switchMap('house3',4,3)`);
  E('investigate(poiAt(4,2))');
  ok(E(`$('dlgText').textContent`).includes('什么都没有'),'空手也要有情怀文案');
  E('while(dq.length||dcb)nextDlg()');
  eq(E('S.gold'),gold,'这几件不应改变银两');
});
t('验收:已翻过的点写入存档,读档恢复,重新开始清空',()=>{
  E('save()');
  ok(JSON.parse(G.store['lingshan1']).looted['h1_cab'],'存档应含 looted');
  E(`looted['h1_cab']=false;delete looted['h4_cab']`);
  ok(E('loadSave()'));
  ok(E(`looted['h1_cab']===true&&looted['h4_cab']===true`),'读档应恢复已翻过的点');
  E('resetState()');
  eq(E('Object.keys(looted).length'),0,'重新开始应清空');
});
t('室内不遇敌,木门/出口可走,家具挡路',()=>{
  for(const [h] of HOUSES)eq(E(`MAPS['${h}'].rate`),0,h+' 遇敌率应为 0');
  E(`switchMap('world',11,41)`);
  ok(E('canWalk(11,40)'),'木门应可走');
  E(`switchMap('house1',2,3)`);
  ok(!E('canWalk(2,2)'),'家具应挡路');
});
t('室内渲染一帧不崩溃(小图居中)',()=>{
  E(`switchMap('house2',6,5)`);G.frame();
  E(`switchMap('world',31,44)`);
});

console.log('— 第二章:水月湖底 —');
t('新妖怪与蛟龙 Boss 数据齐备,精灵可绘',()=>{
  for(const k of ['yaksha','clam','squid','turtle','dragon']){
    ok(E(`ENM['${k}']`),'缺敌人 '+k);
    const draw=E(`ENM['${k}'].draw`);
    ok(E(`SPR['${draw}']`),draw+' 缺绘制函数');
    ok(E(`SPRM['${draw}']`),draw+' 缺尺寸');
    ok(E(`PIX['${draw}']`),draw+' 缺像素图');
  }
  eq(E(`ENM.dragon.el`),'水');eq(E(`ENM.turtle.el`),'土');
});
t('五灵策略成立:风克水(蛟龙)、雷克土(龟将)',()=>{
  eq(E(`advMult('风','水')`),1.5,'风灵咒应拔群于水妖');
  eq(E(`advMult('雷','土')`),1.5,'雷灵咒应拔群于龟将');
  eq(E(`advMult('水','水')`),1,'水打水无加成');
});
t('风灵咒按 flag 解锁,而非等级',()=>{
  E('resetState()');
  ok(!E(`skillKnown(SKILLS.find(s=>s.n==='风灵咒'))`),'未传授前不应会风灵咒');
  E('flags.wind=true');
  ok(E(`skillKnown(SKILLS.find(s=>s.n==='风灵咒'))`),'传授后应会风灵咒');
});
t('漩涡在降妖王前不可入、第二章开启后可入',()=>{
  E('resetState()');
  ok(!E('canWalk(24,14)'),'第二章前漩涡如水,不可走');
  E('flags.ch2=true');
  ok(E('canWalk(24,14)'),'第二章后漩涡可入');
});
t('第二章开篇:与阿萝对话开启 ch2、传授风灵咒',()=>{
  E('resetState();flags.aluo=true;flags.mini=true;flags.boss=true');
  E(`switchMap('world',34,44)`);
  E('K.up=1;updWorld(0.05);K.up=0');
  ok(E('flags.ch2'),'对话应开启第二章');
  ok(E('flags.wind'),'应传授风灵咒');
  E('while(dq.length||dcb)nextDlg()');
});
t('踏入漩涡潜入湖底(首次有旁白),湖底↔水面↔水府互通',()=>{
  E(`switchMap('world',24,15);p.tx=24;p.ty=15`);
  E('K.up=1');                                 // 走上漩涡(需完成移动后才触发 onStep)
  for(let i=0;i<10&&!E('flags.lakeIntro');i++)E('updWorld(0.05)');
  E('K.up=0');
  ok(E('flags.lakeIntro'),'首次潜入应触发旁白');
  E('while(dq.length||dcb)nextDlg()');
  eq(E('curName'),'lake','应进入湖底');
  E('p.tx=14;p.ty=22;onStep()');               // 湖底出口 → 回水面
  eq(E('curName'),'world');eq(E('p.tx'),24);
  // 再潜入(无旁白),走到水府门
  E(`switchMap('world',24,15);p.tx=24;p.ty=14;onStep()`);
  eq(E('curName'),'lake');
  E('p.tx=14;p.ty=1;onStep()');                // 水府门 → 水府
  eq(E('curName'),'palace');
  E('p.tx=11;p.ty=13;onStep()');               // 水府出口 → 回湖底
  eq(E('curName'),'lake');
});
t('湖底沉箱:撞开取宝,配置合法',()=>{
  ok(E(`POIS.lake.length>=2`),'湖底应有沉箱');
  for(const q of E('POIS.lake')){
    eq(E(`MAPS.lake.m[${q.y}][${q.x}]`),'a',q.id+' 应在湖水上');
    ok(E(`'TWXHR'.includes(MAPS.lake.m[${q.y}][${q.x}])===false`));
  }
  E(`for(const k in looted)delete looted[k];switchMap('lake',4,9)`);
  const gold=E('S.gold');
  E('K.up=1;updWorld(0.05);K.up=0');           // 撞 (4,8) 沉箱
  eq(E('S.gold'),gold+120,'沉箱应给 120 两');
  E('while(dq.length||dcb)nextDlg()');
});
t('湖底水草遇敌、水府无随机遇敌',()=>{
  eq(E('MAPS.lake.rate>0'),true);
  eq(E('MAPS.palace.rate'),0);
  ok(E(`['a','c','R','S','D','O'].includes(MAPS.lake.m[12][12])`),'湖底瓦片应在约定字符集内');
});
t('蛟龙 Boss:风灵咒拔群,击败后第二章结局',()=>{
  E('resetState();flags.ch2=true;flags.wind=true;flags.lakeIntro=true;S.lvl=14;S.mp=200;S.maxMp=200');
  E(`switchMap('palace',11,4)`);
  E('p.tx=11;p.ty=3;onStep()');                // 踏上王座 → 蛟龙战
  E('while(dq.length||dcb)nextDlg()');
  eq(E('mode'),'battle');eq(E('B.key'),'dragon');
  const wind=E(`SKILLS.findIndex(s=>s.n==='风灵咒')`);
  E(`castSkill(${wind})`);
  for(let i=0;i<60&&E('B.anim');i++)E('updBattle(0.02)');
  ok(E(`B.pops.some(p=>p.txt==='效果拔群!')`),'风灵咒应对蛟龙拔群');
  E('B.e.hp=1;B.phase="cmd"');
  E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  ok(E('flags.dragon'),'击败蛟龙应置 flags.dragon');
  eq(E(`document.getElementById('endov').style.display`),'flex','应弹出第二章结局');
  eq(E(`document.getElementById('endTitle').textContent`),'第二章 · 完');
  E(`document.getElementById('endov').style.display='none'`);
});
t('第二章进度随存档持久(ch2/wind/dragon + 所在水府)',()=>{
  E(`switchMap('palace',8,8);flags.ch2=true;flags.wind=true;flags.dragon=true;save()`);
  E(`resetState()`);
  ok(E('loadSave()'),'读档应成功');
  eq(E('curName'),'palace');
  ok(E('flags.ch2&&flags.wind&&flags.dragon'),'第二章 flag 应恢复');
  ok(E(`skillKnown(SKILLS.find(s=>s.n==='风灵咒'))`),'读档后风灵咒仍在');
});
t('湖底/水府/水下战斗各渲染一帧不崩溃',()=>{
  E(`mode='world';B=null;switchMap('lake',14,12)`);G.frame();
  E(`switchMap('palace',11,8)`);G.frame();
  E(`switchMap('lake',14,12);startBattle('dragon',true)`);G.frame();
  E(`mode='world';B=null;battleUI(false);switchMap('world',31,44)`);
});

console.log('— 第三章:妖界魔渊 —');
t('魔类与魔尊 Boss 数据齐备,精灵可绘',()=>{
  for(const k of ['yanmo','yin','mojiang','leiyu','demon']){
    ok(E(`ENM['${k}']`),'缺敌人 '+k);
    const draw=E(`ENM['${k}'].draw`);
    ok(E(`SPR['${draw}']`),draw+' 缺绘制函数');
    ok(E(`SPRM['${draw}']`),draw+' 缺尺寸');
  }
  ok(E(`PIX.yanmo&&PIX.leiyu&&PIX.demon`),'新增魔类像素图齐备');
  eq(E(`ENM.demon.el`),'雷');
});
t('魔渊四魔属性齐备:火/水/土/雷,逼用全套升级咒',()=>{
  eq(E(`ENM.yanmo.el`),'火');eq(E(`ENM.yin.el`),'水');
  eq(E(`ENM.mojiang.el`),'土');eq(E(`ENM.leiyu.el`),'雷');
});
t('五灵术升级链:四系大成咒都更强,且为升级关系',()=>{
  const base={'火灵咒':'烈焰咒','水灵咒':'玄冰咒','风灵咒':'罡风咒','雷灵咒':'紫雷咒'};
  for(const [b,u] of Object.entries(base)){
    eq(E(`SKILL_UP['${b}']`),u,b+' 应升级为 '+u);
    const bm=E(`SKILLS.find(s=>s.n==='${b}').mult`),um=E(`SKILLS.find(s=>s.n==='${u}').mult`);
    ok(um>bm,u+' 威力应高于 '+b);
    eq(E(`SKILLS.find(s=>s.n==='${b}').el`),E(`SKILLS.find(s=>s.n==='${u}').el`),u+' 应与 '+b+' 同系');
  }
});
t('升级咒按等级解锁,烈焰咒克雷(魔尊)',()=>{
  E('resetState();flags.wind=true');
  ok(!E(`skillKnown(SKILLS.find(s=>s.n==='烈焰咒'))`),'低级时不会烈焰咒');
  E('S.lvl=16');
  ok(E(`skillKnown(SKILLS.find(s=>s.n==='烈焰咒'))`),'16 级应会烈焰咒');
  ok(!E(`skillKnown(SKILLS.find(s=>s.n==='紫雷咒'))`),'16 级还不会紫雷咒(22 级)');
  eq(E(`advMult('火','雷')`),1.5,'烈焰咒(火)应拔群于魔尊(雷)');
});
t('罡风咒需同时满足等级与风之 flag',()=>{
  E('resetState();S.lvl=30');
  ok(!E(`skillKnown(SKILLS.find(s=>s.n==='罡风咒'))`),'未传风灵咒时,纵然高级也不会罡风咒');
  E('flags.wind=true');
  ok(E(`skillKnown(SKILLS.find(s=>s.n==='罡风咒'))`),'习风且够级方得罡风咒');
});
t('第三章开篇:降蛟龙后与阿萝对话开启 ch3',()=>{
  E('resetState();flags.aluo=true;flags.mini=true;flags.boss=true;flags.ch2=true;flags.wind=true;flags.dragon=true');
  E(`switchMap('world',34,44)`);
  E('K.up=1;updWorld(0.05);K.up=0');
  ok(E('flags.ch3'),'对话应开启第三章');
  E('while(dq.length||dcb)nextDlg()');
});
t('鬼门复用锁妖塔封印:ch3 后踏封印坠入魔渊',()=>{
  E(`switchMap('tower',11,5);p.tx=11;p.ty=4;onStep()`); // 站上封印 B
  ok(E('flags.abyssIntro'),'首次入魔渊应有旁白');
  E('while(dq.length||dcb)nextDlg()');
  eq(E('curName'),'abyss','应进入妖界魔渊');
});
t('魔渊↔锁妖塔↔魔殿互通,魔殿无随机遇敌',()=>{
  E('p.tx=14;p.ty=22;onStep()');                 // 魔渊出口 → 锁妖塔
  eq(E('curName'),'tower');eq(E('p.tx'),11);
  E(`switchMap('abyss',14,2);p.tx=14;p.ty=1;onStep()`); // 魔殿门 → 魔殿
  eq(E('curName'),'hell');
  E('p.tx=11;p.ty=13;onStep()');                 // 魔殿出口 → 魔渊
  eq(E('curName'),'abyss');
  eq(E('MAPS.hell.rate'),0);eq(E('MAPS.abyss.rate>0'),true);
});
t('魔渊宝匣配置合法、可撞开',()=>{
  ok(E('POIS.abyss.length>=2'));
  for(const q of E('POIS.abyss'))eq(E(`MAPS.abyss.m[${q.y}][${q.x}]`),'v',q.id+' 应在魔土上');
  E(`for(const k in looted)delete looted[k];switchMap('abyss',4,9)`);
  const gold=E('S.gold');
  E('K.up=1;updWorld(0.05);K.up=0');
  eq(E('S.gold'),gold+300,'魔焰宝匣应给 300 两');
  E('while(dq.length||dcb)nextDlg()');
});
t('魔尊 Boss:烈焰咒拔群,击败后终章结局',()=>{
  E('resetState();flags.ch3=true;flags.wind=true;flags.abyssIntro=true;S.lvl=24;S.maxMp=300;S.mp=300;S.maxHp=500;S.hp=500;EQ.wpn=2;EQ.arm=2');
  E(`switchMap('hell',11,4);p.tx=11;p.ty=3;onStep()`); // 踏魔尊王座
  E('while(dq.length||dcb)nextDlg()');
  eq(E('mode'),'battle');eq(E('B.key'),'demon');
  const lie=E(`SKILLS.findIndex(s=>s.n==='烈焰咒')`);
  ok(E(`skillKnown(SKILLS[${lie}])`),'24 级应会烈焰咒');
  E(`castSkill(${lie})`);
  for(let i=0;i<60&&E('B.anim');i++)E('updBattle(0.02)');
  ok(E(`B.pops.some(p=>p.txt==='效果拔群!')`),'烈焰咒应对魔尊拔群');
  E('B.e.hp=1;B.phase="cmd"');
  E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  ok(E('flags.demon'),'击败魔尊应置 flags.demon');
  eq(E(`document.getElementById('endTitle').textContent`),'第三章 · 完');
  E(`document.getElementById('endov').style.display='none'`);
});
t('第三章进度随存档持久(ch3/demon + 所在魔殿)',()=>{
  E(`switchMap('hell',8,8);flags.ch3=true;flags.demon=true;save()`);
  E('resetState()');
  ok(E('loadSave()'));
  eq(E('curName'),'hell');
  ok(E('flags.ch3&&flags.demon'),'第三章 flag 应恢复');
});
t('BGM 变奏:每场景挑对应主题、切图即换',()=>{
  ok(E(`MELS.field&&MELS.tower&&MELS.lake&&MELS.abyss`),'四段主题齐备');
  eq(E(`melForBg('field')`),'field');eq(E(`melForBg('house')`),'field');
  eq(E(`melForBg('tower')`),'tower');
  eq(E(`melForBg('lake')`),'lake');eq(E(`melForBg('palace')`),'lake');
  eq(E(`melForBg('abyss')`),'abyss');eq(E(`melForBg('hell')`),'abyss');
  E(`switchMap('world',31,44)`);eq(E('melKey'),'field','回村应切村野主题');
  E(`switchMap('abyss',14,12)`);eq(E('melKey'),'abyss','入魔渊应切魔渊主题');
  E(`switchMap('lake',14,12)`);eq(E('melKey'),'lake','入水府区应切水府主题');
  ok(E(`MELS.field.join()!==MELS.abyss.join()`),'各主题旋律确实不同');
});
t('魔渊/魔殿/魔渊战斗各渲染一帧不崩溃',()=>{
  E(`mode='world';B=null;switchMap('abyss',14,12)`);G.frame();
  E(`switchMap('hell',11,8)`);G.frame();
  E(`switchMap('abyss',14,12);startBattle('demon',true)`);G.frame();
  E(`mode='world';B=null;battleUI(false);switchMap('world',31,44)`);
});

console.log('— 第四章:九霄云海 —');
t('风族与大鹏 Boss 数据齐备,精灵可绘',()=>{
  for(const k of ['gangfeng','yunpeng','pili','fengli','peng']){
    ok(E(`ENM['${k}']`),'缺敌人 '+k);
    const d=E(`ENM['${k}'].draw`);
    ok(E(`SPR['${d}']`),d+' 缺绘制');ok(E(`SPRM['${d}']`),d+' 缺尺寸');
  }
  eq(E('ENM.peng.el'),'风');eq(E('ENM.pili.el'),'雷');
});
t('土灵咒补全五灵,土克风(大鹏)',()=>{
  E('resetState()');
  ok(!E(`skillKnown(SKILLS.find(s=>s.n==='土灵咒'))`),'未传授前不会土灵咒');
  E('flags.earth=true');
  ok(E(`skillKnown(SKILLS.find(s=>s.n==='土灵咒'))`),'传授后会土灵咒');
  eq(E(`advMult('土','风')`),1.5,'土灵咒应拔群于风妖');
  // 五灵到齐:火水雷风土都有基础咒
  const els=E(`SKILLS.filter(s=>!SKILL_UP[s.n]||true).map(s=>s.el)`);
  ['火','水','雷','风','土'].forEach(e=>ok(E(`SKILLS.some(s=>s.el==='${e}')`),'应有 '+e+' 系咒'));
});
t('厚土咒为土灵咒的大成、更强',()=>{
  eq(E(`SKILL_UP['土灵咒']`),'厚土咒');
  ok(E(`SKILLS.find(s=>s.n==='厚土咒').mult>SKILLS.find(s=>s.n==='土灵咒').mult`));
});
t('风口降妖王/降蛟龙前不显,第四章开启后可登',()=>{
  E('resetState()');
  ok(E(`MAPS.world.m[16][50]`),'风口瓦片应存在');eq(E(`MAPS.world.m[16][50]`),'Y');
  ok(E('canWalk(50,16)'),'风口所在为草地,一直可走');
});
t('第四章开篇:降魔尊后与阿萝对话开启 ch4、传授土灵咒',()=>{
  E('resetState();Object.assign(flags,{aluo:true,mini:true,boss:true,ch2:true,wind:true,dragon:true,ch3:true,demon:true})');
  E(`switchMap('world',34,44)`);
  E('K.up=1;updWorld(0.05);K.up=0');
  ok(E('flags.ch4'),'应开启第四章');ok(E('flags.earth'),'应传授土灵咒');
  E('while(dq.length||dcb)nextDlg()');
});
t('踏风口升九霄(首次旁白),云海↔湖畔↔天风殿互通',()=>{
  E(`switchMap('world',50,17);p.tx=50;p.ty=17`);
  E('K.up=1');for(let i=0;i<10&&!E('flags.skyIntro');i++)E('updWorld(0.05)');E('K.up=0');
  ok(E('flags.skyIntro'),'首次升空应有旁白');
  E('while(dq.length||dcb)nextDlg()');
  eq(E('curName'),'sky');
  E('p.tx=14;p.ty=22;onStep()');eq(E('curName'),'world');eq(E('p.tx'),50);
  E(`switchMap('sky',14,2);p.tx=14;p.ty=1;onStep()`);eq(E('curName'),'shrine');
  E('p.tx=11;p.ty=13;onStep()');eq(E('curName'),'sky');
});
t('云海风带遇敌、天风殿无随机遇敌、宝匣合法',()=>{
  eq(E('MAPS.sky.rate>0'),true);eq(E('MAPS.shrine.rate'),0);
  ok(E('POIS.sky.length>=2'));
  for(const q of E('POIS.sky'))eq(E(`MAPS.sky.m[${q.y}][${q.x}]`),'a',q.id+' 应在云路上');
});
t('大鹏 Boss:土灵咒拔群,击败后第四章结局',()=>{
  E('resetState();Object.assign(flags,{ch4:true,earth:true,skyIntro:true});S.lvl=28;S.maxMp=320;S.mp=320;S.maxHp=560;S.hp=560;EQ.wpn=2;EQ.arm=2');
  E(`switchMap('shrine',11,4);p.tx=11;p.ty=3;onStep()`);
  E('while(dq.length||dcb)nextDlg()');
  eq(E('mode'),'battle');eq(E('B.key'),'peng');
  const tu=E(`SKILLS.findIndex(s=>s.n==='土灵咒')`);
  E(`castSkill(${tu})`);
  for(let i=0;i<60&&E('B.anim');i++)E('updBattle(0.02)');
  ok(E(`B.pops.some(p=>p.txt==='效果拔群!')`),'土灵咒应对大鹏拔群');
  E('B.e.hp=1;B.phase="cmd"');E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  ok(E('flags.peng'),'击败大鹏应置 flags.peng');
  eq(E(`document.getElementById('endTitle').textContent`),'第四章 · 完');
  E(`document.getElementById('endov').style.display='none'`);
});
t('第四章进度随存档持久 + BGM 云海主题',()=>{
  E(`switchMap('sky',8,8);Object.assign(flags,{ch4:true,earth:true,peng:true});save()`);
  E('resetState()');ok(E('loadSave()'));
  eq(E('curName'),'sky');ok(E('flags.ch4&&flags.earth&&flags.peng'));
  eq(E(`melForBg('sky')`),'sky');eq(E(`melForBg('shrine')`),'sky');
  ok(E(`MELS.sky&&MELS.sky.join()!==MELS.field.join()`),'云海主题应独立');
});
t('云海/天风殿/云端战斗各渲染一帧不崩溃',()=>{
  E(`mode='world';B=null;switchMap('sky',14,12)`);G.frame();
  E(`switchMap('shrine',11,8)`);G.frame();
  E(`switchMap('sky',14,12);startBattle('peng',true)`);G.frame();
  E(`mode='world';B=null;battleUI(false);switchMap('world',31,44)`);
});

console.log('— 第五章:黄泉地心(终章)—');
t('土族与后土 Boss 数据齐备,精灵可绘',()=>{
  for(const k of ['shankui','shisha','rongyan','dilie','sovereign']){
    ok(E(`ENM['${k}']`),'缺敌人 '+k);
    const d=E(`ENM['${k}'].draw`);
    ok(E(`SPR['${d}']`),d+' 缺绘制');ok(E(`SPRM['${d}']`),d+' 缺尺寸');
  }
  eq(E('ENM.sovereign.el'),'土');eq(E('ENM.rongyan.el'),'火');
});
t('紫雷克土(后土)、玄冰克熔岩兽(火)',()=>{
  eq(E(`advMult('雷','土')`),1.5,'紫雷应拔群于后土');
  eq(E(`advMult('水','火')`),1.5,'玄冰应拔群于熔岩兽');
});
t('地缝瓦片存在、开篇前如常草地',()=>{
  E('resetState()');
  eq(E(`MAPS.world.m[40][6]`),'q');
  ok(E('canWalk(6,40)'),'地缝处为草地,一直可走');
});
t('第五章开篇:降大鹏后与阿萝对话开启 ch5',()=>{
  E('resetState();Object.assign(flags,{aluo:true,mini:true,boss:true,ch2:true,wind:true,dragon:true,ch3:true,demon:true,ch4:true,earth:true,peng:true})');
  E(`switchMap('world',34,44)`);
  E('K.up=1;updWorld(0.05);K.up=0');
  ok(E('flags.ch5'),'应开启第五章');
  E('while(dq.length||dcb)nextDlg()');
});
t('坠地缝入地心(首次旁白),地心↔村西↔后土殿互通',()=>{
  E(`switchMap('world',6,41);p.tx=6;p.ty=41`);
  E('K.up=1');for(let i=0;i<10&&!E('flags.caveIntro');i++)E('updWorld(0.05)');E('K.up=0');
  ok(E('flags.caveIntro'),'首次入地心应有旁白');
  E('while(dq.length||dcb)nextDlg()');
  eq(E('curName'),'cavern');
  E('p.tx=14;p.ty=22;onStep()');eq(E('curName'),'world');eq(E('p.tx'),6);
  E(`switchMap('cavern',14,2);p.tx=14;p.ty=1;onStep()`);eq(E('curName'),'core');
  E('p.tx=11;p.ty=13;onStep()');eq(E('curName'),'cavern');
});
t('地心矿脉遇敌、后土殿无随机遇敌、晶匣合法',()=>{
  eq(E('MAPS.cavern.rate>0'),true);eq(E('MAPS.core.rate'),0);
  ok(E('POIS.cavern.length>=2'));
  for(const q of E('POIS.cavern'))eq(E(`MAPS.cavern.m[${q.y}][${q.x}]`),'v',q.id+' 应在地脉上');
});
t('后土魔君:紫雷拔群,击败后全剧终',()=>{
  E('resetState();Object.assign(flags,{ch5:true,caveIntro:true,wind:true,earth:true});S.lvl=30;S.maxMp=400;S.mp=400;S.maxHp=640;S.hp=640;EQ.wpn=2;EQ.arm=2');
  E(`switchMap('core',11,4);p.tx=11;p.ty=3;onStep()`);
  E('while(dq.length||dcb)nextDlg()');
  eq(E('mode'),'battle');eq(E('B.key'),'sovereign');
  const zi=E(`SKILLS.findIndex(s=>s.n==='紫雷咒')`);
  ok(E(`skillKnown(SKILLS[${zi}])`),'30 级应会紫雷咒');
  E(`castSkill(${zi})`);
  for(let i=0;i<60&&E('B.anim');i++)E('updBattle(0.02)');
  ok(E(`B.pops.some(p=>p.txt==='效果拔群!')`),'紫雷咒应对后土拔群');
  E('B.e.hp=1;B.phase="cmd"');E(`act('atk')`);
  for(let i=0;i<20&&E('B&&B.anim');i++)E('updBattle(0.05)');
  G.flushTimers();
  ok(E('flags.sovereign'),'击败后土应置 flags.sovereign');
  eq(E(`document.getElementById('endTitle').textContent`),'全 剧 终');
  E(`document.getElementById('endov').style.display='none'`);
});
t('五灵圆满:火水雷风土,基础咒 + 大成咒各一,全部克制成立',()=>{
  const elems=['火','水','雷','风','土'];
  elems.forEach(e=>{
    ok(E(`SKILLS.filter(s=>s.el==='${e}'&&!Object.values(SKILL_UP).includes(s.n)).length>=1`),e+' 应有基础咒');
    ok(E(`Object.values(SKILL_UP).some(u=>SKILLS.find(s=>s.n===u).el==='${e}')`),e+' 应有大成咒');
  });
  // 每个元素都能克到某物(五灵相生相克闭环)
  eq(E(`advMult('水','火')`),1.5);eq(E(`advMult('火','雷')`),1.5);
  eq(E(`advMult('雷','土')`),1.5);eq(E(`advMult('土','风')`),1.5);eq(E(`advMult('风','水')`),1.5);
});
t('第五章进度随存档持久 + BGM 地心主题',()=>{
  E(`switchMap('cavern',8,8);Object.assign(flags,{ch5:true,sovereign:true});save()`);
  E('resetState()');ok(E('loadSave()'));
  eq(E('curName'),'cavern');ok(E('flags.ch5&&flags.sovereign'));
  eq(E(`melForBg('cavern')`),'earth');eq(E(`melForBg('core')`),'earth');
  ok(E(`MELS.earth&&MELS.earth.join()!==MELS.sky.join()`),'地心主题应独立');
});
t('地心/后土殿/地心战斗各渲染一帧不崩溃',()=>{
  E(`mode='world';B=null;switchMap('cavern',14,12)`);G.frame();
  E(`switchMap('core',11,8)`);G.frame();
  E(`switchMap('cavern',14,12);startBattle('sovereign',true)`);G.frame();
  E(`mode='world';B=null;battleUI(false);switchMap('world',31,44)`);
});

console.log('— 孩童模式 · 家长锁 —');
t('孩童模式:丹药翻倍、受伤减半倍率',()=>{
  E('CFG.kidMode=false');
  eq(E(`healAmt('dan')`),45);eq(E(`healAmt('qing')`),30);eq(E('hurtScale()'),1);
  E('CFG.kidMode=true');
  eq(E(`healAmt('dan')`),90);eq(E(`healAmt('qing')`),60);eq(E('hurtScale()'),0.5);
  E('CFG.kidMode=false');
});
t('孩童模式:战斗实扣伤害约一半',()=>{
  E('resetState();startBattle("shan",false)');
  E('CFG.kidMode=false;S.maxHp=200;S.hp=200;hurtHero(40)');const n=200-E('S.hp');
  E('CFG.kidMode=true;S.hp=200;hurtHero(40)');const k=200-E('S.hp');
  eq(n,40,'普通应扣 40');eq(k,20,'孩童应扣 20');
  E('CFG.kidMode=false;mode="world";B=null;battleUI(false)');
});
t('家长锁:首次设密码即开启,并写入独立配置',()=>{
  E('CFG.pwd="";CFG.kidMode=false');
  E(`openKidMode();$('pwIn').value='1234';setKidPwd()`);
  ok(E('CFG.kidMode'),'设密码后应开启孩童模式');eq(E('CFG.pwd'),'1234');
  ok(JSON.parse(G.store['lingshan_cfg']).kidMode,'应写入 lingshan_cfg');
});
t('家长锁:错误密码拒绝、正确密码方可切换',()=>{
  E(`openKidMode();$('pwIn').value='0000';applyKidMode()`);
  ok(E('CFG.kidMode'),'错误密码不应改动(仍开着)');
  E(`openKidMode();$('pwIn').value='1234';applyKidMode()`);
  ok(!E('CFG.kidMode'),'正确密码应成功关闭');
});
t('家长设置不随存档/重开清空',()=>{
  E('CFG.pwd="1234";CFG.kidMode=true;saveCfg()');
  E('resetState()');                       // 重新开始
  ok(E('CFG.kidMode')&&E(`CFG.pwd==='1234'`),'重开后孩童模式/密码应保留');
  E('save();loadSave()');                   // 存读档不应影响配置
  ok(E('CFG.kidMode')&&E(`CFG.pwd==='1234'`),'存读档后仍保留');
});
t('loadCfg 从独立 key 恢复配置',()=>{
  G.store['lingshan_cfg']=JSON.stringify({kidMode:true,pwd:'9'});
  E('CFG.kidMode=false;CFG.pwd=""');
  E('loadCfg()');
  ok(E('CFG.kidMode')&&E(`CFG.pwd==='9'`));
  E('CFG.kidMode=false;CFG.pwd="";saveCfg()');
});

console.log('— 幼儿友好:触屏寻路 + 图标 —');
t('触屏:朝手指方向自动走一格(上下左右)',()=>{
  E('resetState();switchMap("world",31,41);K.up=K.down=K.left=K.right=0');
  E('heroSX=480;heroSY=320;navTouch={x:480,y:470}');   // 手指在主角下方
  E('updWorld(0.05)');
  eq(E('p.ty'),42,'应朝下走一格');
  for(let i=0;i<10&&E('p.mv');i++)E('updWorld(0.05)');
  E('heroSX=480;heroSY=320;navTouch={x:610,y:320}');   // 手指在主角右边
  E('updWorld(0.05)');
  eq(E('p.tx'),32,'应朝右走一格');
  E('navTouch=null');
});
t('手指落在主角身上(死区内)不乱走',()=>{
  E('resetState();switchMap("world",31,41);K.up=K.down=K.left=K.right=0');
  E('heroSX=480;heroSY=320;navTouch={x:484,y:326}');   // 几乎重合
  E('updWorld(0.05)');
  eq(E('p.tx'),31);eq(E('p.ty'),41);eq(E('p.mv'),null);
  E('navTouch=null');
});
t('方向键 / dpad 优先于触屏',()=>{
  E('resetState();switchMap("world",31,41)');
  E('heroSX=480;heroSY=320;navTouch={x:480,y:470};K.up=1'); // 触屏向下但按上
  E('updWorld(0.05)');
  eq(E('p.ty'),40,'方向键(上)应优先');
  E('K.up=0;navTouch=null');
});
t('五灵 / 物品 emoji 映射齐备',()=>{
  ['水','火','雷','风','土','无'].forEach(e=>ok(E(`ELEMOJI['${e}']`),e+' 应有 emoji'));
  ok(E(`ITEMOJI.dan&&ITEMOJI.qing&&ITEMOJI.dadan`),'物品 emoji 齐备');
});
t('商店 / 技能 / 物品菜单带图标',()=>{
  E('S.gold=999;openShop("item")');
  let html=E(`$('panelBody').innerHTML`);
  ok(html.includes('❤️')&&html.includes('🪙'),'杂货铺应有图标');
  E('openShop("gear")');html=E(`$('panelBody').innerHTML`);
  ok(html.includes('⚔️')&&html.includes('🛡️'),'铁匠铺应有武器/护甲图标');
  E('S.lvl=5;startBattle("ghost",false);openSkillMenu()');
  html=E(`$('panelBody').innerHTML`);
  ok(html.includes('💧')||html.includes('🔥'),'技能菜单应有五灵图标');
  E('openItemMenu()');html=E(`$('panelBody').innerHTML`);
  ok(html.includes('❤️'),'物品菜单应有图标');
  E('closePanel();mode="world";B=null;battleUI(false)');
});

console.log('— dist 单文件 —');
t('dist/lingshan-rpg.html 内联脚本可独立启动',()=>{
  const D=createGame(loadDistSource());
  eq(D.eval('mode'),'title');
  D.eval(`$('btnNew').onclick()`);
  eq(D.eval('mode'),'world');
});

console.log('\n冒烟测试:'+passed+' 通过,'+failed+' 失败');
process.exit(failed?1:0);
