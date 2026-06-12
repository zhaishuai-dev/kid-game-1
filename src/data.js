'use strict';
// ===== 数值与数据层:随机数、角色、背包、装备、技能、五灵、敌人 =====
const rnd=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
let seed=20260610;const srnd=()=>{seed=(seed*9301+49297)%233280;return seed/233280;};

// 剧情位:aluo/mini/boss=第一章;ch2/wind/lakeIntro/dragon=第二章;ch3/abyssIntro/demon=第三章
//        ch4/earth/skyIntro/peng=第四章;ch5/caveIntro/sovereign=第五章
const flags={aluo:false,mini:false,boss:false,ch2:false,wind:false,lakeIntro:false,dragon:false,ch3:false,abyssIntro:false,demon:false,ch4:false,earth:false,skyIntro:false,peng:false,ch5:false,caveIntro:false,sovereign:false};
const S={hp:70,maxHp:70,mp:36,maxMp:36,lvl:1,exp:0,gold:80};
const INV={dan:3,dadan:0,qing:1};
const EQ={wpn:0,arm:0};
const WPNS=[{n:'铁剑',a:0,p:0},{n:'青锋剑',a:8,p:120},{n:'赤霄剑',a:18,p:420}];
const ARMS=[{n:'布衣',d:0,p:0},{n:'软皮甲',d:4,p:110},{n:'玄铁甲',d:10,p:380}];
const ITEMN={dan:'回灵丹',dadan:'大还丹',qing:'清心散'};
// 孩童模式(家长锁):伤害减半、丹药翻倍。配置独立持久(见 loadCfg/saveCfg),不随存档或「重新开始」清空
const CFG={kidMode:false,pwd:''};
const HEAL={dan:45,qing:30};                       // 丹药基础回复量
function healAmt(k){return HEAL[k]*(CFG.kidMode?2:1);}   // 孩童模式翻倍
function hurtScale(){return CFG.kidMode?0.5:1;}          // 孩童模式受伤减半
const SKILLS=[
  {n:'御剑术',el:'无',mp:8,mult:1.8,lvl:1},
  {n:'火灵咒',el:'火',mp:14,mult:2.2,lvl:3},
  {n:'水灵咒',el:'水',mp:14,mult:2.2,lvl:5},
  {n:'雷灵咒',el:'雷',mp:22,mult:2.7,lvl:7},
  // 风灵咒:第二章由阿萝传授(flag 解锁),风克水
  {n:'风灵咒',el:'风',mp:18,mult:2.4,lvl:1,flag:'wind'},
  // 土灵咒:第四章由阿萝传授(flag 解锁),土克风——补全五灵
  {n:'土灵咒',el:'土',mp:22,mult:2.8,lvl:1,flag:'earth'},
  // 五灵术升级链:勤修到高阶,基础咒法臻至大成(高等级解锁,自动领悟)
  {n:'烈焰咒',el:'火',mp:26,mult:3.2,lvl:16},
  {n:'玄冰咒',el:'水',mp:26,mult:3.2,lvl:18},
  {n:'罡风咒',el:'风',mp:30,mult:3.6,lvl:20,flag:'wind'},
  {n:'紫雷咒',el:'雷',mp:38,mult:4.0,lvl:22},
  {n:'厚土咒',el:'土',mp:34,mult:3.8,lvl:26,flag:'earth'}
];
// 升级链:基础咒 → 大成咒(状态面板里用「↑」标注已进阶)
const SKILL_UP={'火灵咒':'烈焰咒','水灵咒':'玄冰咒','风灵咒':'罡风咒','雷灵咒':'紫雷咒','土灵咒':'厚土咒'};
// 是否已习得某仙术:够等级 且(无 flag 要求或该 flag 已解锁)
function skillKnown(s){return S.lvl>=(s.lvl||1)&&(!s.flag||flags[s.flag]);}
const ELC={'水':'#56b9ff','火':'#ff7a45','雷':'#ffe24a','风':'#9fe7a0','土':'#d2a86a','无':'#cdd6e0'};
// 给不识字的小朋友:五灵 / 物品 / 操作的 emoji 图标
const ELEMOJI={'水':'💧','火':'🔥','雷':'⚡','风':'🍃','土':'🪨','无':'🗡️'};
const ITEMOJI={dan:'❤️',dadan:'💖',qing:'💙'};
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
  stove:{n:'灶台',again:'灶台冷冰冰的,什么也没有。'},
  chest:{n:'沉箱',again:'沉箱已被你撬空了,只剩些缠手的水藻。'}
};

const ENM={
  shan:{n:'青面山魈',el:'土',hp:42,atk:7,exp:30,gold:24,draw:'shan',s:6},
  fox:{n:'风狸',el:'风',hp:50,atk:9,exp:44,gold:36,draw:'fox',s:6},
  snake:{n:'白鳞蛇妖',el:'水',hp:62,atk:10,exp:52,gold:42,draw:'snake',s:6},
  ghost:{n:'鬼火',el:'火',hp:48,atk:12,exp:58,gold:44,draw:'flame',s:6},
  golem:{n:'石傀',el:'土',hp:95,atk:11,exp:75,gold:64,draw:'golem',s:6},
  snakeKing:{n:'蛇妖王',el:'水',hp:190,atk:13,exp:230,gold:280,draw:'snakeK',s:7,caster:true},
  king:{n:'千年妖王',el:'火',hp:330,atk:17,exp:520,gold:600,draw:'king',s:6,gw:20,caster:true},
  // 第二章 · 水月湖底:水妖为主(风灵咒拔群),龟将属土(雷灵咒拔群)
  yaksha:{n:'巡水夜叉',el:'水',hp:96,atk:17,exp:78,gold:54,draw:'yaksha',s:6},
  clam:{n:'蚌壳精',el:'水',hp:120,atk:14,exp:86,gold:66,draw:'clam',s:6},
  squid:{n:'墨鱼妖',el:'水',hp:88,atk:20,exp:80,gold:58,draw:'squid',s:6},
  turtle:{n:'龟将军',el:'土',hp:160,atk:18,exp:120,gold:96,draw:'turtle',s:6},
  dragon:{n:'墨蛟龙王',el:'水',hp:560,atk:27,exp:880,gold:1100,draw:'dragon',s:6,gw:24,caster:true},
  // 第三章 · 妖界魔渊:各属性齐备,逼玩家用全套升级咒(火→玄冰、水→罡风、土→紫雷、雷→烈焰)
  yanmo:{n:'焰魔',el:'火',hp:150,atk:24,exp:140,gold:90,draw:'yanmo',s:6},
  yin:{n:'玄阴鬼',el:'水',hp:140,atk:26,exp:150,gold:96,draw:'yin',s:6},
  mojiang:{n:'魔将',el:'土',hp:230,atk:25,exp:200,gold:140,draw:'mojiang',s:6},
  leiyu:{n:'雷狱卒',el:'雷',hp:165,atk:28,exp:175,gold:112,draw:'leiyu',s:6},
  demon:{n:'混沌魔尊',el:'雷',hp:820,atk:36,exp:1500,gold:2000,draw:'demon',s:6,gw:24,caster:true},
  // 第四章 · 九霄云海:风妖为主(土灵咒克之),霹雳鸟属雷(玄冰咒不行,用烈焰咒)
  gangfeng:{n:'罡风鬼',el:'风',hp:210,atk:31,exp:230,gold:155,draw:'gangfeng',s:6},
  yunpeng:{n:'云鹏',el:'风',hp:240,atk:33,exp:255,gold:175,draw:'yunpeng',s:6},
  pili:{n:'霹雳鸟',el:'雷',hp:220,atk:37,exp:245,gold:165,draw:'pili',s:6},
  fengli:{n:'风狸王',el:'风',hp:265,atk:32,exp:275,gold:185,draw:'fengli',s:6},
  peng:{n:'大鹏妖王',el:'风',hp:1060,atk:42,exp:2300,gold:3000,draw:'peng',s:6,gw:24,caster:true},
  // 第五章 · 黄泉地心:土妖为主(紫雷咒克之),熔岩兽属火(玄冰咒克之)
  shankui:{n:'山魈圣',el:'土',hp:300,atk:36,exp:320,gold:210,draw:'shankui',s:6},
  shisha:{n:'石煞',el:'土',hp:360,atk:34,exp:360,gold:240,draw:'shisha',s:6},
  rongyan:{n:'熔岩兽',el:'火',hp:290,atk:40,exp:340,gold:225,draw:'rongyan',s:6},
  dilie:{n:'地裂魔',el:'土',hp:340,atk:38,exp:355,gold:235,draw:'dilie',s:6},
  sovereign:{n:'后土魔君',el:'土',hp:1380,atk:48,exp:3600,gold:5000,draw:'sovereign',s:6,gw:24,caster:true}
};
