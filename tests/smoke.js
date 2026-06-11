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
  ok(E(`dq.length&&String(dq[0]).includes('爱莎')`),'书架纸条应是三个孩子的彩蛋');
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

console.log('— dist 单文件 —');
t('dist/lingshan-rpg.html 内联脚本可独立启动',()=>{
  const D=createGame(loadDistSource());
  eq(D.eval('mode'),'title');
  D.eval(`$('btnNew').onclick()`);
  eq(D.eval('mode'),'world');
});

console.log('\n冒烟测试:'+passed+' 通过,'+failed+' 失败');
process.exit(failed?1:0);
