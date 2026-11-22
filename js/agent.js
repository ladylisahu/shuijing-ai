/**
 * 水镜先生 · 上下文感知 AI 智能体引擎
 * 支持：实时感知五模块排盘/星象/签文数据、3款白胡子古装老者形象切换、
 *      内置本地智能推演（零配置可用） + 可选真大模型 API（OpenAI/DeepSeek/Gemini 兼容）
 */
window.ShuijingAgent = (function () {
  const STORAGE_AVATAR = 'shuijing_avatar';
  const STORAGE_API = 'shuijing_llm_api';

  const state = {
    activeTab: 'almanac',
    avatar: localStorage.getItem(STORAGE_AVATAR) || 'assets/sage-a.jpg',
    apiConfig: loadApiConfig(),
    context: {
      almanac: null,
      bazi: null,
      horoscope: null,
      compatibility: null,
      divination: null
    },
    isBusy: false
  };

  const TAB_LABELS = {
    almanac: '今日黄历',
    bazi: '八字紫微命盘',
    horoscope: '星座今日运势',
    compatibility: '缘分合盘测算',
    divination: '灵签与塔罗问卜'
  };

  const QUICK_PROMPTS = {
    almanac: ['深度解读今日择吉与吉时', '今天适合签约或谈合作吗？', '今日财神方位怎么用？'],
    bazi: ['综合串联解读我的八字与紫微', '我五行强弱该如何调理？', '结合日主聊聊我的事业方向'],
    horoscope: ['解读我今天的星运重点', '今天感情与社交需要注意什么？', '给我一条今日开运建议'],
    compatibility: ['深度剖析我们俩的相处之道', '遇到分歧时怎么化解最有效？', '我们适合一起共事或长久发展吗？'],
    divination: ['结合我刚抽到的签/牌深度解说', '如果我问的是事业，这签怎么解？', '如果我问的是感情，有何启示？']
  };

  function loadApiConfig() {
    try {
      const raw = localStorage.getItem(STORAGE_API);
      return raw ? JSON.parse(raw) : { baseUrl: '', apiKey: '', model: '' };
    } catch {
      return { baseUrl: '', apiKey: '', model: '' };
    }
  }

  function hasLiveApi() {
    return Boolean(state.apiConfig && state.apiConfig.apiKey && state.apiConfig.baseUrl);
  }

  function setContext(tab, data) {
    state.context[tab] = data;
    updateContextUI();
  }

  function setActiveTab(tab) {
    state.activeTab = tab;
    updateContextUI();
    renderQuickPrompts();
  }

  function updateContextUI() {
    const line = document.getElementById('agentContextLine');
    if (!line) return;
    const label = TAB_LABELS[state.activeTab] || '星象历法';
    let detail = '';
    if (state.activeTab === 'almanac' && state.context.almanac) {
      detail = ` · ${state.context.almanac.lunar} (${state.context.almanac.jianchuName})`;
    } else if (state.activeTab === 'bazi' && state.context.bazi) {
      detail = ` · ${state.context.bazi.dayMaster.title.split(' ')[0]} · ${state.context.bazi.ziweiStar.name}`;
    } else if (state.activeTab === 'horoscope' && state.context.horoscope) {
      detail = ` · ${state.context.horoscope.sign.name}`;
    } else if (state.activeTab === 'compatibility' && state.context.compatibility) {
      detail = ` · ${state.context.compatibility.pairTitle} (${state.context.compatibility.score}分)`;
    } else if (state.activeTab === 'divination' && state.context.divination) {
      const d = state.context.divination;
      detail = d.type === 'qian' ? ` · ${d.data.num}「${d.data.title}」` : ` · 塔罗「${d.data.cn}·${d.data.orientationLabel}」`;
    }
    line.textContent = `实时感知：${label}${detail}`;
  }

  function applyAvatar(src) {
    state.avatar = src;
    localStorage.setItem(STORAGE_AVATAR, src);
    document.querySelectorAll('.js-sage-avatar').forEach(img => {
      img.src = src;
    });
    document.querySelectorAll('#avatarPicker .avatar-opt').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.avatar === src);
    });
  }

  function updateEngineTag() {
    const tag = document.getElementById('agentEngineTag');
    if (!tag) return;
    tag.textContent = hasLiveApi() ? `大模型：${state.apiConfig.model || '已接入'}` : '内置推演引擎';
  }

  function openDrawer(autoAskContext) {
    const drawer = document.getElementById('agentDrawer');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    if (autoAskContext) {
      setActiveTab(autoAskContext);
      const firstPrompt = (QUICK_PROMPTS[autoAskContext] && QUICK_PROMPTS[autoAskContext][0]) || '请为我深度解读当前内容';
      handleUserMessage(firstPrompt);
    }
  }

  function closeDrawer() {
    const drawer = document.getElementById('agentDrawer');
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
  }

  function renderQuickPrompts() {
    const box = document.getElementById('agentQuickPrompts');
    if (!box) return;
    const prompts = QUICK_PROMPTS[state.activeTab] || QUICK_PROMPTS.almanac;
    box.innerHTML = prompts.map(p => `<button class="quick-chip" type="button">${p}</button>`).join('');
    box.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => handleUserMessage(chip.textContent));
    });
  }

  function appendMessage(role, text) {
    const container = document.getElementById('agentMessages');
    const row = document.createElement('div');
    row.className = `msg-row ${role}`;

    if (role === 'ai') {
      const img = document.createElement('img');
      img.className = 'msg-avatar js-sage-avatar';
      img.src = state.avatar;
      img.alt = '水镜先生';
      row.appendChild(img);
    }

    const bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    bubble.textContent = text;
    row.appendChild(bubble);

    container.appendChild(row);
    container.scrollTop = container.scrollHeight;
    return bubble;
  }

  /** 流式打字机效果输出 */
  function streamToBubble(bubble, fullText) {
    const container = document.getElementById('agentMessages');
    return new Promise(resolve => {
      let i = 0;
      bubble.textContent = '';
      const timer = setInterval(() => {
        const step = Math.min(3, fullText.length - i);
        bubble.textContent += fullText.slice(i, i + step);
        i += step;
        container.scrollTop = container.scrollHeight;
        if (i >= fullText.length) {
          clearInterval(timer);
          resolve();
        }
      }, 18);
    });
  }

  /** 生成发给真大模型或本地引擎的结构化上下文摘要 */
  function buildContextSnapshot() {
    const tab = state.activeTab;
    const ctx = state.context[tab];
    if (!ctx) return `当前模块：${TAB_LABELS[tab]}（暂无具体排盘结果）`;
    if (tab === 'almanac') {
      const goodHours = ctx.hours.filter(h => h.isGood).map(h => `${h.ganzhi}(${h.range})`).slice(0, 4).join('、');
      return `今日黄历：${ctx.year}年${ctx.month}月${ctx.day}日 ${ctx.lunar}，干支${ctx.ganzhiText}，${ctx.jianchuName}；宜：${ctx.yi.join('、')}；忌：${ctx.ji.join('、')}；冲煞：${ctx.chongSha}；财神${ctx.caishen}，喜神${ctx.xishen}；部分吉时：${goodHours}。`;
    }
    if (tab === 'bazi') {
      const bz = ctx.pillars.map(p => `${p.label}${p.stem}${p.branch}`).join('，');
      return `八字紫微：${ctx.genderLabel}，属${ctx.shengxiao}；四柱：${bz}；五行统计：金${ctx.counts.金} 木${ctx.counts.木} 水${ctx.counts.水} 火${ctx.counts.火} 土${ctx.counts.土}；日主：${ctx.dayMaster.title}；紫微主星：${ctx.ziweiStar.name}（${ctx.ziweiStar.category}）。`;
    }
    if (tab === 'horoscope') {
      const scores = ctx.scores.map(s => `${s.label}${s.val}星`).join('、');
      return `星座今日运势：${ctx.sign.name}（${ctx.sign.element}），${scores}，幸运色${ctx.luckyColor}，幸运数字${ctx.luckyNumber}，速配${ctx.matchSign}。`;
    }
    if (tab === 'compatibility') {
      return `缘分合盘：${ctx.pairTitle}，共振评分${ctx.score}分，评语「${ctx.tag}」。`;
    }
    if (tab === 'divination') {
      if (ctx.type === 'qian') {
        return `水镜灵签：${ctx.data.num}（${ctx.data.rank}）「${ctx.data.title}」，签诗：${ctx.data.poem.replace('\n', ' ')}`;
      }
      return `每日塔罗：${ctx.data.cn}（${ctx.data.orientationLabel}），关键词：${ctx.data.keywords}`;
    }
    return '';
  }

  /** 本地智能推演引擎（零 API Key 即可直接输出高质感上下文解说） */
  function generateLocalReply(question) {
    const tab = state.activeTab;
    const ctx = state.context[tab];
    const q = question.trim();

    if (tab === 'almanac' && ctx) {
      const goodHours = ctx.hours.filter(h => h.isGood).map(h => `${h.ganzhi}（${h.range}）`).slice(0, 3);
      if (q.includes('签约') || q.includes('合作') || q.includes('工作')) {
        const goodForSign = ctx.yi.some(x => ['签约', '立券', '开市', '交易', '成日'].includes(x));
        return `老夫观今日历象，为「${ctx.ganzhiText}」，值神【${ctx.jianchuName}】。\n\n` +
          (goodForSign
            ? `✦ 签约判断：今日宜「${ctx.yi.slice(0, 4).join('、')}」，气场顺畅，很适合推进签约、谈合作与落定事宜。\n`
            : `✦ 签约判断：今日核心宜项偏向「${ctx.yi.slice(0, 3).join('、')}」，若要正式签约，建议避开冲煞并选在黄道吉时敲定细节。\n`) +
          `✦ 优选吉时：${goodHours.join(' / ')}\n✦ 方位小贴士：谈事可优先坐向或面向【${ctx.caishen}】（财神位），并留意「${ctx.chongSha}」。`;
      }
      if (q.includes('财神') || q.includes('方位')) {
        return `今日财神坐落【${ctx.caishen}】，喜神坐落【${ctx.xishen}】，日纳音为「${ctx.nayin}」。\n\n` +
          `✦ 实用用法：办公桌可保持【${ctx.caishen}】方位整洁明亮；外出洽谈、见重要客户或抽签许愿时，朝此方向迈出第一步或落座，最能借得今日旺气。`;
      }
      return `道友安好，老夫为你梳理今日（${ctx.lunar} · ${ctx.jianchuName}）天时要点：\n\n` +
        `1. 核心宜忌：今日宜「${ctx.yi.slice(0, 4).join('、')}」，忌「${ctx.ji.slice(0, 3).join('、')}」。顺势而为则事半功倍。\n` +
        `2. 黄金吉时：推荐把重要沟通或决策安排在 ${goodHours.join('、')}。\n` +
        `3. 趋吉避凶：今日${ctx.chongSha}，财神在${ctx.caishen}、喜神在${ctx.xishen}，保持从容节奏便是上吉。`;
    }

    if (tab === 'bazi' && ctx) {
      const four = ctx.pillars.map(p => `${p.stem}${p.branch}`).join(' · ');
      const missing = Object.entries(ctx.counts).filter(([, v]) => v === 0).map(([k]) => k);
      if (q.includes('五行') || q.includes('调理') || q.includes('补')) {
        const targetWx = missing[0] || Object.entries(ctx.counts).sort((a, b) => a[1] - b[1])[0][0];
        const tips = {
          木: '多亲近绿植与自然，穿搭可选青绿色系，作息宜早起舒展筋骨。',
          火: '多晒太阳、保持热情表达，暖色系（红/橘/琥珀金）与适度有氧运动最能提气。',
          土: '规律饮食起居，大地色/米黄色系及陶器木石饰物有助于稳固心神。',
          金: '保持环境井然有序，白/银/灰金属质感配饰与果断断舍离能增强决断力。',
          水: '多补水、亲近水景，深蓝/玄黑色系与阅读冥想能滋养你的灵感与松弛感。'
        };
        return `观你四柱【${four}】，${ctx.wuxingNote}\n\n✦ 针对性补益建议（补「${targetWx}」）：\n${tips[targetWx]}\n\n命理重在“中和”，无需执念缺什么，把日常习惯微调到舒展状态即为好风水。`;
      }
      return `老夫已细览你的命盘（${ctx.genderLabel} · 属${ctx.shengxiao}）：\n\n` +
        `✦ 四柱骨架：${four}\n` +
        `✦ 八字×紫微合参：你日主为【${ctx.dayMaster.title}】，同时紫微命宫见【${ctx.ziweiStar.name}（${ctx.ziweiStar.category}）】。\n` +
        `这意味着你既有「${ctx.dayMaster.personality.slice(0, 18)}…」的底色，又具备「${ctx.ziweiStar.keywords}」的处世锋芒。\n\n` +
        `✦ 老夫寄语：${ctx.dayMaster.career}`;
    }

    if (tab === 'horoscope' && ctx) {
      const topScore = [...ctx.scores].sort((a, b) => b.val - a.val)[0];
      return `今日星盘聚焦【${ctx.sign.name}（${ctx.sign.element}）】：\n\n` +
        `✦ 今日最强能量：${topScore.label}（${topScore.val}星）！${ctx.quote}\n` +
        `✦ 感情与人际：${ctx.advice[0].text}\n` +
        `✦ 开运锚点：今日可优先选用「${ctx.luckyColor}」小物件，留意数字「${ctx.luckyNumber}」，与「${ctx.matchSign}」交流格外同频。`;
    }

    if (tab === 'compatibility' && ctx) {
      return `老夫为【${ctx.pairTitle}】起了一卦合盘（共振指数 ${ctx.score} 分 · ${ctx.tag}）：\n\n` +
        `✦ 缘分底色：${ctx.summary}\n` +
        `✦ 关键加分项：${ctx.pros}\n` +
        `✦ 避坑锦囊：${ctx.advice}\n\n合盘分数是起点，真正的长久缘分靠的是互相看见与及时沟通。`;
    }

    if (tab === 'divination') {
      if (!ctx) {
        return `道友尚未起签或翻牌呢。请先在页面中点击「摇签问卜」或点选一张「塔罗星象牌」，老夫即刻结合你抽到的卦象为你细细拆解！`;
      }
      if (ctx.type === 'qian') {
        const focus = q.includes('事业') ? '若论事业，此签提示你把握当下节拍，既要有破局胆识，也要稳扎基本功。'
          : q.includes('感情') ? '若论感情，此签重在真诚与顺其自然，少一分猜测、多一分坦率，良缘自近。'
          : `此签核心在于「${ctx.data.meaning}」`;
        return `老夫细看你方才求得的【${ctx.data.num} · ${ctx.data.rank} · ${ctx.data.title}】：\n\n` +
          `「${ctx.data.poem.replace('\n', ' / ')}」\n\n` +
          `✦ 深度解说：${focus}\n` +
          `✦ 落地指引：${ctx.data.guide}`;
      }
      const focus = q.includes('事业') ? '放在事业语境下，这张牌提醒你先厘清核心目标，把精力集中在最具杠杆的一步。'
        : q.includes('感情') ? '放在感情语境下，这张牌鼓励你倾听真实感受，用温和清晰的边界建立信任。'
        : ctx.data.desc;
      return `你翻开的塔罗牌为【${ctx.data.cn} · ${ctx.data.orientationLabel}】（${ctx.data.keywords}）：\n\n` +
        `✦ 牌面深意：${focus}\n` +
        `✦ 水镜建议：${ctx.data.advice}`;
    }

    return `道友所问老夫已悉知。你可先在上方切换「黄历 / 八字紫微 / 星座 / 合盘 / 灵签塔罗」任意模块，老夫会自动感知当前数据为你深度解说；也可点击右上角「⚙」随时切换我的古风形象或接入你的专属大模型 API。`;
  }

  /** 调用用户配置的大模型 API（OpenAI Chat Completions 兼容协议） */
  async function callLiveLLM(question) {
    const endpoint = state.apiConfig.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    const systemPrompt = `你是「水镜先生」，一位儒雅通透、兼具东方易理底蕴与现代科技感的白胡子古装智者 AI。请结合以下页面实时数据，用温暖、清晰、不迷信、有建设性的中文回答用户问题，控制在 220 字以内。\n\n【当前页面上下文】\n${buildContextSnapshot()}`;

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.apiConfig.apiKey}`
      },
      body: JSON.stringify({
        model: state.apiConfig.model || 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.7
      })
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }
    const json = await resp.json();
    return json.choices?.[0]?.message?.content?.trim() || generateLocalReply(question);
  }

  async function handleUserMessage(text) {
    const q = (text || '').trim();
    if (!q || state.isBusy) return;
    state.isBusy = true;

    appendMessage('user', q);
    const thinkingBubble = appendMessage('ai', '水镜先生正在推演天时星象矩阵...');

    try {
      let answer;
      if (hasLiveApi()) {
        answer = await callLiveLLM(q);
      } else {
        await new Promise(r => setTimeout(r, 380));
        answer = generateLocalReply(q);
      }
      await streamToBubble(thinkingBubble, answer);
    } catch (err) {
      const fallback = `（外接大模型接口暂未响应：${err.message}，已自动切回内置智能推演）\n\n` + generateLocalReply(q);
      await streamToBubble(thinkingBubble, fallback);
    } finally {
      state.isBusy = false;
    }
  }

  function init() {
    applyAvatar(state.avatar);
    updateEngineTag();
    renderQuickPrompts();

    // 欢迎语
    appendMessage('ai',
      '道友幸会，老夫乃「水镜先生」AI 智能体。\n' +
      '我能实时感知你正在查看的黄历、八字紫微、星座、合盘与灵签塔罗数据，随时为你做白话深度解说。\n' +
      '点击右上角「⚙」还可切换我的 3 款形象或接入你的大模型 API。'
    );

    // 打开/关闭抽屉
    document.getElementById('agentFab').addEventListener('click', () => openDrawer());
    document.getElementById('agentCloseBtn').addEventListener('click', closeDrawer);

    // 页面内一键 AI 解读按钮
    document.querySelectorAll('.js-ask-ai').forEach(btn => {
      btn.addEventListener('click', () => openDrawer(btn.dataset.context));
    });

    // 设置面板切换
    const settingsPanel = document.getElementById('agentSettingsPanel');
    document.getElementById('agentSettingsToggle').addEventListener('click', () => {
      settingsPanel.classList.toggle('hidden');
    });

    // 3款形象切换
    document.querySelectorAll('#avatarPicker .avatar-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        applyAvatar(btn.dataset.avatar);
      });
    });

    // 回填 API 配置
    const baseInput = document.getElementById('apiBaseUrl');
    const keyInput = document.getElementById('apiKeyInput');
    const modelInput = document.getElementById('apiModelInput');
    baseInput.value = state.apiConfig.baseUrl || '';
    keyInput.value = state.apiConfig.apiKey || '';
    modelInput.value = state.apiConfig.model || '';

    document.getElementById('saveApiBtn').addEventListener('click', () => {
      state.apiConfig = {
        baseUrl: baseInput.value.trim(),
        apiKey: keyInput.value.trim(),
        model: modelInput.value.trim()
      };
      localStorage.setItem(STORAGE_API, JSON.stringify(state.apiConfig));
      updateEngineTag();
      settingsPanel.classList.add('hidden');
      appendMessage('ai', hasLiveApi()
        ? `已接入大模型接口（${state.apiConfig.model || '默认模型'}），接下来的解说将由真大模型结合页面实时排盘为你生成。`
        : '配置已更新，当前使用内置智能推演引擎。'
      );
    });

    document.getElementById('clearApiBtn').addEventListener('click', () => {
      state.apiConfig = { baseUrl: '', apiKey: '', model: '' };
      baseInput.value = '';
      keyInput.value = '';
      modelInput.value = '';
      localStorage.removeItem(STORAGE_API);
      updateEngineTag();
      settingsPanel.classList.add('hidden');
      appendMessage('ai', '已切回内置本地智能推演引擎，无需 API Key 即可畅问。');
    });

    // 发送表单
    const form = document.getElementById('agentForm');
    const input = document.getElementById('agentInput');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = input.value;
      input.value = '';
      handleUserMessage(val);
    });
  }

  return {
    init,
    setContext,
    setActiveTab,
    openDrawer
  };
})();
