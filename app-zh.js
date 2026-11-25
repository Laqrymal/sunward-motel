/**
 * 向阳汽车旅馆（1962）— 中文版全流程交互与心理坠落引擎
 * 完整同步英文版全部 16+ 项交互系统、声景渐进、标签页操控与二周目记忆机制。
 */

(function () {
  'use strict';

  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  let forceCleanTop = false;
  try {
    if (sessionStorage.getItem('sunward_clean_reset') === '1') {
      sessionStorage.removeItem('sunward_clean_reset');
      forceCleanTop = true;
      if (window.location.hash) {
        history.replaceState(null, '', window.location.href.split('#')[0]);
      }
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  } catch (_) {}

  const Audio = window.SunwardAudio;

  // =========================================================================
  // 会话状态与线索追踪
  // =========================================================================
  const state = {
    startedAt: Date.now(),
    arrivalTimeStr: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    guestName: '',
    currentAct: 1,
    maxScrollPct: 0,
    lastScrollY: 0,
    scrollUpCount: 0,
    scrollUpCooldown: 0,
    loopNumber: 1,
    clues: new Set(),
    inspectedKeys: new Set(),
    poolDipCount: 0,
    mapCalcCount: 0,
    radioPowered: false,
    radioHoldTimer: null,
    uvActive: false,
    doorPeekCounts: { 4: 0, 7: 0, 11: 0, 15: 0 },
    peepholeTimer: null,
    cancelDodges: 0,
    flashlightBattery: 100,
    flashlightInside: false,
    phoneAnswered: false,
    phoneCordCut: false,
    phoneRingInterval: null,
  };

  function markClue(id) {
    state.clues.add(id);
    updateReceipt();
  }

  // =========================================================================
  // 1. 大堂黑胶音响控制
  // =========================================================================
  const hifiToggle = document.getElementById('hifi-toggle');
  const hifiLabel = document.getElementById('hifi-label');
  const heroHifiCta = document.getElementById('hero-hifi-cta');
  const heroHifiCtaText = document.getElementById('hero-hifi-cta-text');

  function syncAudioButtons(isOn) {
    hifiToggle.setAttribute('aria-pressed', String(isOn));
    hifiLabel.textContent = isOn ? '音响：开' : '音响：关';
    if (heroHifiCtaText) {
      heroHifiCtaText.textContent = isOn ? '大堂黑胶音响播放中' : '开启 1962 大堂黑胶音响';
    }
  }

  hifiToggle.addEventListener('click', () => {
    syncAudioButtons(Audio.toggle());
  });

  if (heroHifiCta) {
    heroHifiCta.addEventListener('click', () => {
      syncAudioButtons(Audio.toggle());
    });
  }

  // =========================================================================
  // 2. 连续滚动心理坠落与全局氛围控制器
  // =========================================================================
  const root = document.documentElement;
  const milepostFill = document.getElementById('milepost-fill');
  const neonVacancy = document.getElementById('neon-vacancy');
  const neonVacancyText = document.getElementById('neon-vacancy-text');
  const weatherTemp = document.getElementById('weather-temp');
  const weatherCond = document.getElementById('weather-cond');
  const navBrandSub = document.getElementById('nav-brand-sub');
  const navLinks = Array.from(document.querySelectorAll('.nav-link'));
  const actSections = Array.from(document.querySelectorAll('[data-act-section]'));

  const NAV_STAGES = [
    ['泳池与庭院', '客房与房价', '旅客登记簿', '旅馆设施', '立即预订'],
    ['泳池与庭院', '1–14号客房', '旅客登记簿', '夜间电台', '立即预订'],
    ['深水区 14英尺', '空置客房', '登记簿', '入夜之后', '办理入住'],
    ['深不见底', '切勿敲门', '你的名字', '侧耳倾听', '15号房'],
    ['已反锁', '深水之下', '无人离开', '它看见你了', '留下来'],
  ];

  const WEATHER_STAGES = [
    ['29°C', '晴朗微风'],
    ['26°C', '荒漠暖风'],
    ['20°C', '日影拉长'],
    ['12°C', '19号州道暮色'],
    ['6°C', '干燥静电'],
    ['3°C', '凌晨 02:17'],
    ['1°C', '44英里碑浓雾'],
    ['--°C', '无信号'],
    ['--°C', '就在你身后'],
  ];

  const TITLE_STAGES = [
    '向阳汽车旅馆 — 19号州道的阳光栖居 | 始建于 1962',
    '向阳汽车旅馆 — 恒温泳池与明信片 | 19号州道',
    '向阳汽车旅馆 — 十四间庭院平房客房',
    '向阳汽车旅馆 — 1962年10月旅客登记簿',
    '向阳旅馆 — 日落之后（44英里碑）',
    '凌晨 02:17 — B翼走廊 | 向阳汽车旅馆',
    '15号房 — 退房日期已锁定',
    'B翼走廊 — 千万别关掉手电筒',
    '15号房的门开着 — 向阳汽车旅馆',
  ];

  function updateScrollAtmosphere() {
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY;
    const pct = Math.max(0, Math.min(1, y / docHeight));

    if (pct > state.maxScrollPct) state.maxScrollPct = pct;
    const now = Date.now();
    if (state.maxScrollPct > 0.36 && y < state.lastScrollY - 120 && now > state.scrollUpCooldown) {
      state.scrollUpCount++;
      state.scrollUpCooldown = now + 2200;
      updateReceipt();
    }
    state.lastScrollY = y;

    milepostFill.style.width = `${(pct * 100).toFixed(2)}%`;
    root.style.setProperty('--dread', pct.toFixed(3));
    root.style.setProperty('--vignette-opacity', Math.max(0, (pct - 0.22) * 1.25).toFixed(3));
    root.style.setProperty('--grain-opacity', (0.025 + pct * 0.16).toFixed(3));

    Audio.setDread(pct);

    let activeAct = 1;
    const probeY = window.innerHeight * 0.42;
    for (const sec of actSections) {
      const rect = sec.getBoundingClientRect();
      if (rect.top <= probeY) {
        activeAct = Number(sec.dataset.actSection) || 1;
      }
    }

    if (activeAct !== state.currentAct) {
      state.currentAct = activeAct;
      root.setAttribute('data-act', String(activeAct));
      applyActChrome(activeAct);

      if (activeAct === 9 && state.loopNumber === 1) {
        activateLoopTwo();
      }
    }
  }

  function applyActChrome(act) {
    if (act <= 2) {
      root.style.setProperty('--nav-bg', 'rgba(246, 239, 224, 0.94)');
      root.style.setProperty('--nav-ink', '#231b16');
      root.style.setProperty('--nav-border', 'rgba(35, 27, 22, 0.14)');
    } else if (act === 3) {
      root.style.setProperty('--nav-bg', 'rgba(232, 218, 190, 0.94)');
      root.style.setProperty('--nav-ink', '#2b1e16');
      root.style.setProperty('--nav-border', 'rgba(43, 30, 22, 0.18)');
    } else if (act === 4) {
      root.style.setProperty('--nav-bg', 'rgba(38, 28, 26, 0.94)');
      root.style.setProperty('--nav-ink', '#efe2ce');
      root.style.setProperty('--nav-border', 'rgba(239, 226, 206, 0.15)');
    } else if (act <= 6) {
      root.style.setProperty('--nav-bg', 'rgba(17, 12, 14, 0.95)');
      root.style.setProperty('--nav-ink', '#e4d5c9');
      root.style.setProperty('--nav-border', 'rgba(194, 29, 38, 0.22)');
    } else {
      root.style.setProperty('--nav-bg', 'rgba(12, 4, 6, 0.96)');
      root.style.setProperty('--nav-ink', '#f0cfcf');
      root.style.setProperty('--nav-border', 'rgba(194, 29, 38, 0.45)');
    }

    const stageIdx = act <= 2 ? 0 : act === 3 ? 1 : act <= 5 ? 2 : act <= 7 ? 3 : 4;
    const labels = NAV_STAGES[stageIdx];
    navLinks.forEach((link, i) => {
      if (labels[i]) link.textContent = labels[i];
    });

    if (act <= 3 && state.loopNumber === 1) {
      neonVacancyText.textContent = '有空房';
      neonVacancy.classList.remove('flicker');
    } else if (act === 4) {
      neonVacancyText.textContent = '仅余一间';
      neonVacancy.classList.add('flicker');
    } else if (act <= 6) {
      neonVacancyText.textContent = '客满';
      neonVacancy.classList.add('flicker');
    } else if (act <= 8) {
      neonVacancyText.textContent = '无出口';
      neonVacancy.classList.add('flicker');
    } else {
      neonVacancyText.textContent = '留下来';
      neonVacancy.classList.add('flicker');
    }

    const [temp, cond] = WEATHER_STAGES[act - 1] || WEATHER_STAGES[0];
    weatherTemp.textContent = temp;
    weatherCond.textContent = cond;

    if (act >= 7) {
      navBrandSub.textContent = '19号州道 · 1967年已废弃';
    } else if (act >= 5) {
      navBrandSub.textContent = '44英里碑 · 1962年10月19日';
    } else {
      navBrandSub.textContent = '19号州道 · 44英里碑';
    }

    if (!document.hidden) {
      document.title = TITLE_STAGES[act - 1] || TITLE_STAGES[0];
    }

    if (act === 9 && !state.phoneAnswered) {
      startPhoneRinging();
    } else {
      stopPhoneRinging();
    }
  }

  let scrollRaf = null;
  window.addEventListener('scroll', () => {
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        updateScrollAtmosphere();
        scrollRaf = null;
      });
    }
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state.currentAct >= 6 || state.loopNumber > 1) {
        document.title = '15号房的门还为你开着……';
      } else if (state.currentAct >= 3) {
        document.title = '你的车钥匙还落在向阳旅馆……';
      }
    } else {
      document.title = TITLE_STAGES[state.currentAct - 1] || TITLE_STAGES[0];
    }
  });

  // =========================================================================
  // 3. 第二幕：池畔水温计 & 3D 翻转明信片
  // =========================================================================
  const poolDipBtn = document.getElementById('pool-dip-btn');
  const poolTempVal = document.getElementById('pool-temp-val');
  const poolTempNote = document.getElementById('pool-temp-note');
  const depthMarker = document.getElementById('depth-marker');

  const POOL_READINGS = [
    { temp: '23°C', note: '清凉宜人。深水区排水格栅处传来轻微的低频嗡鸣。', depth: '深水区：14英尺' },
    { temp: '16°C', note: '七月的荒漠里池水冷得反常，可泵房加热开关明明开在最大档。', depth: '深水区：18英尺' },
    { temp: '8°C', note: '深水区水面彻底发黑。水下有什么东西轻轻蹭过了温度计细绳。', depth: '深水区：24英尺' },
    { temp: '2°C', note: '温度计绳子猛地绷紧，被往水底狠狠拽了两下。请勿俯身靠近池边瓷砖。', depth: '深水区：无底' },
  ];

  poolDipBtn.addEventListener('click', () => {
    Audio.playSfx('switchSnap');
    const reading = POOL_READINGS[Math.min(state.poolDipCount, POOL_READINGS.length - 1)];
    state.poolDipCount++;
    poolTempVal.textContent = reading.temp;
    poolTempNote.textContent = reading.note;
    depthMarker.textContent = reading.depth;
    if (state.poolDipCount >= 3) {
      poolTempVal.style.color = '#a81c24';
      markClue('pool_temp');
    }
  });

  document.querySelectorAll('.postcard').forEach((card) => {
    const toggleFlip = () => {
      const flipped = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(flipped));
      Audio.playSfx('cardFlip');
      if (card.dataset.postcard === '2' && flipped) {
        markClue('postcard_oct19');
      }
    };
    card.addEventListener('click', toggleFlip);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFlip();
      }
    });
  });

  // =========================================================================
  // 3B. 第二幕-B：星光咖啡餐吧点菜单 & 西伯格点唱机
  // =========================================================================
  const checkList = document.getElementById('check-list');
  const checkTotal = document.getElementById('check-total');
  const dinerOrderBtn = document.getElementById('diner-order-btn');
  const dinerClearBtn = document.getElementById('diner-clear-btn');
  const dinerOrderNote = document.getElementById('diner-order-note');
  const dinerItems = [];
  let dinerOrderCount = 0;

  function renderDinerCheck() {
    if (dinerItems.length === 0) {
      checkList.innerHTML = '<li class="check-empty">点击上方菜品，添加到您的手写点菜单……</li>';
      checkTotal.textContent = '$0.00';
      return;
    }
    let sum = 0;
    checkList.innerHTML = dinerItems
      .map((item) => {
        sum += item.price;
        return `<li><span>${escapeHtml(item.name)}</span><span>${item.price === 0 ? '招待' : '$' + item.price.toFixed(2)}</span></li>`;
      })
      .join('');
    checkTotal.textContent = `$${sum.toFixed(2)}`;
  }

  document.querySelectorAll('.menu-item-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      Audio.playSfx('typewriter');
      if (dinerItems.length >= 6) dinerItems.shift();
      dinerItems.push({ name: btn.dataset.dish, price: parseFloat(btn.dataset.price || '0') });
      renderDinerCheck();
      if (btn.dataset.dish.includes('夜班经理')) {
        dinerOrderNote.textContent = '伊芙琳在账单边缘用铅笔极轻地写着：“凌晨两点以后端出来的东西，一口都别吃。”';
      }
    });
  });

  dinerClearBtn.addEventListener('click', () => {
    dinerItems.length = 0;
    dinerOrderNote.textContent = '';
    renderDinerCheck();
  });

  dinerOrderBtn.addEventListener('click', () => {
    Audio.playSfx('keyClink');
    dinerOrderCount++;
    if (dinerItems.length === 0) {
      dinerOrderNote.textContent = '清脆的铃声在空荡荡的餐厅里回荡。后厨没有人走出来。';
    } else if (dinerOrderCount === 1) {
      dinerOrderNote.textContent = '下单成功！那壶黑咖啡自 1962 年 10 月 19 日起就一直在炉子上烧着。';
    } else {
      dinerOrderNote.textContent = '你又按了一次铃。透过出菜口，你看见煎台上方挂钟的指针死死指在 02:17。';
    }
  });

  const jbSongs = Array.from(document.querySelectorAll('.jb-song'));
  const jbLyric = document.getElementById('jb-np-lyric');
  const JB_LYRICS = {
    A1: '♪ “十九号公路金色夕阳，松石绿的池水暖洋洋……”（45转流畅旋转中）',
    A2: '♪ “摇下车窗驶向四十四英里，门前就有热腾腾的樱桃派！”',
    B1: '♪ “丝绒月光下……别丢了归途……公路又弯回了……” [唱针轻微跳格]',
    B2: '♪ “凌晨两点十七分霓虹嗡鸣……盐雾漫起时谁也别想启程……”',
    C1: '♪ [变形走调的33转] “……把车钥匙留在银盘里……亚瑟想留你住在这里……”',
    C2: '[被刮花的纹路] ……那不是音乐。那是有人隔着水下玻璃在一下一下地敲打……',
  };

  jbSongs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.jb;
      jbSongs.forEach((b) => b.classList.toggle('playing', b === btn));
      jbLyric.textContent = JB_LYRICS[code] || '';
      if (!Audio.enabled) syncAudioButtons(Audio.toggle());
      Audio.playJukebox(code);
    });
  });

  document.querySelectorAll('[data-reply-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reply = btn.nextElementSibling;
      const open = reply.hidden;
      reply.hidden = !open;
      btn.textContent = open ? '收起经理回复' : '查看经理回复';
      Audio.playSfx('cardFlip');
    });
  });

  // =========================================================================
  // 4. 第三幕：15 间房前台黄铜钥匙挂板
  // =========================================================================
  const UNITS = [
    { num: 1, name: '牧豆树单人间', rate: '$6.00 / 晚', status: '空房待客', desc: '紧邻前台的温馨路旁单人间，配备新刷松石绿浴室与挺括纯棉床单。', note: '早报已于 6:30 送达，冰桶已添满碎冰。', extra: '钥匙转动顺滑，带着淡淡的松木地板蜡香气。', odd: false },
    { num: 2, name: '仙人掌大床房', rate: '$6.50 / 晚', status: '空房待客', desc: '朝东采光极佳的庭院客房，配备弹簧双人床、松石绿瓷砖淋浴间，推门即见恒温肾形泳池。投币按摩床接受25分硬币。', note: '洗手台已摆放新香皂，百叶窗已除尘，随时可以入住。', extra: '床头投币按摩机的投币口摸起来还是温热的。', odd: false },
    { num: 3, name: '荒漠双床房', rate: '$7.00 / 晚', status: '空房待客', desc: '两张胡桃木床头单人床，非常适合结伴自驾或途经19号州道的推销员。', note: '床头柜抽屉已补齐三张免费亚麻明信片。', extra: '台灯底座压着一盒“星光咖啡餐吧”的火柴。', odd: false },
    { num: 4, name: '19号州道大床房', rate: '$6.50 / 晚', status: '空房（通风中）', desc: '位于庭院中段的安静大床房，配备镀铬行李架与真力时黑白电视。', note: '上一位住客把车停在 4 号车位怠速了整整 72 小时，油箱竟从未见底。房内电视至今未关。', extra: '凑近锁孔，能看到里面闪烁着灰白色的电视雪花。', odd: true },
    { num: 5, name: '落日露台房', rate: '$7.50 / 晚', status: '空房待客', desc: '附带两把锻铁露台椅，可远眺红色彩绘台地与午后镂空砖墙光影。', note: '已将门廊烧毁的灯泡更换为 40 瓦琥珀色防虫灯泡。', extra: '纱窗内侧一动不动地停着十几只荒漠飞蛾。', odd: false },
    { num: 6, name: '蜜月套房', rate: '$8.50 / 晚', status: '管理处暂留', desc: '转角大床套房，附赠冰镇苹果起泡酒与黄铜星芒壁钟。', note: '住客于10月12日黎明前“离开”。两只刻字皮箱与一对婚戒仍原封不动留在梳妆台上。', extra: '墙上星芒挂钟的两根指针像是焊死在 2:17。', odd: true },
    { num: 7, name: '树荫转角静室', rate: '$6.50 / 晚', status: '入夜后禁止出租', desc: '掩映在院落拐角怪柳树影下的安静客房。', note: '即便把床头摩托罗拉收音机的电源线剪断，它仍会在夜里持续播放人声广播。', extra: '握着黄铜钥匙牌时，指尖能感到一阵微弱的电流震颤。', odd: true },
    { num: 8, name: '台地双床房', rate: '$7.00 / 晚', status: '待维修', desc: '标准双床房型，配有釉面陶砖浴室与落地梳妆镜。', note: '10月15日住客投诉：浴室镜子里照出来的不是洗手池，而是一条陌生的漆黑走廊。', extra: '尽管室外高达 29°C，这把钥匙却冰得刺骨。', odd: true },
    { num: 9, name: '池畔大床房', rate: '$7.00 / 晚', status: '在住 — 严禁入内', desc: '推开门即可直通恒温肾形泳池的深水区边缘。', note: '无论发生什么情况，绝不要把胡桃木五斗柜从东墙移开。—— A.V.', extra: '凌晨 2:15 记录到五斗柜后方传出持续的抓挠声。', odd: true },
    { num: 10, name: '家庭汽车套房', rate: '$9.00 / 晚', status: '空房（未核检）', desc: '带折叠加床与宽敞瓷砖门厅的连通双间套房。', note: '客房部在蒸汽暖气片后面发现六张儿童蜡笔画，每一张的落款日期都是明天。', extra: '每张画里都有一个高大的黑影站在泳池边。', odd: true },
    { num: 11, name: 'B翼尽头套房', rate: '$7.50 / 晚', status: '自1962年10月19日起在住', desc: '位于制冰机壁龛旁，夜里荒漠风声会顺着门廊灌入。', note: '住客已整整六十余年未曾开门或叫餐，但每周二仍会从门缝底下塞出分毫不差的房费零钱。', extra: '门底胶条下正缓慢渗出冰冷的池水。', odd: true },
    { num: 12, name: '公路瞭望间', rate: '$6.00 / 晚', status: '暂停开放', desc: '临街客房，拉开百叶窗即可望见彩绘台地岔路口。', note: '房内真力时电视锁死在 3 频道，播放的正是你停在门外车辆的实时俯拍画面。', extra: '本旅馆从未安装过任何闭路监控摄像头。', odd: true },
    { num: 13, name: '无编号空钉', rate: '—', status: '本馆不设 13 号房', desc: '遵循 1962 年体面公路旅馆的惯例，向阳旅馆跳过 13 号房以祈求平安。', note: '夜里沿水泥廊道散步时，千万不要数一共有几扇门。每次数出来的数字都不一样。', extra: '只剩下一枚弯折的生锈铁钉，周围木板上布满深深的指甲划痕。', missing: true, odd: true },
    { num: 14, name: '14号房 — 已封死', rate: '不适用', status: '管理处永久查封', desc: '紧贴地下泳池泵房的后排尽头客房。', note: '因 14 英尺深水排水口向上倒灌积水，已于 1962 年 10 月 18 日砌砖封门。', extra: '这把黄铜钥匙被彻底融封在一块凝固的红蜡里。', odd: true },
    { num: 15, name: '15号房 — 锅炉房与地下附楼', rate: '你的车钥匙', status: '已分配给你', desc: '1962 年的原始建筑蓝图上根本不存在这个房间，可它的钥匙挂钩却永远擦得锃亮。', note: '仅限亚瑟使用——严禁交给住客。等等。低头看看你的手，你早就把这把钥匙拿在手里了。', extra: '钥匙挂板木板内部突然传来三声沉闷的敲门声。', room15: true, odd: true },
  ];

  const pegboard = document.getElementById('key-pegboard');
  const keyrackTally = document.getElementById('keyrack-tally');
  const roomFolio = document.getElementById('room-folio');
  const folioUnit = document.getElementById('folio-unit');
  const folioRate = document.getElementById('folio-rate');
  const folioName = document.getElementById('folio-name');
  const folioStatus = document.getElementById('folio-status');
  const folioDesc = document.getElementById('folio-desc');
  const folioNote = document.getElementById('folio-note');
  const folioRattleBtn = document.getElementById('folio-rattle-btn');
  const folioExtra = document.getElementById('folio-extra');

  let activeUnit = UNITS[1];

  function selectUnit(unit, triggerSfx = true) {
    activeUnit = unit;
    state.inspectedKeys.add(unit.num);
    keyrackTally.textContent = `已查验：${state.inspectedKeys.size} / 15 间`;

    document.querySelectorAll('.key-hook').forEach((btn) => {
      const n = Number(btn.dataset.unit);
      btn.classList.toggle('active', n === unit.num);
      if (state.inspectedKeys.has(n)) btn.classList.add('inspected');
    });

    folioUnit.textContent = unit.missing ? '13 号空钉（无房）' : `${String(unit.num).padStart(2, '0')} 号房`;
    folioRate.textContent = unit.rate;
    folioName.textContent = unit.name;
    folioStatus.textContent = `状态：${unit.status}`;
    folioDesc.textContent = unit.desc;
    folioNote.textContent = unit.note;
    folioExtra.textContent = '';
    roomFolio.classList.toggle('eerie-folio', Boolean(unit.room15 || unit.num === 11 || unit.num === 14));

    if (triggerSfx) Audio.playSfx(unit.room15 ? 'doorKnock' : 'keyClink');

    if (unit.room15) {
      pegboard.classList.remove('shake-brief');
      void pegboard.offsetWidth;
      pegboard.classList.add('shake-brief');
      markClue('room15_key');
    }
  }

  UNITS.forEach((unit) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'key-hook';
    if (unit.odd) btn.classList.add('odd-key');
    if (unit.missing) btn.classList.add('missing-key');
    if (unit.room15) btn.classList.add('room-15-key');
    btn.dataset.unit = String(unit.num);
    btn.setAttribute('aria-label', `查验 ${unit.num} 号房`);
    btn.innerHTML = `
      <span class="hook-nail" aria-hidden="true"></span>
      <span class="key-fob">
        <span class="fob-num">${unit.missing ? '—' : String(unit.num).padStart(2, '0')}</span>
        <span class="fob-sub">${unit.room15 ? '附楼' : unit.missing ? '空缺' : '客房'}</span>
      </span>
    `;
    btn.addEventListener('click', () => selectUnit(unit, true));
    pegboard.appendChild(btn);
  });

  selectUnit(UNITS[1], false);

  folioRattleBtn.addEventListener('click', () => {
    Audio.playSfx(activeUnit.room15 ? 'doorKnock' : 'keyClink');
    folioExtra.textContent = activeUnit.extra;
  });

  // =========================================================================
  // 5. 第四幕：1962 旅客登记簿 & 19号州道环路里程计算器
  // =========================================================================
  const LEDGER_DATA = {
    spring: [
      { date: '1962.05.14', name: '沃尔特·布里格斯夫妇', city: '亚利桑那 图森', car: '59款 别克', unit: '02', remark: '10:15 退房 — 泳池非常棒！' },
      { date: '1962.05.22', name: '吉纳维芙·卡拉汉', city: '科罗拉多 丹佛', car: '61款 雪佛兰', unit: '05', remark: '09:40 退房 — 隔壁樱桃派极香' },
      { date: '1962.06.08', name: '老卢与贝蒂·米勒', city: '堪萨斯 威奇托', car: '60款 奥兹莫比尔', unit: '01', remark: '11:00 退房 — 寄出三张明信片' },
      { date: '1962.07.04', name: '托马斯·黑尔牧师', city: '新墨西哥 圣达菲', car: '58款 福特', unit: '03', remark: '08:30 退房 — 荒漠夜晚很宁静' },
      { date: '1962.07.27', name: '科瓦尔斯基一家', city: '伊利诺伊 芝加哥', car: '62款 庞蒂亚克', unit: '10', remark: '10:50 退房 — 孩子们超爱泳池' },
    ],
    lateSummer: [
      { date: '1962.08.19', name: '雷蒙德与克莱尔·贝尔', city: '得克萨斯 埃尔帕索', car: '61款 水星', unit: '04', remark: '06:00 匆忙退房 — 抱怨地板底下有嗡鸣声', cls: 'ledger-row-odd' },
      { date: '1962.09.03', name: '弗兰基·德卢卡', city: '内华达 拉斯维加斯', car: '62款 凯迪拉克', unit: '08', remark: '提前离开 — 追问为何手表停在 02:17', cls: 'ledger-row-odd' },
      { date: '1962.09.16', name: '埃莉诺与保罗·万斯', city: '亚利桑那 弗拉格斯塔夫', car: '60款 斯图贝克', unit: '06', remark: '同一车牌登记了两次？—— A.V.', cls: 'ledger-row-odd' },
      { date: '1962.09.29', name: '罗伯特·亨德森', city: '俄克拉荷马 塔尔萨', car: '61款 普利茅斯', unit: '09', remark: '等待镇上风扇皮带（无退房记录）', cls: 'ledger-row-odd' },
    ],
    october: [
      { date: '1962.10.12', name: 'J. 默瑟夫妇', city: '得克萨斯 达拉斯', car: '62款 福特雷鸟', unit: '06', remark: '未退房 — 行李与婚戒仍在 06 号房', cls: 'ledger-row-odd' },
      { date: '1962.10.15', name: 'H. 林德斯特伦博士', city: '加州 帕萨迪纳', car: '61款 克莱斯勒', unit: '08', remark: '未退房 — 车辆被发现怠速停在 44 英里碑', cls: 'ledger-row-odd' },
      { date: '1962.10.18', name: '克拉拉与山姆·道森', city: '新墨西哥 阿尔伯克基', car: '60款 道奇', unit: '11', remark: '仍在 11 号房 — 切勿打扰', cls: 'ledger-row-horror' },
      { date: '1962.10.19', name: '亚瑟·万斯（馆主）', city: '彩绘台地', car: '在馆内', unit: '前台', remark: '凌晨 02:17 — 霓虹跳闸 — 公路断绝', cls: 'ledger-row-horror' },
    ],
  };

  const ledgerTbody = document.getElementById('ledger-tbody');
  const gbTabs = Array.from(document.querySelectorAll('.gb-tab'));

  function renderLedger(pageKey) {
    gbTabs.forEach((t) => {
      const isActive = t.dataset.gbPage === pageKey;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    const rows = [...(LEDGER_DATA[pageKey] || [])];
    if (pageKey === 'october') {
      markClue('october_ledger');
      rows.push({
        date: '今日 · ' + state.arrivalTimeStr,
        name: state.guestName || '你（未登记访客）',
        city: '当前浏览器',
        car: '远光灯未关',
        unit: '15',
        remark: '系统已自动办理入住 — 无退房日期',
        cls: 'ledger-row-horror',
      });
    }

    ledgerTbody.innerHTML = rows
      .map(
        (r) => `
      <tr class="${r.cls || ''}">
        <td>${escapeHtml(r.date)}</td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.city)}</td>
        <td>${escapeHtml(r.car)}</td>
        <td>${escapeHtml(r.unit)}</td>
        <td>${escapeHtml(r.remark)}</td>
      </tr>`
      )
      .join('');
  }

  gbTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      Audio.playSfx('cardFlip');
      renderLedger(tab.dataset.gbPage);
    });
  });
  renderLedger('spring');

  const regForm = document.getElementById('register-sign-form');
  const regName = document.getElementById('reg-name');
  const regCity = document.getElementById('reg-city');
  const regCar = document.getElementById('reg-car');
  const regFeedback = document.getElementById('register-feedback');
  const trapNameInput = document.getElementById('trap-name');

  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = regName.value.trim() || '迷途旅人';
    const city = regCity.value.trim() || '未知公路';
    const car = regCar.value.trim() || '怠速中的轿车';

    state.guestName = name;
    if (trapNameInput && !trapNameInput.value) trapNameInput.value = name;

    Audio.playSfx('typewriter');
    regFeedback.textContent = `欢迎光临，${name}。正在将您的姓名录入 1962 年大堂登记簿……`;
    renderLedger('october');

    setTimeout(() => {
      Audio.playSfx('doorKnock');
      regFeedback.textContent = `管理处批注：感谢入住，${name}（来自${city}）。您的${car}钥匙已锁入前台保险柜。系统为您分配了 15 号房，退房日期：永不。`;
      markClue('signed_ledger');
      updateReceipt();
    }, 1150);
  });

  const destSelect = document.getElementById('dest-select');
  const calcBtn = document.getElementById('calc-route-btn');
  const calcResult = document.getElementById('calc-result');
  const highwayLoopPath = document.getElementById('highway-loop-path');
  const mapFooterStamp = document.getElementById('map-footer-stamp');

  const NORMAL_ROUTES = {
    mesa: '彩绘台地杂货铺 — 沿19号州道向西 4.2 英里（约 6 分钟车程）。',
    interstate: '40号州际公路东行入口 — 向北 11.0 英里（约 14 分钟车程）。',
    flagstaff: '弗拉格斯塔夫市中心 — 向西 88.4 英里（约 1 小时 35 分钟车程）。',
    home: '最近县道出口 — 向南 14.5 英里至彩绘台地岔口。',
  };

  calcBtn.addEventListener('click', () => {
    state.mapCalcCount++;
    Audio.playSfx('switchSnap');
    const dest = destSelect.value;

    if (state.mapCalcCount === 1 && dest !== 'home') {
      calcResult.classList.remove('glitched');
      calcResult.textContent = NORMAL_ROUTES[dest];
    } else if (state.mapCalcCount === 2 || (state.mapCalcCount === 1 && dest === 'home')) {
      calcResult.classList.add('glitched');
      calcResult.textContent =
        '正在重新规划…… 距离：11.0 英里 — 预计耗时：6 小时 17 分钟。警告：19号州道高架桥已于 1967 年拆除。';
    } else {
      calcResult.classList.add('glitched');
      calcResult.textContent =
        '剩余距离：0.0 英里 — 你已经连续三次经过 44 号里程碑。双向车道都在尽头弯回了向阳旅馆停车场。熄灭你的车灯吧。';
      if (highwayLoopPath) highwayLoopPath.setAttribute('opacity', '0.95');
      if (mapFooterStamp) mapFooterStamp.textContent = '亚利桑那公路局 · 19号州道已废弃 · 无出口';
      markClue('route_loop');
    }
  });

  // =========================================================================
  // 6. 第五幕：摩托罗拉调幅收音机、紫外线验钞台与真力时显像管电视
  // =========================================================================
  const radioCabinet = document.getElementById('radio-cabinet');
  const radioPowerBtn = document.getElementById('radio-power-btn');
  const radioStatusLed = document.getElementById('radio-status-led');
  const radioSlider = document.getElementById('radio-slider');
  const radioNeedle = document.getElementById('radio-needle');
  const radioFreqReadout = document.getElementById('radio-freq-readout');
  const transcriptStation = document.getElementById('transcript-station');
  const transcriptText = document.getElementById('transcript-text');
  const presetBtns = Array.from(document.querySelectorAll('.preset-btn'));

  const STATIONS = [
    {
      freq: 580,
      name: '580 AM — K-SUN 荒漠金曲台 (1962)',
      text: '♪ “……彩绘台地又一个金色午后！接下来为您献上向阳泳池边的丝绒月亮——泳池边的——泳池边的——请不要游过深水排水口——泳池边的……”',
    },
    {
      freq: 890,
      name: '890 AM — 亚利桑那州公路巡警存档频段',
      text: '[电流爆裂声] “……紧急通告所有南行驾驶人：旧19号州道 40 至 48 英里碑路段已于 1967 年彻底废弃拆除。若您在夜雾中看到发光的松石绿旅馆霓虹招牌，绝对不要停车。锁死车门……”',
    },
    {
      freq: 1120,
      name: '1120 AM — 夜间前台内部对讲频道',
      text: '[低沉电流嗡鸣] “……晚上好，15号房的客人。我是前台的亚瑟。刚才听见您的水箱在滴答作响，所以我擅自帮您拆下了分电器盖，天亮再装回去。好好休息吧，今晚的荒漠黑得很……”',
    },
    {
      freq: 1380,
      name: '1380 AM — 15号房监听线路（实时）',
      text: '[有节奏的木门敲击声] “……一……二……三……别再往下滑了……它就坐在床尾……四……五……你为什么要把声音打开？……”',
    },
    {
      freq: 1560,
      name: '1560 AM — 空频段盲区',
      text: '[剧烈白噪声] ……将旋钮稳稳停在 1560 AM，尝试捕捉微弱载波信号……',
      secret: '[清晰的低语] “……零二一七……十月十九日……打开紫外线灯照值班卡……亚瑟早就不是亚瑟了……”',
    },
  ];

  function updateRadioDisplay() {
    const freq = Number(radioSlider.value);
    const pct = ((freq - 540) / (1600 - 540)) * 92 + 4;
    radioNeedle.style.left = `${pct}%`;
    radioFreqReadout.textContent = `${freq} AM`;

    presetBtns.forEach((b) => {
      b.classList.toggle('active', Math.abs(Number(b.dataset.freq) - freq) <= 15);
    });

    clearTimeout(state.radioHoldTimer);

    if (!state.radioPowered) {
      transcriptStation.textContent = '接收机待机中';
      transcriptText.textContent = '按下“电源”预热电子管，扫描彩绘台地夜空下的调幅波段。';
      Audio.setRadioState(false, freq, null);
      return;
    }

    const match = STATIONS.find((s) => Math.abs(s.freq - freq) <= 15);
    Audio.setRadioState(true, freq, match ? match.freq : null);

    if (match) {
      transcriptStation.textContent = match.name;
      transcriptText.textContent = match.text;
      if (match.freq === 890 || match.freq === 1380) markClue('radio_signal');
      if (match.secret) {
        state.radioHoldTimer = setTimeout(() => {
          if (state.radioPowered && Math.abs(Number(radioSlider.value) - 1560) <= 15) {
            transcriptStation.textContent = '1560 AM — 隐藏载波已锁定';
            transcriptText.textContent = match.secret;
            Audio.playSfx('doorKnock');
            markClue('radio_signal');
          }
        }, 2100);
      }
    } else {
      transcriptStation.textContent = `${freq} AM — 频段间白噪声`;
      transcriptText.textContent = '[荒漠静电沙沙声] ……微弱的交流电嗡鸣…… 试试调至 580、890、1120、1380 或 1560 AM……';
    }
  }

  radioPowerBtn.addEventListener('click', () => {
    state.radioPowered = !state.radioPowered;
    radioCabinet.classList.toggle('powered', state.radioPowered);
    radioPowerBtn.setAttribute('aria-pressed', String(state.radioPowered));
    radioPowerBtn.textContent = state.radioPowered ? '电源：开' : '电源：关';
    radioStatusLed.textContent = state.radioPowered ? '电子管已预热 · 接收中' : '电子管未预热';

    if (state.radioPowered && !Audio.enabled) syncAudioButtons(Audio.toggle());
    else Audio.playSfx('switchSnap');
    updateRadioDisplay();
  });

  radioSlider.addEventListener('input', updateRadioDisplay);
  presetBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      radioSlider.value = btn.dataset.freq;
      if (!state.radioPowered) radioPowerBtn.click();
      else {
        Audio.playSfx('switchSnap');
        updateRadioDisplay();
      }
    });
  });
  updateRadioDisplay();

  // 紫外线黑光灯检查台
  const uvToggleBtn = document.getElementById('uv-toggle-btn');
  const uvBtnLabel = document.getElementById('uv-btn-label');
  const uvBoard = document.getElementById('uv-board');
  const uvCards = Array.from(document.querySelectorAll('.index-card'));

  uvToggleBtn.addEventListener('click', () => {
    state.uvActive = !state.uvActive;
    uvToggleBtn.setAttribute('aria-pressed', String(state.uvActive));
    uvBoard.classList.toggle('uv-on', state.uvActive);
    uvBtnLabel.textContent = state.uvActive ? '关闭紫外线黑光灯' : '开启紫外线验钞黑光灯';
    Audio.playSfx('switchSnap');

    if (!state.uvActive) uvCards.forEach((c) => c.classList.remove('uv-lit'));
    else markClue('uv_logs');
  });

  function moveUvSpot(clientX, clientY) {
    if (!state.uvActive) return;
    const rect = uvBoard.getBoundingClientRect();
    uvBoard.style.setProperty('--uv-x', `${clientX - rect.left}px`);
    uvBoard.style.setProperty('--uv-y', `${clientY - rect.top}px`);

    uvCards.forEach((card) => {
      const cRect = card.getBoundingClientRect();
      const dist = Math.hypot(clientX - (cRect.left + cRect.width / 2), clientY - (cRect.top + cRect.height / 2));
      card.classList.toggle('uv-lit', dist < Math.max(cRect.width * 0.65, 190));
    });
  }

  uvBoard.addEventListener('mousemove', (e) => moveUvSpot(e.clientX, e.clientY));
  uvBoard.addEventListener('touchstart', (e) => {
    if (e.touches[0]) moveUvSpot(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  uvBoard.addEventListener('touchmove', (e) => {
    if (e.touches[0]) moveUvSpot(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  uvBoard.addEventListener('click', (e) => moveUvSpot(e.clientX, e.clientY));

  // 真力时显像管电视（实时 Canvas 雪花与信号画面）
  const zenithCanvas = document.getElementById('zenith-canvas');
  const tvHudTag = document.getElementById('tv-hud-tag');
  const tvChannelDesc = document.getElementById('tv-channel-desc');
  const tvAntennaSlider = document.getElementById('tv-antenna-slider');
  const tvChBtns = Array.from(document.querySelectorAll('.tv-ch-btn'));

  if (zenithCanvas) {
    const ctx = zenithCanvas.getContext('2d');
    const nightFeedImg = new Image();
    nightFeedImg.src = 'assets/hero-sunward-night.jpg';
    let tvChannel = 3;
    let tvTick = 0;

    const CH_META = {
      0: { hud: '电源已关闭', desc: '<strong>待机中：</strong>即使关掉电源，显像管玻璃摸起来依然带着诡异的余温。' },
      2: { hud: '2频道 · 停播测试卡', desc: '<strong>2 频道 — 停播测试画面：</strong>彩绘台地电视台测试图。将兔耳天线滑块调至 65 附近以稳定画面。' },
      3: { hud: '3频道 · 凌晨 02:17', desc: '<strong>3 频道 — 庭院实时信号：</strong>充满噪点的黑白庭院泳池监控画面。将兔耳天线调至 75 附近可看清池边的人影。' },
      4: { hud: '4频道 · 民防警报', desc: '<strong>4 频道 — 紧急播报存档：</strong>录制于 1962 年 10 月 19 日的 19 号州道民防广播。' },
      7: { hud: '7频道 · 空白频段', desc: '<strong>7 频道 — 未分配频道：</strong>这里本不应该有任何画面。慢慢将兔耳天线滑向 82……' },
    };

    tvChBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        tvChannel = Number(btn.dataset.ch);
        tvChBtns.forEach((b) => b.classList.toggle('active', b === btn));
        const meta = CH_META[tvChannel];
        tvHudTag.textContent = meta.hud;
        tvChannelDesc.innerHTML = meta.desc;
        Audio.playSfx('switchSnap');
      });
    });

    function drawZenithFrame() {
      tvTick++;
      const w = zenithCanvas.width;
      const h = zenithCanvas.height;
      const tune = Number(tvAntennaSlider.value);

      if (tvChannel === 0) {
        ctx.fillStyle = '#090a0a';
        ctx.fillRect(0, 0, w, h);
        return;
      }

      const sweetSpots = { 2: 65, 3: 75, 4: 50, 7: 82 };
      const clarity = Math.max(0.08, 1 - Math.abs(tune - (sweetSpots[tvChannel] || 50)) / 52);

      ctx.fillStyle = '#0d0f0e';
      ctx.fillRect(0, 0, w, h);

      if (tvChannel === 3 && nightFeedImg.complete) {
        ctx.save();
        ctx.globalAlpha = 0.25 + clarity * 0.72;
        ctx.filter = `grayscale(1) contrast(${1.2 + clarity * 0.6}) brightness(${0.65 + clarity * 0.25})`;
        const zoom = 1 + (clarity > 0.75 ? 0.14 : 0);
        const dw = w * zoom;
        const dh = h * zoom;
        ctx.drawImage(nightFeedImg, (w - dw) / 2, (h - dh) / 2, dw, dh);
        ctx.restore();

        if (clarity > 0.78) {
          ctx.fillStyle = 'rgba(220, 60, 65, 0.9)';
          ctx.font = 'bold 14px "Noto Sans SC", sans-serif';
          ctx.fillText('● REC  44英里碑 — 它正在看镜头', 16, h - 18);
        }
      } else if (tvChannel === 2) {
        ctx.save();
        ctx.globalAlpha = 0.25 + clarity * 0.7;
        ctx.strokeStyle = '#d4ded6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w / 2, h / 2, 108, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w / 2, h);
        ctx.stroke();
        ctx.fillStyle = '#e2ece4';
        ctx.font = 'bold 18px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(clarity > 0.75 ? '切勿离开你的房间' : '信号中断 · 请稍候 (1962)', w / 2, h / 2 - 12);
        ctx.restore();
      } else if (tvChannel === 4) {
        ctx.fillStyle = '#151922';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f0e6d2';
        ctx.font = 'bold 20px "Noto Sans SC", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('亚利桑那州民防紧急通报', w / 2, 74);
        ctx.font = '14px "Noto Serif SC", serif';
        ctx.fillStyle = '#ff8b8f';
        ctx.fillText('19号州道 44英里碑处并无任何建筑。', w / 2, 145);
        ctx.fillText('切勿因松石绿霓虹灯而停车。', w / 2, 178);
        ctx.fillText('天亮之前请锁紧所有门窗。', w / 2, 211);
      } else if (tvChannel === 7) {
        if (clarity > 0.72) {
          const pulse = 0.65 + Math.sin(tvTick * 0.14) * 0.25;
          ctx.fillStyle = `rgba(245, 232, 226, ${pulse * clarity})`;
          ctx.beginPath();
          ctx.ellipse(w / 2 - 44, h / 2 - 6, 13, 6, 0, 0, Math.PI * 2);
          ctx.ellipse(w / 2 + 44, h / 2 - 6, 13, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#060203';
          ctx.beginPath();
          ctx.arc(w / 2 - 44, h / 2 - 6, 4, 0, Math.PI * 2);
          ctx.arc(w / 2 + 44, h / 2 - 6, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 110, 118, 0.92)';
          ctx.font = '14px "Noto Serif SC", serif';
          ctx.textAlign = 'center';
          ctx.fillText('把它关掉', w / 2, h - 26);
        }
      }

      const snowCount = Math.floor(380 + (1 - clarity) * 1650);
      ctx.fillStyle = 'rgba(230, 238, 232, 0.26)';
      for (let i = 0; i < snowCount; i++) {
        ctx.fillRect(Math.random() * w, Math.random() * h, 2.2, 1.8);
      }
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, (tvTick * 3.2) % h, w, 14);
    }

    setInterval(() => {
      if (state.currentAct >= 4 && state.currentAct <= 6) drawZenithFrame();
    }, 95);
    drawZenithFrame();
  }

  // =========================================================================
  // 7. 第六幕：凌晨 02:17 走廊与黄铜猫眼窥视
  // =========================================================================
  const peepholeStage = document.getElementById('peephole-stage');
  const peepholeTitle = document.getElementById('peephole-active-title');
  const peepholeImg = document.getElementById('peephole-img');
  const peepholeCaption = document.getElementById('peephole-caption');
  const peepholeCircle = document.getElementById('peephole-circle');
  const peepholeEyeScare = document.getElementById('peephole-eye-scare');
  const peepholeCloseBtn = document.getElementById('peephole-close-btn');

  const DOOR_VIEWS = {
    4: {
      img: 'assets/peephole-room.jpg',
      first: {
        filter: 'brightness(0.85) contrast(1.15)',
        caption: '04号房里空无一人。一把旧木椅背对着门，面朝剥落的墙角。真力时电视机正发出灰白色的雪花噪点。',
      },
      second: {
        filter: 'brightness(0.7) contrast(1.45) hue-rotate(-15deg)',
        caption: '等等。仔细看。那把木椅不再面向墙角了——它被拖到了门后，正对着猫眼下方。',
        doorNote: '地板上传来沉重的木椅拖曳声。',
      },
    },
    7: {
      img: 'assets/polaroid-desk.jpg',
      first: {
        filter: 'brightness(0.62) contrast(1.35) sepia(0.35)',
        caption: '07号房本该是一间卧室，可透过猫眼玻璃，你看到的却是午夜空无一人的旅馆前台大堂。',
      },
      second: {
        filter: 'brightness(0.48) contrast(1.7) sepia(0.5) hue-rotate(-30deg)',
        caption: '破裂前台玻璃后面的那个苍白人影，正顺着镜筒直勾勾地盯着你的眼睛。快退后。',
        doorNote: '有人贴着锁孔轻声说：“别再看了。”',
      },
    },
    11: {
      img: 'assets/hero-sunward-night.jpg',
      first: {
        filter: 'brightness(0.85) contrast(1.25)',
        caption: '透过11号门看见的是浓雾弥漫的庭院。漆黑的泳池边，站着一个一动不动的高大黑影。',
      },
      second: {
        filter: 'brightness(0.75) contrast(1.55) saturate(1.3)',
        caption: '泳池边已经空了。一串湿漉漉的脚印从深水区一直延伸到你的房门前。',
        doorNote: '冰冷的池水正漫过你的鞋底。',
      },
    },
    15: {
      img: 'assets/climax-hallway.jpg',
      first: {
        filter: 'brightness(0.45) contrast(1.6) sepia(0.4) hue-rotate(-35deg)',
        caption: '别动……15号门后面根本没有床，只有一段通往泳池底部的水泥台阶。等等……有什么东西正顺着台阶走上来……',
        eyeScare: true,
        doorNote: '它回看你了。',
      },
      second: {
        filter: 'brightness(0.35) contrast(1.8) sepia(0.5) hue-rotate(-40deg)',
        caption: '它已经来到玻璃这一侧了。',
        eyeScare: true,
        doorNote: '防盗链已经崩断。',
      },
    },
  };

  function openPeephole(doorNum) {
    clearTimeout(state.peepholeTimer);
    peepholeEyeScare.classList.remove('revealed');
    state.doorPeekCounts[doorNum] = (state.doorPeekCounts[doorNum] || 0) + 1;
    const count = state.doorPeekCounts[doorNum];
    const config = DOOR_VIEWS[doorNum];
    const view = count === 1 ? config.first : config.second;

    Audio.playSfx('peepholeSlide');
    peepholeStage.hidden = false;
    peepholeTitle.textContent = `正在透过黄铜猫眼窥视 — ${String(doorNum).padStart(2, '0')}号房（第 ${count} 次）`;
    peepholeImg.src = config.img;
    peepholeImg.style.filter = view.filter;
    peepholeCaption.textContent = view.caption;

    const statusEl = document.getElementById(`door-status-${doorNum}`);
    if (view.doorNote && statusEl) {
      statusEl.textContent = view.doorNote;
      statusEl.style.color = '#ff7d83';
    }

    peepholeStage.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (view.eyeScare) {
      markClue('peephole_15');
      state.peepholeTimer = setTimeout(() => {
        peepholeEyeScare.classList.add('revealed');
        peepholeCaption.textContent = '一只瞳孔放大、毫无眨动的眼睛，死死贴在了猫眼玻璃的另一侧。';
        Audio.playSfx('doorKnock');
        Audio.playSfx('scareSting');
        peepholeCircle.classList.remove('shake-brief');
        void peepholeCircle.offsetWidth;
        peepholeCircle.classList.add('shake-brief');
      }, count === 1 ? 1550 : 650);
    }
  }

  document.querySelectorAll('[data-door-open]').forEach((btn) => {
    btn.addEventListener('click', () => openPeephole(Number(btn.dataset.doorOpen)));
  });

  peepholeCloseBtn.addEventListener('click', () => {
    clearTimeout(state.peepholeTimer);
    peepholeEyeScare.classList.remove('revealed');
    peepholeStage.hidden = true;
    Audio.playSfx('peepholeSlide');
  });

  peepholeCircle.addEventListener('mousemove', (e) => {
    const r = peepholeCircle.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * -14;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * -14;
    peepholeImg.style.transform = `translate(calc(-7% + ${dx}px), calc(-7% + ${dy}px)) scale(1.09)`;
  });

  // =========================================================================
  // 8. 第七幕：暗室拍立得、入住陷阱与反抗的配电箱
  // =========================================================================
  document.querySelectorAll('.polaroid-card').forEach((card) => {
    card.addEventListener('click', () => {
      if (card.classList.contains('developed')) return;
      card.classList.add('developed');
      Audio.playSfx('polaroidEject');
      markClue('darkroom_polaroid');

      const noteEl = card.querySelector('.polaroid-note');
      const altText = noteEl && noteEl.dataset.altNote;
      if (altText) {
        setTimeout(() => {
          noteEl.textContent = altText;
          card.classList.add('haunted-note');
        }, 4200);
      }
    });
  });

  const trapCard = document.getElementById('trap-card');
  const trapForm = document.getElementById('trap-form');
  const trapGuests = document.getElementById('trap-guests');
  const trapGuestsWhisper = document.getElementById('trap-guests-whisper');
  const trapCheckout = document.getElementById('trap-checkout');
  const trapCheckoutWhisper = document.getElementById('trap-checkout-whisper');
  const trapCancelBtn = document.getElementById('trap-cancel-btn');
  const trapLog = document.getElementById('trap-log');

  trapGuests.addEventListener('change', () => {
    Audio.playSfx('typewriter');
    if (trapGuests.value === '1') {
      trapGuestsWhisper.textContent = '你选择了 1 位旅客。可我们清点到，你的后座上还坐着另一个人。';
    } else if (trapGuests.value === '2') {
      trapGuestsWhisper.textContent = '可刚才走下车来前台登记的，只有你一个人。';
    } else {
      trapGuestsWhisper.textContent = '地下附楼的空间很大，足够把你们全都安顿好。';
    }
  });

  trapCheckout.addEventListener('change', () => {
    Audio.playSfx('switchSnap');
    trapCheckout.value = '1962-10-19';
    trapCheckoutWhisper.textContent = '44英里碑不存在 1962年10月20日。退房日期已锁定为 10月19日。';
  });

  const CANCEL_LINES = ['引擎打不着火', '19号州道已封闭', '再多留一晚吧'];

  function dodgeCancel() {
    if (state.cancelDodges < 3) {
      const shiftX = (state.cancelDodges % 2 === 0 ? 1 : -1) * (42 + state.cancelDodges * 18);
      const shiftY = state.cancelDodges === 1 ? -14 : 10;
      trapCancelBtn.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
      trapCancelBtn.textContent = CANCEL_LINES[state.cancelDodges];
      trapLog.textContent =
        state.cancelDodges === 0
          ? '你的车钥匙已经挂在前台后面的木板上了。'
          : state.cancelDodges === 1
          ? '停车场铁门会在凌晨 02:17 自动落锁。'
          : '夜间经理（亚瑟·万斯）已驳回你的取消申请。';
      state.cancelDodges++;
      Audio.playSfx('switchSnap');
    } else {
      trapCard.classList.add('stamped');
      trapLog.textContent = '入住手续已自动核准。请沿 B 翼走廊前行至 15 号房。';
      Audio.playSfx('doorKnock');
      markClue('trap_checkin');
    }
  }

  trapCancelBtn.addEventListener('mouseenter', () => {
    if (state.cancelDodges < 2) dodgeCancel();
  });
  trapCancelBtn.addEventListener('click', dodgeCancel);

  trapForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = trapNameInput.value.trim();
    if (entered) state.guestName = entered;
    trapCard.classList.add('stamped');
    Audio.playSfx('doorKnock');
    trapLog.textContent = `已确认住客【${state.guestName || '44号旅客'}】入住。15 号房就在 B 翼走廊尽头。`;
    markClue('trap_checkin');
    updateReceipt();
  });

  // B翼反抗配电箱
  const breakerLog = document.getElementById('breaker-log');
  const breakerSwitches = Array.from(document.querySelectorAll('.breaker-switch'));

  breakerSwitches.forEach((sw) => {
    sw.addEventListener('click', () => {
      const id = sw.dataset.breaker;
      const isOn = sw.classList.contains('on');
      Audio.playSfx('switchSnap');

      if (id === 'neon') {
        sw.classList.remove('on');
        sw.querySelector('.br-state').textContent = '关闭';
        breakerLog.textContent = '庭院霓虹招牌已断电……等等，为什么窗外还泛着血红的光？';
        setTimeout(() => {
          sw.classList.add('on');
          sw.querySelector('.br-state').textContent = '开启';
          Audio.playSfx('switchSnap');
          breakerLog.textContent = '“庭院霓虹招牌”电闸自己猛地弹回了开启状态。它的供电并非来自市政电网。';
        }, 850);
        return;
      }

      if (id === 'room15') {
        Audio.playSfx('doorKnock');
        const corridorSw = document.querySelector('[data-breaker="corridor"]');
        if (corridorSw) {
          corridorSw.classList.remove('on');
          corridorSw.setAttribute('aria-pressed', 'false');
          corridorSw.querySelector('.br-state').textContent = '已跳闸';
        }
        breakerLog.textContent = '15号房电闸纹丝不动——反而震断了 B 翼走廊总照明！请使用下方手电筒继续前行。';
        return;
      }

      const next = !isOn;
      sw.classList.toggle('on', next);
      sw.setAttribute('aria-pressed', String(next));
      sw.querySelector('.br-state').textContent = next ? '开启' : '关闭';

      const notes = {
        pool: next ? '深水区排水口恢复了每 14 秒一次的“呼吸”。' : '你切断了泳池水泵，但混凝土地下传来的湿润敲击声并未停止。',
        lobby: next ? '前台台灯闪烁着重新亮起。柜台后面空无一人。' : '前台陷入黑暗，但玻璃上那个苍白的倒影依然清晰可见。',
        corridor: next ? 'B翼走廊日光灯管滋滋响了两声，随即彻底熄灭。' : 'B翼走廊已陷入伸手不见五指的漆黑，请握紧手电筒。',
        ice: next ? '11号房门外的制冰机重新发出低沉轰鸣。' : '制冰机停了下来。现在你能清楚地听见走廊里的脚步声了。',
      };
      breakerLog.textContent = notes[id] || '';
    });
  });

  // =========================================================================
  // 9. 第八幕：B翼走廊手电筒探索 & 躲避光束的眼睛
  // =========================================================================
  const flashlightArena = document.getElementById('flashlight-arena');
  const batteryFill = document.getElementById('battery-fill');
  const smackBtn = document.getElementById('smack-flashlight-btn');
  const lurkingEyes = document.getElementById('lurking-eyes');

  const EYE_SPOTS = [
    { top: '34%', left: '22%' },
    { top: '42%', left: '66%' },
    { top: '26%', left: '78%' },
    { top: '58%', left: '30%' },
    { top: '48%', left: '51%' },
    { top: '30%', left: '42%' },
  ];
  let eyeSpotIdx = 1;

  function setFlashlightPos(clientX, clientY) {
    const r = flashlightArena.getBoundingClientRect();
    const x = Math.max(0, Math.min(r.width, clientX - r.left));
    const y = Math.max(0, Math.min(r.height, clientY - r.top));
    flashlightArena.style.setProperty('--fx', `${x}px`);
    flashlightArena.style.setProperty('--fy', `${y}px`);
    state.flashlightInside = true;

    const eyeRect = lurkingEyes.getBoundingClientRect();
    const ex = eyeRect.left - r.left + eyeRect.width / 2;
    const ey = eyeRect.top - r.top + eyeRect.height / 2;
    if (Math.hypot(x - ex, y - ey) < 165 && lurkingEyes.style.opacity !== '0') {
      lurkingEyes.style.opacity = '0';
      markClue('corridor_eyes');
      setTimeout(() => {
        eyeSpotIdx = (eyeSpotIdx + 1 + Math.floor(Math.random() * 2)) % EYE_SPOTS.length;
        lurkingEyes.style.top = EYE_SPOTS[eyeSpotIdx].top;
        lurkingEyes.style.left = EYE_SPOTS[eyeSpotIdx].left;
        lurkingEyes.style.opacity = '0.92';
      }, 420);
    }
  }

  flashlightArena.addEventListener('mousemove', (e) => setFlashlightPos(e.clientX, e.clientY));
  flashlightArena.addEventListener('touchstart', (e) => {
    if (e.touches[0]) setFlashlightPos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  flashlightArena.addEventListener('touchmove', (e) => {
    if (e.touches[0]) setFlashlightPos(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });
  flashlightArena.addEventListener('mouseleave', () => {
    state.flashlightInside = false;
  });

  function refreshBatteryUI() {
    const b = Math.max(12, state.flashlightBattery);
    batteryFill.style.width = `${b}%`;
    batteryFill.style.background = b < 32 ? '#cf252e' : '#d8a64e';
    const flicker = b < 35 && Math.random() < 0.35 ? 0.45 : 1;
    flashlightArena.style.setProperty('--f-radius', `${Math.round((115 + b * 1.45) * flicker)}px`);
  }

  setInterval(() => {
    if (state.currentAct === 8 && state.flashlightInside && state.flashlightBattery > 14) {
      state.flashlightBattery -= 1.8;
      refreshBatteryUI();
    }
  }, 450);

  function smackFlashlight() {
    state.flashlightBattery = 100;
    refreshBatteryUI();
    Audio.playSfx('switchSnap');
  }

  smackBtn.addEventListener('click', smackFlashlight);
  flashlightArena.addEventListener('click', (e) => {
    if (!e.target.closest('a')) smackFlashlight();
  });

  // =========================================================================
  // 10. 第九幕：15号房拨盘电话终章与实时账单
  // =========================================================================
  const rotaryPhone = document.getElementById('rotary-phone');
  const climaxHeading = document.getElementById('climax-heading');
  const climaxDialogue = document.getElementById('climax-dialogue');
  const answerPhoneBtn = document.getElementById('answer-phone-btn');
  const cutCordBtn = document.getElementById('cut-cord-btn');
  const scareFlashLayer = document.getElementById('scare-flash-layer');
  const flashCaption = document.getElementById('flash-caption');

  function startPhoneRinging() {
    if (state.phoneRingInterval || state.phoneAnswered) return;
    if (Audio.enabled) Audio.playSfx('phoneRing');
    state.phoneRingInterval = setInterval(() => {
      if (state.currentAct === 9 && !state.phoneAnswered && Audio.enabled) Audio.playSfx('phoneRing');
    }, 3400);
  }

  function stopPhoneRinging() {
    clearInterval(state.phoneRingInterval);
    state.phoneRingInterval = null;
  }

  function triggerScareFlash(text, duration = 450) {
    flashCaption.textContent = text;
    scareFlashLayer.classList.add('active');
    setTimeout(() => scareFlashLayer.classList.remove('active'), duration);
  }

  cutCordBtn.addEventListener('click', () => {
    Audio.playSfx('switchSnap');
    state.phoneCordCut = true;
    cutCordBtn.disabled = true;
    cutCordBtn.textContent = '电话线已扯断';
    climaxDialogue.textContent =
      '你用力把黑色编织电话线从墙里生生扯断……两秒钟后，铜铃却比刚才响得更加刺耳。它从来就没插在墙上。';
    setTimeout(() => Audio.playSfx('phoneRing'), 900);
  });

  answerPhoneBtn.addEventListener('click', () => {
    if (state.phoneAnswered) return;
    state.phoneAnswered = true;
    stopPhoneRinging();
    markClue('answered_phone');

    if (!Audio.enabled) syncAudioButtons(Audio.toggle());

    Audio.playSfx('phonePickup');
    rotaryPhone.classList.remove('ringing');
    rotaryPhone.classList.add('answered');
    answerPhoneBtn.disabled = true;
    cutCordBtn.disabled = true;
    answerPhoneBtn.textContent = '通话中 — 凌晨 02:17';
    climaxHeading.textContent = '已接通夜间前台';

    const guestLabel = state.guestName ? `，${state.guestName}` : '';
    const beats = [
      { delay: 200, text: `“……喂${guestLabel}？谢谢你接电话。我是前台的亚瑟。”` },
      { delay: 3200, text: '“我们看着你一路滑过泳池，翻过登记簿，径直走进了 15 号房……”' },
      {
        delay: 6400,
        text: '“不必费心去锁黄铜插销了。凌晨 02:17 之后，我们所有的房门都是从走廊外面反锁的。”',
        flash: '门是从外面反锁的',
        sfx: 'doorKnock',
      },
      {
        delay: 9800,
        text: '“如果你现在走回网页最顶端的庭院看看——我们特意为你点亮了夜晚的霓虹。”',
        flash: '永 不 退 房',
        sfx: 'scareSting',
      },
      {
        delay: 13000,
        text: '“晚安。你的入住账单已经打印在下方了。我们 1962 年 10 月 19 日再见。” [忙音]',
      },
    ];

    beats.forEach((b) => {
      setTimeout(() => {
        climaxDialogue.textContent = b.text;
        if (b.sfx) Audio.playSfx(b.sfx);
        if (b.flash) triggerScareFlash(b.flash, 480);
      }, b.delay);
    });
  });

  const rcptName = document.getElementById('rcpt-name');
  const rcptTime = document.getElementById('rcpt-time');
  const rcptDuration = document.getElementById('rcpt-duration');
  const rcptViewport = document.getElementById('rcpt-viewport');
  const rcptClues = document.getElementById('rcpt-clues');
  const rcptTurnbacks = document.getElementById('rcpt-turnbacks');
  const rcptVerdict = document.getElementById('rcpt-verdict');

  function updateReceipt() {
    const elapsedSec = Math.floor((Date.now() - state.startedAt) / 1000);
    const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
    const secs = String(elapsedSec % 60).padStart(2, '0');

    rcptName.textContent = state.guestName || '未登记旅人';
    rcptTime.textContent = state.arrivalTimeStr;
    rcptDuration.textContent = `${mins}分 ${secs}秒`;
    rcptViewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
    rcptClues.textContent = `${state.clues.size} / 8`;
    rcptTurnbacks.textContent = `${state.scrollUpCount} 次`;

    if (state.scrollUpCount >= 3) {
      rcptVerdict.textContent = `你曾试图向上滑回头离开 ${state.scrollUpCount} 次。可惜 19 号州道不允许掉头。`;
    } else if (state.clues.size >= 5) {
      rcptVerdict.textContent = `你已经识破了亚瑟的 ${state.clues.size} 条秘密——却还是义无反顾地走到了 B 翼走廊尽头。`;
    } else {
      rcptVerdict.textContent = '感谢您选择向阳汽车旅馆。您的退房时间已于 1962 年 10 月 19 日上午 11:00 截止。';
    }
  }

  setInterval(updateReceipt, 1000);
  updateReceipt();

  // =========================================================================
  // 11. 二周目记忆异变 & 重置至 1962 年 5 月 14 日
  // =========================================================================
  const heroTitle = document.getElementById('hero-title');
  const heroLead = document.getElementById('hero-lead');
  const heroStamp = document.getElementById('hero-stamp');
  const factCheckout = document.getElementById('fact-checkout');
  const ribbonTrack = document.getElementById('ribbon-track');
  const roomClockNote = document.getElementById('room-clock-note');
  const loopUpBtn = document.getElementById('loop-up-btn');
  const reset1962Btn = document.getElementById('reset-1962-btn');

  function activateLoopTwo() {
    state.loopNumber = 2;
    root.setAttribute('data-loop', '2');
    heroTitle.textContent = '欢迎回到向阳旅馆';
    heroStamp.textContent = '1962年10月19日 · 凌晨 02:17 · 二周目';
    heroLead.innerHTML =
      '你一路走回庭院停车场了，对吗？你的车灯还在空泳池旁亮着，而 <strong>15 号房</strong> 的门依然为你敞开。';
    factCheckout.textContent = '永不（1962.10.19）';
    if (roomClockNote) roomClockNote.textContent = '挂钟停在 02:17';
    ribbonTrack.innerHTML = `
      <span>19号州道无出口</span><span class="star-dot">✦</span>
      <span>深水区深不见底</span><span class="star-dot">✦</span>
      <span>15号房未上锁</span><span class="star-dot">✦</span>
      <span>车钥匙已由前台代管</span><span class="star-dot">✦</span>
      <span>亚瑟死于1962年</span><span class="star-dot">✦</span>
      <span>千万别回头</span>
    `;
  }

  loopUpBtn.addEventListener('click', () => {
    activateLoopTwo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  reset1962Btn.addEventListener('click', () => {
    try {
      sessionStorage.setItem('sunward_clean_reset', '1');
    } catch (_) {}
    stopPhoneRinging();
    window.scrollTo({ top: 0, behavior: 'instant' });
    const base = window.location.href.split('#')[0].split('?')[0];
    window.location.replace(`${base}?reset=${Date.now()}`);
  });

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (!forceCleanTop && window.location.hash) {
    window.addEventListener('load', () => {
      const target = document.querySelector(window.location.hash);
      if (target) {
        const y = target.getBoundingClientRect().top + window.scrollY - 68;
        window.scrollTo({ top: Math.max(0, y), behavior: 'instant' });
        updateScrollAtmosphere();
      }
    });
  } else {
    window.addEventListener('load', () => {
      window.scrollTo({ top: 0, behavior: 'instant' });
      updateScrollAtmosphere();
    });
  }

  updateScrollAtmosphere();
})();
