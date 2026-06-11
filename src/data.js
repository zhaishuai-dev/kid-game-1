'use strict';
// ===== 数值与数据层:随机数、角色、背包、装备、技能、五灵、敌人 =====
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
let seed=20260610;const srnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};

const flags={aluo:false,mini:false,boss:false};
const S={hp:70,maxHp:70,mp:36,maxMp:36,lvl:1,exp:0,gold:80};
const INV={dan:3,dadan:0,qing:1};
const EQ={wpn:0,arm:0};
const WPNS=[{n:'铁剑',a:0,p:0},{n:'青锋剑',a:8,p:120},{n:'赤霄剑',a:18,p:420}];
const ARMS=[{n:'布衣',d:0,p:0},{n:'软皮甲',d:4,p:110},{n:'玄铁甲',d:10,p:380}];
const ITEMN={dan:'回灵丹',dadan:'大还丹',qing:'清心散'};
const SKILLS=[
  {n:'御剑术',el:'无',mp:8,mult:1.8,lvl:1},
  {n:'火灵咒',el:'火',mp:14,mult:2.2,lvl:3},
  {n:'水灵咒',el:'水',mp:14,mult:2.2,lvl:5},
  {n:'雷灵咒',el:'雷',mp:22,mult:2.7,lvl:7}
];
const ELC={'水':'#56b9ff','火':'#ff7a45','雷':'#ffe24a','风':'#9fe7a0','土':'#d2a86a','无':'#cdd6e0'};
const CK={'水':'火','火':'雷','雷':'土','土':'风','风':'水'};
function atkP(){return 10+S.lvl*4+WPNS[EQ.wpn].a;}
function defP(){return ARMS[EQ.arm].d;}

// Phase 1:进屋找宝贝 —— 已翻过的调查点(跨存档持久,见 save/loadSave)
const looted={};
// 可调查点种类:名称 + 家具贴图 + 重复调查文案(每种不同,情怀所在)
const POI_KINDS={
  cab:{n:'柜子',again:'柜子已经被你翻得乱七八糟,再没有别的了。'},
  vat:{n:'水缸',again:'水缸里只剩下清亮亮的水,照得见你的脸。'},
  rice:{n:'米缸',again:'米缸里只有白米。再掏下去要被骂了。'},
  shelf:{n:'书架',again:'书架上的书都翻过一遍了,没夹着别的东西。'},
  bed:{n:'床底',again:'床底下连灰都被你摸干净了。'},
  jar:{n:'坛子',again:'坛子已经空空如也,嗡嗡作响。'},
  stove:{n:'灶台',again:'灶台冷冰冰的,什么也没有。'}
};

const ENM={
  shan:{n:'青面山魈',el:'土',hp:42,atk:7,exp:30,gold:24,draw:'shan',s:6},
  fox:{n:'风狸',el:'风',hp:50,atk:9,exp:44,gold:36,draw:'fox',s:6},
  snake:{n:'白鳞蛇妖',el:'水',hp:62,atk:10,exp:52,gold:42,draw:'snake',s:6},
  ghost:{n:'鬼火',el:'火',hp:48,atk:12,exp:58,gold:44,draw:'flame',s:6},
  golem:{n:'石傀',el:'土',hp:95,atk:11,exp:75,gold:64,draw:'golem',s:6},
  snakeKing:{n:'蛇妖王',el:'水',hp:190,atk:13,exp:230,gold:280,draw:'snakeK',s:7,caster:true},
  king:{n:'千年妖王',el:'火',hp:330,atk:17,exp:520,gold:600,draw:'king',s:6,gw:20,caster:true}
};
