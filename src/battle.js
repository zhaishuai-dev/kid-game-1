'use strict';
// ===== 战斗层:回合制战斗状态机 + 战斗绘制 =====
let B=null;
function battleUI(on){
  $('btl').style.display=on?'flex':'none';
  $('dpad').style.display=on?'none':'grid';
  refreshBtns();
}
function refreshBtns(){
  const en=mode==='battle'&&B&&B.phase==='cmd';
  ['batk','bskl','bitm','bfle'].forEach(id=>{$(id).disabled=!en;});
}
function startBattle(key,boss){
  const d=ENM[key];
  const hp=d.hp+(boss?0:S.lvl*4);
  B={
    e:{name:d.n,el:d.el,hp:hp,maxHp:hp,atk:d.atk+(boss?0:Math.floor(S.lvl/2)),exp:d.exp,gold:d.gold,draw:d.draw,s:d.s,gw:d.gw||16,caster:d.caster},
    key:key,boss:!!boss,phase:'cmd',hOx:0,eOx:0,fE:0,fH:0,shake:0,pops:[],anim:null,timer:0,turn:0,msg:d.n+' 出现了!'
  };
  mode='battle';grace=2;battleUI(true);
  tone(90,0.3,'sawtooth',0.07,40);
}
function bmsg(t){if(B)B.msg=t;}
function pop(x,y,txt,c){if(B)B.pops.push({x:x,y:y,txt:txt,c:c,t:0});}
function advMult(a,d){if(a==='无')return 1;if(CK[a]===d)return 1.5;if(CK[d]===a)return 0.7;return 1;}
function dealE(d,c){
  B.e.hp-=d;B.fE=0.18;B.shake=0.22;
  pop(330,220,'-'+d,c||'#fff');sHit();
}
function afterPlayer(){
  if(B.e.hp<=0){winB();return;}
  B.phase='wait';B.timer=0.55;refreshBtns();
}
function act(a){
  if(!B||B.phase!=='cmd')return;
  au();
  if(a==='atk'){B.phase='anim';B.anim={k:'lunge',t:0};sSwing();}
  else if(a==='skl')openSkillMenu();
  else if(a==='itm')openItemMenu();
  else if(a==='fle'){
    if(!B.boss&&Math.random()<0.6){mode='world';B=null;battleUI(false);return;}
    bmsg(B.boss?'强敌挡路,无法逃跑!':'逃跑失败!');
    B.phase='wait';B.timer=0.5;
  }
  refreshBtns();
}
function openSkillMenu(){
  let h='<h3>仙术</h3><div class="gold">灵力:'+S.mp+' / '+S.maxMp+'</div>';
  SKILLS.forEach((s,i)=>{
    if(skillKnown(s))h+='<div class="srow"><div><b style="color:'+ELC[s.el]+'">'+s.n+'</b><span>'+s.el+'系 · 威力×'+s.mult+'</span></div><button class="pbtn" onclick="castSkill('+i+')">'+s.mp+' 灵力</button></div>';
  });
  h+='<button class="pbtn" onclick="closePanel()">返回</button>';
  openPanel(h);
}
function castSkill(i){
  closePanel();
  if(!B||B.phase!=='cmd')return;
  const sk=SKILLS[i];
  if(S.mp<sk.mp){bmsg('灵力不足!');return;}
  S.mp-=sk.mp;
  B.phase='anim';B.anim={k:'proj',x:640,t:0,sk:sk};sCast();
  refreshBtns();
}
function openItemMenu(){
  let h='<h3>物品</h3>';
  h+='<div class="srow"><div><b>回灵丹 ×'+INV.dan+'</b><span>恢复 45 气血</span></div><button class="pbtn" onclick="useItem(\'dan\')">使用</button></div>';
  h+='<div class="srow"><div><b>大还丹 ×'+INV.dadan+'</b><span>气血全满</span></div><button class="pbtn" onclick="useItem(\'dadan\')">使用</button></div>';
  h+='<div class="srow"><div><b>清心散 ×'+INV.qing+'</b><span>恢复 30 灵力</span></div><button class="pbtn" onclick="useItem(\'qing\')">使用</button></div>';
  h+='<button class="pbtn" onclick="closePanel()">返回</button>';
  openPanel(h);
}
function useItem(k){
  if(!B||B.phase!=='cmd')return;
  if(INV[k]<1){toast('没有了……');return;}
  closePanel();
  INV[k]--;
  if(k==='dan'){const h=Math.min(45,S.maxHp-S.hp);S.hp+=h;pop(700,320,'+'+h,'#7CFC9A');bmsg('服下回灵丹。');}
  else if(k==='dadan'){const h=S.maxHp-S.hp;S.hp=S.maxHp;pop(700,320,'+'+h,'#7CFC9A');bmsg('大还丹入腹,气血全满!');}
  else{const m=Math.min(30,S.maxMp-S.mp);S.mp+=m;pop(700,320,'+'+m+' 灵力','#bfa7ff');bmsg('服下清心散。');}
  sHeal();
  B.phase='wait';B.timer=0.55;refreshBtns();
}
function enemyAct(){
  B.turn++;
  if(B.e.caster&&B.turn%2===0){B.anim={k:'espell',t:0};sCast();}
  else B.anim={k:'elunge',t:0};
  B.phase='anim';
}
function hurtHero(base){
  const d=Math.max(1,base-defP());
  S.hp-=d;B.fH=0.18;B.shake=0.22;
  pop(740,280,'-'+d,'#ff6b6b');sHurt();
}
function winB(){
  B.phase='over';refreshBtns();sWin();
  bmsg('击败了 '+B.e.name+'!');
  S.gold+=B.e.gold;S.exp+=B.e.exp;
  const learned=[];let lv=false;
  while(S.exp>=S.lvl*45){
    S.exp-=S.lvl*45;S.lvl++;lv=true;
    S.maxHp+=16;S.maxMp+=10;S.hp=S.maxHp;S.mp=S.maxMp;
    const ns=SKILLS.find(s=>s.lvl===S.lvl&&(!s.flag||flags[s.flag]));
    if(ns)learned.push(ns.n);
  }
  if(lv){setTimeout(sLvl,500);pop(660,220,'升级!Lv'+S.lvl,'#ffd23f');}
  const wasBoss=B.boss,key=B.key;
  setTimeout(()=>{
    mode='world';B=null;battleUI(false);
    if(key==='snakeKing'){
      flags.mini=true;
      showDialog(['蛇妖王哀鸣一声,化作白雾散去。断桥畅通了!',learned.length?'你领悟了新仙术:'+learned.join('、'):'(已自动保存)']);
    }else if(key==='king'){
      flags.boss=true;
      showEnding();
    }else if(key==='dragon'){
      flags.dragon=true;
      showEnding2();
    }else if(key==='demon'){
      flags.demon=true;
      showEnding3();
    }else if(key==='peng'){
      flags.peng=true;
      showEnding4();
    }else if(learned.length){
      showDialog(['你领悟了新仙术:'+learned.join('、')+'!']);
    }
    save();
  },1100);
}
function loseB(){
  B.phase='over';refreshBtns();
  setTimeout(()=>{
    mode='world';B=null;battleUI(false);
    S.hp=Math.round(S.maxHp/2);S.mp=S.maxMp;
    switchMap('world',31,44);
    showDialog(['眼前一黑……','再睁眼时,阿萝正守在客栈床边。',{n:'阿萝',t:'别逞强了!多练几级、备好丹药再去。'}]);
  },800);
}
function updBattle(dt){
  if(B.fE>0)B.fE-=dt;if(B.fH>0)B.fH-=dt;if(B.shake>0)B.shake-=dt;
  for(let i=B.pops.length-1;i>=0;i--){B.pops[i].t+=dt;B.pops[i].y-=34*dt;if(B.pops[i].t>1)B.pops.splice(i,1);}
  if(B.anim){
    const a=B.anim;a.t+=dt;
    if(a.k==='lunge'){
      B.hOx=-Math.sin(Math.min(a.t/0.38,1)*Math.PI)*300;
      if(!a.hit&&a.t>=0.18){a.hit=1;dealE(rnd(atkP()-3,atkP()+4));}
      if(a.t>=0.42){B.hOx=0;B.anim=null;afterPlayer();}
    }else if(a.k==='proj'){
      a.x-=1150*dt;
      if(a.x<=330){
        const adv=advMult(a.sk.el,B.e.el);
        const base=atkP()*a.sk.mult;
        const d=Math.max(1,Math.round(rnd(base-4,base+6)*adv));
        dealE(d,ELC[a.sk.el]);
        if(adv>1)pop(310,170,'效果拔群!','#ffd23f');
        else if(adv<1)pop(310,170,'效果不佳…','#9aa3ad');
        B.anim=null;afterPlayer();
      }
    }else if(a.k==='elunge'){
      B.eOx=Math.sin(Math.min(a.t/0.38,1)*Math.PI)*300;
      if(!a.hit&&a.t>=0.18){a.hit=1;hurtHero(rnd(B.e.atk-2,B.e.atk+3));}
      if(a.t>=0.42){
        B.eOx=0;B.anim=null;
        if(S.hp<=0)loseB();else{B.phase='cmd';refreshBtns();}
      }
    }else if(a.k==='espell'){
      if(!a.hit&&a.t>=0.35){a.hit=1;hurtHero(Math.round(rnd(B.e.atk-2,B.e.atk+3)*1.3));}
      if(a.t>=0.7){
        B.anim=null;
        if(S.hp<=0)loseB();else{B.phase='cmd';refreshBtns();}
      }
    }
  }else if(B.phase==='wait'){
    B.timer-=dt;
    if(B.timer<=0)enemyAct();
  }
}
function drawBattle(){
  const towerBg=cur.bg==='tower'||B.key==='king';
  const waterBg=cur.bg==='lake'||cur.bg==='palace'||B.key==='dragon';
  const hellBg=cur.bg==='abyss'||cur.bg==='hell'||B.key==='demon';
  const skyBg=cur.bg==='sky'||cur.bg==='shrine'||B.key==='peng';
  if(skyBg){
    // 云端战场:高空蓝 + 远山云峰 + 飘流云絮
    r(0,0,SW,360,'#8ec0e6');r(0,360,SW,280,'#cfe2f2');
    g.fillStyle='#a8cae8';
    g.beginPath();g.moveTo(0,360);g.lineTo(260,250);g.lineTo(520,360);g.closePath();g.fill();
    g.beginPath();g.moveTo(440,360);g.lineTo(720,260);g.lineTo(960,360);g.closePath();g.fill();
    g.fillStyle='rgba(255,255,255,0.85)';
    for(let k=0;k<5;k++){const cx=((k*230+frame)%1100)-80,cy=70+((k*53)%140);r(cx,cy,90,16,'rgba(255,255,255,0.8)');r(cx+20,cy-10,60,16,'rgba(255,255,255,0.7)');}
    r(0,470,SW,170,'#eaf4ff');
    if(B.key==='peng'){g.fillStyle='#aac4e0';g.beginPath();g.moveTo(360,90);g.lineTo(600,90);g.lineTo(540,300);g.lineTo(420,300);g.closePath();g.fill();r(450,120,60,40,'#ffd23f');}
  }else if(hellBg){
    // 魔渊战场:暗红夜空 + 翻涌岩浆 + 飞散余烬
    r(0,0,SW,430,'#1c0810');r(0,430,SW,210,'#2a0c08');
    g.fillStyle='#3a0e0a';
    g.beginPath();g.moveTo(0,430);g.lineTo(240,330);g.lineTo(480,430);g.closePath();g.fill();
    g.beginPath();g.moveTo(420,430);g.lineTo(700,340);g.lineTo(960,430);g.closePath();g.fill();
    r(0,560,SW,80,'#6a1810'); // 岩浆河
    g.fillStyle='rgba(255,120,40,0.5)';for(let k=0;k<6;k++)r((k*170+(frame*2)%170),566+((frame>>2)+k)%6,40,5,'rgba(255,150,50,0.5)');
    g.fillStyle='#ffb030';for(let k=0;k<16;k++){const ex=(k*131+frame)%960,ey=560-((frame*2+k*70)%460);g.fillRect(ex,ey,3,3);}
    if(B.key==='demon'){r(360,40,240,400,'#1a0610');r(450,110,60,130,'#3a0e1a');r(462,122,36,16,'#ff4040');}
  }else if(waterBg){
    // 水下战场:深蓝水体 + 焦散光柱 + 上浮气泡
    r(0,0,SW,420,'#0f3a48');r(0,420,SW,220,'#0a2a34');
    g.fillStyle='rgba(120,220,230,0.10)';
    [120,360,600,840].forEach((x,i)=>{g.beginPath();g.moveTo(x,0);g.lineTo(x+60,0);g.lineTo(x+120,420);g.lineTo(x+40,420);g.closePath();g.fill();});
    g.fillStyle='rgba(190,240,250,0.5)';
    for(let k=0;k<14;k++){const bx=(k*137+(frame*2))%960,by=420-((frame*3+k*90)%440);g.fillRect(bx,by,3,3);}
    if(B.key==='dragon'){r(360,60,240,360,'#0a2a34');r(450,120,60,120,'#06181e');r(462,132,36,14,'#5dded6');}
  }else if(towerBg){
    r(0,0,SW,420,'#1d1530');r(0,420,SW,220,'#3a2f4a');
    r(80,120,36,300,'#251a3a');r(844,120,36,300,'#251a3a');
    r(90,130,8,280,'#332450');r(854,130,8,280,'#332450');
    if(B.key==='king'){r(340,70,280,350,'#251a3a');r(440,130,80,140,'#120c1e');r(452,142,56,16,'#e24b4a');}
  }else{
    r(0,0,SW,340,'#a8d8ea');
    g.fillStyle='#cfe8f4';g.beginPath();g.arc(820,84,42,0,Math.PI*2);g.fill();
    g.fillStyle='#8fb8a0';
    g.beginPath();g.moveTo(0,340);g.lineTo(220,230);g.lineTo(470,340);g.closePath();g.fill();
    g.beginPath();g.moveTo(380,340);g.lineTo(660,250);g.lineTo(960,340);g.closePath();g.fill();
    r(0,340,SW,300,'#6aa84f');r(0,420,SW,40,'#d9b97f');
  }
  g.save();
  if(B.shake>0)g.translate(rnd(-5,5),rnd(-5,5));
  const m=SPRM[B.e.draw]||{w:20,h:20,s:8};
  const ew=m.w*m.s,eh=m.h*m.s;
  const ex=140+B.eOx,ey=480-eh;
  SPR[B.e.draw](ex,ey,m.s);
  if(B.fE>0){g.globalAlpha=0.7;r(ex,ey,ew,eh,'#ffffff');g.globalAlpha=1;}
  const hs=8,hw=16*hs,hh=20*hs;
  const hx=640+B.hOx,hy=480-hh;
  drawHero(hx,hy,hs,Math.floor(frame/10)%2);
  if(B.fH>0){g.globalAlpha=0.55;r(hx,hy,hw,hh,'#ff3030');g.globalAlpha=1;}
  if(B.anim&&B.anim.k==='proj'){
    const px=B.anim.x,c=ELC[B.anim.sk.el];
    r(px,392,70,10,'#cdd6e0');r(px,394,70,3,'#f0f4f8');
    r(px+66,388,14,18,'#c9a227');
    r(px-12,384,84,4,c);r(px-12,406,84,4,c);
  }
  if(B.anim&&B.anim.k==='espell'){
    const t=B.anim.t,rad=Math.round(t*260),c=ELC[B.e.el];
    g.globalAlpha=Math.max(0,0.8-t);
    g.strokeStyle=c;g.lineWidth=9;
    g.beginPath();g.arc(hx+hw/2,hy+hh/2,rad,0,Math.PI*2);g.stroke();
    g.beginPath();g.arc(hx+hw/2,hy+hh/2,Math.max(0,rad-36),0,Math.PI*2);g.stroke();
    g.globalAlpha=1;
  }
  if(B.anim&&B.anim.k==='lunge'&&B.anim.hit&&B.anim.t<0.3){
    g.strokeStyle='#fff';g.lineWidth=6;
    g.beginPath();g.moveTo(ex+ew-18,ey+18);g.lineTo(ex+26,ey+eh-26);g.stroke();
  }
  for(const w of B.pops){
    g.globalAlpha=Math.max(0,1-w.t);
    g.font='bold 30px monospace';g.strokeStyle='#000';g.lineWidth=5;
    g.strokeText(w.txt,w.x,w.y);g.fillStyle=w.c;g.fillText(w.txt,w.x,w.y);
    g.globalAlpha=1;
  }
  g.restore();
  r(20,18,430,74,'rgba(0,0,0,0.55)');
  g.font='21px monospace';g.fillStyle='#fff';g.fillText(B.e.name,36,46);
  g.fillStyle=ELC[B.e.el];g.fillText('['+B.e.el+']',36+B.e.name.length*21+14,46);
  r(36,58,380,15,'#3a2f3a');
  r(36,58,Math.max(0,Math.min(380,Math.round(B.e.hp/B.e.maxHp*380))),15,'#E24B4A');
  r(596,500,344,118,'rgba(18,14,26,0.78)');
  g.font='19px monospace';g.fillStyle='#ffd76a';
  g.fillText('云无衣 Lv'+S.lvl,612,528);
  r(612,540,230,13,'#3a2f3a');r(612,540,Math.max(0,Math.min(230,Math.round(S.hp/S.maxHp*230))),13,'#1D9E75');
  r(612,562,230,13,'#3a2f3a');r(612,562,Math.max(0,Math.min(230,Math.round(S.mp/S.maxMp*230))),13,'#7F77DD');
  g.font='14px monospace';g.fillStyle='#cdd6e0';
  g.fillText(S.hp+'/'+S.maxHp,850,552);g.fillText(S.mp+'/'+S.maxMp,850,574);
  if(B.msg){
    r(20,576,480,42,'rgba(0,0,0,0.55)');
    g.font='20px monospace';g.fillStyle='#fff';g.fillText(B.msg,36,604);
  }
}
