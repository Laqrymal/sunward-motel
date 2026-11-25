/**
 * THE SUNWARD MOTEL (1962) — Master Interactive & Descent Engine
 * Coordinates scroll-driven atmospheric transformation, tab-title gaslighting,
 * 15-unit key rack, 3D postcards, guest register sabotage, highway loop map,
 * Motorola AM radio tuner, UV blacklight desk logs, fisheye peepholes,
 * darkroom Polaroids, check-in trap, flashlight corridor, and Room 15 climax.
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
  // SESSION STATE & CLUE TRACKING
  // =========================================================================
  const state = {
    startedAt: Date.now(),
    arrivalTimeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    guestName: '',
    currentAct: 1,
    maxScrollPct: 0,
    lastScrollY: 0,
    scrollUpCount: 0,
    scrollUpCooldown: 0,
    loopNumber: 1,
    clues: new Set(), // 8 major artifact categories
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
  // 1. HI-FI AUDIO CONTROLS
  // =========================================================================
  const hifiToggle = document.getElementById('hifi-toggle');
  const hifiLabel = document.getElementById('hifi-label');
  const heroHifiCta = document.getElementById('hero-hifi-cta');
  const heroHifiCtaText = document.getElementById('hero-hifi-cta-text');

  function syncAudioButtons(isOn) {
    hifiToggle.setAttribute('aria-pressed', String(isOn));
    hifiLabel.textContent = isOn ? 'HI-FI ON' : 'HI-FI OFF';
    if (heroHifiCtaText) {
      heroHifiCtaText.textContent = isOn ? 'Mute Lobby Hi-Fi' : 'Turn On 1962 Lobby Hi-Fi';
    }
  }

  syncAudioButtons(Audio.startByDefault());

  hifiToggle.addEventListener('click', () => {
    const on = Audio.toggle();
    syncAudioButtons(on);
  });

  if (heroHifiCta) {
    heroHifiCta.addEventListener('click', () => {
      const on = Audio.toggle();
      syncAudioButtons(on);
    });
  }

  // =========================================================================
  // 2. CONTINUOUS SCROLL DESCENT & ATMOSPHERE CONTROLLER
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
    ['Pool & Patio', 'Rooms & Rates', 'Guestbook', 'Amenities', 'Reserve'],
    ['Pool & Patio', 'Units 1–14', 'Guestbook', 'Night Radio', 'Reserve'],
    ['Deep End (14ft)', 'Empty Units', 'The Register', 'After Dark', 'Check In'],
    ['No Bottom', 'Do Not Knock', 'Your Name', 'Listen Closely', 'Room 15'],
    ['LOCKED IN', '14 FT DOWN', 'NEVER LEFT', 'IT SEES YOU', 'STAY'],
  ];

  const WEATHER_STAGES = [
    ['84°F', 'CLEAR SKIES'],
    ['79°F', 'WARM DESERT BREEZE'],
    ['68°F', 'LONG SHADOWS'],
    ['54°F', 'DUSK ON RT. 19'],
    ['43°F', 'DRY STATIC'],
    ['38°F', '02:17 AM'],
    ['34°F', 'FOG AT MILE 44'],
    ['--°F', 'NO SIGNAL'],
    ['--°F', 'BEHIND YOU'],
  ];

  const TITLE_STAGES = [
    'The Sunward Motel — Sunlit Comfort on Route 19 | Est. 1962',
    'The Sunward Motel — Heated Pool & Postcards | Route 19',
    'The Sunward Motel — Fourteen Ground-Floor Units',
    'The Sunward Motel — October 1962 Guest Register',
    'Sunward Motel — After Sundown (Milepost 44)',
    '02:17 AM — Wing B Corridor | Sunward Motel',
    'Room 15 — Check-Out Unavailable',
    'CORRIDOR B — DO NOT TURN OFF YOUR LIGHT',
    'ROOM 15 IS UNLOCKED — THE SUNWARD MOTEL',
  ];

  function updateScrollAtmosphere() {
    const docHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const y = window.scrollY;
    const pct = Math.max(0, Math.min(1, y / docHeight));

    // Track scroll-up ("trying to leave") attempts after entering dusk
    if (pct > state.maxScrollPct) state.maxScrollPct = pct;
    const now = Date.now();
    if (state.maxScrollPct > 0.36 && y < state.lastScrollY - 120 && now > state.scrollUpCooldown) {
      state.scrollUpCount++;
      state.scrollUpCooldown = now + 2200;
      updateReceipt();
    }
    state.lastScrollY = y;

    // Progress bar & CSS custom vars
    milepostFill.style.width = `${(pct * 100).toFixed(2)}%`;
    root.style.setProperty('--dread', pct.toFixed(3));
    root.style.setProperty('--vignette-opacity', Math.max(0, (pct - 0.22) * 1.25).toFixed(3));
    root.style.setProperty('--grain-opacity', (0.025 + pct * 0.16).toFixed(3));

    // Sync audio engine
    Audio.setDread(pct);

    // Determine active act (1–9) based on section viewport positions
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

      // Automatically trigger Loop #2 memory once visitor reaches Act IX
      if (activeAct === 9 && state.loopNumber === 1) {
        activateLoopTwo();
      }
    }
  }

  function applyActChrome(act) {
    // 1. Update sticky nav palette smoothly
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

    // 2. Morph Nav Link Text
    const stageIdx = act <= 2 ? 0 : act === 3 ? 1 : act <= 5 ? 2 : act <= 7 ? 3 : 4;
    const labels = NAV_STAGES[stageIdx];
    navLinks.forEach((link, i) => {
      if (labels[i]) link.textContent = labels[i];
    });

    // 3. Morph Neon Vacancy Sign
    if (act <= 3 && state.loopNumber === 1) {
      neonVacancyText.textContent = 'VACANCY';
      neonVacancy.classList.remove('flicker');
    } else if (act === 4) {
      neonVacancyText.textContent = '1 ROOM LEFT';
      neonVacancy.classList.add('flicker');
    } else if (act <= 6) {
      neonVacancyText.textContent = 'NO VACANCY';
      neonVacancy.classList.add('flicker');
    } else if (act <= 8) {
      neonVacancyText.textContent = 'NO EXIT';
      neonVacancy.classList.add('flicker');
    } else {
      neonVacancyText.textContent = 'STAY';
      neonVacancy.classList.add('flicker');
    }

    // 4. Morph Weather & Brand Subtitle
    const [temp, cond] = WEATHER_STAGES[act - 1] || WEATHER_STAGES[0];
    weatherTemp.textContent = temp;
    weatherCond.textContent = cond;

    if (act >= 7) {
      navBrandSub.textContent = 'RT. 19 · DECOMMISSIONED 1967';
    } else if (act >= 5) {
      navBrandSub.textContent = 'MILE 44 · OCT 19, 1962';
    } else {
      navBrandSub.textContent = 'MOTEL · RT. 19 · MILE 44';
    }

    // 5. Document Title
    if (!document.hidden) {
      document.title = TITLE_STAGES[act - 1] || TITLE_STAGES[0];
    }

    // 6. Climax Phone Auto-Ringer (only when visible & audio enabled)
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

  // Browser Tab Visibility Gaslighting
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (state.currentAct >= 6 || state.loopNumber > 1) {
        document.title = 'Room 15 is still unlocked...';
      } else if (state.currentAct >= 3) {
        document.title = 'You left your keys at the Sunward...';
      }
    } else {
      document.title = TITLE_STAGES[state.currentAct - 1] || TITLE_STAGES[0];
    }
  });

  // =========================================================================
  // 3. ACT II: POOLSIDE THERMOMETER & 3D FLIP POSTCARDS
  // =========================================================================
  const poolDipBtn = document.getElementById('pool-dip-btn');
  const poolTempVal = document.getElementById('pool-temp-val');
  const poolTempNote = document.getElementById('pool-temp-note');
  const depthMarker = document.getElementById('depth-marker');

  const POOL_READINGS = [
    { temp: '74°F', note: 'Crisp and refreshing. Slight hum from the deep-end filter grate.', depth: 'DEEP END: 14 FT' },
    { temp: '61°F', note: 'Unusually cold for July. The heater switch in the shed is set to MAX.', depth: 'DEEP END: 18 FT' },
    { temp: '46°F', note: 'Water near the deep end is completely black. Something brushed the thermometer string.', depth: 'DEEP END: 24 FT' },
    { temp: '36°F', note: 'The thermometer cord snapped taut and pulled downward twice. Do not lean over the tile.', depth: 'NO BOTTOM FOUND' },
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
  // 4. ACT III: INTERACTIVE 15-UNIT BRASS KEY RACK
  // =========================================================================
  const UNITS = [
    { num: 1, name: 'The Mesquite Single', rate: '$6.00 / NIGHT', status: 'VACANT & READY', desc: 'Cozy roadside single closest to the front office. Freshly painted turquoise bath and crisp cotton sheets.', note: 'Morning paper delivered 6:30 AM. Ice tray refilled.', extra: 'Key turns smoothly. Smells faintly of pine floor wax.', odd: false },
    { num: 2, name: 'The Cactus Double', rate: '$6.50 / NIGHT', status: 'VACANT & READY', desc: 'Bright east-facing motor-court unit with one full-size spring mattress, turquoise tiled shower, and view of the heated kidney pool.', note: 'Fresh soap placed on sink. Venetian blinds dusted. Ready for arrival.', extra: 'Magic Fingers quarter slot still warm from last night.', odd: false },
    { num: 3, name: 'The Desert Twin', rate: '$7.00 / NIGHT', status: 'VACANT & READY', desc: 'Two twin beds with walnut headboards, ideal for traveling salesmen or siblings on Route 19.', note: 'Complimentary postcards restocked in nightstand drawer.', extra: 'A matchbook from Starlight Coffee Shop sits on the lamp base.', odd: false },
    { num: 4, name: 'The Route 19 Double', rate: '$6.50 / NIGHT', status: 'VACANT (AIRING OUT)', desc: 'Quiet mid-courtyard room with chrome luggage rack and black-and-white Zenith television.', note: 'Previous guest left car idling in Space #4 for 72 hours. Tank never ran dry. Television remains on.', extra: 'Through the keyhole, gray TV snow flickers gently.', odd: true },
    { num: 5, name: 'The Sunset Patio', rate: '$7.50 / NIGHT', status: 'VACANT & READY', desc: 'Includes two wrought-iron terrace chairs overlooking the red mesas and afternoon breeze blocks.', note: 'Replaced burned porch bulb with 40W amber glass.', extra: 'Small desert moths cling motionless to the inside of the screen.', odd: false },
    { num: 6, name: 'The Honeymoon Suite', rate: '$8.50 / NIGHT', status: 'HOLD FOR MANAGEMENT', desc: 'Corner king suite with complimentary chilled apple cider and starburst brass clock.', note: 'Guests departed Oct 12 before sunrise. Two monogrammed suitcases and wedding rings remain untouched on dresser.', extra: 'The starburst clock hands are welded fast at 2:17.', odd: true },
    { num: 7, name: 'The Corner Quiet Unit', rate: '$6.50 / NIGHT', status: 'DO NOT RENT AFTER DUSK', desc: 'Shaded unit tucked beneath the tamarisk trees at the bend of the motor court.', note: 'Bedside Motorola radio plays broadcast chatter even when power cord is cut from the wall.', extra: 'You feel a faint vibration through the brass key fob.', odd: true },
    { num: 8, name: 'The Mesa Twin', rate: '$7.00 / NIGHT', status: 'MAINTENANCE PENDING', desc: 'Standard double-twin configuration with glazed adobe bath tiles and full-length vanity mirror.', note: 'Guest complaint (Oct 15): Bathroom mirror reflects an empty hallway instead of the sink.', extra: 'Key tag feels freezing cold despite the 84°F desert heat.', odd: true },
    { num: 9, name: 'The Poolside Double', rate: '$7.00 / NIGHT', status: 'OCCUPIED — DO NOT ENTER', desc: 'Direct ground-floor access to the deep end of the heated kidney swimming pool.', note: 'Under NO circumstances move the walnut dresser away from the east plaster wall. — A.V.', extra: 'Scratching sounds recorded behind dresser at 2:15 AM.', odd: true },
    { num: 10, name: 'The Family Motor Suite', rate: '$9.00 / NIGHT', status: 'VACANT (UNINSPECTED)', desc: 'Connecting two-room suite with rollaway cot and spacious tiled alcove.', note: 'Housekeeping found six crayon drawings tucked behind the steam radiator. All dated tomorrow.', extra: 'Each drawing depicts a tall dark figure standing by the pool.', odd: true },
    { num: 11, name: 'The Wing B End Suite', rate: '$7.50 / NIGHT', status: 'OCCUPIED SINCE OCT 19, 1962', desc: 'Located beside the ice machine alcove where the desert wind funnels at night.', note: 'Guest has not opened door or ordered room service in 64 years. Still pays exact change under the threshold every Tuesday.', extra: 'Water drips slowly from beneath the door sweep.', odd: true },
    { num: 12, name: 'The Highway Lookout', rate: '$6.00 / NIGHT', status: 'TEMPORARILY CLOSED', desc: 'Front-facing unit with direct view of the Painted Mesa highway turnoff.', note: 'Zenith television only tunes Channel 3. Broadcast shows a live camera angle of your own car parked outside.', extra: 'There are no security cameras installed on this property.', odd: true },
    { num: 13, name: 'Unnumbered Hook', rate: '—', status: 'NO ROOM 13 ON PROPERTY', desc: 'Like all respectable 1962 motor courts, The Sunward omits Room 13 for guest peace of mind.', note: 'Please do not count the doors while walking along the concrete veranda at night. The count changes.', extra: 'Only a bent rusted nail remains. Deep fingernail grooves circle the wood.', missing: true, odd: true },
    { num: 14, name: 'Unit 14 — Sealed', rate: 'N/A', status: 'CONDEMNED BY MANAGEMENT', desc: 'Rear unit directly adjoining the underground swimming pool pump chamber.', note: 'Doorway bricked over Oct 18, 1962 due to upward seepage from the 14-foot drain.', extra: 'The brass key is fused inside melted wax.', odd: true },
    { num: 15, name: 'ROOM 15 — BOILER & ANNEX', rate: 'YOUR KEYS', status: 'ASSIGNED TO YOU', desc: 'This unit does not appear on the 1962 architectural blueprint, yet its key hook is always polished clean.', note: 'ARTHUR ONLY — DO NOT GIVE TO GUESTS. Wait. Look at your hand. You already took this key.', extra: 'THREE MUFFLED KNOCKS ECHO FROM INSIDE THE PEGBOARD.', room15: true, odd: true },
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
    keyrackTally.textContent = `INSPECTED: ${state.inspectedKeys.size} / 15 UNITS`;

    document.querySelectorAll('.key-hook').forEach((btn) => {
      const n = Number(btn.dataset.unit);
      btn.classList.toggle('active', n === unit.num);
      if (state.inspectedKeys.has(n)) btn.classList.add('inspected');
    });

    folioUnit.textContent = unit.missing ? 'HOOK 13 (EMPTY)' : `UNIT ${String(unit.num).padStart(2, '0')}`;
    folioRate.textContent = unit.rate;
    folioName.textContent = unit.name;
    folioStatus.textContent = `STATUS: ${unit.status}`;
    folioDesc.textContent = unit.desc;
    folioNote.textContent = unit.note;
    folioExtra.textContent = '';
    roomFolio.classList.toggle('eerie-folio', Boolean(unit.room15 || unit.num === 11 || unit.num === 14));

    if (triggerSfx) {
      Audio.playSfx(unit.room15 ? 'doorKnock' : 'keyClink');
    }

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
    btn.setAttribute('aria-label', `Inspect Room ${unit.num}`);
    btn.innerHTML = `
      <span class="hook-nail" aria-hidden="true"></span>
      <span class="key-fob">
        <span class="fob-num">${unit.missing ? '—' : String(unit.num).padStart(2, '0')}</span>
        <span class="fob-sub">${unit.room15 ? 'ANNEX' : unit.missing ? 'NONE' : 'UNIT'}</span>
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
  // 5. ACT IV: 1962 GUEST REGISTER & HIGHWAY DISTANCE GLITCHER
  // =========================================================================
  const LEDGER_DATA = {
    spring: [
      { date: 'May 14, 1962', name: 'M. & Mrs. Walter Briggs', city: 'Tucson, AZ', car: "'59 Buick LeSabre", unit: '02', remark: 'Checked out 10:15 AM — Lovely pool!' },
      { date: 'May 22, 1962', name: 'Genevieve Callahan', city: 'Denver, CO', car: "'61 Chevy Bel Air", unit: '05', remark: 'Checked out 9:40 AM — Great pie next door' },
      { date: 'Jun 08, 1962', name: 'Lou & Betty Miller', city: 'Wichita, KS', car: "'60 Oldsmobile 88", unit: '01', remark: 'Checked out 11:00 AM — Sent 3 postcards' },
      { date: 'Jul 04, 1962', name: 'Rev. Thomas K. Hale', city: 'Santa Fe, NM', car: "'58 Ford Fairlane", unit: '03', remark: 'Checked out 8:30 AM — Quiet desert night' },
      { date: 'Jul 27, 1962', name: 'D. & S. Kowalski', city: 'Chicago, IL', car: "'62 Pontiac Catalina", unit: '10', remark: 'Checked out 10:50 AM — Kids loved the pool' },
    ],
    lateSummer: [
      { date: 'Aug 19, 1962', name: 'Raymond & Claire Bell', city: 'El Paso, TX', car: "'61 Mercury Comet", unit: '04', remark: 'Checked out 6:00 AM — Complained of humming under floor', cls: 'ledger-row-odd' },
      { date: 'Sep 03, 1962', name: 'Frankie DeLuca', city: 'Las Vegas, NV', car: "'62 Cadillac DeVille", unit: '08', remark: 'Left early — Asked why his wristwatch stopped at 2:17', cls: 'ledger-row-odd' },
      { date: 'Sep 16, 1962', name: 'Eleanor & Paul Vance', city: 'Flagstaff, AZ', car: "'60 Studebaker Lark", unit: '06', remark: 'Checked in twice under same plate? — A.V.', cls: 'ledger-row-odd' },
      { date: 'Sep 29, 1962', name: 'Robert Henderson', city: 'Tulsa, OK', car: "'61 Plymouth Fury", unit: '09', remark: 'Awaiting fan belt from town (NO CHECKOUT RECORDED)', cls: 'ledger-row-odd' },
    ],
    october: [
      { date: 'Oct 12, 1962', name: 'Mr. & Mrs. J. Mercer', city: 'Dallas, TX', car: "'62 Ford Thunderbird", unit: '06', remark: 'NO CHECKOUT — Luggage still in Unit 06', cls: 'ledger-row-odd' },
      { date: 'Oct 15, 1962', name: 'Dr. H. Lindstrom', city: 'Pasadena, CA', car: "'61 Chrysler Newport", unit: '08', remark: 'NO CHECKOUT — Car found idling at Milepost 44', cls: 'ledger-row-odd' },
      { date: 'Oct 18, 1962', name: 'Clara & Sam Dawson', city: 'Albuquerque, NM', car: "'60 Dodge Dart", unit: '11', remark: 'STILL IN UNIT 11 — DO NOT DISTURB', cls: 'ledger-row-horror' },
      { date: 'Oct 19, 1962', name: 'Arthur Vance (Owner)', city: 'Painted Mesa, AZ', car: 'On Property', unit: 'DESK', remark: '02:17 AM — NEON BREAKER TRIPPED — ROAD CLOSED', cls: 'ledger-row-horror' },
    ],
  };

  const ledgerTbody = document.getElementById('ledger-tbody');
  const gbTabs = Array.from(document.querySelectorAll('.gb-tab'));
  let activeLedgerPage = 'spring';

  function renderLedger(pageKey) {
    activeLedgerPage = pageKey;
    gbTabs.forEach((t) => {
      const isActive = t.dataset.gbPage === pageKey;
      t.classList.toggle('active', isActive);
      t.setAttribute('aria-selected', String(isActive));
    });

    const rows = [...(LEDGER_DATA[pageKey] || [])];
    if (pageKey === 'october') {
      markClue('october_ledger');
      rows.push({
        date: 'TODAY · ' + state.arrivalTimeStr,
        name: state.guestName || 'YOU (UNREGISTERED)',
        city: 'YOUR BROWSER',
        car: 'HEADLIGHTS ON',
        unit: '15',
        remark: 'CHECKED IN AUTOMATICALLY — NO DEPARTURE',
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

  // Sign Register Form (with Management Sabotage!)
  const regForm = document.getElementById('register-sign-form');
  const regName = document.getElementById('reg-name');
  const regCity = document.getElementById('reg-city');
  const regCar = document.getElementById('reg-car');
  const regFeedback = document.getElementById('register-feedback');
  const trapNameInput = document.getElementById('trap-name');

  regForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = regName.value.trim() || 'Stranded Motorist';
    const city = regCity.value.trim() || 'Unknown Highway';
    const car = regCar.value.trim() || 'Idling Sedan';

    state.guestName = name;
    if (trapNameInput && !trapNameInput.value) {
      trapNameInput.value = name;
    }

    Audio.playSfx('typewriter');
    regFeedback.textContent = `Welcome, ${name}. Entering your name into the 1962 lobby ledger...`;
    renderLedger('october');

    setTimeout(() => {
      Audio.playSfx('doorKnock');
      regFeedback.textContent = `MANAGEMENT UPDATE: Thank you, ${name} (${city}). Your ${car} keys have been placed in the front safe. You are assigned to ROOM 15. Check-out: NEVER.`;
      markClue('signed_ledger');
      updateReceipt();
    }, 1150);
  });

  // Highway Distance Calculator
  const destSelect = document.getElementById('dest-select');
  const calcBtn = document.getElementById('calc-route-btn');
  const calcResult = document.getElementById('calc-result');
  const highwayLoopPath = document.getElementById('highway-loop-path');
  const mapFooterStamp = document.getElementById('map-footer-stamp');

  const NORMAL_ROUTES = {
    mesa: 'Painted Mesa General Store — 4.2 miles West via Route 19 (approx. 6 minutes).',
    interstate: 'Interstate 40 Eastbound Ramp — 11.0 miles North (approx. 14 minutes).',
    flagstaff: 'Flagstaff Downtown — 88.4 miles West (approx. 1 hour 35 minutes).',
    home: 'Nearest County Exit — 14.5 miles South toward Painted Mesa Junction.',
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
        'RECALCULATING... Distance: 11.0 miles — Estimated drive time: 6 hours 17 minutes. Warning: State Route 19 bridge removed in 1967.';
    } else {
      calcResult.classList.add('glitched');
      calcResult.textContent =
        'DISTANCE: 0.0 MILES — You have passed Milepost 44 three times. Both lanes curve back into the Sunward parking lot. Turn off your headlights.';
      if (highwayLoopPath) highwayLoopPath.setAttribute('opacity', '0.95');
      if (mapFooterStamp) mapFooterStamp.textContent = 'ARIZONA HIGHWAY DEPT · ROUTE 19 DECOMMISSIONED · NO EXIT';
      markClue('route_loop');
    }
  });

  // =========================================================================
  // 6. ACT V: MOTOROLA AM RADIO & UV BLACKLIGHT DESK LOGS
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
      name: '580 AM — K-SUN DESERT GOLD (1962)',
      text: '♪ "...another golden afternoon in Painted Mesa! Coming up next, Velvet Moon at the Sunward poolside—at the poolside—at the poolside—please do not swim past the drain—at the poolside..."',
    },
    {
      freq: 890,
      name: '890 AM — AZ HIGHWAY PATROL ARCHIVE',
      text: '[CRACKLE] "...advisory to all southbound motorists: Old State Route 19 between Milepost 40 and 48 was demolished in 1967. If you see a turquoise neon motel sign ahead, DO NOT STOP. Keep your doors locked..."',
    },
    {
      freq: 1120,
      name: '1120 AM — NIGHT DESK INTERCOM',
      text: '[LOW HUM] "...Good evening, Unit 15. This is Arthur at the front desk. Your radiator is ticking, so I took the liberty of pulling the distributor cap until morning. Get some rest. The desert is awfully dark tonight..."',
    },
    {
      freq: 1380,
      name: '1380 AM — ROOM 15 MONITOR (LIVE)',
      text: '[RHYTHMIC KNOCKING ON WOOD] "...one... two... three... don\'t scroll any further... it\'s sitting on the foot of the bed... four... five... why did you turn the sound on?..."',
    },
    {
      freq: 1560,
      name: '1560 AM — DEAD AIR',
      text: '[HEAVY WHITE STATIC] ...Hold dial steady at 1560 AM to isolate faint carrier signal...',
      secret: '[CLEAR WHISPER] "...0-2-1-7... OCTOBER NINETEENTH... LOOK UNDER THE UV LAMP... ARTHUR IS NOT ARTHUR..."',
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
      transcriptStation.textContent = 'RECEIVER STANDBY';
      transcriptText.textContent = 'Press POWER to warm up the vacuum tubes and scan the Painted Mesa AM band.';
      Audio.setRadioState(false, freq, null);
      return;
    }

    const match = STATIONS.find((s) => Math.abs(s.freq - freq) <= 15);
    Audio.setRadioState(true, freq, match ? match.freq : null);

    if (match) {
      transcriptStation.textContent = match.name;
      transcriptText.textContent = match.text;
      if (match.freq === 890 || match.freq === 1380) {
        markClue('radio_signal');
      }
      if (match.secret) {
        state.radioHoldTimer = setTimeout(() => {
          if (state.radioPowered && Math.abs(Number(radioSlider.value) - 1560) <= 15) {
            transcriptStation.textContent = '1560 AM — HIDDEN CARRIER LOCKED';
            transcriptText.textContent = match.secret;
            Audio.playSfx('doorKnock');
            markClue('radio_signal');
          }
        }, 2100);
      }
    } else {
      transcriptStation.textContent = `${freq} AM — INTERSTATION STATIC`;
      transcriptText.textContent = '[HISSING DESERT STATIC] ...faint electrical hum... try tuning near 580, 890, 1120, 1380, or 1560 AM...';
    }
  }

  radioPowerBtn.addEventListener('click', () => {
    state.radioPowered = !state.radioPowered;
    radioCabinet.classList.toggle('powered', state.radioPowered);
    radioPowerBtn.setAttribute('aria-pressed', String(state.radioPowered));
    radioPowerBtn.textContent = state.radioPowered ? 'POWER: ON' : 'POWER: OFF';
    radioStatusLed.textContent = state.radioPowered ? 'TUBES WARM · RECEIVING' : 'TUBES COLD';

    if (state.radioPowered && !Audio.enabled) {
      const on = Audio.toggle();
      syncAudioButtons(on);
    } else {
      Audio.playSfx('switchSnap');
    }
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

  // Ultraviolet Blacklight Board
  const uvToggleBtn = document.getElementById('uv-toggle-btn');
  const uvBtnLabel = document.getElementById('uv-btn-label');
  const uvBoard = document.getElementById('uv-board');
  const uvCards = Array.from(document.querySelectorAll('.index-card'));

  uvToggleBtn.addEventListener('click', () => {
    state.uvActive = !state.uvActive;
    uvToggleBtn.setAttribute('aria-pressed', String(state.uvActive));
    uvBoard.classList.toggle('uv-on', state.uvActive);
    uvBtnLabel.textContent = state.uvActive
      ? 'Switch Off Ultraviolet Bulb'
      : 'Turn On Ultraviolet Inspection Bulb';
    Audio.playSfx('switchSnap');

    if (!state.uvActive) {
      uvCards.forEach((c) => c.classList.remove('uv-lit'));
    } else {
      markClue('uv_logs');
    }
  });

  function moveUvSpot(clientX, clientY) {
    if (!state.uvActive) return;
    const rect = uvBoard.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    uvBoard.style.setProperty('--uv-x', `${x}px`);
    uvBoard.style.setProperty('--uv-y', `${y}px`);

    uvCards.forEach((card) => {
      const cRect = card.getBoundingClientRect();
      const cx = cRect.left + cRect.width / 2;
      const cy = cRect.top + cRect.height / 2;
      const dist = Math.hypot(clientX - cx, clientY - cy);
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

  // =========================================================================
  // 7. ACT VI: 2:17 AM CORRIDOR & INTERACTIVE BRASS PEEPHOLES
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
        caption: 'Room 04 is empty. The old wooden chair faces the peeling corner wall. The Zenith television hums with gray snow.',
      },
      second: {
        filter: 'brightness(0.7) contrast(1.45) hue-rotate(-15deg)',
        caption: 'WAIT. Look closer. The wooden chair is no longer facing the corner—it has been dragged right up beneath the peephole.',
        doorNote: 'Something scraped across the floorboards.',
      },
    },
    7: {
      img: 'assets/polaroid-desk.jpg',
      first: {
        filter: 'brightness(0.62) contrast(1.35) sepia(0.35)',
        caption: 'Room 07 should be a bedroom, yet through the glass you are looking straight back into the empty front desk lobby at midnight.',
      },
      second: {
        filter: 'brightness(0.48) contrast(1.7) sepia(0.5) hue-rotate(-30deg)',
        caption: 'The pale silhouette behind the cracked office glass is staring straight down the lens at you. Step back.',
        doorNote: 'Someone whispered "STOP LOOKING" through the keyhole.',
      },
    },
    11: {
      img: 'assets/hero-sunward-night.jpg',
      first: {
        filter: 'brightness(0.85) contrast(1.25)',
        caption: 'Through Door 11 you see the foggy courtyard outside. A tall motionless silhouette stands right at the edge of the black swimming pool.',
      },
      second: {
        filter: 'brightness(0.75) contrast(1.55) saturate(1.3)',
        caption: 'The poolside is empty now. Wet footprints lead from the deep end straight up to your door.',
        doorNote: 'Cold pool water is pooling under your shoes.',
      },
    },
    15: {
      img: 'assets/climax-hallway.jpg',
      first: {
        filter: 'brightness(0.45) contrast(1.6) sepia(0.4) hue-rotate(-35deg)',
        caption: 'Hold steady... Beyond Door 15 there is no bed—only concrete steps descending beneath the swimming pool. Wait... something is walking up the steps...',
        eyeScare: true,
        doorNote: 'IT LOOKED BACK.',
      },
      second: {
        filter: 'brightness(0.35) contrast(1.8) sepia(0.5) hue-rotate(-40deg)',
        caption: 'IT IS ALREADY ON THIS SIDE OF THE GLASS.',
        eyeScare: true,
        doorNote: 'THE CHAIN IS BROKEN.',
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
    peepholeTitle.textContent = `VIEWING THROUGH BRASS LENS — DOOR ${String(doorNum).padStart(2, '0')} (LOOK #${count})`;
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
        peepholeCaption.textContent = 'A WIDE, UNBLINKING EYE PRESSES FLUSH AGAINST THE OTHER SIDE OF THE GLASS.';
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

  // Subtle parallax pan inside peephole glass
  peepholeCircle.addEventListener('mousemove', (e) => {
    const r = peepholeCircle.getBoundingClientRect();
    const dx = ((e.clientX - r.left) / r.width - 0.5) * -14;
    const dy = ((e.clientY - r.top) / r.height - 0.5) * -14;
    peepholeImg.style.transform = `translate(calc(-7% + ${dx}px), calc(-7% + ${dy}px)) scale(1.09)`;
  });

  // =========================================================================
  // 8. ACT VII: DARKROOM POLAROIDS & EXPRESS CHECK-IN TRAP
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

  // Gaslighting Check-In Registration Form
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
      trapGuestsWhisper.textContent = 'You selected 1 traveler. We counted someone else sitting in your backseat.';
    } else if (trapGuests.value === '2') {
      trapGuestsWhisper.textContent = 'Only one of you stepped out of the car at the desk.';
    } else {
      trapGuestsWhisper.textContent = 'Plenty of room in the basement annex for everyone.';
    }
  });

  trapCheckout.addEventListener('change', () => {
    Audio.playSfx('switchSnap');
    trapCheckout.value = '1962-10-19';
    trapCheckoutWhisper.textContent = 'October 20, 1962 could not be found. Departure locked to October 19.';
  });

  const CANCEL_LINES = [
    'Engine Won\'t Turn Over',
    'Route 19 Is Closed',
    'Stay Another Night',
  ];

  function dodgeCancel() {
    if (state.cancelDodges < 3) {
      const shiftX = (state.cancelDodges % 2 === 0 ? 1 : -1) * (42 + state.cancelDodges * 18);
      const shiftY = state.cancelDodges === 1 ? -14 : 10;
      trapCancelBtn.style.transform = `translate(${shiftX}px, ${shiftY}px)`;
      trapCancelBtn.textContent = CANCEL_LINES[state.cancelDodges];
      trapLog.textContent =
        state.cancelDodges === 0
          ? 'Your car keys are already hanging behind the front desk.'
          : state.cancelDodges === 1
          ? 'The parking lot gate locks automatically at 2:17 AM.'
          : 'Cancellation rejected by Night Manager (A. Vance).';
      state.cancelDodges++;
      Audio.playSfx('switchSnap');
    } else {
      trapCard.classList.add('stamped');
      trapLog.textContent = 'Registration finalized automatically. Proceed down Corridor B to Room 15.';
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
    trapLog.textContent = `CHECK-IN CONFIRMED FOR ${(state.guestName || 'GUEST #44').toUpperCase()}. ROOM 15 IS AT THE END OF CORRIDOR B.`;
    markClue('trap_checkin');
    updateReceipt();
  });

  // =========================================================================
  // 9. ACT VIII: CORRIDOR B — FLASHLIGHT EXPLORATION & VANISHING EYES
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

    // Check proximity to lurking eyes — make them blink & relocate when beam gets close!
    const eyeRect = lurkingEyes.getBoundingClientRect();
    const ex = eyeRect.left - r.left + eyeRect.width / 2;
    const ey = eyeRect.top - r.top + eyeRect.height / 2;
    const dist = Math.hypot(x - ex, y - ey);
    if (dist < 165 && lurkingEyes.style.opacity !== '0') {
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
    const radius = Math.round((115 + b * 1.45) * flicker);
    flashlightArena.style.setProperty('--f-radius', `${radius}px`);
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
  // 10. ACT IX: ROOM 15 RINGING ROTARY PHONE & PERSONALIZED FOLIO
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
      if (state.currentAct === 9 && !state.phoneAnswered && Audio.enabled) {
        Audio.playSfx('phoneRing');
      }
    }, 3400);
  }

  function stopPhoneRinging() {
    clearInterval(state.phoneRingInterval);
    state.phoneRingInterval = null;
  }

  function triggerScareFlash(text, duration = 420) {
    flashCaption.textContent = text;
    scareFlashLayer.classList.add('active');
    setTimeout(() => {
      scareFlashLayer.classList.remove('active');
    }, duration);
  }

  cutCordBtn.addEventListener('click', () => {
    Audio.playSfx('switchSnap');
    state.phoneCordCut = true;
    cutCordBtn.disabled = true;
    cutCordBtn.textContent = 'Cord Severed';
    climaxDialogue.textContent =
      'You yank the braided black cord clean out of the plaster wall... Two seconds later, the bell rings louder than before. It was never plugged in.';
    setTimeout(() => {
      Audio.playSfx('phoneRing');
    }, 900);
  });

  answerPhoneBtn.addEventListener('click', () => {
    if (state.phoneAnswered) return;
    state.phoneAnswered = true;
    stopPhoneRinging();
    markClue('answered_phone');

    if (!Audio.enabled) {
      const on = Audio.toggle();
      syncAudioButtons(on);
    }

    Audio.playSfx('phonePickup');
    rotaryPhone.classList.remove('ringing');
    rotaryPhone.classList.add('answered');
    answerPhoneBtn.disabled = true;
    cutCordBtn.disabled = true;
    answerPhoneBtn.textContent = 'Line Open — 02:17 AM';
    climaxHeading.textContent = 'Connected to Front Desk';

    const guestLabel = state.guestName ? `, ${state.guestName}` : '';
    const beats = [
      { delay: 200, text: `"...Hello${guestLabel}? Thank you for answering. This is Arthur at the front desk."` },
      { delay: 3200, text: '"We noticed you scrolled all the way past the pool, past the register, right into Room 15..."' },
      {
        delay: 6400,
        text: '"Don\'t bother checking the brass deadbolt. All our doors lock from the hallway after 2:17 AM."',
        flash: 'IT LOCKS FROM OUTSIDE',
        sfx: 'doorKnock',
      },
      {
        delay: 9800,
        text: '"Look at the courtyard if you walk back up the page. We turned the neon on just for you."',
        flash: 'CHECK-OUT IS NEVER',
        sfx: 'scareSting',
      },
      {
        delay: 13000,
        text: '"Sleep well. Your folio is printed below. We\'ll see you again on October 19, 1962." [DIAL TONE]',
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

  // Live Personalized Guest Folio Receipt
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

    rcptName.textContent = (state.guestName || 'UNREGISTERED TRAVELER').toUpperCase();
    rcptTime.textContent = state.arrivalTimeStr;
    rcptDuration.textContent = `${mins}m ${secs}s`;
    rcptViewport.textContent = `${window.innerWidth} × ${window.innerHeight}`;
    rcptClues.textContent = `${state.clues.size} / 8`;
    rcptTurnbacks.textContent = String(state.scrollUpCount);

    if (state.scrollUpCount >= 3) {
      rcptVerdict.textContent = `You tried to scroll back ${state.scrollUpCount} times. State Route 19 does not turn around.`;
    } else if (state.clues.size >= 5) {
      rcptVerdict.textContent = `You uncovered ${state.clues.size} of Arthur's secrets — yet you kept walking down Corridor B anyway.`;
    } else {
      rcptVerdict.textContent = 'Thank you for choosing The Sunward Motel. Checkout was at 11:00 AM on October 19, 1962.';
    }
  }

  setInterval(updateReceipt, 1000);
  updateReceipt();

  // =========================================================================
  // 11. LOOP #2 MEMORY SYSTEM & CLEAN RESET
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
    heroTitle.textContent = 'WELCOME BACK TO THE SUNWARD';
    heroStamp.textContent = 'OCTOBER 19, 1962 · 02:17 AM · LOOP #2';
    heroLead.innerHTML =
      'You walked all the way back to the courtyard, didn\'t you? Your headlights are still burning by the empty pool, and <strong>Room 15</strong> is still unlocked.';
    factCheckout.textContent = 'NEVER (OCT 19, 1962)';
    if (roomClockNote) roomClockNote.textContent = 'Clock stopped at 02:17 AM';
    ribbonTrack.innerHTML = `
      <span>NO EXIT ON ROUTE 19</span><span class="star-dot">✦</span>
      <span>DEEP END: NO BOTTOM</span><span class="star-dot">✦</span>
      <span>ROOM 15 UNLOCKED</span><span class="star-dot">✦</span>
      <span>KEYS HELD AT DESK</span><span class="star-dot">✦</span>
      <span>ARTHUR DIED IN 1962</span><span class="star-dot">✦</span>
      <span>DO NOT LOOK BACK</span>
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

  // =========================================================================
  // 3B. ACT II-B: STARLIGHT COFFEE SHOP MENU & SEEBURG WALLBOX JUKEBOX
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
      checkList.innerHTML = '<li class="check-empty">Tap dishes above to add to your counter ticket...</li>';
      checkTotal.textContent = '$0.00';
      return;
    }
    let sum = 0;
    checkList.innerHTML = dinerItems
      .map((item) => {
        sum += item.price;
        return `<li><span>${escapeHtml(item.name)}</span><span>${item.price === 0 ? 'FREE' : '$' + item.price.toFixed(2)}</span></li>`;
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
      if (btn.dataset.dish.includes('Night Manager')) {
        dinerOrderNote.textContent = 'Evelyn penciled on the margin: "Do not eat anything served after 2:00 AM."';
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
      dinerOrderNote.textContent = 'The counter bell echoes across an empty dining room. Nobody comes out of the kitchen.';
    } else if (dinerOrderCount === 1) {
      dinerOrderNote.textContent = 'Order up! Your coffee pot has been sitting on the burner since October 19, 1962.';
    } else {
      dinerOrderNote.textContent = 'You ring again. Through the pass-through window, the clock above the grill reads 02:17.';
    }
  });

  // Seeburg Wallbox Jukebox
  const jbSongs = Array.from(document.querySelectorAll('.jb-song'));
  const jbLyric = document.getElementById('jb-np-lyric');
  const JB_LYRICS = {
    A1: '♪ "Golden sun on Route Nineteen, turquoise water warm and clean..." (Spinning at 45 RPM)',
    A2: '♪ "Roll down the glass, hit Mile Forty-Four, cold cherry pie right by your door!"',
    B1: '♪ "Velvet moon... don\'t lose the road... the highway bends back to the..." [record skips slightly]',
    B2: '♪ "At two-seventeen the neon hums... nobody leaves when the salt fog comes..."',
    C1: '♪ [WARPED 33 RPM] "...leave your keys upon the tray... Arthur wants you here to stay..."',
    C2: '[SCRATCHED GROOVE] ...not music. Just the sound of someone tapping glass from underwater...',
  };

  jbSongs.forEach((btn) => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.jb;
      jbSongs.forEach((b) => b.classList.toggle('playing', b === btn));
      jbLyric.textContent = JB_LYRICS[code] || '';
      if (!Audio.enabled) {
        const on = Audio.toggle();
        syncAudioButtons(on);
      }
      Audio.playJukebox(code);
    });
  });

  // Motorist Reviews — Interactive Manager Reply Toggle
  document.querySelectorAll('[data-reply-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const reply = btn.nextElementSibling;
      const open = reply.hidden;
      reply.hidden = !open;
      btn.textContent = open ? 'Hide Management Reply' : 'Read Management Reply';
      Audio.playSfx('cardFlip');
    });
  });

  // =========================================================================
  // 6B. ACT V-B: 1962 ZENITH CRT TELEVISION (LIVE CANVAS SNOW & FEED)
  // =========================================================================
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
      0: { hud: 'POWER OFF', desc: '<strong>STANDBY:</strong> Even switched off, the phosphor glass stays faintly warm to the touch.' },
      2: { hud: 'CH 02 · TEST PATTERN', desc: '<strong>CH 02 — STATION OFF AIR:</strong> Painted Mesa broadcast test card. Slide the rabbit ears near 65 to stabilize the vertical hold.' },
      3: { hud: 'CH 03 · 02:17 AM', desc: '<strong>CH 03 — PARKING LOT FEED:</strong> Live monochrome view of the courtyard pool. Tune the rabbit ears near 75 to clear the static.' },
      4: { hud: 'CH 04 · CIVIL DEFENSE', desc: '<strong>CH 04 — EMERGENCY ARCHIVE:</strong> State Route 19 advisory loop recorded October 19, 1962.' },
      7: { hud: 'CH 07 · DEAD CHANNEL', desc: '<strong>CH 07 — UNASSIGNED VHF:</strong> Nothing should be broadcasting here. Slide the rabbit ears slowly near 82...' },
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

      // Base noise intensity depending on sweet-spot tuning
      const sweetSpots = { 2: 65, 3: 75, 4: 50, 7: 82 };
      const dist = Math.abs(tune - (sweetSpots[tvChannel] || 50));
      const clarity = Math.max(0.08, 1 - dist / 52);

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
          ctx.fillStyle = 'rgba(220, 60, 65, 0.85)';
          ctx.font = 'bold 14px "Special Elite", monospace';
          ctx.fillText('● REC  MILEPOST 44 — IT SEES THE CAMERA', 16, h - 18);
        }
      } else if (tvChannel === 2) {
        // Retro monochrome test pattern
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
        ctx.font = 'bold 18px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(clarity > 0.75 ? 'DO NOT LEAVE YOUR ROOM' : 'PLEASE STAND BY — 1962', w / 2, h / 2 - 12);
        ctx.restore();
      } else if (tvChannel === 4) {
        ctx.fillStyle = '#151922';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#f0e6d2';
        ctx.font = 'bold 20px Oswald, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('ARIZONA CIVIL DEFENSE BULLETIN', w / 2, 74);
        ctx.font = '14px "Special Elite", monospace';
        ctx.fillStyle = '#ff8b8f';
        ctx.fillText('ROUTE 19 MILEPOST 44 DOES NOT EXIST.', w / 2, 145);
        ctx.fillText('DO NOT STOP FOR TURQUOISE NEON.', w / 2, 175);
        ctx.fillText('LOCK ALL WINDOWS UNTIL SUNRISE.', w / 2, 205);
      } else if (tvChannel === 7) {
        // Hidden silhouette eyes appear only when tuned cleanly near 82!
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
          ctx.fillStyle = 'rgba(255, 110, 118, 0.9)';
          ctx.font = '13px "Special Elite", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('TURN IT OFF', w / 2, h - 26);
        }
      }

      // Procedural static snow overlay (lighter when tuned cleanly)
      const snowCount = Math.floor(380 + (1 - clarity) * 1650);
      ctx.fillStyle = 'rgba(230, 238, 232, 0.26)';
      for (let i = 0; i < snowCount; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        ctx.fillRect(sx, sy, 2.2, 1.8);
      }

      // Rolling horizontal tracking bar
      const barY = (tvTick * 3.2) % h;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(0, barY, w, 14);
    }

    setInterval(() => {
      if (state.currentAct >= 4 && state.currentAct <= 6) {
        drawZenithFrame();
      }
    }, 95);
    drawZenithFrame();
  }

  // =========================================================================
  // 8B. ACT VII-B: CORRODED STEEL HALLWAY BREAKER PANEL (FIGHTS BACK!)
  // =========================================================================
  const breakerLog = document.getElementById('breaker-log');
  const breakerSwitches = Array.from(document.querySelectorAll('.breaker-switch'));

  breakerSwitches.forEach((sw) => {
    sw.addEventListener('click', () => {
      const id = sw.dataset.breaker;
      const isOn = sw.classList.contains('on');
      Audio.playSfx('switchSnap');

      if (id === 'neon') {
        sw.classList.remove('on');
        sw.querySelector('.br-state').textContent = 'OFF';
        breakerLog.textContent = 'Courtyard neon disconnected... wait... why is the window still glowing red?';
        setTimeout(() => {
          sw.classList.add('on');
          sw.querySelector('.br-state').textContent = 'ON';
          Audio.playSfx('switchSnap');
          breakerLog.textContent = 'COURTYARD NEON snapped itself back ON. Power draw is NOT coming from the street line.';
        }, 850);
        return;
      }

      if (id === 'room15') {
        Audio.playSfx('doorKnock');
        const corridorSw = document.querySelector('[data-breaker="corridor"]');
        if (corridorSw) {
          corridorSw.classList.remove('on');
          corridorSw.setAttribute('aria-pressed', 'false');
          corridorSw.querySelector('.br-state').textContent = 'TRIPPED';
        }
        breakerLog.textContent = 'ROOM 15 BREAKER REFUSES TO BUDGE — CORRIDOR B OVERHEAD LIGHTS TRIPPED OUT. USE YOUR FLASHLIGHT BELOW.';
        return;
      }

      const next = !isOn;
      sw.classList.toggle('on', next);
      sw.setAttribute('aria-pressed', String(next));
      sw.querySelector('.br-state').textContent = next ? 'ON' : 'OFF';

      const notes = {
        pool: next ? 'Deep-end drain resumes breathing every 14 seconds.' : 'You cut the pool pump. The wet tapping beneath the concrete continues anyway.',
        lobby: next ? 'Front office lamp flickers on. Nobody is behind the desk.' : 'Front office goes dark. A pale reflection stays visible in the glass.',
        corridor: next ? 'Corridor B fluorescents buzz and die immediately.' : 'Corridor B plunged into pitch darkness. Proceed carefully with flashlight.',
        ice: next ? 'Ice machine rumbles outside Unit 11.' : 'Ice machine silenced. Now you can hear footsteps in the hallway.',
      };
      breakerLog.textContent = notes[id] || '';
    });
  });

  // Honor direct anchor links instantly on initial load (unless resetting)
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

  // Initial sync
  updateScrollAtmosphere();
})();
