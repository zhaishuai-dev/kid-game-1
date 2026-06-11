'use strict';
// ===== 引擎层:画布、音频、地图行走、对话、商店、存档、主循环 =====
const $=id=>document.getElementById(id);
const cv=$('cv'),g=cv.getContext('2d');
const T=32,SW=960,SH=640,VW=31,VH=21;
let mode='title',frame=0,grace=0;
let curName='world',cur=MAPS.world;
const p={tx:31,ty:44,x:31*T,y:44*T,mv:null};
const K={up:0,down:0,left:0,right:0};
const wpops=[];
function wpop(txt,c){wpops.push({x:p.x,y:p.y,txt,c,t:0});}

let AC=null;
function au(){
  if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}
  if(AC&&AC.state==='suspended'){try{AC.resume();}catch(e){}}
}
function tone(f,d,type,v,slide){
  if(!AC)return;
  try{
    const o=AC.createOscillator(),ga=AC.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(f,AC.currentTime);
    if(slide)o.frequency.exponentialRampToValueAtTime(slide,AC.currentTime+d);
    ga.gain.setValueAtTime(v||0.05,AC.currentTime);
    ga.gain.exponentialRampToValueAtTime(0.001,AC.currentTime+d);
    o.connect(ga);ga.connect(AC.destination);o.start();o.stop(AC.currentTime+d);
  }catch(e){}
}
const sSwing=()=>tone(620,0.1,'square',0.04,180);
const sHit=()=>tone(160,0.16,'sawtooth',0.07,55);
const sHurt=()=>tone(110,0.22,'sawtooth',0.07,45);
const sHeal=()=>tone(480,0.18,'sine',0.05,950);
const sCast=()=>tone(280,0.3,'triangle',0.05,1300);
const sWin=()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'square',0.04),i*110));
const sDing=()=>[784,1175,1568].forEach((f,i)=>setTimeout(()=>tone(f,0.09,'square',0.05),i*70));
const sLvl=()=>[440,554,659,880].forEach((f,i)=>setTimeout(()=>tone(f,0.14,'triangle',0.05),i*90));
let musicOn=false,mi=0,mTimer=null;
const MEL=[392,440,523,0,587,523,440,392,330,392,440,523,587,0,659,587,523,440,392,330,392,0,440,523,440,392,330,294,330,392,440,0];
function setMusic(on){
  musicOn=on;$('btnMus').textContent='音乐:'+(on?'开':'关');
  if(mTimer){clearInterval(mTimer);mTimer=null;}
  if(on){au();mTimer=setInterval(()=>{
    const f=MEL[mi%MEL.length];mi++;
    if(f)tone(f,0.22,'triangle',0.025);
    if(mi%4===0)tone(f?f/2:98,0.3,'sine',0.018);
  },250);}
}

function r(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}

function tileAt(x,y){if(x<0||y<0||x>=cur.w||y>=cur.h)return 'T';return cur.m[y][x];}
function npcAt(x,y){return (NPCS[curName]||[]).find(n=>n.x===x&&n.y===y);}
function poiAt(x,y){return (POIS[curName]||[]).find(q=>q.x===x&&q.y===y);}
function canWalk(x,y){
  if(npcAt(x,y)||poiAt(x,y))return false;
  if(curName==='world'&&!flags.mini&&y===13&&(x===31||x===32))return false;
  if(tileAt(x,y)==='V'&&!flags.ch2)return false; // 漩涡未显现前如同湖水,不可入
  return !('TWXHR'.includes(tileAt(x,y)));
}
function switchMap(name,x,y){curName=name;cur=MAPS[name];p.tx=x;p.ty=y;p.x=x*T;p.y=y*T;p.mv=null;}

function drawTile(i,j,sx,sy){
  const c=cur.m[j][i];
  if(cur.bg==='house'){
    if(c==='H'){
      r(sx,sy,T,T,'#5a3a22');r(sx,sy,T,4,'#3e2814');r(sx,sy,2,T,'#3e2814');r(sx+30,sy,2,T,'#3e2814');
      if(j===1&&i%3===1){r(sx+6,sy+8,20,18,'#2a1c10');r(sx+8,sy+10,16,14,'#e8d8a8');r(sx+15,sy+10,2,14,'#5a3a22');r(sx+8,sy+16,16,2,'#5a3a22');}
      return;
    }
    r(sx,sy,T,T,'#b9854f');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.05)');
    r(sx,sy+15,T,1,'#9a6a3a');r(sx,sy+31,T,1,'#9a6a3a');
    r(sx+((i+j)%2?8:22),sy,1,15,'#9a6a3a');r(sx+((i+j)%2?22:8),sy+16,1,15,'#9a6a3a');
    if(c==='O'){r(sx+4,sy+6,24,22,'#8a5e32');r(sx+6,sy+8,20,18,'#a8744a');r(sx,sy+28,T,4,'#3e2814');}
    return;
  }
  if(cur.bg==='lake'){
    if(c==='R'){r(sx,sy,T,T,'#1a3340');r(sx+3,sy+4,12,12,'#27505f');r(sx+16,sy+14,12,12,'#27505f');r(sx+18,sy+3,9,9,'#16303a');r(sx+4,sy+19,9,9,'#16303a');return;}
    // 水底:幽蓝水体 + 流动焦散光纹
    r(sx,sy,T,T,'#1d5566');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.06)');
    const o=(frame>>4)%2,o2=(frame>>3)%3;
    r(sx+4+o*6,sy+6,9,2,'rgba(150,230,240,0.30)');r(sx+18-o*6,sy+20,8,2,'rgba(150,230,240,0.24)');
    r(sx+24,sy+5+o2*3,2,2,'rgba(210,250,255,0.5)'); // 上浮气泡
    if(c==='c'){[[5,20],[11,24],[18,18],[23,22],[8,12]].forEach(b=>{r(sx+b[0],sy+b[1],3,T-b[1]-1,'#2f7f6a');r(sx+b[0],sy+b[1],1,6,'#54b594');});}
    else if(c==='S'){r(sx+4,sy+4,24,24,'#3aa0a8');r(sx+8,sy+8,16,16,'#7fe6e0');const k=(frame>>3)%4;r(sx+10+k*3,sy+6+(k*4)%16,3,3,'#ffffff');r(sx+6,sy+18,2,3,'#cffcff');r(sx+24,sy+10,2,3,'#cffcff');}
    else if(c==='O'){r(sx+3,sy+3,26,26,'#2a7a8c');r(sx+8,sy+8,16,16,'#aef0ff');const k=(frame>>2)%3;r(sx+12,sy+4+k*2,8,4,'#e8feff');g.fillStyle='#0c2a33';g.font='12px monospace';g.fillText('↑',sx+12,sy+22);}
    else if(c==='D'){r(sx,sy,T,T,'#16303a');r(sx+3,sy+2,26,30,'#1c4f5e');r(sx+6,sy+5,20,27,'#0e2630');r(sx+10,sy+8,12,24,'#2f7f93');r(sx+14,sy+3,4,4,'#5dded6');r(sx+8,sy+14,3,3,'#9fe1cb');r(sx+21,sy+14,3,3,'#9fe1cb');}
    return;
  }
  if(cur.bg==='palace'){
    if(c==='X'){r(sx,sy,T,T,'#13313a');r(sx+3,sy+2,26,28,'#1d4a57');r(sx+6,sy+5,20,22,'#163a45');r(sx+13,sy+2,6,28,'#2f7f93');r(sx+14,sy+6,4,6,'#5dded6');r(sx+14,sy+18,4,6,'#5dded6');return;}
    r(sx,sy,T,T,'#0e2a33');if((i+j)%2)r(sx,sy,T,T,'rgba(95,222,214,0.05)');
    r(sx,sy,T,1,'#14424d');r(sx,sy,1,T,'#14424d');
    if(c==='O'){r(sx+3,sy+3,26,26,'#16303a');r(sx+8,sy+8,16,16,'#2a7a8c');r(sx+11,sy+12,10,8,'#aef0ff');g.fillStyle='#0c2a33';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='Z'){const gl=flags.dragon?'#9fe1cb':'#ffd76a';r(sx+6,sy+2,20,28,'#10333d');r(sx+9,sy+5,14,22,'#1d4a57');r(sx+8,sy+4,4,6,gl);r(sx+20,sy+4,4,6,gl);r(sx+13,sy+12,6,10,gl);r(sx+10,sy+24,12,4,'#0a2229');}
    return;
  }
  if(curName==='tower'){
    if(c==='X'){r(sx,sy,T,T,'#2c2638');r(sx+2,sy+2,12,12,'#241f30');r(sx+18,sy+18,12,12,'#241f30');r(sx+18,sy+2,12,12,'#332b42');r(sx+2,sy+18,12,12,'#332b42');return;}
    r(sx,sy,T,T,'#4a4356');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.07)');
    r(sx,sy,T,1,'#3d374a');r(sx,sy,1,T,'#3d374a');
    if(c==='e'){r(sx,sy,T,T,'#423a52');r(sx+8,sy+8,4,4,'#6e5a9e');r(sx+20,sy+18,4,4,'#6e5a9e');r(sx+12,sy+22,4,4,'#6e5a9e');r(sx+22,sy+6,3,3,'#8a74c4');}
    else if(c==='O'){r(sx+4,sy+4,24,24,'#1c1726');r(sx+8,sy+14,16,4,'#6a6f78');r(sx+8,sy+22,16,4,'#6a6f78');}
    else if(c==='B'){const gl=flags.boss?'#ffd76a':'#e24b4a';r(sx+4,sy+14,24,4,gl);r(sx+14,sy+4,4,24,gl);r(sx+8,sy+8,4,4,gl);r(sx+20,sy+20,4,4,gl);}
    return;
  }
  r(sx,sy,T,T,'#7ab648');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.04)');
  r(sx+6,sy+8,2,4,'#8fcc5e');r(sx+22,sy+20,2,4,'#8fcc5e');r(sx+14,sy+26,2,3,'#69a342');
  if(c==='t'){r(sx,sy,T,T,'#4e8c2f');[[4,12],[10,6],[16,14],[24,8],[20,22],[8,22]].forEach(b=>{r(sx+b[0],sy+b[1],3,T-b[1]-2,'#3c7022');r(sx+b[0],sy+b[1],1,5,'#5fa53c');});}
  else if(c==='P'){r(sx,sy,T,T,'#d9b97f');r(sx+6,sy+10,6,4,'#c7a76d');r(sx+20,sy+22,6,4,'#c7a76d');r(sx+22,sy+6,4,3,'#e6cc96');}
  else if(c==='W'){r(sx,sy,T,T,'#3f7fbf');const o=(frame>>4)%2;r(sx+4+o*8,sy+8,10,2,'#7fb2e0');r(sx+16-o*6,sy+22,10,2,'#7fb2e0');r(sx+24,sy+4,3,2,'#a8d4f0');}
  else if(c==='b'){r(sx,sy,T,T,'#3f7fbf');r(sx,sy+2,T,8,'#9a6a3a');r(sx,sy+12,T,8,'#8a5e32');r(sx,sy+22,T,8,'#9a6a3a');r(sx,sy,4,T,'#6e4a26');r(sx+28,sy,4,T,'#6e4a26');r(sx+14,sy+5,2,2,'#5a3a1e');r(sx+14,sy+25,2,2,'#5a3a1e');}
  else if(c==='T'){r(sx+13,sy+20,6,12,'#5d4327');r(sx+14,sy+20,2,12,'#7a5a36');r(sx+6,sy+12,20,10,'#2f6b1e');r(sx+2,sy+7,28,9,'#2f6b1e');r(sx+8,sy+2,16,8,'#2f6b1e');r(sx+10,sy+4,12,8,'#3f8429');r(sx+6,sy+9,18,6,'#3f8429');r(sx+11,sy+5,6,4,'#52a338');}
  else if(c==='R'){r(sx,sy,T,T,'#8a3b2c');for(let k=0;k<4;k++)r(sx,sy+k*8+6,T,2,'#6e2e22');r(sx+10,sy,2,T,'#6e2e22');r(sx+22,sy,2,T,'#6e2e22');}
  else if(c==='H'){r(sx,sy,T,T,'#caa46a');r(sx,sy,T,3,'#a8854f');r(sx,sy,2,T,'#8a6a3e');r(sx+30,sy,2,T,'#8a6a3e');if(j===39){r(sx+8,sy+10,16,14,'#5d4327');r(sx+10,sy+12,12,10,'#8fb8d0');r(sx+15,sy+12,2,10,'#5d4327');r(sx+10,sy+16,12,2,'#5d4327');}}
  else if(c==='d'){r(sx,sy,T,T,'#caa46a');r(sx,sy,T,3,'#a8854f');r(sx+8,sy+4,16,28,'#5d4327');r(sx+10,sy+6,12,26,'#4a3520');r(sx+19,sy+18,2,3,'#d9aa3c');}
  else if(c==='X'){r(sx,sy,T,T,'#7d7f8a');r(sx,sy,16,16,'#8a8c97');r(sx+16,sy+16,16,16,'#8a8c97');r(sx,sy,T,1,'#5f616c');r(sx,sy+15,T,1,'#5f616c');r(sx+2,sy+26,4,3,'#6f8a5a');}
  else if(c==='D'){r(sx,sy,T,T,'#7d7f8a');r(sx+4,sy+4,24,28,flags.boss?'#ffd76a':'#2a2233');r(sx+6,sy+6,20,26,flags.boss?'#e8c050':'#1c1726');r(sx+14,sy+2,4,3,'#e24b4a');}
  else if(c==='S'){r(sx+4,sy+4,24,24,'#6fcfc6');r(sx+8,sy+8,16,16,'#9fe7e0');const o=(frame>>3)%4;r(sx+8+o*4,sy+8+(o*5)%14,4,4,'#ffffff');r(sx+2,sy+14,2,4,'#8a8c97');r(sx+28,sy+10,2,4,'#8a8c97');}
  else if(c==='V'){
    if(!flags.ch2){ // 未开启第二章时与湖水无异
      r(sx,sy,T,T,'#3f7fbf');const o=(frame>>4)%2;r(sx+4+o*8,sy+8,10,2,'#7fb2e0');r(sx+16-o*6,sy+22,10,2,'#7fb2e0');
    }else{ // 漩涡:双臂螺旋 + 幽暗涡心(第二章入口,需醒目)
      r(sx,sy,T,T,'#1d4f78');const a=frame*0.14;
      for(let k=1;k<=4;k++){
        const rad=2+k*3.4,an=a+k*0.9;
        g.fillStyle=k%2?'#cdeeff':'#3f7fbf';
        g.fillRect(sx+16+Math.cos(an)*rad-2,sy+16+Math.sin(an)*rad-2,4,4);
        g.fillRect(sx+16-Math.cos(an)*rad-2,sy+16-Math.sin(an)*rad-2,4,4);
      }
      r(sx+13,sy+13,6,6,'#0a1d2e');
    }
  }
}
function label(n,sx,sy){
  g.font='13px monospace';
  const w=n.length*13+12;
  g.fillStyle='rgba(0,0,0,0.55)';g.fillRect(sx+16-w/2,sy-17,w,15);
  g.fillStyle='#fff';g.fillText(n,sx+22-w/2,sy-5);
}
function drawHUD(){
  r(14,14,300,76,'rgba(18,14,26,0.75)');
  g.font='17px monospace';g.fillStyle='#ffd76a';
  g.fillText('云无衣 Lv'+S.lvl+'  '+S.gold+'两',26,38);
  r(26,48,190,11,'#3a2f3a');r(26,48,Math.max(0,Math.min(190,Math.round(S.hp/S.maxHp*190))),11,'#1D9E75');
  r(26,66,190,11,'#3a2f3a');r(26,66,Math.max(0,Math.min(190,Math.round(S.mp/S.maxMp*190))),11,'#7F77DD');
  g.font='13px monospace';g.fillStyle='#cdd6e0';
  g.fillText(S.hp+'/'+S.maxHp,224,58);g.fillText(S.mp+'/'+S.maxMp,224,76);
}
function drawWorld(){
  r(0,0,SW,SH,cur.bg==='tower'?'#1a1622':cur.bg==='house'?'#16101c':cur.bg==='lake'?'#103642':cur.bg==='palace'?'#081d24':'#234d1e');
  const mw=cur.w*T,mh=cur.h*T;
  const camX=mw<=SW?(mw-SW)/2:Math.max(0,Math.min(mw-SW,p.x-SW/2+16));
  const camY=mh<=SH?(mh-SH)/2:Math.max(0,Math.min(mh-SH,p.y-SH/2+16));
  const x0=Math.max(0,Math.floor(camX/T)),y0=Math.max(0,Math.floor(camY/T));
  for(let j=y0;j<=Math.min(cur.h-1,y0+VH);j++)for(let i=x0;i<=Math.min(cur.w-1,x0+VW);i++)drawTile(i,j,i*T-camX,j*T-camY);
  (POIS[curName]||[]).forEach(q=>{
    const sx=q.x*T-camX,sy=q.y*T-camY;
    if(sx<-T||sy<-T||sx>SW||sy>SH)return;
    pix(q.kind,sx,sy,2);
    if(!looted[q.id]&&(frame>>4)%3===0){r(sx+22,sy+2,3,3,'#fff3c0');r(sx+23,sy+3,1,1,'#ffffff');}
  });
  (NPCS[curName]||[]).forEach(n=>{
    const sx=n.x*T-camX,sy=n.y*T-camY;
    if(sx<-T||sy<-T||sx>SW||sy>SH)return;
    SPR[n.draw](sx,sy-8,2,n.c);label(n.n,sx,sy-8);
  });
  if(curName==='world'&&!flags.mini){
    const sx=31*T-camX,sy=13*T-camY;
    if(sx>-48&&sy>-48&&sx<SW&&sy<SH){drawSnakeK(sx,sy-12,2);label('蛇妖王',sx,sy-12);}
  }
  drawHero(p.x-camX,p.y-camY-8,2,p.mv?Math.floor(frame/8)%2:0);
  for(const w of wpops){
    g.globalAlpha=Math.max(0,1-w.t);
    g.font='bold 16px monospace';g.strokeStyle='#000';g.lineWidth=3;
    g.strokeText(w.txt,w.x-camX-30,w.y-camY);
    g.fillStyle=w.c;g.fillText(w.txt,w.x-camX-30,w.y-camY);
    g.globalAlpha=1;
  }
  drawHUD();
}
function updWorld(dt){
  if(!p.mv){
    let dx=0,dy=0;
    if(K.up)dy=-1;else if(K.down)dy=1;else if(K.left)dx=-1;else if(K.right)dx=1;
    if(dx||dy){
      const nx=p.tx+dx,ny=p.ty+dy;
      const n=npcAt(nx,ny),q=n?null:poiAt(nx,ny);
      if(n){K.up=K.down=K.left=K.right=0;n.talk();}
      else if(q){K.up=K.down=K.left=K.right=0;investigate(q);}
      else if(canWalk(nx,ny)){p.mv={fx:p.tx*T,fy:p.ty*T,gx:nx*T,gy:ny*T,t:0};p.tx=nx;p.ty=ny;}
    }
  }else{
    p.mv.t+=dt/0.14;
    if(p.mv.t>=1){p.x=p.mv.gx;p.y=p.mv.gy;p.mv=null;onStep();}
    else{p.x=p.mv.fx+(p.mv.gx-p.mv.fx)*p.mv.t;p.y=p.mv.fy+(p.mv.gy-p.mv.fy)*p.mv.t;}
  }
  for(let i=wpops.length-1;i>=0;i--){wpops[i].t+=dt;wpops[i].y-=24*dt;if(wpops[i].t>1.2)wpops.splice(i,1);}
}
function onStep(){
  const c=tileAt(p.tx,p.ty);
  if(c==='S'&&(S.hp<S.maxHp||S.mp<S.maxMp)){S.hp=S.maxHp;S.mp=S.maxMp;sHeal();wpop('灵泉:全恢复!','#9fe7e0');}
  if(c==='D'&&curName==='world'){
    showDialog(['你推开沉重的石门,塔内阴风扑面……'],()=>switchMap('tower',11,25));
    return;
  }
  if(c==='V'&&flags.ch2){diveLake();return;}
  if(c==='d'||c==='D'||c==='O'){ // 通用传送门:木门、水府门、各类出口
    const door=DOORS[curName+':'+p.tx+','+p.ty];
    if(door){switchMap(door.map,door.x,door.y);return;}
    if(c==='O'){switchMap('world',31,3);return;}
  }
  if(c==='Z'){ // 蛟龙王座
    if(!flags.dragon){
      showDialog([
        '水府深处,一条墨色蛟龙自蟠柱间昂起,鳞甲泛着幽光。',
        {n:'阿萝',t:'师兄小心!这蛟龙性属水,快用风灵咒——御风能破它的水鳞!'},
        {n:'墨蛟龙王',t:'谁人扰我清眠……既来了,便永沉这湖底吧!'}
      ],()=>startBattle('dragon',true));
    }else wpop('王座空荡荡的','#9fe1cb');
    return;
  }
  if(c==='B'){
    if(!flags.boss){
      showDialog([
        '封印法阵的中央,黑雾凝成一道高大的影子。',
        {n:'千年妖王',t:'千年了……终于等到开锁的血食。小辈,纳命来!'}
      ],()=>startBattle('king',true));
    }else wpop('封印安然无恙','#ffd76a');
    return;
  }
  if(curName==='world'&&!flags.mini&&p.ty===14&&(p.tx===31||p.tx===32)){
    showDialog([
      {n:'???',t:'嘶嘶——此桥是我开,要过去,先问问我的毒牙。'},
      '蛇妖王挡住了去路!'
    ],()=>startBattle('snakeKing',true));
    return;
  }
  if(c==='t'||c==='e'||c==='c'){ // 深草 / 符纹地 / 水草:遇敌地形
    if(grace>0){grace--;return;}
    if(Math.random()<cur.rate){
      const pool=cur.pool();
      startBattle(pool[rnd(0,pool.length-1)],false);
    }
  }
}
// 第二章:纵身潜入水月湖底(首次潜入播一段旁白)
function diveLake(){
  if(!flags.lakeIntro){
    flags.lakeIntro=true;
    showDialog([
      '你深吸一口气,纵身跃入漩涡。冰凉的湖水将你裹住,世界沉入一片幽蓝。',
      {n:'阿萝',t:'师兄,我跟你一起!这水府机关重重,千万跟紧我。'},
      '(水草丛中会遇上水妖;气泡灵泉可回满状态。北边的水府门后,便是蛟龙的巢穴。)'
    ],()=>switchMap('lake',14,21));
  }else switchMap('lake',14,21);
}

// Phase 1:翻找家具。首次有宝物("叮"+金色飘字),重复调查按种类给不同文案
function investigate(q){
  const kd=POI_KINDS[q.kind];
  if(looted[q.id]){showDialog([kd.again]);return;}
  looted[q.id]=true;
  const lt=q.loot,lines=[];
  if(lt.t==='gold'){S.gold+=lt.n;sDing();wpop('+'+lt.n+' 两','#ffd76a');lines.push('你在'+kd.n+'里翻出了 '+lt.n+' 两银子!');}
  else if(lt.t==='item'){const n=lt.n||1;INV[lt.k]+=n;sDing();wpop(ITEMN[lt.k]+' ×'+n,'#ffd76a');lines.push('你在'+kd.n+'里找到了'+ITEMN[lt.k]+'!');}
  else if(lt.t==='note'){sDing();wpop('发现纸条','#ffd76a');lines.push('你在'+kd.n+'里发现一张纸条……',lt.text);}
  else lines.push('你仔细翻了翻'+kd.n+'……什么都没有。');
  // 翻到第二件时,屋主忍不住吐槽一句(每间屋一次)
  const sn=SNARK[curName];
  if(sn&&(POIS[curName]||[]).filter(x=>looted[x.id]).length===2)lines.push(sn);
  showDialog(lines);
  save();
}

function talkAluo(){
  if(!flags.aluo){
    flags.aluo=true;INV.dan++;
    showDialog([
      {n:'阿萝',t:'师兄!锁妖塔的封印快破了,北边过了断桥就是塔门。'},
      {n:'阿萝',t:'这枚回灵丹你带上。桥上盘着一条蛇妖王,千万小心!'},
      {n:'阿萝',t:'湖东边有灵泉能回满状态,杂货铺和铁匠铺也去看看。'}
    ]);
  }
  else if(!flags.mini)showDialog([{n:'阿萝',t:'先在草丛练级、买好装备,再去会那蛇妖王!它属水,雷法可不好使。'}]);
  else if(!flags.boss)showDialog([{n:'阿萝',t:'塔里阴气重,鬼火属火——练到 5 级学会水灵咒就能克它,妖王也一样!'}]);
  else if(!flags.ch2){ // 第二章开篇:妖王残魂惊动湖底蛟龙,阿萝传授风灵咒,湖面漩涡显现
    flags.ch2=true;flags.wind=true;
    showDialog([
      {n:'阿萝',t:'师兄,大事不好!妖王临死那缕妖魂沉进了水月湖,惊醒了湖底沉睡千年的蛟龙!'},
      {n:'阿萝',t:'湖水一夜暴涨,村子要保不住了……这回,我陪你一起下湖!'},
      {n:'阿萝',t:'湖底水妖个个属水。我把师门的「风灵咒」传给你——风能克水,正好破它们!'},
      '【习得仙术 · 风灵咒】(战斗中选「仙术」即可施放)',
      {n:'阿萝',t:'湖中央起了个漩涡,那就是入口。走,我在漩涡边等你!'}
    ]);
    save();
  }
  else if(!flags.dragon)showDialog([{n:'阿萝',t:'湖中漩涡通往水府。记住——水府里的妖物都属水,风灵咒打它们最疼!'}]);
  else showDialog([{n:'阿萝',t:'蛟龙也降了,师兄真是顶天立地的大英雄!下一程,我还要跟着你。'}]);
}
// 第二章:阿萝在湖底剧情同行(随进度变化的台词)
function talkAluoLake(){
  if(!flags.dragon)showDialog([
    {n:'阿萝',t:'顺着水草往北走就是水府门。当心,墨鱼妖最快,先用风灵咒点它!'},
    {n:'阿萝',t:'那只龟将军壳硬属土——对它改用雷灵咒,事半功倍。'}
  ]);
  else showDialog([{n:'阿萝',t:'湖水退下去了,水府也安静了。师兄,我们回村报喜吧!'}]);
}
function inn(){
  const c=Math.min(10,S.gold);S.gold-=c;S.hp=S.maxHp;S.mp=S.maxMp;sHeal();save();
  showDialog([{n:'老板娘',t:'热水烧好啦,好生歇息。(花费 '+c+' 两,气血灵力全满,已自动保存)'}]);
}

let dq=[],dcb=null;
function showDialog(lines,cb){dq=lines.slice();dcb=cb;$('dlg').style.display='block';nextDlg();}
function nextDlg(){
  if(!dq.length){
    $('dlg').style.display='none';
    const c=dcb;dcb=null;if(c)c();
    return;
  }
  const it=dq.shift();
  if(typeof it==='string'){$('dlgName').style.display='none';$('dlgText').textContent=it;}
  else{$('dlgName').style.display='inline-block';$('dlgName').textContent=it.n;$('dlgText').textContent=it.t;}
}
function openPanel(html){$('panelBody').innerHTML=html;$('panel').style.display='flex';}
function closePanel(){$('panel').style.display='none';}
let toastT=null;
function toast(t){
  $('toast').textContent=t;$('toast').style.display='block';
  if(toastT)clearTimeout(toastT);
  toastT=setTimeout(()=>{$('toast').style.display='none';},1400);
}
function shopRow(n,d,pr,fn){
  return '<div class="srow"><div><b>'+n+'</b><span>'+d+'</span></div><button class="pbtn" onclick="'+fn+'">'+pr+' 两</button></div>';
}
function openShop(kind){
  let h='<h3>'+(kind==='item'?'杂货铺':'铁匠铺')+'</h3><div class="gold">银两:'+S.gold+'</div>';
  if(kind==='item'){
    h+=shopRow('回灵丹','恢复 45 气血(现有 '+INV.dan+')',30,"buyItem('dan',30)");
    h+=shopRow('清心散','恢复 30 灵力(现有 '+INV.qing+')',30,"buyItem('qing',30)");
    h+=shopRow('大还丹','气血全满(现有 '+INV.dadan+')',90,"buyItem('dadan',90)");
  }else{
    for(let i=1;i<WPNS.length;i++)h+=shopRow(WPNS[i].n,'攻击 +'+WPNS[i].a+(EQ.wpn===i?' · 已装备':EQ.wpn>i?' · 已淘汰':''),WPNS[i].p,'buyWpn('+i+')');
    for(let i=1;i<ARMS.length;i++)h+=shopRow(ARMS[i].n,'防御 +'+ARMS[i].d+(EQ.arm===i?' · 已装备':EQ.arm>i?' · 已淘汰':''),ARMS[i].p,'buyArm('+i+')');
  }
  h+='<button class="pbtn" onclick="closePanel()">离开</button>';
  openPanel(h);
}
function buyItem(k,pr){
  if(S.gold<pr){toast('银两不够……');return;}
  S.gold-=pr;INV[k]++;sHeal();openShop('item');
}
function buyWpn(i){
  if(EQ.wpn>=i){toast('已有更好的剑了');return;}
  if(S.gold<WPNS[i].p){toast('银两不够……');return;}
  S.gold-=WPNS[i].p;EQ.wpn=i;sLvl();toast('已装备 '+WPNS[i].n);openShop('gear');
}
function buyArm(i){
  if(EQ.arm>=i){toast('已有更好的护甲了');return;}
  if(S.gold<ARMS[i].p){toast('银两不够……');return;}
  S.gold-=ARMS[i].p;EQ.arm=i;sLvl();toast('已装备 '+ARMS[i].n);openShop('gear');
}
function openStatus(){
  const known=SKILLS.filter(skillKnown).map(s=>s.n+'·'+s.el).join('  ');
  openPanel('<h3>云无衣</h3>'+
    '<div class="srow"><div><b>等级 '+S.lvl+'</b><span>经验 '+S.exp+' / '+(S.lvl*45)+'</span></div></div>'+
    '<div class="srow"><div><b>气血 '+S.hp+'/'+S.maxHp+'</b><span>灵力 '+S.mp+'/'+S.maxMp+'</span></div></div>'+
    '<div class="srow"><div><b>攻击 '+atkP()+' · 防御 '+defP()+'</b><span>'+WPNS[EQ.wpn].n+' / '+ARMS[EQ.arm].n+'</span></div></div>'+
    '<div class="srow"><div><b>仙术</b><span>'+known+'</span></div></div>'+
    '<div class="srow"><div><b>行囊</b><span>回灵丹×'+INV.dan+'  大还丹×'+INV.dadan+'  清心散×'+INV.qing+'  银两 '+S.gold+'</span></div></div>'+
    '<button class="pbtn" onclick="doSave()">保存进度</button> <button class="pbtn" onclick="closePanel()">关闭</button>');
}
function doSave(){save();toast('已保存');closePanel();}
function save(){
  try{localStorage.setItem('lingshan1',JSON.stringify({S:S,INV:INV,EQ:EQ,flags:flags,looted:looted,map:curName,x:p.tx,y:p.ty}));}catch(e){}
}
function loadSave(){
  try{
    const d=JSON.parse(localStorage.getItem('lingshan1'));
    if(!d)return false;
    Object.assign(S,d.S);Object.assign(INV,d.INV);Object.assign(EQ,d.EQ);Object.assign(flags,d.flags);
    for(const k in looted)delete looted[k];
    Object.assign(looted,d.looted||{});
    switchMap(d.map||'world',d.x,d.y);
    return true;
  }catch(e){return false;}
}
function hasSave(){try{return !!localStorage.getItem('lingshan1');}catch(e){return false;}}
function resetState(){
  Object.assign(S,{hp:70,maxHp:70,mp:36,maxMp:36,lvl:1,exp:0,gold:80});
  Object.assign(INV,{dan:3,dadan:0,qing:1});
  EQ.wpn=0;EQ.arm=0;
  flags.aluo=false;flags.mini=false;flags.boss=false;
  flags.ch2=false;flags.wind=false;flags.lakeIntro=false;flags.dragon=false;
  for(const k in looted)delete looted[k];
  switchMap('world',31,44);
}

function showEnding(){
  if($('endTitle'))$('endTitle').textContent='第一章 · 完';
  $('endText').textContent='千年妖王哀嚎着被吸回封印,法阵重新亮起金光。阿萝在塔外迎着晨光向你奔来——回到村里找她,水月湖那边,似乎又起了波澜……';
  $('endov').style.display='flex';
  sWin();
}
function showEnding2(){
  if($('endTitle'))$('endTitle').textContent='第二章 · 完';
  $('endText').textContent='墨蛟龙王化作一池清水,湖面重归平静,月影粼粼。阿萝挽住你的衣袖,笑着说还要陪你走更远的路——灵山的传说,仍未完待续。想要第三章?回到 Claude 的对话里喊一声就行。';
  $('endov').style.display='flex';
  sWin();
}
$('btnRoam').onclick=()=>{$('endov').style.display='none';};
$('btnRestart').onclick=()=>{$('endov').style.display='none';resetState();save();};

const petals=[];
for(let i=0;i<26;i++)petals.push({x:Math.random()*SW,y:Math.random()*SH,vx:24+Math.random()*36,vy:30+Math.random()*42,s:4+Math.round(Math.random()*2)});
function drawTitleBg(dt){
  r(0,0,SW,SH,'#181426');
  g.fillStyle='#f3e6c8';g.beginPath();g.arc(780,124,60,0,Math.PI*2);g.fill();
  g.fillStyle='#181426';g.beginPath();g.arc(804,108,52,0,Math.PI*2);g.fill();
  g.fillStyle='#241d38';
  g.beginPath();g.moveTo(0,500);g.lineTo(180,280);g.lineTo(400,500);g.closePath();g.fill();
  g.beginPath();g.moveTo(260,520);g.lineTo(520,240);g.lineTo(800,520);g.closePath();g.fill();
  g.fillStyle='#2e2547';
  g.beginPath();g.moveTo(600,540);g.lineTo(840,320);g.lineTo(960,540);g.closePath();g.fill();
  r(0,500,SW,140,'#100d1c');
  r(456,300,48,200,'#0c0a16');r(444,288,72,16,'#0c0a16');r(464,240,32,60,'#0c0a16');r(470,226,20,16,'#0c0a16');
  for(const f of petals){
    f.x-=f.vx*dt;f.y+=f.vy*dt;
    if(f.y>SH||f.x<-6){f.x=SW+Math.random()*60;f.y=-12;}
    r(f.x,f.y,f.s,f.s,'#ED93B1');
  }
}
document.querySelectorAll('#dpad button').forEach(b=>{
  const d=b.dataset.d;
  if(!d)return;
  b.addEventListener('pointerdown',e=>{e.preventDefault();au();K[d]=1;try{b.setPointerCapture(e.pointerId);}catch(err){}});
  ['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>{K[d]=0;}));
});
const KM={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'};
window.addEventListener('keydown',e=>{
  au();
  if(KM[e.key]!==undefined){K[KM[e.key]]=1;e.preventDefault();}
  if((e.key==='Enter'||e.key===' '||e.key==='z')&&$('dlg').style.display==='block'){nextDlg();e.preventDefault();}
});
window.addEventListener('keyup',e=>{if(KM[e.key]!==undefined)K[KM[e.key]]=0;});
$('dlg').onclick=()=>{au();nextDlg();};
$('batk').onclick=()=>act('atk');
$('bskl').onclick=()=>act('skl');
$('bitm').onclick=()=>act('itm');
$('bfle').onclick=()=>act('fle');
$('btnBag').onclick=()=>{au();if(mode==='world')openStatus();};
$('btnMus').onclick=()=>{au();setMusic(!musicOn);};
$('btnNew').onclick=()=>{
  au();resetState();
  $('title').style.display='none';mode='world';
  showDialog([
    '第一章 · 锁妖塔',
    {n:'阿萝',t:'师兄!出大事了,快来村口找我!'},
    '(撞上村民即可对话;先去找阿萝吧)'
  ]);
};
$('btnCont').onclick=()=>{
  au();
  if(loadSave()){$('title').style.display='none';mode='world';}
  else toast('没有找到存档');
};
if(!hasSave())$('btnCont').disabled=true;
battleUI(false);

let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000);
  last=now;frame++;
  if(mode==='title')drawTitleBg(dt);
  else if(mode==='world'){
    if($('dlg').style.display!=='block'&&$('panel').style.display!=='flex'&&$('endov').style.display!=='flex')updWorld(dt);
    drawWorld();
  }
  else if(mode==='battle'&&B){updBattle(dt);drawBattle();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
