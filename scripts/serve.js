'use strict';
// 本地预览用的极简静态服务器(零依赖):node scripts/serve.js [端口]
const http=require('http'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const port=Number(process.argv[2]||8765);
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.json':'application/json'};
http.createServer((req,res)=>{
  const url=decodeURIComponent(req.url.split('?')[0]);
  let f=path.normalize(path.join(root,url==='/'?'index.html':url));
  if(!f.startsWith(root)){res.writeHead(403);res.end();return;}
  fs.readFile(f,(err,data)=>{
    if(err){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});
    res.end(data);
  });
}).listen(port,()=>console.log('serving http://localhost:'+port));
