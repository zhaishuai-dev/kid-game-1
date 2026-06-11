'use strict';
// ===== 地图层:瓦片地图生成 + MAPS 注册表 + NPC 配置 =====
// 瓦片字符:G 草 t 深草 T 树 W 水 P 路 b 桥 R 屋顶 H 墙 X 石墙 F 石地
//          e 符纹遇敌地 D 门(锁妖塔) O 出口 S 灵泉 B 封印
function blank(w,h,f){const m=[];for(let y=0;y<h;y++)m.push(new Array(w).fill(f));return m;}
function fillR(m,x,y,w,h,c){for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++){if(m[j]&&m[j][i]!==undefined)m[j][i]=c;}}
function house(m,x,y){fillR(m,x,y,5,2,'R');fillR(m,x,y+2,5,2,'H');}
function makeWorld(){
  const w=64,h=48,m=blank(w,h,'G');
  for(let k=0;k<150;k++){
    const x=2+Math.floor(srnd()*(w-4)),y=2+Math.floor(srnd()*(h-4));
    if(y>=33)continue;if(y>=11&&y<=17)continue;if(x>=28&&x<=35)continue;
    m[y][x]='T';
  }
  fillR(m,1,13,w-2,2,'W');
  fillR(m,8,5,8,5,'t');fillR(m,46,4,9,5,'t');fillR(m,12,26,8,5,'t');
  fillR(m,44,24,9,6,'t');fillR(m,38,18,7,4,'t');fillR(m,16,18,6,4,'t');
  fillR(m,5,20,8,5,'W');m[22][15]='S';
  fillR(m,31,3,2,42,'P');
  fillR(m,31,13,2,2,'b');
  fillR(m,28,0,8,3,'X');fillR(m,31,2,2,1,'D');
  fillR(m,4,35,56,12,'G');
  fillR(m,31,35,2,10,'P');fillR(m,10,42,44,2,'P');
  house(m,9,37);house(m,19,37);house(m,41,37);house(m,51,37);
  m[40][11]='d';m[40][21]='d';m[40][43]='d';m[40][53]='d';
  fillR(m,0,0,w,1,'T');fillR(m,0,h-1,w,1,'T');fillR(m,0,0,1,h,'T');fillR(m,w-1,0,1,h,'T');
  return m;
}
// Phase 1:室内小图(12×10),f 木地板、H 墙、O 出口,家具走 POI 层
function makeHouse(){
  const w=12,h=10,m=blank(w,h,'f');
  fillR(m,0,0,w,2,'H');fillR(m,0,h-1,w,1,'H');
  fillR(m,0,0,1,h,'H');fillR(m,w-1,0,1,h,'H');
  m[h-1][6]='O';
  return m;
}
function makeTower(){
  const w=24,h=30,m=blank(w,h,'X');
  fillR(m,3,3,18,24,'F');
  [[6,8],[17,8],[6,14],[17,14],[6,20],[17,20],[10,11],[13,17]].forEach(c=>{m[c[1]][c[0]]='X';});
  fillR(m,4,10,7,5,'e');fillR(m,13,12,7,5,'e');fillR(m,4,19,7,5,'e');fillR(m,13,20,7,4,'e');
  fillR(m,11,4,2,1,'B');
  fillR(m,11,26,2,1,'O');
  return m;
}
const MAPS={
  world:{m:makeWorld(),w:64,h:48,bg:'field',rate:0.13,pool:()=>S.lvl>=3?['shan','fox','snake']:['shan','fox']},
  tower:{m:makeTower(),w:24,h:30,bg:'tower',rate:0.16,pool:()=>['ghost','golem']},
  house1:{m:makeHouse(),w:12,h:10,bg:'house',rate:0,pool:()=>[]},
  house2:{m:makeHouse(),w:12,h:10,bg:'house',rate:0,pool:()=>[]},
  house3:{m:makeHouse(),w:12,h:10,bg:'house',rate:0,pool:()=>[]},
  house4:{m:makeHouse(),w:12,h:10,bg:'house',rate:0,pool:()=>[]}
};
// 双向传送门:'地图:x,y' → 目的地(d 木门进屋,O 出口回村)
const DOORS={
  'world:11,40':{map:'house1',x:6,y:8},
  'world:21,40':{map:'house2',x:6,y:8},
  'world:43,40':{map:'house3',x:6,y:8},
  'world:53,40':{map:'house4',x:6,y:8},
  'house1:6,9':{map:'world',x:11,y:41},
  'house2:6,9':{map:'world',x:21,y:41},
  'house3:6,9':{map:'world',x:43,y:41},
  'house4:6,9':{map:'world',x:53,y:41}
};
// 可调查点:撞上家具即翻找。loot: gold 银两 / item 物品 / note 纸条 / none 空手
const POIS={
  house1:[ // 王大娘的家
    {id:'h1_cab',x:2,y:2,kind:'cab',loot:{t:'gold',n:20}},
    {id:'h1_stove',x:4,y:2,kind:'stove',loot:{t:'none'}},
    {id:'h1_vat',x:9,y:2,kind:'vat',loot:{t:'item',k:'dan',n:1}}
  ],
  house2:[ // 老村长的家
    {id:'h2_shelf',x:2,y:2,kind:'shelf',loot:{t:'note',text:'泛黄的书页间夹着一张字条:「锁妖塔镇千年妖王,塔心封印以五灵为锁。妖王属火,水灵咒可克之。」'}},
    {id:'h2_cab',x:9,y:2,kind:'cab',loot:{t:'gold',n:30}},
    {id:'h2_bed',x:1,y:4,kind:'bed',loot:{t:'gold',n:10}},
    {id:'h2_jar',x:10,y:6,kind:'jar',loot:{t:'item',k:'qing',n:1}}
  ],
  house3:[ // 阿萝的家
    {id:'h3_bed',x:2,y:2,kind:'bed',loot:{t:'note',text:'枕头底下压着一本小册子,娟秀的字迹:「今日师兄又在瀑布下练剑,偷偷看了半个时辰……哎呀,不写了不写了。」'}},
    {id:'h3_cab',x:4,y:2,kind:'cab',loot:{t:'none'}},
    {id:'h3_rice',x:9,y:2,kind:'rice',loot:{t:'item',k:'dan',n:1}},
    {id:'h3_vat',x:10,y:6,kind:'vat',loot:{t:'gold',n:15}}
  ],
  house4:[ // 猎户的家
    {id:'h4_shelf',x:2,y:2,kind:'shelf',loot:{t:'note',text:'猎户的字据背面,歪歪扭扭画着三个小人,写着:「爱莎、安娜、艾米莉,到此一游!」'}},
    {id:'h4_stove',x:4,y:2,kind:'stove',loot:{t:'item',k:'qing',n:1}},
    {id:'h4_cab',x:9,y:2,kind:'cab',loot:{t:'item',k:'dadan',n:1}},
    {id:'h4_jar',x:10,y:5,kind:'jar',loot:{t:'gold',n:40}}
  ]
};
// 翻第二件东西时主人的吐槽(致敬经典:进屋翻箱倒柜,主人毫无意见)
const SNARK={
  house1:{n:'王大娘',t:'哎哟,小侠客,你这是把我家当自家翻呢?……罢了罢了,看你顺眼,翻吧翻吧!'},
  house2:{n:'老村长',t:'年轻人,书架轻点翻!那是老朽攒了一辈子的书……唉,拿都拿了,就当村里资助你降妖了。'},
  house3:{n:'外婆',t:'阿萝那丫头的东西你也敢乱翻?……嗯?你就是她常念叨的师兄?那、那随便看!'},
  house4:{n:'猎户',t:'好家伙,进门就掏人家的坛坛罐罐,跟山里的狸子一个习性!'}
};

const NPCS={
  world:[
    {x:34,y:43,draw:'girl',n:'阿萝',talk:()=>talkAluo()},
    // 注意:不能站在房门(x,40)正下方,否则会堵住进屋的唯一通路
    {x:20,y:41,draw:'vill',c:'#7a5230',n:'杂货商',talk:()=>openShop('item')},
    {x:42,y:41,draw:'vill',c:'#3f6f8f',n:'老板娘',talk:()=>inn()},
    {x:52,y:41,draw:'vill',c:'#555560',n:'铁匠',talk:()=>openShop('gear')}
  ],
  tower:[],
  house1:[{x:8,y:3,draw:'vill',c:'#7a5230',n:'王大娘',talk:()=>showDialog([{n:'王大娘',t:'娃儿来啦?随便坐!屋里东西尽管翻,大娘藏不住啥宝贝。'}])}],
  house2:[{x:5,y:3,draw:'vill',c:'#555560',n:'老村长',talk:()=>showDialog([{n:'老村长',t:'锁妖塔建于前朝,塔心封印千万碰不得……咳,老朽的书你随便看,可别折了页角。'}])}],
  house3:[{x:6,y:4,draw:'vill',c:'#3f6f8f',n:'外婆',talk:()=>showDialog([{n:'外婆',t:'阿萝常念叨你哩。灶上温着汤,自己舀着喝,别客气。'}])}],
  house4:[{x:7,y:4,draw:'vill',c:'#4a6b2a',n:'猎户',talk:()=>showDialog([{n:'猎户',t:'北边林子最近不太平,妖气重。进塔之前,把皮甲穿厚实些!'}])}]
};
