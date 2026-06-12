'use strict';
// 把 index.html + src/*.js 合并为单文件 dist/lingshan-rpg.html(零依赖,双击即玩)
const fs=require('fs'),path=require('path');
const root=__dirname;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const tags=[...html.matchAll(/<script src="(src\/[^"]+)"><\/script>\n?/g)];
if(!tags.length){console.error('build: index.html 里没有找到 src 脚本标签');process.exit(1);}
const js=tags.map(m=>fs.readFileSync(path.join(root,m[1]),'utf8')).join('\n');
if(/<\/script/i.test(js)){console.error('build: 源码中含有 </script>,会破坏内联');process.exit(1);}
const first=tags[0],lastTag=tags[tags.length-1];
const start=html.indexOf(first[0]),end=html.indexOf(lastTag[0])+lastTag[0].length;
const out=html.slice(0,start)+'<script>\n'+js+'</script>\n'+html.slice(end);
fs.mkdirSync(path.join(root,'dist'),{recursive:true});
fs.writeFileSync(path.join(root,'dist/lingshan-rpg.html'),out);
// 同步输出到 docs/index.html —— GitHub Pages 直接把它当站点首页(孩子用链接就能玩)
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/index.html'),out);
fs.writeFileSync(path.join(root,'docs/.nojekyll'),''); // 关掉 Jekyll,原样静态托管
console.log('build: dist/lingshan-rpg.html + docs/index.html ('+(out.length/1024).toFixed(1)+' KB)');
