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
  fillR(m,0,0,w,1,'T');fillR(m,0,h-1,w,1,'T');fillR(m,0,0,1,h,'T');fillR(m,w-1,0,1,h,'T');
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
  tower:{m:makeTower(),w:24,h:30,bg:'tower',rate:0.16,pool:()=>['ghost','golem']}
};

const NPCS={
  world:[
    {x:34,y:43,draw:'girl',n:'阿萝',talk:()=>talkAluo()},
    {x:21,y:41,draw:'vill',c:'#7a5230',n:'杂货商',talk:()=>openShop('item')},
    {x:43,y:41,draw:'vill',c:'#3f6f8f',n:'老板娘',talk:()=>inn()},
    {x:53,y:41,draw:'vill',c:'#555560',n:'铁匠',talk:()=>openShop('gear')}
  ],
  tower:[]
};
