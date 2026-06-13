'use strict';
// ===== 像素美术层:字符串像素图 + 调色板 + 绘制函数 =====
const PALS={"hero": {"K": "#1a1626", "H": "#2b2b3a", "h": "#4a4a63", "S": "#f2c9a0", "s": "#d9a87c", "E": "#1a1626", "R": "#c43a2f", "W": "#e9e2d2", "B": "#2f6f93", "b": "#235877", "L": "#4d8fb3", "G": "#d9aa3c", "M": "#b9c2cc", "m": "#8a939e", "P": "#28404e", "F": "#1c2e38"}, "girl": {"K": "#1f141c", "H": "#3a2430", "h": "#5a3a4a", "S": "#f6d3ae", "s": "#e0b58a", "E": "#1f141c", "o": "#f0a08a", "W": "#efe7d8", "D": "#d4537e", "d": "#b03a60", "l": "#f4c0d1", "R": "#c43a2f", "F": "#72243e"}, "vill": {"K": "#231d14", "H": "#3a3328", "S": "#eec39a", "s": "#d4a578", "E": "#231d14", "C": "#7a5230", "c": "#5e3d22", "A": "#c9b08a", "P": "#33291c", "F": "#241c12"}, "shan": {"K": "#15240f", "I": "#e8dcb8", "i": "#bfae84", "G": "#4f8f3a", "g": "#3a6e28", "L": "#6cab50", "Y": "#ffd23f", "E": "#15240f", "F": "#fff8e6", "M": "#2c5520", "B": "#8a5a2b", "b": "#6e4520", "T": "#caa46a"}, "fox": {"K": "#3a2a14", "C": "#e8cfa0", "c": "#caa873", "W": "#fbf3df", "P": "#e8a0a0", "E": "#7a4a14", "G": "#5dca7c", "T": "#c98c4b", "t": "#a06f33"}, "snake": {"K": "#2a2a36", "W": "#e8e8f0", "w": "#c6c6d6", "V": "#f6f6fb", "E": "#e24b4a", "R": "#c43a2f", "Y": "#ffd23f", "G": "#9fe1cb"}, "snakek": {"K": "#241a2e", "W": "#e6dff2", "w": "#bfb2d6", "V": "#f6f2fb", "E": "#ff4040", "R": "#c43a2f", "Y": "#ffd76a", "y": "#d9aa3c", "G": "#9fe1cb"}, "flame": {"K": "#0c2038", "B": "#2f7fd6", "b": "#4aa3ff", "L": "#9fd0ff", "W": "#f2f8ff", "E": "#0c2038"}, "golem": {"K": "#1d1f26", "G": "#8a8f99", "g": "#6a6f78", "L": "#aab0bb", "M": "#5d8a4a", "R": "#5dded6", "r": "#2a9e96", "E": "#5dded6"}, "king": {"K": "#0e0a16", "O": "#c4502c", "o": "#8a3618", "F": "#cfc6da", "f": "#a39ab5", "E": "#ff4040", "e": "#8a1818", "P": "#3a2b52", "p": "#281c3c", "L": "#54407a", "G": "#d9aa3c", "C": "#cfd2da", "A": "#54108a"}};
const PIX={"hero0":["......KKKK......",".....KHHHHK.....","....KHHHHHHK....","....KHhHHhHK....","....KRRRRRRK....","...KSSSSSSSSKM..","...KSESSSSESKM..","....KSSssSSKMm..","....KsSSSSsKGm..","..KKBBBWWBBBKK..",".KBBBBWBBWBBBBK.",".KBBBKGGGGKBBBK.",".KsBKBBBBBBKBsK.","..KBBbBBBBbBBK..","..KBBbBBBBbBBK..","..KBbKBBBBKbBK..","....KPPKKPPK....","....KPPK.KPPK...","...KFFFK.KFFK...","................"],"hero1":["......KKKK......",".....KHHHHK.....","....KHHHHHHK....","....KHhHHhHK....","....KRRRRRRK....","...KSSSSSSSSKM..","...KSESSSSESKM..","....KSSssSSKMm..","....KsSSSSsKGm..","..KKBBBWWBBBKK..",".KBBBBWBBWBBBBK.",".KBBBKGGGGKBBBK.",".KsBKBBBBBBKBsK.","..KBBbBBBBbBBK..","..KBBbBBBBbBBK..","..KBbKBBBBKbBK..","....KPPK.KPPK...","....KFFK.KFFFK..","................"],"girl":[".KKK........KKK.","KHHHK......KHHHK","KHhHHKKKKKKHHhHK",".KRKHHHHHHHHKRK.","..KHHHHHHHHHHK..","..KHSSSSSSSSHK..","..KSSESSSSESSK..","..KSoSSssSSoSK..","...KSSSSSSSSK...","...KWWDDDDWWK...","..KDDdDWWDdDDK..","..KDDDDDDDDDDK..",".KsDDlDDDDlDDsK.",".KDDDlDDDDlDDDK.","..KDDDDDDDDDDK..","..KllllllllllK..","..KDDDDDDDDDDK..","..KDDDDDDDDDDK..","...KFFK..KFFK...","................"],"vill":[".....KKKKKK.....","....KHHHHHHK....","....KHHHHHHK....","....KSSSSSSK....","....KSESSESK....","....KSSssSSK....",".....KSSSSK.....","...KKCCCCCCKK...","..KCCCAAAACCCK..","..KCCCAAAACCCK..","..KCCCAAAACCCK..","..KsCCAAAACCsK..","...KCCCCCCCCK...","...KCCCCCCCCK...","....KPPKKPPK....","....KPPK.KPPK...","...KFFFK.KFFFK..","................","................","................"],"shan":[".....II......II.....","....KIiK....KIiK....","...KKGGKKKKKKGGKK...","..KGGGGGGGGGGGGGGK..",".KGGLGGGGGGGGGGLGGK.",".KGGYYKGGGGGGKYYGGK.",".KGGYEKGGGGGGKEYGGK.",".KGGGGGGggGGGGGGGGK.",".KGGKMMMMMMMMMMKGGK.","..KGKMFKMMMMKFMKGK..","..KGGKMMMMMMMMKGGK..",".KGGGGGGGGGGGGGGGGK.","KGgGKGGGGGGGGGGKGgGK","KGgGKGTTTTTTTTKKGgGK","KGGGKGTBBBBBBTKKGGGK",".KKK.KGTTTTTTGK.KKK.",".....KGGGGGGGGK.....","....KGGgGKKGgGGK....","....KGGGGK.KGGGGK...","....KKKKK...KKKKK..."],"fox":["....KK........KK....","...KCCK......KCCK...","...KCPCK....KCPCK...","...KCCCKKKKKKCCCK...","....KCCCCCCCCCCK....","...KCCCCCCCCCCCCK...","...KCEKCCCCCCKECK...","...KCCCCKKCCCCCCK...","....KWWWWWWWWWWK....",".....KWWWWWWWWK.KK..","...KKCCCCCCCCCKKTTK.","..KCCCCCWWWWCCCKTtK.",".KCCCCCWWWWWWCCKTtK.",".KCGGCCWWWWWWCCKTTK.",".KCGGCCWWWWWWCCKTtK.",".KCCCCCCWWWWCCCKTTK.","..KCCCCCCCCCCCKKTK..","..KCCKCCCCKCCCK.K...","..KttK.KttK.KttK....","...................."],"snake":["....KKKK............","...KWWWWK...........","..KWEKWWEK..........","..KWWWWWWK..........","..KWWKKWWK..RR......","...KWWWWWKKRR.......","...KVWWWWWWK........","....KVWWWWWWK.......",".....KKVWWWWWK......",".......KVWWWWWK.....","...KKKKKKVWWWWK.....","..KWWWWWWWVWWWWK....",".KWVVVVVVWWVWWWK....",".KWVWWWWVWWWWWWK....",".KWWWWWWWWWWWWK.....","..KKKWWWWWWWWWWK....",".KWWWWWWWWWWWWWWK...","KWVVVVVVVVVVVVWWWK..","KWWWWWWWWWWWWWWWWK..",".KKKKKKKKKKKKKKKK..."],"snakek":["....KYKYKYK.........","....KYYYYYK.........","...KWWWWWWK.........","..KWEKWWWEK.........","..KWWWWWWWK.........","..KWWKKWWWK..RR.....","...KWWWWWWKKRR......","...KVWWWWWWWK.......","....KVWWWWWWWK......",".....KKVWWWWWWK.....",".......KVWWWWWK.....","...KKKKKKVWWWWK.....","..KWWWWWWWVWWWWK....",".KWVVVVVVWWVWWWWK...",".KWVWWWWVWWWWWWWK...",".KWWWWWWWWWWWWWK....","..KKKWWWWWWWWWWWK...",".KWWWWWWWWWWWWWWWK..","KWVVVVVVVVVVVVVWWWK.","KWWWWWWWWWWWWWWWWWK.",".KKKKKKKKKKKKKKKKK..","...................."],"flame0":["......Kb........",".....KbK..Kb....","....KbbK.KbK....","...KbbbKKbbK....","...KbbbbbbbK....","..KbbLLLLbbbK...","..KbLLLLLLbbK...",".KbLLWWWWLLbK...",".KbLWWWWWWLbK...",".KbLWEWWEWLbK...",".KbLWWWWWWLbK...",".KbLWWEEWWLbK...",".KbLLWWWWLLbK...",".KbbLLLLLLbbK...","..KbbLLLLbbK....","..KbbbbbbbbK....","...KbbbbbbK.....","....KbbbbK......",".....KbbK.......","......KK........"],"flame1":["....Kb..........","...KbK...Kb.....","....KbbKKbK.....","...KbbbbbbK.....","...KbbbbbbbK....","..KbbLLLLbbbK...","..KbLLLLLLbbK...",".KbLLWWWWLLbK...",".KbLWWWWWWLbK...",".KbLWEWWEWLbK...",".KbLWWWWWWLbK...",".KbLWWEEWWLbK...",".KbLLWWWWLLbK...",".KbbLLLLLLbbK...","..KbbLLLLbbK....","..KbbbbbbbbK....","...KbbbbbbK.....","....KbbbbK......",".....KbbK.......","......KK........"],"golem":["....KKKKKKKKKK......","...KLLLGGGGGGGK.....","...KLGGGGGGGGGK.....","...KGEGGGGGEGGK.....","...KGGGGGGGGGGK.....","....KGGgggGGGK......","..KKKKKKKKKKKKKK....",".KLLGGGGGGGGGGGGK...","KLGGGGKRRKGGGGGGGK..","KGGGGKRrrRKGGGGGGK..","KGGGGKRrrRKGGMGGGK..","KGGGGGKRRKGGMMGGGK..","KGgGGGGGGGGGGGGGgK..",".KGGKGGGGGGGGKGGK...",".KGGK.KGGGGK.KGGK...",".KggK.KGGGGK.KggK...",".KKK..KGGGGK..KKK...","......KGggGK........",".....KGGKKGGK.......",".....KKK..KKK......."],"king":["...KOK............KOK...","..KOOK....KKKK....KOOK..",".KOoOK...KFFFFK...KOoOK.",".KOOK...KFFFFFFK...KOOK.",".KOOKK..KFFFFFFK..KKOOK.","..KOOOKKFFFFFFFFKKOOOK..","...KKKFFFEKFFKEFFFKKK...",".....KFFFEEFFEEFFFK.....",".....KFFFFFFFFFFFFK.....",".....KFfFKKKKKKfFFK.....","......KFFeeeeeeFFK......",".....KKPKKKKKKKKPKK.....","...KKPPPPLLLLLLPPPPKK...","..KPPPPPLPPPPPPLPPPPPK..",".KpPPPPLPPAAAAPPLPPPPpK.",".KpPPPPLPPAAAAPPLPPPPpK.",".KpPPPPLPPPPPPPPLPPPPpK.",".KpPKPPLPPPPPPPPLPPKPpK.",".KpPKPPPLLLLLLLLPPPKPpK.",".KpPKPPPPPPPPPPPPPPKPpK.","..KKKPPPPPPPPPPPPPPKKK..",".KCCK.KPPPPPPPPPPK.KCCK.","KCCCK..KPPPPPPPPK..KCCCK","KCCK...KPPKKKKPPK...KCCK",".KK....KPPK..KPPK....KK.",".......KKKK..KKKK......."]};
const PIXPAL={"hero0": "hero", "hero1": "hero", "girl": "girl", "vill": "vill", "shan": "shan", "fox": "fox", "snake": "snake", "snakek": "snakek", "flame0": "flame", "flame1": "flame", "golem": "golem", "king": "king"};

function pix(name,x,y,s,palOverride){
  const rows=PIX[name],pal=palOverride||PALS[PIXPAL[name]];
  for(let j=0;j<rows.length;j++){
    const row=rows[j];
    for(let i=0;i<row.length;i++){
      const ch=row[i];
      if(ch==='.')continue;
      g.fillStyle=pal[ch];
      g.fillRect(x+i*s,y+j*s,s,s);
    }
  }
}
const VPALS={
  '#7a5230':PALS.vill,
  '#3f6f8f':Object.assign({},PALS.vill,{C:'#3f6f8f',c:'#2c536e',A:'#e9e2d2',H:'#4a3a2a'}),
  '#555560':Object.assign({},PALS.vill,{C:'#555560',c:'#3d3d48',A:'#8a6d3b',H:'#23232b'})
};
function drawHero(x,y,s,f){pix(f?'hero1':'hero0',x,y,s);}
function drawGirl(x,y,s){pix('girl',x,y,s);}
function drawVill(x,y,s,c){pix('vill',x,y,s,VPALS[c]||PALS.vill);}
function drawShan(x,y,s){pix('shan',x,y,s);}
function drawSnake(x,y,s){pix('snake',x,y,s);}
function drawSnakeK(x,y,s){pix('snakek',x,y,s);}
function drawFox(x,y,s){pix('fox',x,y,s);}
function drawFlame(x,y,s){pix((frame>>3)%2?'flame1':'flame0',x,y,s);}
function drawGolem(x,y,s){pix('golem',x,y,s);}
function drawKing(x,y,s){pix('king',x,y,s);}
const SPRM={shan:{w:20,h:20,s:8},fox:{w:20,h:20,s:8},snake:{w:20,h:20,s:8},snakeK:{w:20,h:22,s:9},flame:{w:16,h:20,s:9},golem:{w:20,h:20,s:8},king:{w:24,h:26,s:9}};
const SPR={girl:drawGirl,vill:drawVill,shan:drawShan,snake:drawSnake,snakeK:drawSnakeK,fox:drawFox,flame:drawFlame,golem:drawGolem,king:drawKing};

// ===== Phase 1:室内家具贴图(进屋找宝贝)=====
PALS.furn={K:'#241709',W:'#8a5a2b',w:'#6e4520',L:'#b9854f',C:'#5d6878',c:'#46505e',V:'#8f9cad',A:'#6fcfe8',P:'#e8dcb8',R:'#c43a2f',r:'#8a2a22',G:'#d9aa3c',B:'#2f6f93',E:'#4f8f3a',F:'#ff7a45',f:'#ffd23f'};
Object.assign(PIX,{
cab:["................","..KKKKKKKKKKKK..","..KLLLLLLLLLLK..","..KWWWWWWWWWWK..","..KWWWWGGWWWWK..","..KKKKKKKKKKKK..","..KWWWWWWWWWWK..","..KWWWWGGWWWWK..","..KKKKKKKKKKKK..","..KWWWWWWWWWWK..","..KWWWWGGWWWWK..","..KKKKKKKKKKKK..","..KwwwwwwwwwwK..","..KKKKKKKKKKKK..","..KK........KK..","................"],
vat:["................","................","...KKKKKKKKKK...","..KKAAAAAAAAKK..","..KCCAAAAAACCK..",".KCCCCCCCCCCCCK.",".KCVVCCCCCCCCCK.",".KCVCCCCCCCCCCK.",".KCCCCCCCCCCCCK.",".KCCCCCCCCCCCCK.",".KcCCCCCCCCCCcK.","..KcCCCCCCCCcK..","..KKccccccccKK..","...KKKKKKKKKK...","................","................"],
rice:["................","................","...KKKKKKKKKK...","..KKPPPPPPPPKK..","..KWPPPPPPPPWK..",".KWWWPPPPPPWWWK.",".KWWWWWWWWWWWWK.",".KWLLWWWWWWWWWK.",".KWLWWWWWWWWWWK.",".KWWWWWWWWWWWWK.",".KwWWWWWWWWWWwK.","..KwWWWWWWWWwK..","..KKwwwwwwwwKK..","...KKKKKKKKKK...","................","................"],
shelf:["................",".KKKKKKKKKKKKKK.",".KLLLLLLLLLLLLK.",".KRRBEERBBERBEK.",".KRRBEERBBERBEK.",".KKKKKKKKKKKKKK.",".KBERRBBEERRBEK.",".KBERRBBEERRBEK.",".KKKKKKKKKKKKKK.",".KEEBRREBBEERRK.",".KEEBRREBBEERRK.",".KKKKKKKKKKKKKK.",".KwwwwwwwwwwwwK.",".KKKKKKKKKKKKKK.",".KK..........KK.","................"],
bed:["................","..KKKKKKKKKKKK..","..KLLLLLLLLLLK..","..KWWWWWWWWWWK..","..KPPPPPPPPPPK..","..KPPPPPPPPPPK..","..KRRRRRRRRRRK..","..KRRRRRRRRRRK..","..KRrrRRRRrrRK..","..KRRRRRRRRRRK..","..KRrrRRRRrrRK..","..KRRRRRRRRRRK..","..KWWWWWWWWWWK..","..KKKKKKKKKKKK..","..KK........KK..","................"],
jar:["................","......KKKK......",".....KPPPPK.....",".....KPPPPK.....","....KKWWWWKK....","...KWWWWWWWWK...","..KWLWWWWWWWWK..","..KWLWWWWWWWWK..","..KWWWWWWWWWWK..","..KwWWWWWWWWwK..","...KwWWWWWWwK...","....KKwwwwKK....",".....KKKKKK.....","................","................","................"],
stove:["....KKKKKKKK....","...KcCCCCCCcK...","...KcCCCCCCcK...","..KKKKKKKKKKKK..","..KLLLLLLLLLLK..","..KWwWWwWWwWWK..","..KwWWwWWwWWwK..","..KWWKKKKKKWWK..","..KWwKfFFfKWwK..","..KwWKFFFFKWwK..","..KWWKFfFFKwWK..","..KwWKKKKKKWWK..","..KWwWWwWWwWwK..","..KKKKKKKKKKKK..","................","................"]
});
Object.assign(PIXPAL,{cab:'furn',vat:'furn',rice:'furn',shelf:'furn',bed:'furn',jar:'furn',stove:'furn'});
VPALS['#4a6b2a']=Object.assign({},PALS.vill,{C:'#4a6b2a',c:'#36511e',A:'#caa46a',H:'#2e2618'});

// ===== 第二章 · 水月湖底:水妖 + 蛟龙 Boss 像素图 =====
PALS.yaksha={"K": "#0e1c24", "B": "#2f7f8f", "b": "#1f5a66", "W": "#eef6f6", "E": "#ff4747", "H": "#13343a", "R": "#c43a2f", "G": "#5dded6"};
PALS.clam={"K": "#241a2e", "S": "#e090b4", "s": "#b5688f", "W": "#f8eef4", "P": "#9fe7ff", "E": "#3a2030", "G": "#ffd76a"};
PALS.squid={"K": "#160c20", "P": "#7a4ec0", "p": "#5a3494", "W": "#efe6ff", "E": "#ffe24a", "I": "#2a1840"};
PALS.turtle={"K": "#15240f", "S": "#8a5a2b", "s": "#6e4520", "L": "#caa46a", "H": "#6f7a86", "A": "#d9aa3c", "E": "#ff4747"};
PALS.dragon={"K": "#0a1622", "B": "#2f6f93", "b": "#1c4f6e", "L": "#5dded6", "W": "#e8f0f8", "E": "#ffe24a", "R": "#c43a2f", "G": "#9fe1cb"};
Object.assign(PIX,{
  yaksha:["....................","......KK....KK......","......KBK..KBK......",".....KKBK..KBKK.....","...KKBBBBKKBBBBKK...","..KBBBBBBBBBBBBBBK..","..KBHHHHHHHHHHHHBK..","..KBEEKBBBBBBKEEBK..","..KBEEKBBBBBBKEEBK..","..KBBBKBBBBBBKBBBK..","..KBBBWWBBBBWWBBBK..","...KBBWWBBBBWWBBK...","...KKBBBBBBBBBBKK...",".KKBBBBBBBBBBBBBBKK.","KBBBBBBBBBBBBBBBBBBK","KBBBbBBBBBBBBBBbBBBK",".KBBbBBRRRRRRBBbBBK.","..KKBBBRRRRRRBBBKK..","....KKBBBRRBBBKK....","......KKBBBBKK......"],
  clam:["....................","....................",".......KKKKKK.......","....KKKSSSSSSKKK....","..KKSSSSSSSSSSSSKK..",".KSSSSSSSSSSSSSSSSK.",".KSSSSWWWWWWWWSSSSK.","KSSSWWWPPPPPPWWWSSSK","KSSWWWWPPPPPPWWWWSSK","KSSWWWWWWWWWWWWWWSSK",".KSSSWWWWWWWWWWSSSK.",".KsSSSSSSSSSSSSSSsK.","..KKsSSSSSSSSSSsKK..","....KKsSSSSSSsKK....",".......KKssKK.......","...................."],
  squid:["........KKKK........",".......KPPPPK.......","......KPPPPPPK......",".....KPPPPPPPPK.....","....KPPPPPPPPPPK....","...KPPPPPPPPPPPPK...","..KPPPPPPPPPPPPPPK..",".KPPPPPPPPPPPPPPPPK.",".KPPWWWWPPPPWWWWPPK.",".KPWEEWWPPPPWWEEWPK.",".KPWEEWWPPPPWWEEWPK.",".KPPWWWWPPPPWWWWPPK.","..KPPPPPPPPPPPPPPK..","..KpPPpPPPPPPpPPpK..","..KpKpKpKppKpKpKpK..","..KpKpKpKppKpKpKpK..","...KpKpKpKKpKpKpK...","..Kp.Kp.KppK.pK.pK..","..K..Kp..KK..pK..K..",".....K........K....."],
  turtle:["....................","......HHHKKHHH......","....HHHHHHHHHHHH....","...HAAAAHHHHAAAAH...","...HLLLLLLLLLLLLH...","..KLEELLLLLLLLEELK..","..KLLLLLLLLLLLLLLK..","..KKLLLLLLLLLLLLKK..",".KSSSKKLLLLLLKKSSSK.","KSSSSSSSKKKKSSSSSSSK","KSsSSSSSSSSSSSSSSsSK","KSSSsSSSSSSSSSSsSSSK","KSsSSSsSSSSSSsSSSsSK","KSSSSSSSSSSSSSSSSSSK",".KSSSSSSSSSSSSSSSSK.","..KKSSSSSSSSSSSSKK..",".K..KKSSSSSSSSKK..K.",".K....KKSSSSKK....K."],
  dragon:["...........LL...........","..........LLLL..........",".....L...LBLLBL...L.....","....LBL.LBBLLBBL.LBL....","...LBBLLBBBBBBBBLLBBL...","...LBBBBBBBBBBBBBBBBL...","..KBBBBBBBBBBBBBBBBBBK..","..KBBEEKBBBBBBBBKEEBBK..","..KBBEEKBBBBBBBBKEEBBK..","..KBBBBKBBBBBBBBKBBBBK..","..KBBBBBBBBBBBBBBBBBBK..","..KBBWWWWWWWWWWWWWWBBK..","..KBWWRRRRRRRRRRRRWWBK..","...KWWRRRRRRRRRRRRWWK...","...KKBBWWWWWWWWWWBBKK...","....KBBBBBBBBBBBBBBK....",".....KBBBBBBBBBBBBK.....","....KBbBBBBBBBBBBbBK....","...KBbBBBBBBBBBBBBbBK...","..KBbBBBBLBBBBLBBBBbBK..","..KBBBBBBLBBBBLBBBBBBK..","...KBbBBBBBBBBBBBBbBK...","....KKBBBBBBBBBBBBKK....","......KKBBBBBBBBKK......"],
});
Object.assign(PIXPAL,{yaksha:'yaksha',clam:'clam',squid:'squid',turtle:'turtle',dragon:'dragon'});
Object.assign(PIX,{chest:["................","................","...KKKKKKKKKK...","..KLLLLLLLLLLK..","..KWWWWWWWWWWK..","..KKKKKKKKKKKK..","..KWWWWGGWWWWK..","..KWWWWGGWWWWK..","..KWWWWWWWWWWK..","..KWwWWWWWWwWK..","..KWwWWWWWWwWK..","..KKKKKKKKKKKK..","..KK........KK..","................","................","................"]});PIXPAL.chest='furn';
function drawYaksha(x,y,s){pix('yaksha',x,y,s);}
function drawClam(x,y,s){pix('clam',x,y,s);}
function drawSquid(x,y,s){pix('squid',x,y,s);}
function drawTurtle(x,y,s){pix('turtle',x,y,s);}
function drawDragon(x,y,s){pix('dragon',x,y,s);}
Object.assign(SPR,{yaksha:drawYaksha,clam:drawClam,squid:drawSquid,turtle:drawTurtle,dragon:drawDragon});
Object.assign(SPRM,{yaksha:{w:20,h:20,s:6},clam:{w:20,h:16,s:6},squid:{w:20,h:20,s:6},turtle:{w:20,h:18,s:6},dragon:{w:24,h:24,s:6}});

// ===== 第三章 · 妖界魔渊:魔类像素图 + 旧图改色复用 =====
PALS.yanmo={"K": "#1a0808", "F": "#ff8a2a", "f": "#ffe24a", "R": "#c0382a", "E": "#fff0a0", "W": "#ffe8c0", "B": "#5a1414"};
PALS.leiyu={"K": "#0e0a18", "D": "#2f2a44", "d": "#1a1626", "Y": "#ffe24a", "y": "#c9a227", "B": "#3a4a72", "E": "#fff0a0"};
PALS.demon={"K": "#0a0612", "H": "#d9c0a0", "h": "#a08858", "P": "#4a2a6e", "p": "#2a1640", "R": "#c43a2f", "E": "#ff4040", "W": "#ffd0d0"};
Object.assign(PIX,{
  yanmo:[".........ff.........","......fFf..fFf......",".....fFFf..fFFf.....","....KFFFFFFFFFFK....","...KFRRRRRRRRRRFK...","...KFRRRRRRRRRRFK...","..KFRREEKRRKEERRFK..","..KFRREEKRRKEERRFK..","..KFRRRRRRRRRRRRFK..",".KFRRRWWWWWWRRRRFK..","..KFRRWKWKWKWRRRFK..","..KFRRRRRRRRRRRRFK..","..KKFRRRRRRRRRRFKK..","...KFBRRRRRRRRBFK...","...KFBBRRRRRRBBFK...","...KBBBRRRRRRBBBK...","...KBBBRRRRRRBBBK...","...KBBRRRRRRRRBBK...","....KKBBRRRRBBKK....","......KKBBBBKK......"],
  leiyu:["...K....K..K....K...","..KYK..KY..YK..KYK..","..KDK..KD..DK..KDK..",".KDDDDDDDKKDDDDDDDK.","KDDDDDDDDDDDDDDDDDDK","KDDEEKDDDDDDDDKEEDDK","KDDEEKDDDDDDDDKEEDDK","KDDDDKDDDDDDDDKDDDDK","KDYDDDDYDDDDYDDDDYDK","KDDYDDYDDDDDDYDDYDDK",".KDDDDDDDKKDDDDDDDK.",".KBDDDDDBKKBDDDDDBK.","KBBDYYDBBBBBBDYYDBBK","KBDDYYDDBBBBDDYYDDBK","KBDDDDDDBBBBDDDDDDBK",".KBDDDDDBKKBDDDDDBK.",".KKBDDBKK..KKBDDBKK.","...KDDK......KDDK...","..KDKKDK....KDKKDK..",".KDK..KDK..KDK..KDK."],
  demon:[".H.........HH.........H.",".HH.......HHHH.......HH.","KHhK.....KHhhHK.....KhHK","KHhPK...KPHhhHPK...KPhHK",".KPPPK.KPPPKKPPPK.KPPPK.",".KPPPPKPPPPPPPPPPKPPPPK.","..KPPPPPPPPPPPPPPPPPPK..","..KPPEEKPPPPPPPPKEEPPK..","..KPEEEKPPPPPPPPKEEEPK..","..KPPPPKPPPPPPPPKPPPPK..","..KPPPPPPPPPPPPPPPPPPK..","..KPPWWWWWPPPPWWWWWPPK..","..KPWRKRKRWPPWRKRKRWPK..","...KWRRRRRWPPWRRRRRWK...","...KKPWWWPPPPPPWWWPKK...","....KPPPPPPPPPPPPPPK....","...KpPPPPPPPPPPPPPPpK...","..KpPPPPPPpPPpPPPPPPpK..","..KpPPRRPPpPPpPPRRPPpK..","..KpPRRRRPpPPpPRRRRPpK..","..KpPPRRPPpPPpPPRRPPpK..","...KpPPPPpPKKPpPPPPpK...","....KKPPpKK..KKpPPKK....","......KKK......KKK......"],
});
Object.assign(PIXPAL,{yanmo:'yanmo',leiyu:'leiyu',demon:'demon'});
// 玄阴鬼:借鬼火帧改寒蓝调;魔将:借石傀改暗血调
const YINPAL={K:'#0a1422',B:'#1c3a6e',b:'#12284a',L:'#5a8fd0',W:'#cfe0ff',E:'#9fd6ff'};
const MOJPAL=Object.assign({},PALS.golem,{G:'#6a2a3a',g:'#481c28',L:'#9a4a5a',M:'#7a2430',R:'#ff5a5a',r:'#c43a3a',E:'#ff5a5a'});
function drawYanmo(x,y,s){pix('yanmo',x,y,s);}
function drawLeiyu(x,y,s){pix('leiyu',x,y,s);}
function drawDemon(x,y,s){pix('demon',x,y,s);}
function drawYin(x,y,s){pix((frame>>3)%2?'flame1':'flame0',x,y,s,YINPAL);}
function drawMojiang(x,y,s){pix('golem',x,y,s,MOJPAL);}
Object.assign(SPR,{yanmo:drawYanmo,leiyu:drawLeiyu,demon:drawDemon,yin:drawYin,mojiang:drawMojiang});
Object.assign(SPRM,{yanmo:{w:20,h:20,s:6},leiyu:{w:20,h:20,s:6},demon:{w:24,h:24,s:6},yin:{w:16,h:20,s:8},mojiang:{w:20,h:20,s:7}});

// ===== 第四章 · 九霄云海:风族像素图 + 改色复用 =====
PALS.yunpeng={"K": "#101820", "W": "#eaf2f8", "w": "#b9cad8", "B": "#3f7fb0", "L": "#9fd0ec", "Y": "#ffc23a", "E": "#1a2230", "F": "#d9aa3c"};
PALS.peng={"K": "#0c1018", "P": "#34507a", "p": "#22344f", "G": "#ffd23f", "W": "#eaf2f8", "E": "#ff4040", "Y": "#ffb030", "L": "#7fb0d8", "F": "#caa46a"};
Object.assign(PIX,{
  yunpeng:["....................",".........KK.........","........KWWK........","........KWWK........",".......KWWWWK.......","......KWEWWEWK......","......KWWWWWWK......",".....KKWWYYWWKK.....","...KKBWWWWWWWWBKK...","..KBBBKWWWWWWKBBBK..",".KBLLBBKWWWWKBBLLBK.",".KLLLLBBKWWKBBLLLLK.","..KLLBBBKWWKBBBLLK..","...KKBBKWWWWKBBKK...",".....KKWWWWWWKK.....",".......KWWWWK.......",".......KWwwWK.......","......KWWKKWWK......",".....KFFK..KFFK.....","...................."],
  peng:["........................","...........GG...........","..........GGGG..........",".........GKKKKG.........",".........KPPPPK.........","........KPEPPEPK........","........KPPPPPPK........",".......KKPPYYPPKK.......",".....KKPPPPPPPPPPKK.....","...KKPLLPPPPPPPPLLPKK...","..KPLLLLPPPPPPPPLLLLPK..",".KPLLLLLPKWWWWKPLLLLLPK.",".KLLLLPPKWWWWWWKPPLLLLK.","..KKPPKKWWWWWWWWKKPPKK..","....KKKWWWWWWWWWWKKK....",".....KKWWWWWWWWWWKK.....",".......KWWWWWWWWK.......",".......KWWWPPWWWK.......",".......KWWKKKKWWK.......","......KPPK....KPPK......",".....KPPPK....KPPPK.....","....KKFFKK....KKFFKK....","...KFKKK........KKKFK...","........................"],
});
Object.assign(PIXPAL,{yunpeng:'yunpeng',peng:'peng'});
// 罡风鬼:借鬼火帧改罡风白绿;霹雳鸟:借云鹏改雷暴黄紫;风狸王:借风狸改银白
const GFPAL={K:'#16241c',B:'#3a6e54',b:'#244a38',L:'#cfeede',W:'#f2fff8',E:'#9fe7a0'};
const PILIPAL=Object.assign({},PALS.yunpeng,{W:'#f6efc0',w:'#cdbf7a',B:'#6a4ea8',L:'#ffe24a',Y:'#ff7a30',E:'#2a1840'});
const FENGLIPAL={K:'#2a2a36','C':'#e6eef6','c':'#bcc8d6','W':'#ffffff','P':'#cfe0ff','E':'#3a4660','G':'#9fd0ec','T':'#9aa6b8','t':'#76808f'};
function drawYunpeng(x,y,s){pix('yunpeng',x,y,s);}
function drawPeng(x,y,s){pix('peng',x,y,s);}
function drawGangfeng(x,y,s){pix((frame>>3)%2?'flame1':'flame0',x,y,s,GFPAL);}
function drawPili(x,y,s){pix('yunpeng',x,y,s,PILIPAL);}
function drawFengli(x,y,s){pix('fox',x,y,s,FENGLIPAL);}
Object.assign(SPR,{yunpeng:drawYunpeng,peng:drawPeng,gangfeng:drawGangfeng,pili:drawPili,fengli:drawFengli});
Object.assign(SPRM,{yunpeng:{w:20,h:20,s:6},peng:{w:24,h:24,s:6},gangfeng:{w:16,h:20,s:8},pili:{w:20,h:20,s:6},fengli:{w:20,h:20,s:6}});

// ===== 第五章 · 黄泉地心:土族像素图 + 改色复用 =====
PALS.dilie={"K": "#1a0e06", "R": "#6a4a30", "r": "#3e2818", "L": "#a07a50", "M": "#ff6a20", "m": "#ffd23f", "E": "#ff5a20"};
PALS.sovereign={"K": "#140a04", "R": "#6a4a30", "r": "#3e2818", "L": "#9a7648", "M": "#ff7a2a", "m": "#ffe24a", "E": "#ff4040", "G": "#ffd23f", "C": "#a07a50"};
Object.assign(PIX,{
  dilie:["....................","......KKKKKK........",".....KRRRRRRK.......","....KRRLLLLRRK......","....KRRRRRRRRK......","...KRREERRRREERRK...","...KRREERRRREERRK...","...KRRRRMMMMRRRRK...","..KRRMMMMMMMMMMRRK..","..KRmMMMMMMMMMMmRK..","..KRRRRRRRRRRRRRRK..","..KRRMRRRRRRRRMRRK..",".KLRRRRRRRRRRRRRRLK.",".KKRRRRRRRRRRRRRRKK.","..KKRRRRRRRRRRRRKK..","...KRRRK....KRRRK...","..KRRRK......KRRRK..",".KRRRK........KRRRK.",".KRK............KRK.","...................."],
  sovereign:["........................",".....GG..........GG.....","....GGGG........GGGG....","....GGRGG......GGRGG....","....KKRRKKKKKKKKRRKK....","....KRRRRRRRRRRRRRRK....","....KRRREEKRRKEERRRK....","....KRRREEKRRKEERRRK....","....KRRRRRKRRKRRRRRK....","....KRRRRRRRRRRRRRRK....","....KRRRMMMMMMMMRRRK....","....KKRMMmMMMMmMMRKK....","....CKRRMMMMMMMMRRKC....","....CCKRRRRRRRRRRKCC....","....CCKRRRMMMMRRRKCC....","....CKRRRRRRRRRRRRKC....","....KRRRRRKRRKRRRRRK....","....KRRRRKRRRRKRRRRK....","....KKRRKRRRRRRKRRKK....",".....KRRKRRRRRRKRRK.....",".....KKRKKRRRRKKRKK.....","......KRRK....KRRK......",".....KRRK......KRRK.....","........................"],
});
Object.assign(PIXPAL,{dilie:'dilie',sovereign:'sovereign'});
// 山魈圣:借山魈改金土;石煞:借石傀改岩石;熔岩兽:借焰魔改熔岩
const SHANKPAL=Object.assign({},PALS.shan,{G:'#b08838',g:'#7a5a22',L:'#d9b04a',M:'#6a4a20',B:'#caa46a',b:'#8a6a3a',Y:'#ffe24a'});
const SHISHAPAL=Object.assign({},PALS.golem,{G:'#8a7256',g:'#5e4a32',L:'#b09a76',M:'#caa46a',R:'#ff8a3a',r:'#c4602a',E:'#ffd23f'});
const RONGPAL=Object.assign({},PALS.yanmo,{R:'#4a2a14',F:'#ff8a2a',f:'#ffe24a',B:'#2a1408',W:'#ffd0a0'});
function drawDilie(x,y,s){pix('dilie',x,y,s);}
function drawSovereign(x,y,s){pix('sovereign',x,y,s);}
function drawShankui(x,y,s){pix('shan',x,y,s,SHANKPAL);}
function drawShisha(x,y,s){pix('golem',x,y,s,SHISHAPAL);}
function drawRongyan(x,y,s){pix('yanmo',x,y,s,RONGPAL);}
Object.assign(SPR,{dilie:drawDilie,sovereign:drawSovereign,shankui:drawShankui,shisha:drawShisha,rongyan:drawRongyan});
Object.assign(SPRM,{dilie:{w:20,h:20,s:6},sovereign:{w:24,h:24,s:6},shankui:{w:20,h:20,s:6},shisha:{w:20,h:20,s:7},rongyan:{w:20,h:20,s:6}});

// ===== 第二部 · 天界篇:天将/天帝 像素图(改色复用,金白仙气)=====
const TIANHUOPAL={K:'#3a2410',F:'#ffce4a',f:'#fff0b0',R:'#f0a836',E:'#ff5a3a',W:'#fff8e6',B:'#c47a20'};        // 借焰魔
const XUANSHUIPAL={K:'#15303f',P:'#cfeaf6',p:'#9fc8e0',W:'#ffffff',E:'#ffd76a',I:'#6a9ec0'};                    // 借墨鱼
const ZILEIPAL={K:'#2a2410',D:'#e8d89a',d:'#c0a860',Y:'#fff0a0',y:'#ffd23f',B:'#b89a40',E:'#ff5a3a'};          // 借雷狱卒
const JINGANGPAL=Object.assign({},PALS.golem,{G:'#d9aa3c',g:'#a8801e',L:'#ffe98a',M:'#fff8e6',R:'#ff6a3a',r:'#c43a2f',E:'#fff0a0'}); // 借石傀
const EMPERORPAL=Object.assign({},PALS.king,{O:'#ffd76a',o:'#c79a1e',F:'#fff8e6',f:'#e8dcb8',E:'#ff5a3a',e:'#c43a2f',P:'#d9c89a',p:'#b8a060',L:'#fff0b0',G:'#ffe98a',C:'#ffffff',A:'#ffd76a'}); // 借千年妖王
function drawTianhuo(x,y,s){pix('yanmo',x,y,s,TIANHUOPAL);}
function drawXuanshui(x,y,s){pix('squid',x,y,s,XUANSHUIPAL);}
function drawZilei(x,y,s){pix('leiyu',x,y,s,ZILEIPAL);}
function drawJingang(x,y,s){pix('golem',x,y,s,JINGANGPAL);}
function drawEmperor(x,y,s){pix('king',x,y,s,EMPERORPAL);}
Object.assign(SPR,{tianhuo:drawTianhuo,xuanshui:drawXuanshui,zilei:drawZilei,jingang:drawJingang,emperor:drawEmperor});
Object.assign(SPRM,{tianhuo:{w:20,h:20,s:6},xuanshui:{w:20,h:20,s:6},zilei:{w:20,h:20,s:6},jingang:{w:20,h:20,s:7},emperor:{w:24,h:26,s:6}});
