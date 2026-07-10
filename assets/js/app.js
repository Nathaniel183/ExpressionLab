(() => {
  const state = {
    data: null,
    view: "home",
    selectedExampleId: null,
    exampleFilter: { query: "", domain: "all", format: "all" },
    coverageFilter: "all",
    materialFilter: { query: "", function: "all", register: "all" },
    promptFilter: "all",
    exerciseFilter: { skill: "all", level: "all" },
    exerciseIndex: 0,
    reveals: { scaffold: false, reference: false }
  };

  const els = {
    content: document.getElementById("appContent"),
    pageTitle: document.getElementById("pageTitle"),
    pageSubtitle: document.getElementById("pageSubtitle"),
    statusStack: document.getElementById("statusStack"),
    sidebar: document.getElementById("sidebar"),
    sidebarProgressText: document.getElementById("sidebarProgressText"),
    sidebarProgressFill: document.getElementById("sidebarProgressFill"),
    continueButton: document.getElementById("continueButton"),
    themeToggle: document.getElementById("themeToggle"),
    importProgressInput: document.getElementById("importProgressInput")
  };

  const viewMeta = {
    home: ["首页", "查看进度并快速进入训练"],
    coverage: ["功能覆盖", "检查共享、写作和口语功能是否完整"],
    examples: ["核心范例", "背诵、拆解并迁移完整表达骨架"],
    practice: ["迁移练习", "在新主题与新情景中重组已学结构"],
    materials: ["补充素材", "积累可插拔的词组、句型和描述素材"],
    prompts: ["提示词中心", "复制提示词以生成可追加的数据文件"],
    settings: ["数据与设置", "管理进度、主题与本地文件结构"]
  };

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  const progress = {
    get() {
      const defaults = { learned: {}, scores: {}, starred: {}, notes: {}, answers: {} };
      try {
        const saved = JSON.parse(localStorage.getItem("expressionLabProgress")) || {};
        return { ...defaults, ...saved, learned: saved.learned || {}, scores: saved.scores || {}, starred: saved.starred || {}, notes: saved.notes || {}, answers: saved.answers || {} };
      } catch { return defaults; }
    },
    set(value) { localStorage.setItem("expressionLabProgress", JSON.stringify(value)); updateProgressUI(); },
    toggleLearned(id) { const p = this.get(); p.learned[id] = !p.learned[id]; this.set(p); },
    toggleStar(id) { const p = this.get(); p.starred[id] = !p.starred[id]; this.set(p); },
    score(id, value) { const p = this.get(); p.scores[id] = { value, time: new Date().toISOString() }; this.set(p); },
    note(id, value) { const p = this.get(); p.notes[id] = value; this.set(p); },
    answer(id, value) { const p = this.get(); p.answers[id] = value; this.set(p); }
  };

  function notify(message, type = "success") {
    const node = document.createElement("div");
    node.className = `status-message ${type}`;
    node.innerHTML = `<strong>${type === "error" ? "提示" : "完成"}</strong><span>${escapeHtml(message)}</span>`;
    els.statusStack.prepend(node);
    setTimeout(() => node.remove(), 2800);
  }

  async function copyText(text, label = "内容") {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label}已复制`);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      notify(`${label}已复制`);
    }
  }

  function setView(view) {
    state.view = view;
    const [title, subtitle] = viewMeta[view];
    els.pageTitle.textContent = title;
    els.pageSubtitle.textContent = subtitle;
    document.querySelectorAll(".nav-item").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
    els.sidebar.classList.remove("open");
    render();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateProgressUI() {
    if (!state.data) return;
    const p = progress.get();
    const total = state.data.examples.length;
    const learned = Object.entries(p.learned).filter(([, v]) => v).length;
    const pct = total ? Math.round(learned / total * 100) : 0;
    els.sidebarProgressText.textContent = `${pct}%`;
    els.sidebarProgressFill.style.width = `${pct}%`;
  }

  function render() {
    if (!state.data) return;
    const renderers = { home: renderHome, coverage: renderCoverage, examples: renderExamples, practice: renderPractice, materials: renderMaterials, prompts: renderPrompts, settings: renderSettings };
    renderers[state.view]();
    bindViewEvents();
  }

  function renderHome() {
    const { examples, exercises, materials, coverage, prompts } = state.data;
    const p = progress.get();
    const learnedCount = Object.values(p.learned).filter(Boolean).length;
    const scoredCount = Object.keys(p.scores).length;
    const topPrompts = prompts.filter(item => item.featured).slice(0, 3);
    const nextExample = examples.find(item => !p.learned[item.id]) || examples[0];
    els.content.innerHTML = `
      <div class="hero-grid">
        <article class="hero-card">
          <div class="eyebrow">Structure First · Transfer Next</div>
          <h2>先掌握表达骨架，再把它迁移到任何主题。</h2>
          <p>核心范例负责建立完整结构，迁移练习负责替换人物、情景、主题与观点，补充素材则用于填补新题暴露出的具体表达缺口。</p>
          <div class="hero-actions">
            <button class="primary-button" data-action="open-example" data-id="${escapeHtml(nextExample?.id || "")}">继续背诵</button>
            <button class="secondary-button" data-action="go-view" data-view="practice">开始迁移</button>
          </div>
        </article>
        <div class="side-stack">
          <article class="panel">
            <div class="eyebrow">今日入口</div>
            <h3>${escapeHtml(nextExample?.titleZh || "暂无范例")}</h3>
            <p class="panel-subtitle">${escapeHtml(nextExample?.mainFunction || "")}</p>
            <div class="hero-actions"><button class="secondary-button" data-action="open-example" data-id="${escapeHtml(nextExample?.id || "")}">打开范例</button></div>
          </article>
          <article class="panel">
            <div class="eyebrow">数据规模</div>
            <h3>${coverage.length} 个覆盖单元</h3>
            <p class="panel-subtitle">由 ${examples.length} 个核心范例、${exercises.length} 道迁移练习和 ${materials.length} 条素材共同承载。</p>
          </article>
        </div>
      </div>
      <div class="stats-grid">
        ${statCard(examples.length, "核心范例")}
        ${statCard(learnedCount, "已掌握范例")}
        ${statCard(scoredCount, "已完成练习")}
        ${statCard(materials.length, "补充素材")}
      </div>
      <section class="section-block">
        <div class="section-head"><div><h2 class="section-title">常用提示词</h2><p>生成新数据文件并追加到项目中。</p></div><button class="secondary-button" data-action="go-view" data-view="prompts">查看全部</button></div>
        <div class="card-grid">${topPrompts.map(promptCard).join("")}</div>
      </section>
      <section class="section-block">
        <div class="section-head"><div><h2 class="section-title">推荐训练链</h2><p>每轮只完成一条清晰路径。</p></div></div>
        <div class="card-grid">
          ${flowCard("01", "完整背诵", "理解全文结构，标记每段与每句的功能。", "examples")}
          ${flowCard("02", "结构替换", "保留骨架，替换人物、主题、原因与例子。", "practice")}
          ${flowCard("03", "缺口补充", "只补充新题真正缺少的词组、动作与描述。", "materials")}
        </div>
      </section>`;
  }

  function statCard(value, label) { return `<article class="stat-card"><div class="stat-value">${value}</div><div class="stat-label">${label}</div></article>`; }
  function flowCard(no, title, text, view) { return `<article class="panel"><div class="eyebrow">STEP ${no}</div><h3>${title}</h3><p class="panel-subtitle">${text}</p><div class="hero-actions"><button class="secondary-button" data-action="go-view" data-view="${view}">进入</button></div></article>`; }

  function renderCoverage() {
    const filterButtons = [["all","全部"],["shared","共享"],["writing","写作"],["speaking","口语"]];
    const items = state.data.coverage.filter(item => state.coverageFilter === "all" || item.domain === state.coverageFilter);
    els.content.innerHTML = `
      <div class="toolbar">${filterButtons.map(([key,label]) => `<button class="chip-button ${state.coverageFilter === key ? "active" : ""}" data-action="coverage-filter" data-value="${key}">${label}</button>`).join("")}</div>
      <div class="coverage-grid">${items.map(item => {
        const linked = state.data.examples.filter(ex => (ex.coverageIds || []).includes(item.id));
        const learned = linked.filter(ex => progress.get().learned[ex.id]).length;
        const pct = linked.length ? Math.round(learned / linked.length * 100) : 0;
        return `<article class="coverage-card">
          <div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${domainLabel(item.domain)}</span><span class="badge">${escapeHtml(item.carrier)}</span></div>
          <h3>${escapeHtml(item.nameZh)}</h3><p>${escapeHtml(item.description)}</p>
          <details class="coverage-details"><summary>查看覆盖规划</summary>
            <div class="coverage-detail-group"><strong>子功能</strong><div class="tag-wrap">${(item.subFunctions || []).map(x => `<span class="badge">${escapeHtml(x)}</span>`).join("")}</div></div>
            <div class="coverage-detail-group"><strong>微观能力</strong><div class="tag-wrap">${(item.microFunctions || []).map(x => `<span class="badge">${escapeHtml(x)}</span>`).join("")}</div></div>
            <p>${escapeHtml(item.coverageNote || "")}</p>
          </details>
          <div class="coverage-meter"><div class="mini-progress-head"><span>${linked.length} 个范例</span><span>${pct}%</span></div><div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div></div>
          <div class="hero-actions">${linked.slice(0,4).map(ex => `<button class="chip-button" data-action="open-example" data-id="${ex.id}">${escapeHtml(ex.id)}</button>`).join("")}</div>
        </article>`;
      }).join("")}</div>`;
  }

  function renderExamples() {
    const { query, domain, format } = state.exampleFilter;
    const filtered = state.data.examples.filter(item => {
      const hay = `${item.id} ${item.titleZh} ${item.titleEn} ${item.mainFunction} ${(item.tags || []).join(" ")}`.toLowerCase();
      return (!query || hay.includes(query.toLowerCase())) && (domain === "all" || item.domain === domain) && (format === "all" || item.format === format);
    });
    if (!state.selectedExampleId || !filtered.some(x => x.id === state.selectedExampleId)) state.selectedExampleId = filtered[0]?.id || null;
    const selected = state.data.examples.find(item => item.id === state.selectedExampleId);
    els.content.innerHTML = `
      <div class="toolbar">
        <input class="search-input" id="exampleSearch" value="${escapeHtml(query)}" placeholder="搜索标题、功能或标签" />
        <select class="select-input" id="exampleDomain"><option value="all">全部场景</option><option value="shared" ${domain === "shared" ? "selected" : ""}>共享</option><option value="writing" ${domain === "writing" ? "selected" : ""}>写作</option><option value="speaking" ${domain === "speaking" ? "selected" : ""}>口语</option></select>
        <select class="select-input" id="exampleFormat"><option value="all">全部粒度</option><option value="article" ${format === "article" ? "selected" : ""}>完整文章</option><option value="answer" ${format === "answer" ? "selected" : ""}>完整回答</option><option value="paragraph" ${format === "paragraph" ? "selected" : ""}>功能段落</option><option value="snippet" ${format === "snippet" ? "selected" : ""}>短片段</option></select>
      </div>
      <div class="split-layout">
        <div class="list-column">${filtered.length ? filtered.map(exampleListCard).join("") : `<div class="empty-state">没有匹配的范例。</div>`}</div>
        ${selected ? exampleDetail(selected) : `<div class="empty-state">请选择一个范例。</div>`}
      </div>`;
  }

  function exampleListCard(item) {
    const p = progress.get();
    return `<article class="list-card ${state.selectedExampleId === item.id ? "active" : ""}" data-action="select-example" data-id="${item.id}">
      <div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${domainLabel(item.domain)}</span><span class="badge ${p.learned[item.id] ? "success" : ""}">${p.learned[item.id] ? "已掌握" : item.level}</span></div>
      <h3>${escapeHtml(item.titleZh)}</h3><p>${escapeHtml(item.mainFunction)}</p>
    </article>`;
  }

  function exampleDetail(item) {
    const p = progress.get();
    const breakdown = (item.breakdown || []).map(part => `<div class="breakdown-item"><strong>${escapeHtml(part.label)}</strong><p>${escapeHtml(part.explanation)}</p></div>`).join("");
    return `<article class="detail-card">
      <div class="detail-head"><div><div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${domainLabel(item.domain)}</span><span class="badge">${formatLabel(item.format)}</span><span class="badge">${escapeHtml(item.register)}</span></div><h2>${escapeHtml(item.titleZh)}</h2><p class="panel-subtitle">${escapeHtml(item.titleEn)}</p></div>
      <div class="detail-actions"><button class="secondary-button" data-action="toggle-star" data-id="${item.id}">${p.starred[item.id] ? "★ 已收藏" : "☆ 收藏"}</button><button class="primary-button" data-action="toggle-learned" data-id="${item.id}">${p.learned[item.id] ? "取消掌握" : "标记掌握"}</button></div></div>
      <section class="section-block"><div class="eyebrow">English</div><div class="article-text">${escapeHtml(item.english)}</div></section>
      <section class="section-block"><button class="secondary-button" data-action="toggle-translation">显示 / 隐藏中文</button><div class="translation-box hidden" id="translationBox">${escapeHtml(item.chinese)}</div></section>
      <section class="section-block"><div class="eyebrow">结构拆解</div><div class="breakdown-list">${breakdown}</div></section>
      <div class="info-grid">
        ${infoBox("可复用结构", item.reusablePatterns)}
        ${infoBox("主题限定素材", item.topicMaterial)}
        ${infoBox("迁移方向", item.transferDirections)}
        ${infoBox("覆盖功能", item.coverageIds)}
      </div>
      <section class="section-block"><div class="eyebrow">个人笔记</div><textarea class="textarea-input" id="exampleNote" data-id="${item.id}" placeholder="记录易忘表达、替换思路或自己的改写…">${escapeHtml(p.notes[item.id] || "")}</textarea></section>
    </article>`;
  }

  function infoBox(title, values = []) { return `<div class="info-box"><h4>${title}</h4><ul>${values.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>`; }

  function renderPractice() {
    const { skill, level } = state.exerciseFilter;
    const filtered = state.data.exercises.filter(item => (skill === "all" || item.skill === skill) && (level === "all" || String(item.level) === level));
    if (state.exerciseIndex >= filtered.length) state.exerciseIndex = 0;
    const item = filtered[state.exerciseIndex];
    const p = progress.get();
    els.content.innerHTML = `
      <div class="toolbar">
        <select class="select-input" id="exerciseSkill"><option value="all">全部能力</option><option value="writing" ${skill === "writing" ? "selected" : ""}>写作</option><option value="speaking" ${skill === "speaking" ? "selected" : ""}>口语</option><option value="shared" ${skill === "shared" ? "selected" : ""}>共享</option></select>
        <select class="select-input" id="exerciseLevel"><option value="all">全部难度</option><option value="1" ${level === "1" ? "selected" : ""}>基础替换</option><option value="2" ${level === "2" ? "selected" : ""}>结构迁移</option><option value="3" ${level === "3" ? "selected" : ""}>自由表达</option></select>
        <span class="badge">${filtered.length ? state.exerciseIndex + 1 : 0} / ${filtered.length}</span>
      </div>
      ${item ? `<article class="exercise-card">
        <div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${escapeHtml(item.type)}</span><span class="badge">难度 ${item.level}</span><span class="badge">来源 ${escapeHtml(item.sourceExampleId || "独立")}</span></div>
        <div class="exercise-prompt">${escapeHtml(item.promptZh)}</div>
        <div class="info-box"><h4>要求</h4><ul>${(item.constraints || []).map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
        <textarea class="textarea-input" id="exerciseAnswer" data-id="${item.id}" placeholder="在这里写下答案或口语提纲。本地内容不会上传。">${escapeHtml(p.answers[item.id] || "")}</textarea>
        <div class="prompt-actions"><button class="secondary-button" data-action="toggle-scaffold">${state.reveals.scaffold ? "隐藏结构提示" : "显示结构提示"}</button><button class="secondary-button" data-action="toggle-reference">${state.reveals.reference ? "隐藏参考答案" : "显示参考答案"}</button><button class="ghost-button" data-action="open-example" data-id="${escapeHtml(item.sourceExampleId || "")}">查看来源范例</button></div>
        ${state.reveals.scaffold ? `<div class="reveal-box"><strong>结构提示</strong>\n${escapeHtml(item.scaffold)}</div>` : ""}
        ${state.reveals.reference ? `<div class="reveal-box"><strong>参考表达</strong>\n${escapeHtml(item.referenceAnswer)}</div>` : ""}
        <div class="score-row">${[[0,"未完成"],[1,"困难"],[2,"基本完成"],[3,"独立完成"]].map(([v,l]) => `<button class="score-button" data-action="score-exercise" data-id="${item.id}" data-score="${v}">${l}</button>`).join("")}</div>
        <div class="exercise-nav"><button class="secondary-button" data-action="prev-exercise">上一题</button><button class="primary-button" data-action="next-exercise">下一题</button></div>
      </article>` : `<div class="empty-state">当前筛选下没有练习。</div>`}`;
  }

  function renderMaterials() {
    const { query, function: func, register } = state.materialFilter;
    const funcs = [...new Set(state.data.materials.map(x => x.function))].sort();
    const filtered = state.data.materials.filter(item => {
      const hay = `${item.english} ${item.chinese} ${item.function} ${(item.tags || []).join(" ")}`.toLowerCase();
      return (!query || hay.includes(query.toLowerCase())) && (func === "all" || item.function === func) && (register === "all" || item.register === register);
    });
    els.content.innerHTML = `
      <div class="toolbar">
        <input class="search-input" id="materialSearch" value="${escapeHtml(query)}" placeholder="搜索英文、中文、功能或主题" />
        <select class="select-input" id="materialFunction"><option value="all">全部功能</option>${funcs.map(x => `<option value="${escapeHtml(x)}" ${func === x ? "selected" : ""}>${escapeHtml(x)}</option>`).join("")}</select>
        <select class="select-input" id="materialRegister"><option value="all">全部语域</option><option value="spoken" ${register === "spoken" ? "selected" : ""}>口语</option><option value="neutral" ${register === "neutral" ? "selected" : ""}>通用</option><option value="formal" ${register === "formal" ? "selected" : ""}>正式</option></select>
      </div>
      <div class="material-grid">${filtered.map(item => `<article class="material-card">
        <div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${escapeHtml(item.function)}</span><span class="badge">${escapeHtml(item.register)}</span></div>
        <div class="material-english">${escapeHtml(item.english)}</div><div class="material-chinese">${escapeHtml(item.chinese)}</div>
        <div class="material-example">${escapeHtml(item.example)}</div>
        <div class="prompt-actions"><button class="secondary-button" data-action="copy-material" data-id="${item.id}">复制表达</button></div>
      </article>`).join("")}</div>`;
  }

  function renderPrompts() {
    const cats = [...new Set(state.data.prompts.map(x => x.category))];
    const filtered = state.data.prompts.filter(x => state.promptFilter === "all" || x.category === state.promptFilter);
    els.content.innerHTML = `
      <div class="toolbar"><button class="chip-button ${state.promptFilter === "all" ? "active" : ""}" data-action="prompt-filter" data-value="all">全部</button>${cats.map(x => `<button class="chip-button ${state.promptFilter === x ? "active" : ""}" data-action="prompt-filter" data-value="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div>
      <div class="card-grid">${filtered.map(promptCard).join("")}</div>`;
  }

  function promptCard(item) {
    return `<article class="prompt-card"><div class="badge-row"><span class="badge accent">${escapeHtml(item.id)}</span><span class="badge">${escapeHtml(item.category)}</span></div><h3>${escapeHtml(item.title)}</h3><p class="panel-subtitle">${escapeHtml(item.description)}</p><div class="prompt-preview">${escapeHtml(item.prompt)}</div><div class="prompt-actions"><button class="primary-button" data-action="copy-prompt" data-id="${item.id}">复制提示词</button><button class="secondary-button" data-action="expand-prompt" data-id="${item.id}">展开</button></div></article>`;
  }

  function renderSettings() {
    els.content.innerHTML = `
      <div class="settings-grid">
        <article class="setting-card"><h3>进度管理</h3><p>进度存储在当前浏览器的 localStorage 中，可导出备份或在另一设备导入。</p><div class="setting-actions"><button class="primary-button" data-action="export-progress">导出进度</button><button class="secondary-button" data-action="import-progress">导入进度</button><button class="ghost-button" data-action="reset-progress">清空进度</button></div></article>
        <article class="setting-card"><h3>追加数据</h3><p>新内容以 JSONL 文本文件保存。把文件放入 <span class="code-inline">data/</span>，再把文件名加入 <span class="code-inline">manifest.txt</span> 对应数组。</p><div class="setting-actions"><button class="primary-button" data-action="go-view" data-view="prompts">复制生成提示词</button></div></article>
        <article class="setting-card"><h3>主题替换</h3><p>所有颜色、圆角和阴影集中在 CSS 顶部变量。可使用主题提示词生成一份完整的 <span class="code-inline">styles.css</span> 替换文件。</p><div class="setting-actions"><button class="secondary-button" data-action="copy-theme-prompt">复制主题提示词</button><button class="ghost-button" data-action="toggle-theme">切换明暗</button></div></article>
        <article class="setting-card"><h3>本地运行</h3><p>直接双击 HTML 时浏览器可能阻止读取 txt。Windows 双击 <span class="code-inline">run_windows.bat</span>；macOS/Linux 运行 <span class="code-inline">run_mac_linux.sh</span>。</p></article>
      </div>`;
  }

  function domainLabel(domain) { return ({ shared: "共享", writing: "写作", speaking: "口语" })[domain] || domain; }
  function formatLabel(format) { return ({ article: "完整文章", answer: "完整回答", paragraph: "功能段落", snippet: "短片段" })[format] || format; }

  function bindViewEvents() {
    els.content.querySelectorAll("[data-action]").forEach(node => node.addEventListener("click", handleAction));
    const exampleSearch = document.getElementById("exampleSearch");
    if (exampleSearch) exampleSearch.addEventListener("input", e => {
      state.exampleFilter.query = e.target.value;
      renderExamples(); bindViewEvents(); restoreSearchFocus("exampleSearch");
    });
    const exampleDomain = document.getElementById("exampleDomain");
    if (exampleDomain) exampleDomain.addEventListener("change", e => { state.exampleFilter.domain = e.target.value; render(); });
    const exampleFormat = document.getElementById("exampleFormat");
    if (exampleFormat) exampleFormat.addEventListener("change", e => { state.exampleFilter.format = e.target.value; render(); });
    const exerciseSkill = document.getElementById("exerciseSkill");
    if (exerciseSkill) exerciseSkill.addEventListener("change", e => { state.exerciseFilter.skill = e.target.value; state.exerciseIndex = 0; render(); });
    const exerciseLevel = document.getElementById("exerciseLevel");
    if (exerciseLevel) exerciseLevel.addEventListener("change", e => { state.exerciseFilter.level = e.target.value; state.exerciseIndex = 0; render(); });
    const materialSearch = document.getElementById("materialSearch");
    if (materialSearch) materialSearch.addEventListener("input", e => {
      state.materialFilter.query = e.target.value;
      renderMaterials(); bindViewEvents(); restoreSearchFocus("materialSearch");
    });
    const materialFunction = document.getElementById("materialFunction");
    if (materialFunction) materialFunction.addEventListener("change", e => { state.materialFilter.function = e.target.value; render(); });
    const materialRegister = document.getElementById("materialRegister");
    if (materialRegister) materialRegister.addEventListener("change", e => { state.materialFilter.register = e.target.value; render(); });
    const note = document.getElementById("exampleNote");
    if (note) note.addEventListener("input", e => progress.note(e.target.dataset.id, e.target.value));
    const exerciseAnswer = document.getElementById("exerciseAnswer");
    if (exerciseAnswer) exerciseAnswer.addEventListener("input", e => progress.answer(e.target.dataset.id, e.target.value));
  }

  function restoreSearchFocus(id) {
    requestAnimationFrame(() => {
      const input = document.getElementById(id);
      if (!input) return;
      input.focus();
      const end = input.value.length;
      input.setSelectionRange(end, end);
    });
  }

  function handleAction(event) {
    const el = event.currentTarget;
    const action = el.dataset.action;
    if (action === "go-view") setView(el.dataset.view);
    if (action === "open-example") { if (!el.dataset.id) return; state.selectedExampleId = el.dataset.id; setView("examples"); }
    if (action === "select-example") { state.selectedExampleId = el.dataset.id; render(); }
    if (action === "coverage-filter") { state.coverageFilter = el.dataset.value; render(); }
    if (action === "toggle-translation") document.getElementById("translationBox")?.classList.toggle("hidden");
    if (action === "toggle-learned") { progress.toggleLearned(el.dataset.id); render(); }
    if (action === "toggle-star") { progress.toggleStar(el.dataset.id); render(); }
    if (action === "toggle-scaffold") { state.reveals.scaffold = !state.reveals.scaffold; render(); }
    if (action === "toggle-reference") { state.reveals.reference = !state.reveals.reference; render(); }
    if (action === "prev-exercise") { state.exerciseIndex = Math.max(0, state.exerciseIndex - 1); state.reveals = { scaffold:false, reference:false }; render(); }
    if (action === "next-exercise") { state.exerciseIndex += 1; state.reveals = { scaffold:false, reference:false }; render(); }
    if (action === "score-exercise") { progress.score(el.dataset.id, Number(el.dataset.score)); notify("练习结果已保存"); }
    if (action === "copy-material") { const item = state.data.materials.find(x => x.id === el.dataset.id); copyText(`${item.english}\n${item.chinese}\n${item.example}`, "表达"); }
    if (action === "copy-prompt") { const item = state.data.prompts.find(x => x.id === el.dataset.id); copyText(item.prompt, "提示词"); }
    if (action === "expand-prompt") { const item = state.data.prompts.find(x => x.id === el.dataset.id); el.closest(".prompt-card").querySelector(".prompt-preview").style.maxHeight = "none"; el.disabled = true; }
    if (action === "prompt-filter") { state.promptFilter = el.dataset.value; render(); }
    if (action === "export-progress") exportProgress();
    if (action === "import-progress") els.importProgressInput.click();
    if (action === "reset-progress") {
      if (el.dataset.confirm !== "true") {
        el.dataset.confirm = "true";
        el.textContent = "再次点击确认";
        notify("再次点击该按钮以清空全部本地进度", "error");
        setTimeout(() => { if (el.isConnected) { el.dataset.confirm = "false"; el.textContent = "清空进度"; } }, 5000);
      } else {
        localStorage.removeItem("expressionLabProgress");
        notify("进度已清空");
        render();
      }
    }
    if (action === "toggle-theme") toggleTheme();
    if (action === "copy-theme-prompt") { const item = state.data.prompts.find(x => x.id === "P-CSS-01"); if (item) copyText(item.prompt, "主题提示词"); }
  }

  function exportProgress() {
    const blob = new Blob([JSON.stringify(progress.get(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `expression-lab-progress-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url); notify("进度文件已导出");
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === "dark";
    document.documentElement.dataset.theme = dark ? "light" : "dark";
    localStorage.setItem("expressionLabTheme", dark ? "light" : "dark");
  }

  async function init() {
    document.querySelectorAll(".nav-item").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
    document.getElementById("openSidebar").addEventListener("click", () => els.sidebar.classList.add("open"));
    document.getElementById("closeSidebar").addEventListener("click", () => els.sidebar.classList.remove("open"));
    els.themeToggle.addEventListener("click", toggleTheme);
    els.continueButton.addEventListener("click", () => {
      const p = progress.get();
      const next = state.data?.examples.find(item => !p.learned[item.id]) || state.data?.examples[0];
      if (next) { state.selectedExampleId = next.id; setView("examples"); }
    });
    els.importProgressInput.addEventListener("change", async e => {
      const file = e.target.files[0]; if (!file) return;
      try { const parsed = JSON.parse(await file.text()); progress.set(parsed); notify("进度已导入"); render(); }
      catch { notify("进度文件格式无效", "error"); }
      e.target.value = "";
    });
    document.documentElement.dataset.theme = localStorage.getItem("expressionLabTheme") || "light";

    if (location.protocol === "file:") {
      els.content.innerHTML = `<div class="error-card"><h2>请通过本地服务器打开</h2><p>浏览器会阻止网页直接读取 txt 数据。Windows 请双击 <span class="code-inline">run_windows.bat</span>；macOS/Linux 请运行 <span class="code-inline">run_mac_linux.sh</span>。</p></div>`;
      return;
    }

    try {
      state.data = await window.ExpressionDataLoader.loadAllData();
      state.selectedExampleId = state.data.examples[0]?.id || null;
      updateProgressUI();
      render();
    } catch (error) {
      els.content.innerHTML = `<div class="error-card"><h2>数据载入失败</h2><p>${escapeHtml(error.message)}</p><p>请检查 <span class="code-inline">data/manifest.txt</span> 中的文件名和 JSONL 格式。</p></div>`;
    }
  }

  init();
})();
