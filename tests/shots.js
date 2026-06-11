'use strict';
// 视觉回归:用 node-canvas 真渲染几个关键画面,存 PNG 并与基线对比
// node-canvas 是可选依赖:未安装时跳过(npm i canvas 后可用)
const fs=require('fs'),path=require('path'),vm=require('vm');
const {createGame,loadSrcSources}=require('./harness');
let Canvas=null;
try{Canvas=require('canvas');}catch(e){
  console.log('shots: 未安装 node-canvas,跳过视觉截图(可选:npm i canvas)');
  process.exit(0);
}
const root=path.join(__dirname,'..');
const curDir=path.join(__dirname,'shots-current');
const baseDir=path.join(__dirname,'shots-baseline');
fs.mkdirSync(curDir,{recursive:true});

const canvas=Canvas.createCanvas(960,640);
const ctx=canvas.getContext('2d');
// 带真画布的沙箱:先建空沙箱,把 cv 的 2d 上下文换成 node-canvas,再载入游戏脚本
const G=createGame([]);
const realGet=G.sandbox.document.getElementById;
G.sandbox.document.getElementById=id=>{
  const el=realGet(id);
  if(id==='cv')el.getContext=()=>ctx;
  return el;
};
for(const s of loadSrcSources())vm.runInContext(s.code,G.sandbox,{filename:s.name});
const E=c=>G.eval(c);

function snap(name){
  const f=path.join(curDir,name+'.png');
  fs.writeFileSync(f,canvas.toBuffer('image/png'));
  const b=path.join(baseDir,name+'.png');
  return {name,f,baseline:fs.existsSync(b)?b:null};
}
async function diffRatio(fileA,fileB){
  const imgA=await Canvas.loadImage(fileA),imgB=await Canvas.loadImage(fileB);
  const ca=Canvas.createCanvas(960,640).getContext('2d');ca.drawImage(imgA,0,0);
  const cb=Canvas.createCanvas(960,640).getContext('2d');cb.drawImage(imgB,0,0);
  const da=ca.getImageData(0,0,960,640).data,db=cb.getImageData(0,0,960,640).data;
  let diff=0;
  for(let i=0;i<da.length;i+=4){
    if(Math.abs(da[i]-db[i])+Math.abs(da[i+1]-db[i+1])+Math.abs(da[i+2]-db[i+2])>30)diff++;
  }
  return diff/(960*640);
}
(async()=>{
  const shots=[];
  E(`mode='title'`);G.frame(16);shots.push(snap('01-title'));
  E(`$('btnNew').onclick();while(dq.length||dcb)nextDlg()`);
  E(`switchMap('world',31,41)`);G.frame(16);shots.push(snap('02-village'));
  E(`switchMap('tower',11,20)`);G.frame(16);shots.push(snap('03-tower'));
  E(`switchMap('world',31,44);startBattle('shan',false)`);G.frame(16);shots.push(snap('04-battle'));
  if(E(`typeof MAPS.house1!=='undefined'`)){
    E(`mode='world';B=null;battleUI(false);switchMap('house1',6,5)`);G.frame(16);shots.push(snap('05-house'));
  }
  if(E(`typeof MAPS.lake!=='undefined'`)){
    E(`flags.ch2=true;flags.lakeIntro=true;mode='world';B=null;battleUI(false);switchMap('lake',14,12)`);G.frame(16);shots.push(snap('06-lake'));
    E(`switchMap('palace',11,8)`);G.frame(16);shots.push(snap('07-palace'));
    E(`switchMap('lake',14,12);startBattle('dragon',true)`);G.frame(16);shots.push(snap('08-dragon'));
    E(`mode='world';B=null;battleUI(false);switchMap('world',24,16)`);G.frame(16);shots.push(snap('09-whirlpool'));
  }
  if(E(`typeof MAPS.abyss!=='undefined'`)){
    E(`flags.ch3=true;flags.abyssIntro=true;mode='world';B=null;battleUI(false);switchMap('abyss',14,12)`);G.frame(16);shots.push(snap('10-abyss'));
    E(`switchMap('hell',11,8)`);G.frame(16);shots.push(snap('11-hell'));
    E(`switchMap('abyss',14,12);startBattle('demon',true)`);G.frame(16);shots.push(snap('12-demon'));
  }
  if(E(`typeof MAPS.sky!=='undefined'`)){
    E(`flags.ch4=true;flags.skyIntro=true;mode='world';B=null;battleUI(false);switchMap('sky',14,12)`);G.frame(16);shots.push(snap('13-sky'));
    E(`switchMap('shrine',11,8)`);G.frame(16);shots.push(snap('14-shrine'));
    E(`switchMap('sky',14,12);startBattle('peng',true)`);G.frame(16);shots.push(snap('15-peng'));
  }
  let fail=0;
  for(const s of shots){
    if(s.baseline){
      const ratio=await diffRatio(s.f,s.baseline);
      const bad=ratio>0.02;
      if(bad)fail++;
      console.log((bad?'  ✗ ':'  ✓ ')+s.name+' 与基线差异 '+(ratio*100).toFixed(2)+'%');
    }else console.log('  · '+s.name+' 无基线,已生成 '+path.relative(root,s.f));
  }
  if(!fs.existsSync(baseDir))console.log('shots: 用 npm run shots:accept 接受当前截图为基线');
  process.exit(fail?1:0);
})();
