'use strict';
// ===== 引擎层:画布、音频、地图行走、对话、商店、存档、主循环 =====
const $=id=>document.getElementById(id);
const cv=$('cv'),g=cv.getContext('2d');
const T=32,SW=960,SH=640,VW=31,VH=21;
// iPad 清晰化:把画布后备分辨率提到逻辑尺寸的 SS 倍(超采样),逻辑坐标仍是 960×640
// 每帧在主循环用 setTransform(SS) 重置基准;像素图按整数倍放大,边缘锐利不糊
const SS=(typeof window!=='undefined'&&Math.min(3,Math.max(2,Math.round(window.devicePixelRatio||2))))||2;
try{cv.width=SW*SS;cv.height=SH*SS;g.imageSmoothingEnabled=false;}catch(e){}
// 大地图镜头拉近倍数:角色与世界都更大一点(iPad 上看得清)
const WZOOM=1.25;
let mode='title',frame=0,grace=0;
let curName='world',cur=MAPS.world;
const p={tx:31,ty:44,x:31*T,y:44*T,mv:null};
const K={up:0,down:0,left:0,right:0};
let navTouch=null,heroSX=480,heroSY=320; // 触屏寻路:手指落点(画布坐标)+ 主角屏幕坐标
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
let musicOn=false,mi=0,mTimer=null,melKey='field';
// BGM 变奏:每个篇章一段主题(村野明快 / 塔内幽暗 / 水府流动 / 魔渊压抑)
const MELS={
  field:[392,440,523,0,587,523,440,392,330,392,440,523,587,0,659,587,523,440,392,330,392,0,440,523,440,392,330,294,330,392,440,0],
  tower:[294,0,349,392,294,0,262,294,220,0,262,294,349,0,330,294,262,0,294,349,392,0,349,294,262,247,220,0,247,262,294,0],
  lake:[330,392,440,523,440,392,0,440,494,587,494,440,0,392,440,494,392,330,294,330,392,0,440,392,330,294,262,0,294,330,392,0],
  abyss:[247,0,262,233,196,0,233,196,175,0,208,247,262,0,233,208,196,175,165,0,196,208,233,0,220,196,175,165,0,185,208,0],
  sky:[523,587,659,784,659,587,523,0,587,659,784,880,784,659,587,0,659,784,880,784,659,587,523,494,523,587,659,0,784,659,587,0],
  earth:[196,0,220,196,165,0,147,165,196,0,220,247,220,196,0,175,165,147,131,0,147,165,196,0,220,196,165,147,0,165,196,0],
  heaven:[523,659,784,988,1046,988,784,659,587,784,880,1046,1175,1046,880,784,659,784,880,988,880,784,659,587,523,659,784,988,784,659,587,0]
};
const MUSCFG={
  field:{wave:'triangle',rest:250,bv:0.018},
  tower:{wave:'square',rest:280,bv:0.020},
  lake:{wave:'sine',rest:235,bv:0.016},
  abyss:{wave:'sawtooth',rest:300,bv:0.024},
  sky:{wave:'sine',rest:220,bv:0.014},
  earth:{wave:'triangle',rest:300,bv:0.026},
  heaven:{wave:'sine',rest:210,bv:0.013}
};
function melForBg(bg){return bg==='tower'?'tower':(bg==='lake'||bg==='palace')?'lake':(bg==='abyss'||bg==='hell')?'abyss':(bg==='sky'||bg==='shrine')?'sky':(bg==='cavern'||bg==='core')?'earth':(bg==='heaven'||bg==='celestial')?'heaven':'field';}
function startMusicLoop(){
  if(mTimer){clearInterval(mTimer);mTimer=null;}
  const cfg=MUSCFG[melKey],mel=MELS[melKey];
  mTimer=setInterval(()=>{
    const f=mel[mi%mel.length];mi++;
    if(f)tone(f,cfg.rest/1000*0.88,cfg.wave,0.025);
    if(mi%4===0)tone(f?f/2:98,cfg.rest/1000*1.2,'sine',cfg.bv);
  },cfg.rest);
}
function setMusic(on){
  musicOn=on;$('btnMus').textContent='🎵 '+(on?'开':'关');
  if(!on){if(mTimer){clearInterval(mTimer);mTimer=null;}return;}
  au();mi=0;startMusicLoop();
}
// 切图时按场景切换 BGM 主题(变奏);音乐开着才即时重启
function setMelodyForMap(){
  const k=melForBg(cur.bg);
  if(k!==melKey){melKey=k;mi=0;if(musicOn)startMusicLoop();}
}

function r(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h);}
// ===== 视觉打磨:投影 / 粒子 / 辉光 / 氛围 =====
function shadowEllipse(cx,by,rw){g.fillStyle='rgba(0,0,0,0.22)';g.beginPath();g.ellipse(cx,by,rw,Math.max(2,rw*0.32),0,0,Math.PI*2);g.fill();}
function glowDot(x,y,rad,c){const gr=g.createRadialGradient(x,y,0,x,y,rad);gr.addColorStop(0,c);gr.addColorStop(0.6,c);gr.addColorStop(1,'rgba(0,0,0,0)');const o=g.globalCompositeOperation;g.globalCompositeOperation='lighter';g.globalAlpha=0.5;g.fillStyle=gr;g.beginPath();g.arc(x,y,rad,0,Math.PI*2);g.fill();g.globalAlpha=1;g.globalCompositeOperation=o;}
const bfx=[]; // 战斗粒子(打击/法术爆发)
function burst(arr,x,y,c,n,spd,grav){for(let i=0;i<n;i++){const a=Math.random()*6.283,s=spd*(0.35+Math.random()*0.9);arr.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-spd*0.4,life:0.4+Math.random()*0.45,t:0,c,sz:2+Math.round(Math.random()*3),gr:grav==null?460:grav});}}
function updFx(arr,dt){for(let i=arr.length-1;i>=0;i--){const p=arr[i];p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.gr*dt;if(p.t>=p.life)arr.splice(i,1);}}
function drawFx(arr){for(const p of arr){g.globalAlpha=Math.max(0,1-p.t/p.life);g.fillStyle=p.c;g.fillRect(p.x-p.sz/2,p.y-p.sz/2,p.sz,p.sz);}g.globalAlpha=1;}
// 氛围浮粒(随场景变色,前景慢飘=视差感);用固定种子,保证截图可复现
let _ms=98765;const mrnd=()=>{_ms=(_ms*9301+49297)%233280;return _ms/233280;};
const motes=[];for(let i=0;i<18;i++)motes.push({x:mrnd()*SW,y:mrnd()*SH,vx:-6-mrnd()*14,vy:-4+mrnd()*8,ph:mrnd()*6.28,sz:2+Math.round(mrnd()*2)});
function moteColor(){const b=cur.bg;return (b==='abyss'||b==='hell')?'rgba(255,140,60,':(b==='heaven'||b==='celestial')?'rgba(255,233,138,':(b==='lake'||b==='palace')?'rgba(190,240,250,':(b==='cavern'||b==='core')?'rgba(255,170,60,':b==='tower'?'rgba(160,140,210,':(b==='sky'||b==='shrine')?'rgba(255,255,255,':'rgba(255,245,180,';}
function updMotes(dt){for(const m of motes){m.x+=m.vx*dt;m.ph+=dt;m.y+=(Math.sin(m.ph)*7+m.vy)*dt;if(m.x<-6)m.x=SW+6;if(m.y<-6)m.y=SH+6;if(m.y>SH+6)m.y=-6;}}
function drawMotes(){if(cur.bg==='house')return;const c=moteColor();for(const m of motes){g.globalAlpha=0.18+0.22*(0.5+0.5*Math.sin(m.ph*2));g.fillStyle=c+'1)';g.fillRect(m.x,m.y,m.sz,m.sz);}g.globalAlpha=1;}
// 章节指引:阿萝有新剧情(能开下一章)时,头顶冒「!」;入口同理
function aluoNews(){return !flags.aluo||(flags.boss&&!flags.ch2)||(flags.dragon&&!flags.ch3)||(flags.demon&&!flags.ch4)||(flags.peng&&!flags.ch5)||(flags.sovereign&&!flags.ch6);}
function drawMarker(wx,wy){const b=Math.abs(Math.sin(frame*0.13))*7,y=wy-b;g.fillStyle='#1a1626';g.beginPath();g.arc(wx,y,11,0,Math.PI*2);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(wx,y,9,0,Math.PI*2);g.fill();g.fillStyle='#1a1626';g.font='bold 15px monospace';g.fillText('!',wx-2.5,y+5.5);}

function tileAt(x,y){if(x<0||y<0||x>=cur.w||y>=cur.h)return 'T';return cur.m[y][x];}
function npcAt(x,y){return (NPCS[curName]||[]).find(n=>n.x===x&&n.y===y);}
function poiAt(x,y){return (POIS[curName]||[]).find(q=>q.x===x&&q.y===y);}
function canWalk(x,y){
  if(npcAt(x,y)||poiAt(x,y))return false;
  if(curName==='world'&&!flags.mini&&y===13&&(x===31||x===32))return false;
  if(tileAt(x,y)==='V'&&!flags.ch2)return false; // 漩涡未显现前如同湖水,不可入
  return !('TWXHR'.includes(tileAt(x,y)));
}
function switchMap(name,x,y){curName=name;cur=MAPS[name];p.tx=x;p.ty=y;p.x=x*T;p.y=y*T;p.mv=null;setMelodyForMap();}

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
  if(cur.bg==='abyss'){
    if(c==='X'){r(sx,sy,T,T,'#1a1018');r(sx+2,sy+2,12,12,'#2a1622');r(sx+18,sy+18,12,12,'#2a1622');r(sx+18,sy+3,10,10,'#140a12');r(sx+3,sy+18,10,10,'#140a12');return;}
    if(c==='R'){ // 岩浆:暗红熔流 + 翻涌亮斑
      r(sx,sy,T,T,'#5a1410');const o=(frame>>3)%3;r(sx+4+o*5,sy+8,8,3,'#ff6a20');r(sx+16-o*4,sy+20,7,3,'#ffb030');r(sx+10,sy+4,4,2,'#ffd23f');return;}
    r(sx,sy,T,T,'#241420');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.10)');
    const e=(frame>>4)%2;
    r(sx+22,sy+6,2,2,'rgba(255,120,80,0.45)');r(sx+6+e*4,sy+22,2,2,'rgba(200,80,140,0.4)'); // 余烬
    if(c==='m'){r(sx,sy,T,T,'#321826');[[8,8],[20,18],[12,22],[22,7],[5,16]].forEach(b=>{r(sx+b[0],sy+b[1],3,3,'#a8324f');r(sx+b[0]+1,sy+b[1]+1,1,1,'#ff5a7a');});}
    else if(c==='S'){r(sx+4,sy+4,24,24,'#7a2a4a');r(sx+8,sy+8,16,16,'#c45a7a');const k=(frame>>3)%4;r(sx+10+k*3,sy+6+(k*4)%16,3,3,'#ffd0e0');}
    else if(c==='O'){r(sx+3,sy+3,26,26,'#3a1822');r(sx+8,sy+8,16,16,'#7a2a3a');r(sx+11,sy+12,10,8,'#ffb0a0');g.fillStyle='#1a0a0e';g.font='12px monospace';g.fillText('↑',sx+13,sy+22);}
    else if(c==='D'){r(sx,sy,T,T,'#160a12');r(sx+3,sy+2,26,30,'#3a1428');r(sx+6,sy+5,20,27,'#1a0810');r(sx+10,sy+8,12,24,'#7a1c3a');r(sx+13,sy+3,6,5,'#ff4040');r(sx+8,sy+14,3,3,'#ff6a8a');r(sx+21,sy+14,3,3,'#ff6a8a');}
    return;
  }
  if(cur.bg==='hell'){
    if(c==='X'){r(sx,sy,T,T,'#1a0c14');r(sx+3,sy+2,26,28,'#34121f');r(sx+6,sy+5,20,22,'#220a14');r(sx+13,sy+2,6,28,'#7a1c2e');r(sx+14,sy+6,4,6,'#ff4040');r(sx+14,sy+18,4,6,'#ff4040');return;}
    r(sx,sy,T,T,'#180810');if((i+j)%2)r(sx,sy,T,T,'rgba(255,60,60,0.05)');
    r(sx,sy,T,1,'#3a121e');r(sx,sy,1,T,'#3a121e');
    if(c==='O'){r(sx+3,sy+3,26,26,'#2a0e16');r(sx+8,sy+8,16,16,'#5a1a26');r(sx+11,sy+12,10,8,'#ffb0a0');g.fillStyle='#1a0a0e';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='M'){const gl=flags.demon?'#9a9aa8':'#ff4040';r(sx+6,sy+2,20,28,'#1e0a14');r(sx+9,sy+5,14,22,'#34121f');r(sx+7,sy+3,4,7,gl);r(sx+21,sy+3,4,7,gl);r(sx+13,sy+11,6,12,gl);r(sx+10,sy+25,12,4,'#0e0610');}
    return;
  }
  if(cur.bg==='sky'){
    if(c==='R'){ // 云隙(虚空):透出深空
      r(sx,sy,T,T,'#1a2640');r(sx+4,sy+5,8,3,'rgba(180,210,255,0.12)');r(sx+18,sy+18,8,3,'rgba(180,210,255,0.10)');return;}
    // 云路:柔白云海 + 飘动流云
    r(sx,sy,T,T,'#bcd4ea');if((i+j)%2)r(sx,sy,T,T,'rgba(255,255,255,0.10)');
    const o=(frame>>4)%2;r(sx+4+o*6,sy+7,11,3,'#eaf4ff');r(sx+16-o*5,sy+21,9,3,'#d4e6f7');
    if(c==='c'){[[5,18],[12,22],[19,16],[23,21],[8,12]].forEach(b=>{r(sx+b[0],sy+b[1],6,2,'#9fb8d8');r(sx+b[0]+1,sy+b[1]-2,4,2,'rgba(255,255,255,0.6)');});}
    else if(c==='S'){r(sx+4,sy+4,24,24,'#9fd0ec');r(sx+8,sy+8,16,16,'#eaf6ff');const k=(frame>>3)%4;r(sx+10+k*3,sy+6+(k*4)%16,3,3,'#ffffff');}
    else if(c==='O'){r(sx+3,sy+3,26,26,'#9fd0ec');r(sx+8,sy+8,16,16,'#eaf6ff');g.fillStyle='#2a4a6a';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='D'){r(sx,sy,T,T,'#8aa8cc');r(sx+3,sy+2,26,30,'#d4e6f7');r(sx+6,sy+5,20,27,'#aac4e0');r(sx+10,sy+8,12,24,'#eaf6ff');r(sx+13,sy+3,6,4,'#ffd23f');r(sx+8,sy+14,3,3,'#ffffff');r(sx+21,sy+14,3,3,'#ffffff');}
    return;
  }
  if(cur.bg==='shrine'){
    if(c==='X'){r(sx,sy,T,T,'#5a708e');r(sx+3,sy+2,26,28,'#7a92b0');r(sx+6,sy+5,20,22,'#6a82a0');r(sx+13,sy+2,6,28,'#d4e6f7');r(sx+14,sy+6,4,6,'#ffffff');r(sx+14,sy+18,4,6,'#ffffff');return;}
    r(sx,sy,T,T,'#cdddf0');if((i+j)%2)r(sx,sy,T,T,'rgba(90,120,160,0.08)');
    r(sx,sy,T,1,'#aac0da');r(sx,sy,1,T,'#aac0da');
    if(c==='O'){r(sx+3,sy+3,26,26,'#aac4e0');r(sx+8,sy+8,16,16,'#eaf6ff');g.fillStyle='#2a4a6a';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='N'){const gl=flags.peng?'#b9c2cc':'#ffd23f';r(sx+6,sy+2,20,28,'#8aa8cc');r(sx+9,sy+5,14,22,'#aac4e0');r(sx+8,sy+4,4,6,gl);r(sx+20,sy+4,4,6,gl);r(sx+13,sy+12,6,10,gl);r(sx+10,sy+24,12,4,'#6a82a0');}
    return;
  }
  if(cur.bg==='cavern'){
    if(c==='R'){r(sx,sy,T,T,'#241608');r(sx+3,sy+4,12,12,'#3e2814');r(sx+16,sy+14,12,12,'#3e2814');r(sx+18,sy+3,9,9,'#1a0e06');r(sx+4,sy+19,9,9,'#1a0e06');return;}
    // 地脉:深褐岩地 + 矿脉微光
    r(sx,sy,T,T,'#332010');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.10)');
    const e=(frame>>4)%2;
    r(sx+22,sy+6,2,2,'rgba(255,160,60,0.4)');r(sx+6+e*4,sy+22,2,2,'rgba(255,200,90,0.35)');
    if(c==='m'){r(sx,sy,T,T,'#3e2810');[[8,8],[20,18],[12,22],[22,7],[5,16]].forEach(b=>{r(sx+b[0],sy+b[1],3,3,'#c47a30');r(sx+b[0]+1,sy+b[1]+1,1,1,'#ffd23f');});}
    else if(c==='S'){r(sx+4,sy+4,24,24,'#6a4a20');r(sx+8,sy+8,16,16,'#caa44a');const k=(frame>>3)%4;r(sx+10+k*3,sy+6+(k*4)%16,3,3,'#ffe8a0');}
    else if(c==='O'){r(sx+3,sy+3,26,26,'#3a2410');r(sx+8,sy+8,16,16,'#7a5a28');r(sx+11,sy+12,10,8,'#ffe0a0');g.fillStyle='#1a0e06';g.font='12px monospace';g.fillText('↑',sx+13,sy+22);}
    else if(c==='D'){r(sx,sy,T,T,'#160c04');r(sx+3,sy+2,26,30,'#3a2410');r(sx+6,sy+5,20,27,'#1a0e06');r(sx+10,sy+8,12,24,'#7a4a1c');r(sx+13,sy+3,6,5,'#ffae40');r(sx+8,sy+14,3,3,'#ffd23f');r(sx+21,sy+14,3,3,'#ffd23f');}
    return;
  }
  if(cur.bg==='core'){
    if(c==='X'){r(sx,sy,T,T,'#1a0e06');r(sx+3,sy+2,26,28,'#3a2410');r(sx+6,sy+5,20,22,'#241608');r(sx+13,sy+2,6,28,'#7a4a1c');r(sx+14,sy+6,4,6,'#ffae40');r(sx+14,sy+18,4,6,'#ffae40');return;}
    r(sx,sy,T,T,'#221408');if((i+j)%2)r(sx,sy,T,T,'rgba(255,150,50,0.05)');
    r(sx,sy,T,1,'#3a2410');r(sx,sy,1,T,'#3a2410');
    if(c==='O'){r(sx+3,sy+3,26,26,'#2a1808');r(sx+8,sy+8,16,16,'#5a3a18');r(sx+11,sy+12,10,8,'#ffe0a0');g.fillStyle='#1a0e06';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='U'){const gl=flags.sovereign?'#9a8a6a':'#ffd23f';r(sx+6,sy+2,20,28,'#1e1206');r(sx+9,sy+5,14,22,'#3a2410');r(sx+7,sy+3,4,7,gl);r(sx+21,sy+3,4,7,gl);r(sx+13,sy+11,6,12,gl);r(sx+10,sy+25,12,4,'#0e0804');}
    return;
  }
  if(cur.bg==='heaven'){
    if(c==='R'){r(sx,sy,T,T,'#cfe0f4');r(sx+4,sy+5,9,3,'rgba(255,255,255,0.85)');r(sx+18,sy+18,9,3,'rgba(255,255,255,0.7)');return;}
    // 云阶:洁白云海 + 金光浮纹
    r(sx,sy,T,T,'#eaf2fb');if((i+j)%2)r(sx,sy,T,T,'rgba(180,200,230,0.18)');
    const o=(frame>>4)%2;r(sx+4+o*6,sy+8,11,2,'#fff');r(sx+16-o*5,sy+22,9,2,'#dce8f6');
    if(c==='c'){[[5,18],[12,22],[19,16],[23,21],[8,12]].forEach(b=>{r(sx+b[0],sy+b[1],5,2,'#ffe98a');r(sx+b[0]+1,sy+b[1]-2,3,2,'#fff6c8');});}
    else if(c==='S'){r(sx+4,sy+4,24,24,'#ffe98a');r(sx+8,sy+8,16,16,'#fffce6');const k=(frame>>3)%4;r(sx+10+k*3,sy+6+(k*4)%16,3,3,'#fff');}
    else if(c==='O'){r(sx+3,sy+3,26,26,'#ffe98a');r(sx+8,sy+8,16,16,'#fffce6');g.fillStyle='#9a7a20';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='D'){r(sx,sy,T,T,'#cfd8e8');r(sx+3,sy+2,26,30,'#fffce6');r(sx+6,sy+5,20,27,'#ffe98a');r(sx+10,sy+8,12,24,'#fff');r(sx+13,sy+3,6,4,'#ffae40');r(sx+8,sy+14,3,3,'#ffd23f');r(sx+21,sy+14,3,3,'#ffd23f');}
    return;
  }
  if(cur.bg==='celestial'){
    if(c==='X'){r(sx,sy,T,T,'#b9c8e0');r(sx+3,sy+2,26,28,'#e6eef8');r(sx+6,sy+5,20,22,'#d2deef');r(sx+13,sy+2,6,28,'#ffe98a');r(sx+14,sy+6,4,6,'#fff');r(sx+14,sy+18,4,6,'#fff');return;}
    r(sx,sy,T,T,'#dde7f4');if((i+j)%2)r(sx,sy,T,T,'rgba(255,220,120,0.10)');
    r(sx,sy,T,1,'#c4d2e6');r(sx,sy,1,T,'#c4d2e6');
    if(c==='O'){r(sx+3,sy+3,26,26,'#cdd9ec');r(sx+8,sy+8,16,16,'#fffce6');g.fillStyle='#9a7a20';g.font='12px monospace';g.fillText('↓',sx+13,sy+22);}
    else if(c==='k'){const gl=flags.emperor?'#b9c2cc':'#ffae40';r(sx+6,sy+2,20,28,'#cdd9ec');r(sx+9,sy+5,14,22,'#fffce6');r(sx+8,sy+4,4,6,gl);r(sx+20,sy+4,4,6,gl);r(sx+13,sy+12,6,10,gl);r(sx+10,sy+24,12,4,'#ffe98a');}
    return;
  }
  if(curName==='tower'){
    if(c==='X'){r(sx,sy,T,T,'#2c2638');r(sx+2,sy+2,12,12,'#241f30');r(sx+18,sy+18,12,12,'#241f30');r(sx+18,sy+2,12,12,'#332b42');r(sx+2,sy+18,12,12,'#332b42');return;}
    r(sx,sy,T,T,'#4a4356');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.07)');
    r(sx,sy,T,1,'#3d374a');r(sx,sy,1,T,'#3d374a');
    if(c==='e'){r(sx,sy,T,T,'#423a52');r(sx+8,sy+8,4,4,'#6e5a9e');r(sx+20,sy+18,4,4,'#6e5a9e');r(sx+12,sy+22,4,4,'#6e5a9e');r(sx+22,sy+6,3,3,'#8a74c4');}
    else if(c==='O'){r(sx+4,sy+4,24,24,'#1c1726');r(sx+8,sy+14,16,4,'#6a6f78');r(sx+8,sy+22,16,4,'#6a6f78');}
    else if(c==='B'){
      if(flags.ch3&&!flags.demon){ // 鬼门:封印裂开,腥红雾气翻涌
        r(sx+4,sy+3,24,26,'#1a0810');r(sx+7,sy+6,18,20,'#3a1424');
        const o=(frame>>3)%3;r(sx+10+o*2,sy+10,5,3,'#ff4a4a');r(sx+16-o*2,sy+18,5,3,'#c43a5a');r(sx+13,sy+14,4,4,'#ff8080');
      }else{const gl=flags.boss?'#ffd76a':'#e24b4a';r(sx+4,sy+14,24,4,gl);r(sx+14,sy+4,4,24,gl);r(sx+8,sy+8,4,4,gl);r(sx+20,sy+20,4,4,gl);}
    }
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
  else if(c==='Y'){ // 第四章:风口(开启前如常草地)
    r(sx,sy,T,T,'#7ab648');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.04)');
    if(flags.ch4&&!flags.peng){ // 旋风柱
      const a=frame*0.16;
      for(let k=1;k<=4;k++){const rad=2+k*3.2,an=a+k*1.1;g.fillStyle=k%2?'#eaf6ff':'#9fb8d8';
        g.fillRect(sx+16+Math.cos(an)*rad-2,sy+9+k*4,4,3);}
      r(sx+12,sy+24,8,4,'#cdddf0');
    }
  }
  else if(c==='q'){ // 第五章:地缝(开启前如常草地)
    r(sx,sy,T,T,'#7ab648');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.04)');
    if(flags.ch5&&!flags.sovereign){ // 裂开的地缝,透出地火
      r(sx+12,sy+2,8,28,'#1a0e08');r(sx+13,sy+4,6,24,'#3a1808');
      const o=(frame>>3)%3;r(sx+14,sy+8+o*4,4,4,'#ff6a20');r(sx+15,sy+18-o*3,3,3,'#ffb030');
    }
  }
  else if(c==='L'){ // 第二部:天梯(开启前如常草地)
    r(sx,sy,T,T,'#7ab648');if((i+j)%2)r(sx,sy,T,T,'rgba(0,0,0,0.04)');
    if(flags.ch6&&!flags.emperor){ // 通天光柱
      r(sx+11,sy,10,T,'rgba(255,233,138,0.35)');r(sx+13,sy,6,T,'#fffce6');
      const o=(frame>>2)%4;r(sx+12,sy+2+o*7,8,3,'#ffd23f');
    }
  }
}
function label(n,sx,sy){
  g.font='13px monospace';
  const w=n.length*13+12;
  g.fillStyle='rgba(0,0,0,0.55)';g.fillRect(sx+16-w/2,sy-17,w,15);
  g.fillStyle='#fff';g.fillText(n,sx+22-w/2,sy-5);
}
// 小朋友看图识意:❤气血 💧灵力 🪙金币(画成形状,保证各平台一致渲染)
function drawHeart(x,y){g.fillStyle='#e24b4a';g.beginPath();g.arc(x+3,y+3,3.2,0,Math.PI*2);g.arc(x+9,y+3,3.2,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(x-0.5,y+4);g.lineTo(x+6,y+11);g.lineTo(x+12.5,y+4);g.closePath();g.fill();}
function drawDrop(x,y){g.fillStyle='#7F77DD';g.beginPath();g.arc(x+6,y+7,4.6,0,Math.PI*2);g.fill();g.beginPath();g.moveTo(x+6,y-1);g.lineTo(x+1.5,y+6);g.lineTo(x+10.5,y+6);g.closePath();g.fill();g.fillStyle='#cfc8f5';g.beginPath();g.arc(x+4,y+6,1.4,0,Math.PI*2);g.fill();}
function drawCoin(x,y){g.fillStyle='#c79a1e';g.beginPath();g.arc(x+6,y+6,6,0,Math.PI*2);g.fill();g.fillStyle='#ffd23f';g.beginPath();g.arc(x+6,y+6,4.6,0,Math.PI*2);g.fill();g.fillStyle='#ffe98a';g.beginPath();g.arc(x+4.2,y+4.2,1.6,0,Math.PI*2);g.fill();}
function drawHUD(){
  r(14,14,306,84,'rgba(18,14,26,0.78)');
  g.font='16px monospace';g.fillStyle='#ffd76a';
  g.fillText('云无衣 Lv'+S.lvl,26,35);
  drawCoin(212,24);g.fillStyle='#ffd76a';g.font='15px monospace';g.fillText(''+S.gold,230,35);
  drawHeart(22,46);
  r(40,46,176,12,'#3a2f3a');r(40,46,Math.max(0,Math.min(176,Math.round(S.hp/S.maxHp*176))),12,'#1D9E75');
  drawDrop(22,64);
  r(40,66,176,12,'#3a2f3a');r(40,66,Math.max(0,Math.min(176,Math.round(S.mp/S.maxMp*176))),12,'#7F77DD');
  g.font='12px monospace';g.fillStyle='#cdd6e0';
  g.fillText(S.hp+'/'+S.maxHp,222,56);g.fillText(S.mp+'/'+S.maxMp,222,76);
}
function drawWorld(){
  r(0,0,SW,SH,cur.bg==='tower'?'#1a1622':cur.bg==='house'?'#16101c':cur.bg==='lake'?'#103642':cur.bg==='palace'?'#081d24':cur.bg==='abyss'?'#1a0c14':cur.bg==='hell'?'#140610':cur.bg==='sky'?'#7fa8d0':cur.bg==='shrine'?'#6a8ab0':cur.bg==='cavern'?'#1a0e06':cur.bg==='core'?'#140a04':cur.bg==='heaven'?'#cfe0f4':cur.bg==='celestial'?'#b9c8e0':'#234d1e');
  const mw=cur.w*T,mh=cur.h*T;
  const vw=SW/WZOOM,vh=SH/WZOOM; // 镜头拉近后实际可见的世界范围
  const camX=mw<=vw?(mw-vw)/2:Math.max(0,Math.min(mw-vw,p.x-vw/2+16));
  const camY=mh<=vh?(mh-vh)/2:Math.max(0,Math.min(mh-vh,p.y-vh/2+16));
  g.save();g.scale(WZOOM,WZOOM);g.translate(-camX,-camY); // 世界层:拉近 + 跟随镜头
  const x0=Math.max(0,Math.floor(camX/T)),y0=Math.max(0,Math.floor(camY/T));
  for(let j=y0;j<=Math.min(cur.h-1,y0+VH);j++)for(let i=x0;i<=Math.min(cur.w-1,x0+VW);i++)drawTile(i,j,i*T,j*T);
  (POIS[curName]||[]).forEach(q=>{
    pix(q.kind,q.x*T,q.y*T,2);
    if(!looted[q.id]&&(frame>>4)%3===0){r(q.x*T+22,q.y*T+2,3,3,'#fff3c0');r(q.x*T+23,q.y*T+3,1,1,'#ffffff');}
  });
  (NPCS[curName]||[]).forEach(n=>{
    shadowEllipse(n.x*T+16,n.y*T+27,11);
    SPR[n.draw](n.x*T,n.y*T-8,2,n.c);label(n.n,n.x*T,n.y*T-8);
    if(n.n==='阿萝'&&aluoNews())drawMarker(n.x*T+16,n.y*T-30); // 头顶!:去找她开下一章
  });
  if(curName==='world'){ // 当前已开启、尚未通关的章节,在入口冒!指路
    if(flags.ch2&&!flags.dragon)drawMarker(24*T+16,14*T+2);
    if(flags.ch3&&!flags.demon)drawMarker(31*T+16,2*T+2);   // 锁妖塔门(鬼门在塔内)
    if(flags.ch4&&!flags.peng)drawMarker(50*T+16,16*T+2);
    if(flags.ch5&&!flags.sovereign)drawMarker(6*T+16,40*T+2);
    if(flags.ch6&&!flags.emperor)drawMarker(16*T+16,16*T+2);
  }
  if(curName==='world'&&!flags.mini){shadowEllipse(31*T+16,13*T+22,13);drawSnakeK(31*T,13*T-12,2);label('蛇妖王',31*T,13*T-12);}
  shadowEllipse(p.x+16,p.y+27,10);
  drawHero(p.x,p.y-8,2,p.mv?Math.floor(frame/8)%2:0);
  for(const w of wpops){
    g.globalAlpha=Math.max(0,1-w.t);
    g.font='bold 16px monospace';g.strokeStyle='#000';g.lineWidth=3;
    g.strokeText(w.txt,w.x-30,w.y);
    g.fillStyle=w.c;g.fillText(w.txt,w.x-30,w.y);
    g.globalAlpha=1;
  }
  g.restore();
  drawMotes(); // 前景氛围浮粒(屏幕空间,慢飘,视差感)
  heroSX=(p.x+16-camX)*WZOOM;heroSY=(p.y+16-camY)*WZOOM; // 触屏寻路:主角的逻辑屏幕坐标(含镜头缩放)
  drawHUD();
  if(CFG.kidMode){ // 右上角小标:让家长一眼看到孩童模式开着
    r(SW-92,16,78,24,'rgba(20,16,30,0.72)');
    g.font='14px monospace';g.fillStyle='#9fe7a0';g.fillText('孩童·护',SW-86,33);
  }
}
function updWorld(dt){
  if(!p.mv){
    let dx=0,dy=0;
    if(K.up)dy=-1;else if(K.down)dy=1;else if(K.left)dx=-1;else if(K.right)dx=1;
    if(!dx&&!dy&&navTouch){ // 触屏:朝手指方向走一步(主轴优先,留死区防抖)
      const ddx=navTouch.x-heroSX,ddy=navTouch.y-heroSY,dead=14;
      if(Math.abs(ddx)>Math.abs(ddy)){if(Math.abs(ddx)>dead)dx=ddx>0?1:-1;}
      else{if(Math.abs(ddy)>dead)dy=ddy>0?1:-1;}
    }
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
  updMotes(dt);
}
function onStep(){
  const c=tileAt(p.tx,p.ty);
  if(c==='S'&&(S.hp<S.maxHp||S.mp<S.maxMp)){S.hp=S.maxHp;S.mp=S.maxMp;sHeal();wpop('灵泉:全恢复!','#9fe7e0');}
  if(c==='D'&&curName==='world'){
    showDialog(['你推开沉重的石门,塔内阴风扑面……'],()=>switchMap('tower',11,25));
    return;
  }
  if(c==='V'&&flags.ch2){diveLake();return;}
  if(c==='Y'&&flags.ch4){ascendSky();return;}
  if(c==='q'&&flags.ch5){descendCave();return;}
  if(c==='L'&&flags.ch6){ascendHeaven();return;}
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
    }else if(flags.ch3&&!flags.demon){ // 第三章:封印之下竟藏着通往妖界的鬼门
      enterAbyss();
    }else wpop('封印安然无恙','#ffd76a');
    return;
  }
  if(c==='M'){ // 第三章:魔尊王座
    if(!flags.demon){
      showDialog([
        '殿堂尽头,一尊巨影自骨座上缓缓睁眼,雷光在它角间游走。',
        {n:'阿萝',t:'师兄,它就是操纵妖王和蛟龙的混沌魔尊!它属雷——用烈焰咒,火克雷!'},
        {n:'混沌魔尊',t:'蝼蚁也敢登我殿堂?连同你这一身五灵,我一并吞了!'}
      ],()=>startBattle('demon',true));
    }else wpop('魔殿一片死寂','#9a9aa8');
    return;
  }
  if(c==='k'){ // 第二部:天帝王座(全剧终 Boss)
    if(!flags.emperor){
      showDialog([
        '灵霄殿顶,金光大盛,一位执掌五灵的天帝自玉座上俯视而下。',
        {n:'阿萝',t:'师兄……原来纵着这一切的,是天帝。它身随心变,五灵轮转,寻常克制压不住它!'},
        {n:'玄穹天帝',t:'凡尘蝼蚁,也敢登我灵霄?五灵在我,生杀由我——伏诛吧。'},
        {n:'阿萝',t:'用五灵归元!万法归一,不分属性,它怎么变都拦不住!我陪你,打到底!'}
      ],()=>startBattle('emperor',true));
    }else wpop('灵霄殿万里无云','#fffce6');
    return;
  }
  if(c==='N'){ // 第四章:大鹏王座
    if(!flags.peng){
      showDialog([
        '殿顶罡风骤起,一只通天巨鹏抖开双翅,翅下卷起飓风。',
        {n:'阿萝',t:'是大鹏妖王!它御风而行,寻常招式近不得身——用土灵咒,土克风,镇住它的翅!'},
        {n:'大鹏妖王',t:'区区地行之辈,也敢登我九霄?随风去吧!'}
      ],()=>startBattle('peng',true));
    }else wpop('云殿风平浪静','#cdddf0');
    return;
  }
  if(c==='U'){ // 第五章:后土王座(全剧终 Boss)
    if(!flags.sovereign){
      showDialog([
        '地心深处,一尊以山岩为甲的巨君自王座上起身,熔岩顺着它的躯壳流淌。',
        {n:'阿萝',t:'就是它……乱源之根,后土魔君!它属土,镇压万物——用紫雷咒,雷克土,这是最后一战了!'},
        {n:'后土魔君',t:'妖王、蛟龙、魔尊、大鹏……皆是我之指爪。如今你也将归于尘土。'},
        {n:'阿萝',t:'师兄,五灵在你手中圆满。我陪着你——一起,了结它!'}
      ],()=>startBattle('sovereign',true));
    }else wpop('地心归于沉寂','#9a8a6a');
    return;
  }
  if(curName==='world'&&!flags.mini&&p.ty===14&&(p.tx===31||p.tx===32)){
    showDialog([
      {n:'???',t:'嘶嘶——此桥是我开,要过去,先问问我的毒牙。'},
      '蛇妖王挡住了去路!'
    ],()=>startBattle('snakeKing',true));
    return;
  }
  if(c==='t'||c==='e'||c==='c'||c==='m'){ // 深草 / 符纹地 / 水草 / 魔纹:遇敌地形
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
// 第三章:踏入封印之下的鬼门,坠入妖界魔渊(首次有旁白)
function enterAbyss(){
  if(!flags.abyssIntro){
    flags.abyssIntro=true;
    showDialog([
      '封印的金光裂开一道缝隙,缝里翻涌着腥红的雾——那是一道鬼门。',
      {n:'阿萝',t:'妖王和蛟龙,都不过是它的爪牙……师兄,这一关,我们一起闯过去!'},
      '你与阿萝并肩跨入鬼门,脚下是望不见底的魔渊。',
      '(魔纹地会遇上魔物;邪泉可回满状态。北面的魔殿,便是混沌魔尊的所在。)'
    ],()=>switchMap('abyss',14,21));
  }else switchMap('abyss',14,21);
}
// 第四章:乘风口直上九霄云海(首次有旁白)
function ascendSky(){
  if(!flags.skyIntro){
    flags.skyIntro=true;
    showDialog([
      '风口卷起一道盘旋的旋风,托着你与阿萝扶摇直上,穿过云层,踏上了茫茫云海。',
      {n:'阿萝',t:'好高啊……这就是九霄。脚下踩的都是云,可别踩空了。'},
      '(罡风带里会遇上风妖;风眼灵泉可回满状态。云海北端的风窟,便是大鹏妖王的巢。)'
    ],()=>switchMap('sky',14,21));
  }else switchMap('sky',14,21);
}
// 第五章:坠入村西地缝,深入黄泉地心(首次有旁白)
function descendCave(){
  if(!flags.caveIntro){
    flags.caveIntro=true;
    showDialog([
      '地缝裂开,一股灼热的地气扑面而来。你与阿萝顺着嶙峋的岩壁,一路下到黄泉地心。',
      {n:'阿萝',t:'越往下,这股镇压万物的气息越重……乱源,就在这底下。'},
      '(矿脉地会遇上土妖;地泉可回满状态。地心尽头的后土殿,藏着这一切的根源。)'
    ],()=>switchMap('cavern',14,21));
  }else switchMap('cavern',14,21);
}
// 第二部:踏天梯飞升天界云阙(首次有旁白)
function ascendHeaven(){
  if(!flags.tianIntro){
    flags.tianIntro=true;
    showDialog([
      '天梯的金光将你与阿萝托起,云海在脚下退去,眼前是金阙玉宇、仙气缭绕的天界。',
      {n:'阿萝',t:'真的上来了……这里就是天界。守门的天将都不好惹,小心些。'},
      '(罡气带里会遇上天将,各有属性;仙泉可回满。云阙北端的灵霄门后,便是天帝。)'
    ],()=>switchMap('heaven',14,21));
  }else switchMap('heaven',14,21);
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
  else if(!flags.ch3){ // 第三章开篇:揭示幕后魔尊,指向锁妖塔鬼门
    flags.ch3=true;
    showDialog([
      {n:'阿萝',t:'师兄,我查过古卷……妖王和蛟龙,都是被同一个东西驱使的爪牙。'},
      {n:'阿萝',t:'锁妖塔的封印之下,藏着一道通往妖界的鬼门。幕后真凶——混沌魔尊,就困在里头。'},
      {n:'阿萝',t:'它属雷,凶得很。你把五灵术修到大成,火灵咒会化作烈焰咒,火克雷,正好克它!'},
      {n:'阿萝',t:'回锁妖塔,踏上塔心那道裂开的封印。这一回,我陪你闯妖界!'}
    ]);
    save();
  }
  else if(!flags.demon)showDialog([{n:'阿萝',t:'鬼门就在锁妖塔塔心的封印处。魔渊里魔物属性各异,记得换着咒法打——魔尊属雷,烈焰咒最克它!'}]);
  else if(!flags.ch4){ // 第四章开篇:魔尊一除,九霄失镇,阿萝传授土灵咒
    flags.ch4=true;flags.earth=true;
    showDialog([
      {n:'阿萝',t:'师兄,不好了!混沌魔尊一除,镇着天地的五灵失了平衡——这回是天上。'},
      {n:'阿萝',t:'九霄之上,大鹏妖王挟着罡风,要把灵山连根掀了。它御风而行,寻常剑招近不得身。'},
      {n:'阿萝',t:'你五灵里独缺一门土。我把祖传的「土灵咒」传你——土能克风,正好镇它的翅!'},
      '【习得仙术 · 土灵咒】五灵自此圆满!',
      {n:'阿萝',t:'湖畔起了道风口,能直上九霄。走,我陪你上天去会会那只大鸟!'}
    ]);
    save();
  }
  else if(!flags.peng)showDialog([{n:'阿萝',t:'风口在湖畔东边。云海里风妖都属风——土灵咒一出,个个现形!大鹏妖王也一样。'}]);
  else if(!flags.ch5){ // 第五章开篇:乱源之根在地心,村西地缝裂开
    flags.ch5=true;
    showDialog([
      {n:'阿萝',t:'师兄,我把古卷翻到了最后一页……妖王、蛟龙、魔尊、大鹏,全是同一个根上长出的爪牙。'},
      {n:'阿萝',t:'乱源之根,叫「后土魔君」,镇在黄泉地心。它一动,五灵就乱。要彻底了结,只能下去拔掉这根。'},
      {n:'阿萝',t:'它属土,雷克土——你那道紫雷咒,正是为它备的。村西的地,刚裂开一道地缝。'},
      {n:'阿萝',t:'这是最后一程了。师兄……我们一起,走到底。'}
    ]);
    save();
  }
  else if(!flags.sovereign)showDialog([{n:'阿萝',t:'地缝在村子西边。地心里土妖成群,紫雷咒最克它们;那只熔岩兽属火,玄冰咒伺候。后土魔君,也属土!'}]);
  else if(!flags.ch6){ // 第二部开篇:后土只是表象,乱源在天上;阿萝传授五灵归元
    flags.ch6=true;flags.wuling=true;
    showDialog([
      {n:'阿萝',t:'师兄,我夜观星象……后土魔君也只是被人推出来的。真正纵着这一切的,在天上。'},
      {n:'阿萝',t:'天界的天帝执掌五灵,身随心变。要上去理论,得有一道不分属性的法门。'},
      {n:'阿萝',t:'我把师门最后一道绝学「五灵归元」传你——万法归一,无视属性,它怎么变都克得住!'},
      '【习得仙术 · 五灵归元】(无属性大招,灵力耗得多,但稳)',
      {n:'阿萝',t:'湖畔升起了一道天梯。走,这一回我们上天去!'}
    ]);
    save();
  }
  else if(!flags.emperor)showDialog([{n:'阿萝',t:'天梯在湖畔。天将属性各异,挨个用克它的咒;天帝会变属性,认准了用五灵归元最稳!'}]);
  else showDialog([{n:'阿萝',t:'天帝也伏诛了……三界与天界都太平了。师兄,真正的故事,到这儿才算圆满。'}]);
}
// 第二部:阿萝随你闯天界
function talkAluoHeaven(){
  if(!flags.emperor)showDialog([
    {n:'阿萝',t:'顺着云阶往北就是灵霄门。天火神兵属火、玄水仙官属水、紫雷天君属雷、金刚神将属土——挨个克。'},
    {n:'阿萝',t:'天帝身随心变,看准它当下的属性再出手,拿不准就甩五灵归元,无视属性!'}
  ]);
  else showDialog([{n:'阿萝',t:'天界也安宁了。师兄,我们回灵山吧——回家。'}]);
}
// 第四章:阿萝随你闯云海
function talkAluoSky(){
  if(!flags.peng)showDialog([
    {n:'阿萝',t:'顺着云路往北就是风窟。罡风鬼、云鹏、风狸王都属风——土灵咒最克它们!'},
    {n:'阿萝',t:'只有霹雳鸟属雷,留着烈焰咒招呼它。撑不住就回风眼灵泉歇口气。'}
  ]);
  else showDialog([{n:'阿萝',t:'风停了,云海也静了。师兄,我们下去吧。'}]);
}
// 第五章:阿萝随你下黄泉
function talkAluoCave(){
  if(!flags.sovereign)showDialog([
    {n:'阿萝',t:'顺着矿脉往北就是后土殿。山魈圣、石煞、地裂魔都属土——紫雷咒一道道劈下去最痛快!'},
    {n:'阿萝',t:'熔岩兽属火,改用玄冰咒。后土魔君属土,留足灵力给紫雷咒。师兄,我就在你身边。'}
  ]);
  else showDialog([{n:'阿萝',t:'地心静了,腥气也散了。师兄,我们回家——回灵山。'}]);
}
// 第二章:阿萝在湖底剧情同行(随进度变化的台词)
function talkAluoLake(){
  if(!flags.dragon)showDialog([
    {n:'阿萝',t:'顺着水草往北走就是水府门。当心,墨鱼妖最快,先用风灵咒点它!'},
    {n:'阿萝',t:'那只龟将军壳硬属土——对它改用雷灵咒,事半功倍。'}
  ]);
  else showDialog([{n:'阿萝',t:'湖水退下去了,水府也安静了。师兄,我们回村报喜吧!'}]);
}
// 第三章:阿萝随你闯魔渊(战前提点全套克制打法)
function talkAluoAbyss(){
  if(!flags.demon)showDialog([
    {n:'阿萝',t:'顺着魔纹往北就是魔殿。焰魔属火、玄阴鬼属水、魔将属土、雷狱卒属雷——挨个用克它的咒最省力!'},
    {n:'阿萝',t:'撑不住就退回邪泉边回气。魔尊属雷,灵力留着给烈焰咒!'}
  ]);
  else showDialog([{n:'阿萝',t:'魔渊的腥气散尽了。师兄,我们回家吧。'}]);
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
function shopRow(icon,n,d,pr,fn){
  return '<div class="srow"><div><b><span style="font-size:19px">'+icon+'</span> '+n+'</b><span>'+d+'</span></div><button class="pbtn" onclick="'+fn+'">🪙 '+pr+'</button></div>';
}
function openShop(kind){
  let h='<h3>'+(kind==='item'?'🛒 杂货铺':'⚒️ 铁匠铺')+'</h3><div class="gold">🪙 银两:'+S.gold+'</div>';
  if(kind==='item'){
    h+=shopRow('❤️','回灵丹','恢复 '+healAmt('dan')+' 气血(现有 '+INV.dan+')',30,"buyItem('dan',30)");
    h+=shopRow('💙','清心散','恢复 '+healAmt('qing')+' 灵力(现有 '+INV.qing+')',30,"buyItem('qing',30)");
    h+=shopRow('💖','大还丹','气血全满(现有 '+INV.dadan+')',90,"buyItem('dadan',90)");
  }else{
    // 只列出已按等级解锁的装备;下一档未解锁的给个「🔒 升级解锁」提示,让孩子有奔头
    let lockW=null;
    for(let i=1;i<WPNS.length;i++){
      if(S.lvl>=WPNS[i].lvl)h+=shopRow('⚔️',WPNS[i].n,'攻击 +'+WPNS[i].a+(EQ.wpn===i?' · 已装备':EQ.wpn>i?' · 已淘汰':''),WPNS[i].p,'buyWpn('+i+')');
      else if(!lockW)lockW=WPNS[i];
    }
    if(lockW)h+='<div class="srow"><div><b>🔒 '+lockW.n+'</b><span>升到 Lv'+lockW.lvl+' 解锁(攻击 +'+lockW.a+')</span></div></div>';
    let lockA=null;
    for(let i=1;i<ARMS.length;i++){
      if(S.lvl>=ARMS[i].lvl)h+=shopRow('🛡️',ARMS[i].n,'防御 +'+ARMS[i].d+(EQ.arm===i?' · 已装备':EQ.arm>i?' · 已淘汰':''),ARMS[i].p,'buyArm('+i+')');
      else if(!lockA)lockA=ARMS[i];
    }
    if(lockA)h+='<div class="srow"><div><b>🔒 '+lockA.n+'</b><span>升到 Lv'+lockA.lvl+' 解锁(防御 +'+lockA.d+')</span></div></div>';
  }
  h+='<button class="pbtn" onclick="closePanel()">🚪 离开</button>';
  openPanel(h);
}
function buyItem(k,pr){
  if(S.gold<pr){toast('银两不够……');return;}
  S.gold-=pr;INV[k]++;sHeal();openShop('item');
}
function buyWpn(i){
  if(S.lvl<WPNS[i].lvl){toast('等级不够,先升级');return;}
  if(EQ.wpn>=i){toast('已有更好的剑了');return;}
  if(S.gold<WPNS[i].p){toast('银两不够……');return;}
  S.gold-=WPNS[i].p;EQ.wpn=i;sLvl();toast('已装备 '+WPNS[i].n);save();openShop('gear');
}
function buyArm(i){
  if(S.lvl<ARMS[i].lvl){toast('等级不够,先升级');return;}
  if(EQ.arm>=i){toast('已有更好的护甲了');return;}
  if(S.gold<ARMS[i].p){toast('银两不够……');return;}
  S.gold-=ARMS[i].p;EQ.arm=i;sLvl();toast('已装备 '+ARMS[i].n);save();openShop('gear');
}
function openStatus(){
  const ups=Object.values(SKILL_UP);
  const known=SKILLS.filter(skillKnown).map(s=>ELEMOJI[s.el]+s.n+(ups.includes(s.n)?'↑':'')).join('  ');
  openPanel('<h3>⭐ 状态</h3>'+
    '<div class="srow"><div><b>⭐ 等级 '+S.lvl+'</b><span>经验 '+S.exp+' / '+(S.lvl*45)+'</span></div></div>'+
    '<div class="srow"><div><b>❤️ 气血 '+S.hp+'/'+S.maxHp+'</b><span>💙 灵力 '+S.mp+'/'+S.maxMp+'</span></div></div>'+
    '<div class="srow"><div><b>⚔️ 攻击 '+atkP()+' · 🛡️ 防御 '+defP()+'</b><span>'+WPNS[EQ.wpn].n+' / '+ARMS[EQ.arm].n+'</span></div></div>'+
    '<div class="srow"><div><b>✨ 仙术</b><span>'+known+'</span></div></div>'+
    '<div class="srow"><div><b>难度 · '+(CFG.kidMode?'孩童模式':'普通模式')+'</b><span>'+(CFG.kidMode?'伤害减半 · 丹药翻倍':'家长可开启孩童模式护着孩子')+'</span></div><button class="pbtn" onclick="openKidMode()">家长设置</button></div>'+
    '<button class="pbtn" onclick="closePanel()">🔙 关闭</button>');
}
// 背包:大图标看物品,场外也能吃药回血/回灵力(给小朋友)
function openBag(){
  const useBtn=(k,full)=>'<button class="pbtn" onclick="useField(\''+k+'\')">'+(full?'喝':'用')+'</button>';
  openPanel('<h3>🎒 背包</h3>'+
    '<div class="srow"><div><b><span style="font-size:21px">❤️</span> 回灵丹 ×'+INV.dan+'</b><span>恢复 '+healAmt('dan')+' 气血</span></div>'+useBtn('dan')+'</div>'+
    '<div class="srow"><div><b><span style="font-size:21px">💖</span> 大还丹 ×'+INV.dadan+'</b><span>气血全满</span></div>'+useBtn('dadan')+'</div>'+
    '<div class="srow"><div><b><span style="font-size:21px">💙</span> 清心散 ×'+INV.qing+'</b><span>恢复 '+healAmt('qing')+' 灵力</span></div>'+useBtn('qing')+'</div>'+
    '<div class="srow"><div><b><span style="font-size:21px">⚔️</span> '+WPNS[EQ.wpn].n+'</b><span>攻击 +'+WPNS[EQ.wpn].a+'</span></div></div>'+
    '<div class="srow"><div><b><span style="font-size:21px">🛡️</span> '+ARMS[EQ.arm].n+'</b><span>防御 +'+ARMS[EQ.arm].d+'</span></div></div>'+
    '<div class="srow"><div><b><span style="font-size:21px">🪙</span> 银两</b><span>买东西用的钱</span></div><b style="font-size:17px">'+S.gold+'</b></div>'+
    '<button class="pbtn" onclick="closePanel()">🔙 关闭</button>');
}
// 场外用药(战斗外回血/回灵力)
function useField(k){
  if((INV[k]||0)<1){toast('没有了……');return;}
  if(k==='dan'){if(S.hp>=S.maxHp){toast('气血已经满了');return;}INV.dan--;const h=Math.min(healAmt('dan'),S.maxHp-S.hp);S.hp+=h;wpop('+'+h,'#7CFC9A');}
  else if(k==='dadan'){if(S.hp>=S.maxHp){toast('气血已经满了');return;}INV.dadan--;const h=S.maxHp-S.hp;S.hp=S.maxHp;wpop('+'+h,'#7CFC9A');}
  else{if(S.mp>=S.maxMp){toast('灵力已经满了');return;}INV.qing--;const m=Math.min(healAmt('qing'),S.maxMp-S.mp);S.mp+=m;wpop('+'+m+' 灵力','#bfa7ff');}
  sHeal();save();openBag();
}
// 一键保存(菜单大按钮,给小朋友看得见的反馈)
function quickSave(){save();toast('💾 已保存!');}
function doSave(){save();toast('💾 已保存!');closePanel();}
// 孩童模式 · 家长锁:配置存独立 key,不随存档/重开走
function loadCfg(){try{const c=JSON.parse(localStorage.getItem('lingshan_cfg'));if(c){CFG.kidMode=!!c.kidMode;CFG.pwd=c.pwd||'';}}catch(e){}}
function saveCfg(){try{localStorage.setItem('lingshan_cfg',JSON.stringify(CFG));}catch(e){}}
function openKidMode(){
  const on=CFG.kidMode,first=!CFG.pwd;
  let h='<h3>家长设置 · 难度</h3>';
  h+='<div class="gold">当前:'+(on?'孩童模式(伤害减半 · 丹药翻倍)':'普通模式')+'</div>';
  if(first)h+='<div class="srow"><div><span>第一次使用:先设一个家长密码。之后要改难度,都得先输这个密码——孩子就改不动啦。</span></div></div>';
  h+='<input id="pwIn" type="password" inputmode="numeric" autocomplete="off" placeholder="'+(first?'设置家长密码':'输入家长密码')+'">';
  h+='<button class="pbtn" onclick="'+(first?'setKidPwd()':'applyKidMode()')+'">'+(on?'关闭孩童模式':'开启孩童模式')+(first?'(并设密码)':'')+'</button>';
  if(!first)h+=' <span style="color:#6e6655;font-size:11px;">忘了密码?清除浏览器网站数据可重置</span>';
  h+='<div style="margin-top:6px;"><button class="pbtn" onclick="openStatus()">返回</button></div>';
  openPanel(h);
  setTimeout(()=>{const e=$('pwIn');if(e&&e.focus)e.focus();},60);
}
function setKidPwd(){
  const v=(($('pwIn')||{}).value||'').trim();
  if(!v){toast('密码不能为空');return;}
  CFG.pwd=v;CFG.kidMode=!CFG.kidMode;saveCfg();
  toast(CFG.kidMode?'已开启孩童模式':'已关闭孩童模式');openStatus();
}
function applyKidMode(){
  const v=(($('pwIn')||{}).value||'').trim();
  if(v!==CFG.pwd){toast('密码不对,未改动');return;}
  CFG.kidMode=!CFG.kidMode;saveCfg();
  toast(CFG.kidMode?'已开启孩童模式':'已关闭孩童模式');openStatus();
}
// 多档案(分开存档,给每个孩子一份):每个档位一个存档 key
let slot=0;                                  // 当前档位 0..2
const PROFAV=['🦊','🐰','🐻'];               // 每档固定小动物头像(不识字也能认出自己那档)
const PROFCOL=['#e7913a','#4f9fd8','#9a7ad0'];
let profNames=['','',''];                    // 各档名字(家长在 iPad 上自己起,只存本机,不进源码)
function saveKey(i){return 'lingshan1_p'+(i==null?slot:i);}
function save(){
  try{localStorage.setItem(saveKey(),JSON.stringify({S:S,INV:INV,EQ:EQ,flags:flags,looted:looted,map:curName,x:p.tx,y:p.ty}));}catch(e){}
}
function loadSave(){
  try{
    const d=JSON.parse(localStorage.getItem(saveKey()));
    if(!d)return false;
    Object.assign(S,d.S);Object.assign(INV,d.INV);Object.assign(EQ,d.EQ);Object.assign(flags,d.flags);
    for(const k in looted)delete looted[k];
    Object.assign(looted,d.looted||{});
    switchMap(d.map||'world',d.x,d.y);
    return true;
  }catch(e){return false;}
}
function hasSave(i){try{return !!localStorage.getItem(saveKey(i));}catch(e){return false;}}
// 读取某档进度概要(等级 / 第几章),用于档案卡显示
function slotMeta(i){
  try{const d=JSON.parse(localStorage.getItem(saveKey(i)));if(!d)return null;
    const f=d.flags||{},ch=f.sovereign?5:f.demon||f.ch5?5:f.peng||f.ch4?4:f.dragon||f.ch3?3:f.boss||f.ch2?2:1;
    return {lvl:(d.S&&d.S.lvl)||1,chap:ch};}catch(e){return null;}
}
function loadProfiles(){
  try{const c=JSON.parse(localStorage.getItem('lingshan_profiles'));if(c&&c.names)profNames=c.names.slice(0,3);}catch(e){}
  while(profNames.length<3)profNames.push('');
  // 迁移:旧的单一存档 lingshan1 → 第一档,免得之前的进度丢了
  try{if(localStorage.getItem('lingshan1')&&!localStorage.getItem('lingshan1_p0')){
    localStorage.setItem('lingshan1_p0',localStorage.getItem('lingshan1'));
    if(!profNames[0])profNames[0]='小侠客';saveProfiles();
  }}catch(e){}
}
function saveProfiles(){try{localStorage.setItem('lingshan_profiles',JSON.stringify({names:profNames}));}catch(e){}}
function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
// 渲染标题页的「谁在玩」三张档案卡
function renderProfiles(){
  let h='';
  for(let i=0;i<3;i++){
    const meta=slotMeta(i),named=!!profNames[i];
    const sub=meta?('Lv'+meta.lvl+' · 第'+meta.chap+'章'):(named?'新的冒险':'➕ 新玩家');
    h+='<div class="pslot" style="border-color:'+PROFCOL[i]+'">'+
       '<button class="pslot-go" onclick="pickProfile('+i+')">'+
       '<span class="pav" style="background:'+PROFCOL[i]+'">'+PROFAV[i]+'</span>'+
       '<span class="pinfo"><b>'+(named?esc(profNames[i]):'空位')+'</b><span>'+sub+'</span></span>'+
       '</button><button class="pslot-edit" onclick="manageProfile('+i+')" aria-label="设置">✏️</button></div>';
  }
  if($('profSlots'))$('profSlots').innerHTML=h;
}
function enterGame(fresh){
  au();$('title').style.display='none';mode='world';
  if(fresh)showDialog(['第一章 · 锁妖塔',{n:'阿萝',t:'师兄!出大事了,快来村口找我!'},'(撞上村民即可对话;先去找阿萝吧)']);
}
function pickProfile(i){
  au();slot=i;
  if(hasSave(i)){loadSave();enterGame(false);}
  else if(profNames[i]){resetState();save();enterGame(true);}  // 已命名但无存档 → 开新档
  else openNameProfile(i);                                      // 空档 → 先起名
}
function openNameProfile(i){
  openPanel('<h3>'+PROFAV[i]+' 新玩家</h3><div class="gold">给小侠客起个名字(给爸爸妈妈填):</div>'+
    '<input id="pnameIn" type="text" maxlength="8" autocomplete="off" placeholder="名字">'+
    '<button class="pbtn" onclick="confirmNewProfile('+i+')">▶ 开始冒险</button> '+
    '<button class="pbtn" onclick="closePanel()">返回</button>');
  setTimeout(()=>{const e=$('pnameIn');if(e&&e.focus)e.focus();},60);
}
function confirmNewProfile(i){
  const v=(($('pnameIn')||{}).value||'').trim().slice(0,8)||PROFAV[i];
  profNames[i]=v;saveProfiles();closePanel();
  slot=i;resetState();save();enterGame(true);
}
function manageProfile(i){
  const meta=slotMeta(i);
  openPanel('<h3>'+PROFAV[i]+' '+esc(profNames[i]||'空档')+'</h3>'+
    (meta?'<div class="gold">进度:Lv'+meta.lvl+' · 第'+meta.chap+'章</div>':'<div class="gold">还没开始冒险</div>')+
    '<input id="pnameIn" type="text" maxlength="8" autocomplete="off" placeholder="名字" value="'+esc(profNames[i]||'')+'">'+
    '<button class="pbtn" onclick="renameProfile('+i+')">✏️ 改名</button>'+
    (meta?' <button class="pbtn" onclick="restartProfile('+i+')">🔄 这档重来(家长)</button>':'')+
    '<div style="margin-top:6px;"><button class="pbtn" onclick="closePanel();renderProfiles()">返回</button></div>');
  setTimeout(()=>{const e=$('pnameIn');if(e&&e.focus)e.focus();},60);
}
function renameProfile(i){
  const v=(($('pnameIn')||{}).value||'').trim().slice(0,8);if(!v){toast('名字不能空');return;}
  profNames[i]=v;saveProfiles();closePanel();renderProfiles();
}
function restartProfile(i){
  if(CFG.pwd){const p=prompt('请输入家长密码:');if(p==null)return;if(p!==CFG.pwd){toast('密码不对,未改动');return;}}
  try{localStorage.removeItem(saveKey(i));}catch(e){}
  toast('已清空这档进度');closePanel();renderProfiles();
}
function resetState(){
  Object.assign(S,{hp:70,maxHp:70,mp:36,maxMp:36,lvl:1,exp:0,gold:80});
  Object.assign(INV,{dan:3,dadan:0,qing:1});
  EQ.wpn=0;EQ.arm=0;
  flags.aluo=false;flags.mini=false;flags.boss=false;
  flags.ch2=false;flags.wind=false;flags.lakeIntro=false;flags.dragon=false;
  flags.ch3=false;flags.abyssIntro=false;flags.demon=false;
  flags.ch4=false;flags.earth=false;flags.skyIntro=false;flags.peng=false;
  flags.ch5=false;flags.caveIntro=false;flags.sovereign=false;
  flags.ch6=false;flags.wuling=false;flags.tianIntro=false;flags.emperor=false;
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
  $('endText').textContent='墨蛟龙王化作一池清水,湖面重归平静,月影粼粼。阿萝挽住你的衣袖,笑着说还要陪你走更远的路——灵山的传说,仍未完待续。';
  $('endov').style.display='flex';
  sWin();
}
function showEnding3(){
  if($('endTitle'))$('endTitle').textContent='第三章 · 完';
  $('endText').textContent='混沌魔尊在五灵齐轰下崩散成漫天流光,鬼门轰然闭合。云无衣与阿萝并肩走出锁妖塔——可妖魂散尽时,大地却隐隐震颤,镇压天地的五灵失了平衡。新的风波,正在天地之间酝酿……';
  $('endov').style.display='flex';
  sWin();
}
function showEnding4(){
  if($('endTitle'))$('endTitle').textContent='第四章 · 完';
  $('endText').textContent='大鹏妖王折翼坠落,化作一缕清风消散,云海重归澄澈。云无衣与阿萝乘风而下、脚踏实地——可阿萝总望着脚下的土地出神,仿佛深处还有什么,正在低低地轰鸣。';
  $('endov').style.display='flex';
  sWin();
}
function showEnding5(){
  if($('endTitle'))$('endTitle').textContent='第一部 · 完';
  $('endText').textContent='后土魔君崩解为漫天尘光,五灵归位,人间重归太平。可阿萝抬头望向云端,神色凝重——这五场浩劫,竟像是被一只无形的手推着发生的。她低声道:「师兄,真正纵着这一切的,只怕……在天上。」灵山的故事,还没有真正结束。';
  $('endov').style.display='flex';
  sWin();
}
function showEnding6(){
  if($('endTitle'))$('endTitle').textContent='全 剧 终';
  $('endText').textContent='玄穹天帝在五灵归元的万道金光中崩散,灵霄殿的金光归于澄澈,天界、三界,尽数归于太平。云无衣与阿萝并肩立于云端,脚下是他们一路走过的山川湖海。从锁妖塔的第一缕妖气,到灵霄殿的最后一道天光——这一整段传说,自此圆满落幕。多谢你,陪云无衣和阿萝走完了整条路。再会。';
  $('endov').style.display='flex';
  sWin();
}
$('btnRoam').onclick=()=>{$('endov').style.display='none';if(aluoNews())showDialog(['🎉 这一章通关啦!回村口找阿萝(她头上有 ❗),她会带你进下一关!']);};
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
// 触屏寻路:在画布上按住,主角朝手指方向走;对话时点屏幕任意处翻页(给不会用方向键的小朋友)
function canvasXY(e){const r=cv.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*SW,y:(e.clientY-r.top)/r.height*SH};}
cv.addEventListener('pointerdown',e=>{
  au();
  if($('panel').style.display==='flex'||$('endov').style.display==='flex')return; // 面板/结局自有按钮
  if($('dlg').style.display==='block'){nextDlg();e.preventDefault();return;}        // 点哪都能推进对话
  if(mode!=='world')return;
  navTouch=canvasXY(e);e.preventDefault();
  try{cv.setPointerCapture(e.pointerId);}catch(err){}
});
cv.addEventListener('pointermove',e=>{if(navTouch)navTouch=canvasXY(e);});
['pointerup','pointercancel','pointerleave'].forEach(ev=>cv.addEventListener(ev,()=>{navTouch=null;}));
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
$('btnBag').onclick=()=>{au();if(mode==='world')openBag();};
$('btnStat').onclick=()=>{au();if(mode==='world')openStatus();};
$('btnSave').onclick=()=>{au();if(mode==='world')quickSave();};
$('btnMus').onclick=()=>{au();setMusic(!musicOn);};
loadCfg();
loadProfiles();renderProfiles(); // 标题页显示三张档案卡(谁在玩)
battleUI(false);

let last=performance.now();
function loop(now){
  const dt=Math.min(0.05,(now-last)/1000);
  last=now;frame++;
  g.setTransform(SS,0,0,SS,0,0); // 每帧重置为超采样基准变换(逻辑 960×640 → 高分后备画布)
  if(mode==='title')drawTitleBg(dt);
  else if(mode==='world'){
    if($('dlg').style.display!=='block'&&$('panel').style.display!=='flex'&&$('endov').style.display!=='flex')updWorld(dt);
    drawWorld();
  }
  else if(mode==='battle'&&B){updBattle(dt);drawBattle();}
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
