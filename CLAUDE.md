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
- 瓦片字符:`G` 草 `t` 深草(遇敌) `T` 树 `W` 水 `P` 路 `b` 桥 `R` 屋顶 `H` 墙 `X` 石墙 `F` 石地 `e` 符纹遇敌地 `D` 塔门 `d` 木门(进屋) `O` 出口 `S` 灵泉 `B` 封印 `f` 室内木地板
- 切图用 `switchMap(name,x,y)`;`cur`/`curName` 指向当前地图;新室内图直接往 `MAPS` 里加
- 进屋找宝贝(Phase 1):`DOORS` 双向传送表(键 `'地图:x,y'`)、`POIS[mapName]` 可调查家具/沉箱(撞击触发 `investigate()`)、`POI_KINDS` 种类与重复文案、`SNARK` 主人吐槽、`looted` 已翻过的点(随 `save()` 持久)。家具是 POI 层贴图,不占瓦片层
- **NPC 不能站在房门正下方**(x,40 的下一格),会堵死进屋通路,冒烟测试有可达性校验
- 第二章 · 水月湖底:地图 `lake`(水草 `c` 遇敌)+ `palace`(王座 `Z` 触发蛟龙战);世界图 `V` 漩涡为入口(`flags.ch2` 前如水不可入);新敌 yaksha/clam/squid/turtle/dragon
- 第三章 · 妖界魔渊:地图 `abyss`(魔纹 `m` 遇敌)+ `hell`(王座 `M` 触发魔尊战);入口复用锁妖塔封印 `B`(ch3 后渲染为鬼门、踏上即坠魔渊);新敌 yanmo/yin(改色鬼火)/mojiang(改色石傀)/leiyu/demon
- **技能解锁**:`skillKnown(s)` = 够等级 **且**(无 flag 或 flag 已解锁)。风灵咒 `{lvl:1,flag:'wind'}`(阿萝传授);升级链 `烈焰/玄冰/罡风/紫雷` 高等级自动领悟(`SKILL_UP` 是基础→大成映射)。不要再写 `S.lvl>=s.lvl`;`winB` 升级播报也要带 `(!s.flag||flags[s.flag])`
- **BGM 变奏**:`MELS`/`MUSCFG` 按场景分 field/tower/lake/abyss 四套;`melForBg(cur.bg)` 选曲,`switchMap` 末尾调 `setMelodyForMap()` 即时切换
- 章节流程靠 `flags`:ch2→wind→lakeIntro→dragon→ch3→abyssIntro→demon;`winB` 按 `B.key` 分支结局(king→`showEnding`,dragon→`showEnding2`,demon→`showEnding3`),`#endTitle` 动态改章节名
- 新增剧情 flag 必须同步改 `resetState()`(否则重开游戏残留);存档已整体序列化 `flags`,无需逐个加
- 加新妖怪精灵:对称的用 `python3` 镜像左半生成(见 git 历史),**单脸生物别整块镜像**(会变双脸),改用「居中段」式或直接写整行;`tests/smoke.js` 会校验每行等宽
- 像素角色:`PIX` 里加字符串像素图(每行等宽,冒烟测试会校验),调色板放 `PALS`,映射放 `PIXPAL`
- 交互模式:撞击触发(同 `npcAt()`),走向目标按方向键即可
- 存档:localStorage key `lingshan1`;新增持久字段要同时改 `save()`/`loadSave()`/`resetState()`
- 文案、注释、commit 全部用中文
