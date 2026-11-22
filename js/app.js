/**
 * 水镜先生 · 主交互控制器
 */
(function () {
  const Cal = window.ShuijingCalendar;
  const Bazi = window.ShuijingBazi;
  const Horo = window.ShuijingHoroscope;
  const Div = window.ShuijingDivination;
  const Agent = window.ShuijingAgent;

  let currentAlmanacDate = new Date();
  let currentZodiacId = 'aries';
  let currentCompatMode = 'zodiac';

  // ==================== 工具函数 ====================
  function formatDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate();
  }

  function renderStars(count) {
    return '★'.repeat(count) + '☆'.repeat(5 - count);
  }

  // ==================== 导航切换 ====================
  function initNavigation() {
    const buttons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.tab-panel');
    const brandLink = document.querySelector('.brand');

    function activateTab(tabId) {
      buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabId));
      panels.forEach(panel => panel.classList.toggle('active', panel.id === `tab-${tabId}`));
      if (Agent) Agent.setActiveTab(tabId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    buttons.forEach(btn => {
      btn.addEventListener('click', () => activateTab(btn.dataset.tab));
    });

    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        activateTab('almanac');
      });
    }
  }

  // ==================== 顶部今日概览条 ====================
  function renderTicker() {
    const today = new Date();
    const alm = Cal.getAlmanac(today);
    document.getElementById('tickerDate').textContent =
      `今日 ${alm.year}年${alm.month}月${alm.day}日 ${alm.weekday} · ${alm.lunar}（${alm.ganzhiText}）`;
    document.getElementById('tickerMeta').textContent =
      `宜：${alm.yi.slice(0, 3).join(' ')} ｜ 财神：${alm.caishen} ｜ ${alm.chongSha}`;
  }

  // ==================== 1. 今日黄历模块 ====================
  function renderAlmanac(date) {
    currentAlmanacDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const alm = Cal.getAlmanac(currentAlmanacDate);
    const now = new Date();
    const viewingToday = isSameDay(currentAlmanacDate, now);
    const nowHourIdx = Cal.getCurrentHourBranch(now);

    document.getElementById('almanacDateInput').value = formatDateInputValue(currentAlmanacDate);
    document.getElementById('almWeekday').textContent = `${alm.weekday} · ${alm.jianchuName}`;
    document.getElementById('almSolarTerm').textContent = alm.solarTerm;
    document.getElementById('almDayNum').textContent = alm.day;
    document.getElementById('almGregorian').textContent = `${alm.year}年 ${alm.month}月`;
    document.getElementById('almLunar').textContent = alm.lunar;
    document.getElementById('almGanzhi').textContent = alm.ganzhiText;
    document.getElementById('almZodiac').textContent = `生肖：${alm.shengxiao}`;
    document.getElementById('almConstellation').textContent = alm.zodiac;

    document.getElementById('almYi').innerHTML = alm.yi
      .map(item => `<span class="yiji-tag">${item}</span>`).join('');
    document.getElementById('almJi').innerHTML = alm.ji
      .map(item => `<span class="yiji-tag">${item}</span>`).join('');

    document.getElementById('almChongSha').textContent = alm.chongSha;
    document.getElementById('almCaishen').textContent = alm.caishen;
    document.getElementById('almXishen').textContent = alm.xishen;
    document.getElementById('almNayin').textContent = alm.nayin;

    document.getElementById('almHoursGrid').innerHTML = alm.hours.map(h => {
      const isNow = viewingToday && h.idx === nowHourIdx;
      return `
        <div class="hour-cell ${isNow ? 'is-now' : ''}">
          ${isNow ? '<span class="hour-now-tag">当前</span>' : ''}
          <div class="hour-name">${h.ganzhi}</div>
          <div class="hour-range">${h.range}</div>
          <span class="hour-luck ${h.isGood ? 'ji' : 'xiong'}">${h.luckText}</span>
        </div>
      `;
    }).join('');

    if (Agent) Agent.setContext('almanac', alm);
  }

  function initAlmanac() {
    renderAlmanac(new Date());

    document.getElementById('almanacDateInput').addEventListener('change', (e) => {
      if (!e.target.value) return;
      const [y, m, d] = e.target.value.split('-').map(Number);
      renderAlmanac(new Date(y, m - 1, d));
    });

    document.getElementById('prevDayBtn').addEventListener('click', () => {
      const d = new Date(currentAlmanacDate);
      d.setDate(d.getDate() - 1);
      renderAlmanac(d);
    });

    document.getElementById('nextDayBtn').addEventListener('click', () => {
      const d = new Date(currentAlmanacDate);
      d.setDate(d.getDate() + 1);
      renderAlmanac(d);
    });

    document.getElementById('todayBtn').addEventListener('click', () => {
      renderAlmanac(new Date());
    });
  }

  // ==================== 2. 八字紫微模块 ====================
  function renderBaziResult() {
    const dateStr = document.getElementById('baziDate').value;
    const hourIdx = parseInt(document.getElementById('baziHour').value, 10);
    const gender = document.getElementById('baziGender').value;
    if (!dateStr) return;

    const res = Bazi.analyze(dateStr, hourIdx, gender);

    document.getElementById('baziSummaryBadge').textContent = `${res.genderLabel} · 属${res.shengxiao}`;

    document.getElementById('pillarsGrid').innerHTML = res.pillars.map(p => `
      <div class="pillar-box">
        <div class="pillar-label">${p.label}</div>
        <div class="pillar-chars">
          <span class="gz-char wx-${p.stemWx}">${p.stem}</span>
          <span class="gz-char wx-${p.branchWx}">${p.branch}</span>
        </div>
        <div class="pillar-wuxing">${p.stemWx} · ${p.branchWx}</div>
      </div>
    `).join('');

    const total = 8;
    document.getElementById('wuxingBars').innerHTML = ['金', '木', '水', '火', '土'].map(wx => {
      const count = res.counts[wx];
      const pct = Math.round((count / total) * 100);
      return `
        <div class="wx-bar-row">
          <strong style="color:${res.wuxingColors[wx]}">${wx}</strong>
          <div class="wx-track">
            <div class="wx-fill" style="width:${Math.max(pct, count > 0 ? 12 : 0)}%; background:${res.wuxingColors[wx]}"></div>
          </div>
          <span class="muted-note">${count} 个</span>
        </div>
      `;
    }).join('');
    document.getElementById('wuxingNote').textContent = res.wuxingNote;

    document.getElementById('ziweiCategory').textContent = res.ziweiStar.category;
    document.getElementById('ziweiStarName').textContent = res.ziweiStar.name;
    document.getElementById('ziweiKeywords').textContent = res.ziweiStar.keywords;
    document.getElementById('ziweiDesc').textContent = res.ziweiStar.desc;

    document.getElementById('dayMasterTitle').textContent = `日主命格：${res.dayMaster.title}`;
    document.getElementById('dayMasterElement').textContent = `五行属${res.dayMaster.element}`;
    document.getElementById('dayMasterGrid').innerHTML = `
      <div class="tip-box">
        <strong>性格特质</strong>
        <p>${res.dayMaster.personality}</p>
      </div>
      <div class="tip-box">
        <strong>事业方向</strong>
        <p>${res.dayMaster.career}</p>
      </div>
      <div class="tip-box">
        <strong>感情与人际</strong>
        <p>${res.dayMaster.love}</p>
      </div>
    `;

    if (Agent) Agent.setContext('bazi', res);
  }

  function initBazi() {
    renderBaziResult();
    document.getElementById('baziForm').addEventListener('submit', (e) => {
      e.preventDefault();
      renderBaziResult();
    });
  }

  // ==================== 3. 十二星座运势模块 ====================
  function renderHoroscopeDetail(signId) {
    currentZodiacId = signId;
    document.querySelectorAll('.zodiac-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sign === signId);
    });

    const data = Horo.getDailyHoroscope(signId, new Date());
    document.getElementById('horoGlyph').textContent = data.sign.glyph;
    document.getElementById('horoName').textContent = data.sign.name;
    document.getElementById('horoDateRange').textContent = `${data.sign.dates} · ${data.sign.element}星座`;

    document.getElementById('horoLuckyPills').innerHTML = `
      <span class="lucky-pill">幸运色：<strong>${data.luckyColor}</strong></span>
      <span class="lucky-pill">幸运数字：<strong>${data.luckyNumber}</strong></span>
      <span class="lucky-pill">速配星座：<strong>${data.matchSign}</strong></span>
    `;

    document.getElementById('horoQuote').textContent = `「${data.quote}」`;

    document.getElementById('horoScores').innerHTML = data.scores.map(s => `
      <div class="score-box">
        <div class="score-top">
          <span>${s.label}</span>
          <span class="score-stars">${renderStars(s.val)}</span>
        </div>
        <div class="score-bar">
          <div class="score-bar-fill" style="width:${s.val * 20}%"></div>
        </div>
      </div>
    `).join('');

    document.getElementById('horoAdviceGrid').innerHTML = data.advice.map(a => `
      <div class="tip-box">
        <strong>${a.title}</strong>
        <p>${a.text}</p>
      </div>
    `).join('');

    if (Agent) Agent.setContext('horoscope', data);
  }

  function initHoroscope() {
    const container = document.getElementById('zodiacSelector');
    container.innerHTML = Horo.SIGNS.map(s => `
      <button class="zodiac-btn" data-sign="${s.id}">
        <span class="z-glyph">${s.glyph}</span>
        <span class="z-name">${s.name}</span>
        <span class="z-dates">${s.dates}</span>
      </button>
    `).join('');

    container.querySelectorAll('.zodiac-btn').forEach(btn => {
      btn.addEventListener('click', () => renderHoroscopeDetail(btn.dataset.sign));
    });

    renderHoroscopeDetail(currentZodiacId);
  }

  // ==================== 4. 缘分合盘模块 ====================
  function populateCompatSelects(mode) {
    const selA = document.getElementById('compatA');
    const selB = document.getElementById('compatB');
    if (mode === 'zodiac') {
      const opts = Horo.SIGNS.map((s, idx) => `<option value="${idx}">${s.glyph} ${s.name}（${s.element}）</option>`).join('');
      selA.innerHTML = opts;
      selB.innerHTML = opts;
      selA.value = '0';
      selB.value = '4';
    } else {
      const opts = Horo.SHENGXIAO.map((sx, idx) => `<option value="${idx}">属${sx}</option>`).join('');
      selA.innerHTML = opts;
      selB.innerHTML = opts;
      selA.value = '2';
      selB.value = '6';
    }
  }

  function renderCompatResult() {
    const idxA = parseInt(document.getElementById('compatA').value, 10);
    const idxB = parseInt(document.getElementById('compatB').value, 10);
    const res = currentCompatMode === 'zodiac'
      ? Horo.calcZodiacCompat(idxA, idxB)
      : Horo.calcShengxiaoCompat(idxA, idxB);

    document.getElementById('compatScore').textContent = res.score;
    document.getElementById('compatPairTitle').textContent = res.pairTitle;
    document.getElementById('compatTag').textContent = res.tag;
    document.getElementById('compatSummary').textContent = res.summary;
    document.getElementById('compatPros').textContent = res.pros;
    document.getElementById('compatAdvice').textContent = res.advice;

    if (Agent) Agent.setContext('compatibility', res);
  }

  function initCompatibility() {
    populateCompatSelects(currentCompatMode);
    renderCompatResult();

    document.querySelectorAll('#compatModeSwitch .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentCompatMode = btn.dataset.mode;
        document.querySelectorAll('#compatModeSwitch .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        populateCompatSelects(currentCompatMode);
        renderCompatResult();
      });
    });

    document.getElementById('compatCalcBtn').addEventListener('click', renderCompatResult);
  }

  // ==================== 5. 水镜灵签 & 每日塔罗模块 ====================
  function initDivination() {
    // 切换灵签/塔罗
    document.querySelectorAll('#divModeSwitch .seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        document.querySelectorAll('#divModeSwitch .seg-btn').forEach(b => b.classList.toggle('active', b === btn));
        document.getElementById('divQianPanel').classList.toggle('active', mode === 'qian');
        document.getElementById('divTarotPanel').classList.toggle('active', mode === 'tarot');
      });
    });

    // 摇签
    const cylinder = document.getElementById('qianCylinder');
    const qianCard = document.getElementById('qianResultCard');
    function performQianDraw() {
      cylinder.classList.remove('shaking');
      void cylinder.offsetWidth; // 强制重绘触发动画
      cylinder.classList.add('shaking');

      setTimeout(() => {
        const q = Div.drawQian();
        document.getElementById('qianRank').textContent = q.rank;
        document.getElementById('qianNumber').textContent = q.num;
        document.getElementById('qianTitle').textContent = q.title;
        document.getElementById('qianPoem').textContent = q.poem;
        document.getElementById('qianMeaning').textContent = q.meaning;
        document.getElementById('qianGuide').textContent = q.guide;
        qianCard.classList.remove('hidden');
        qianCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (Agent) Agent.setContext('divination', { type: 'qian', data: q });
      }, 480);
    }

    document.getElementById('drawQianBtn').addEventListener('click', performQianDraw);
    document.getElementById('redrawQianBtn').addEventListener('click', performQianDraw);

    // 塔罗抽牌
    const deckButtons = document.querySelectorAll('.tarot-card-btn');
    const tarotCard = document.getElementById('tarotResultCard');
    const resetTarotBtn = document.getElementById('resetTarotBtn');

    deckButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        deckButtons.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        const card = Div.drawTarot();
        const face = document.getElementById('tarotFace');
        face.classList.toggle('reversed', card.isReversed);
        document.getElementById('tarotRoman').textContent = card.roman;
        document.getElementById('tarotSymbol').textContent = card.symbol;
        document.getElementById('tarotNameCn').textContent = card.cn;
        document.getElementById('tarotNameEn').textContent = card.en;
        document.getElementById('tarotResultTitle').textContent = `${card.cn} · ${card.orientationLabel}`;
        document.getElementById('tarotOrientation').textContent = card.orientationLabel;
        document.getElementById('tarotKeywords').textContent = card.keywords;
        document.getElementById('tarotDesc').textContent = card.desc;
        document.getElementById('tarotAdvice').textContent = card.advice;

        tarotCard.classList.remove('hidden');
        resetTarotBtn.classList.remove('hidden');
        tarotCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (Agent) Agent.setContext('divination', { type: 'tarot', data: card });
      });
    });

    resetTarotBtn.addEventListener('click', () => {
      deckButtons.forEach(b => b.classList.remove('selected'));
      tarotCard.classList.add('hidden');
      resetTarotBtn.classList.add('hidden');
    });
  }

  // ==================== 启动 ====================
  document.addEventListener('DOMContentLoaded', () => {
    if (Agent) Agent.init();
    initNavigation();
    renderTicker();
    initAlmanac();
    initBazi();
    initHoroscope();
    initCompatibility();
    initDivination();
  });
})();
