# 灵山剑侠录 · 童年回忆版

零依赖的 2D 仙剑致敬小游戏。开发计划与验收标准见 [lingshan-plan.md](lingshan-plan.md),v1 原始单文件留档在 `baseline/lingshan-rpg-v1.html`。

## 命令

- `npm test` — 先 build 再跑冒烟测试(node + DOM stub,见 `tests/smoke.js`)。**改完逻辑必须跑。**
- `npm run build` — 把 `index.html` + `src/*.js` 合并为单文件 `dist/lingshan-rpg.html`(分享给孩子,双击即玩)。
- `npm run shots` — 视觉截图回归(需要可选依赖 node-canvas,未安装会自动跳过);`npm run shots:accept` 接受当前截图为基线。**改完画面跑。**

## 架构(加载顺序即依赖顺序)

| 文件 | 职责 |
|---|---|
| `index.html` | HTML/CSS 外壳 + 按顺序引入 src 脚本 |
| `src/data.js` | 数值层:`S` 玩家、`INV` 背包、`EQ` 装备、`SKILLS`、`ENM` 敌表、`flags` 剧情位、随机数 `rnd/srnd` |
| `src/sprites.js` | `PIX` 字符串像素图 + `PALS` 调色板 + `pix()`/`SPR` 绘制函数 |
| `src/maps.js` | 地图生成、`MAPS` 注册表、`NPCS` 配置 |
| `src/battle.js` | 回合制战斗状态机 `B` + 战斗绘制 |
| `src/engine.js` | 画布/音频/行走/对话/商店/存档 `save()/loadSave()`/主循环 |

全部是经典 script(非 module),共享全局作用域。**注意:** maps.js 的 NPC `talk` 必须写成箭头包装 `()=>fn()`,因为 fn 定义在更晚加载的 engine.js 里。

## 关键约定

- **零依赖**:游戏本体与测试不引第三方包(node-canvas 仅为可选 devDep)。
- 瓦片字符:`G` 草 `t` 深草(遇敌) `T` 树 `W` 水 `P` 路 `b` 桥 `R` 屋顶 `H` 墙 `X` 石墙 `F` 石地 `e` 符纹遇敌地 `D` 塔门 `O` 出口 `S` 灵泉 `B` 封印
- 切图用 `switchMap(name,x,y)`;`cur`/`curName` 指向当前地图;新室内图直接往 `MAPS` 里加
- 像素角色:`PIX` 里加字符串像素图(每行等宽,冒烟测试会校验),调色板放 `PALS`,映射放 `PIXPAL`
- 交互模式:撞击触发(同 `npcAt()`),走向目标按方向键即可
- 存档:localStorage key `lingshan1`;新增持久字段要同时改 `save()`/`loadSave()`/`resetState()`
- 文案、注释、commit 全部用中文
