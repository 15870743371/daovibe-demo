'use strict';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
let demo;
try {
  const saved = JSON.parse(localStorage.getItem(DEMO_STORE));
  demo = saved?.schema === DEMO_SCHEMA ? saved : makeSeed();
} catch {
  demo = makeSeed();
}
let route = { page: 'projects', id: '' };
let taskTab = 'chat';
let projectTab = 'tasks';
let projectView = 'cards';
let filters = {};
let selectedFlows = [];
let selectedReportId = '';
let toastTimer;
let returnFocus;
let attachmentDraft = [];
const titles = { home: '工作台', teams: '团队', projects: '项目', project: '项目总览', task: '任务会话', knowledge: '知识库', skills: '知识库', credentials: '凭证管理', management: '项目管理', 'manage-tasks': '任务管理', flows: 'Flow 执行记录', logs: '日志分析', accept: '交付验收' };
const designIds = {
  home: 'Y2609-039、N2026-023', teams: 'Y2609-007、Y2609-038、N2026-002',
  projects: 'Y2609-021、022、025、026', project: 'Y2609-026、027、039、040；N2026-006、023',
  task: 'Y2609-041、054、055～059、065、067；N2026-006、007、010、020',
  knowledge: 'N2026-013、014、015、016', skills: 'Y2609-014；N2026-016',
  credentials: 'N2026-017', management: 'Y2609-023；N2026-005',
  'manage-tasks': 'Y2609-041；N2026-005、020', flows: 'Y2609-041；N2026-006、020',
  logs: 'Y2609-041；N2026-020', accept: 'Y2609-053、065、067、044、045；N2026-021、022、024'
};

function now() { return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai' }).slice(0, 16); }
function uid(prefix) { demo.nextId += 1; return `${prefix}-${demo.nextId}`; }
function save() {
  try { localStorage.setItem(DEMO_STORE, JSON.stringify(demo)); }
  catch { toast('浏览器存储不可用或已满，当前操作仍可在本次页面中演示。'); }
}
function toast(text) {
  $('#toast').textContent = text;
  $('#toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}
function button(label, action, kind = '', disabled = false, extra = '') {
  return `<button class="${kind}" data-action="${esc(action)}" ${disabled ? 'disabled' : ''} ${extra}>${label}</button>`;
}
function badge(text) {
  let color = '';
  if (/失败|不通过|不可用|退回|清理失败/.test(text)) color = 'red';
  else if (/已确认|通过|可预览|生效|已关闭|启用|已配置|在用|本轮已完成|成功/.test(text)) color = 'teal';
  else if (/执行中|进行中|测试中|验收中/.test(text)) color = 'blue';
  else if (/待|未|暂停|草稿|已归档|清理中/.test(text)) color = 'amber';
  return `<span class="badge ${color}">${esc(text)}</span>`;
}
function head(title, description, actions = '', eyebrow = '') {
  return `<div class="page-head"><div>${eyebrow ? `<div class="eyebrow">${eyebrow}</div>` : ''}<h1>${esc(title)}</h1><div class="sub">${esc(description)}</div></div><div class="actions">${actions}</div></div>`;
}
function metric(label, value, note, action = '') {
  const element = action ? 'button' : 'div';
  return `<${element} class="panel metric" ${action ? `data-action="${esc(action)}"` : ''}><div class="sub">${label}</div><div class="metric-number">${value}</div><div class="sub">${note}</div></${element}>`;
}
function empty(title, description, action = '') {
  return `<div class="empty"><span class="empty-symbol">▤</span><strong>${title}</strong><p class="sub">${description}</p>${action}</div>`;
}
function table(headers, rows, emptyContent = '') {
  return `<div class="table-wrap"><table><thead><tr>${headers.map(text => `<th>${text}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>${rows.length ? '' : emptyContent}</div>`;
}
function row(cells) { return `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`; }
function tabs(items, current, prefix) {
  return `<div class="tabs">${items.map(([key, label]) => button(label, `${prefix}:${key}`, `tab ${key === current ? 'active' : ''}`, false, key === current ? 'aria-current="page"' : '')).join('')}</div>`;
}
function field(label, id, value = '', options = {}) {
  const required = options.required ? '<span class="required">*</span>' : '';
  const common = `id="${id}" ${options.required ? 'aria-required="true"' : ''} ${options.disabled ? 'disabled' : ''}`;
  let control = `<input ${common} type="${options.type || 'text'}" value="${esc(value)}" ${options.max ? `maxlength="${options.max}"` : ''} autocomplete="off" ${options.placeholder ? `placeholder="${esc(options.placeholder)}"` : ''}>`;
  if (options.textarea) control = `<textarea ${common} ${options.max ? `maxlength="${options.max}"` : ''}>${esc(value)}</textarea>`;
  if (options.choices) control = `<select ${common}>${options.choices.map(choice => {
    const [key, title] = Array.isArray(choice) ? choice : [choice, choice];
    return `<option value="${esc(key)}" ${key === value ? 'selected' : ''}>${esc(title)}</option>`;
  }).join('')}</select>`;
  return `<div class="field"><label for="${id}">${required}${label}</label>${control}${options.help ? `<small>${options.help}</small>` : ''}<div class="field-error" id="${id}-error"></div></div>`;
}
function filterInput(name, placeholder) { return `<input data-filter="${name}" aria-label="${placeholder}" placeholder="${placeholder}" value="${esc(filters[name] || '')}">`; }
function filterSelect(name, choices) { return `<select data-filter="${name}" aria-label="${choices[0]}">${choices.map(choice => `<option ${choice === (filters[name] || choices[0]) ? 'selected' : ''}>${esc(choice)}</option>`).join('')}</select>`; }
function readOnly() { return demo.role === '只读成员'; }
function projectById(id) { return demo.projects.find(project => project.id === id); }
function currentProject() { return projectById(demo.selectedProject); }
function currentTask() { return demo.tasks.find(task => task.id === demo.selectedTask); }
function projectTasks(id, includeArchived = false) { return demo.tasks.filter(task => task.projectId === id && (includeArchived || task.lifecycle === '在用')); }
function locked(task = currentTask()) { return readOnly() || !task || task.lifecycle !== '在用' || projectById(task.projectId)?.lifecycle !== '在用'; }
function projectLocked(project = currentProject()) { return readOnly() || !project || project.lifecycle !== '在用'; }
function event(target, text) {
  const entry = { text, time: now() };
  target.events.unshift(entry);
  target.updated = entry.time;
  demo.events.unshift({ ...entry, projectId: target.projectId || target.id, taskId: target.projectId ? target.id : '' });
}
function timeline(entries) {
  return entries.length ? `<div class="timeline">${entries.slice(0, 30).map(entry => `<p>${esc(entry.text)}<br><span class="sub">${entry.time} · 本地演示</span></p>`).join('')}</div>` : '<p class="sub">暂无新增动态</p>';
}
function isBlocked(task) { return task.round === '失败' || task.baselineState !== '已确认' || task.web === '不可用' || task.test === '不通过'; }
function canUseResource(resource, project) {
  if (resource.scope === '平台' || resource.scope === '租户') return true;
  if (resource.scope === '团队') return resource.team === project.team;
  return resource.projectId === project.id;
}
function canUseCredential(credential, project) {
  return credential.status === '启用' && credential.configured && (credential.scope === '当前租户' || credential.projectId === project.id);
}
function stageOf(task) {
  if (task.round === '执行中') return '执行中';
  if (task.accept === '通过') return '已关闭';
  if (task.test === '通过') return '待验收';
  if (['待测试', '不通过', '阻塞'].includes(task.test)) return '待测试';
  return task.stage;
}
function go(path) {
  closeModal();
  const hash = `#/${path}`;
  if (location.hash === hash) navigate();
  else location.hash = hash;
}
function navigate() {
  const [page = 'projects', id = ''] = location.hash.replace(/^#\/?/, '').split('/');
  route = { page: titles[page] ? page : 'projects', id };
  if (['project', 'manage-tasks'].includes(route.page)) demo.selectedProject = id;
  if (['task', 'accept', 'flows', 'logs'].includes(route.page)) {
    demo.selectedTask = id;
    const task = currentTask();
    if (task) demo.selectedProject = task.projectId;
  }
  filters = {};
  selectedFlows = [];
  selectedReportId = '';
  if (route.page === 'logs' && currentTask()) selectedFlows = currentTask().runs.filter(run => run.status !== '执行中').slice(0, 3).map(run => run.id);
  attachmentDraft = ['task', 'accept', 'flows', 'logs'].includes(route.page) ? currentTask()?.attachments || [] : [];
  closeModal();
  render();
  window.scrollTo(0, 0);
}
function shell(content) {
  const active = ['project', 'task', 'accept'].includes(route.page) ? 'projects' : ['manage-tasks', 'flows', 'logs'].includes(route.page) ? 'management' : route.page === 'skills' ? 'knowledge' : route.page;
  const nav = [['home', '◫', '工作台'], ['teams', '♙', '团队'], ['projects', '▦', '项目'], ['knowledge', '▤', '知识库'], ['credentials', '♧', '凭证管理'], ['management', '▱', '项目管理']];
  return `<aside class="sidebar"><div class="brand"><span class="brand-mark">D</span><span class="brand-name">DaoVibe</span></div><div class="nav-label">工作空间</div>${nav.map(([key, icon, label], index) => `${index === 4 ? '<div class="nav-label">管理后台</div>' : ''}<button class="nav ${active === key ? 'active' : ''}" data-action="go:${key}" aria-label="${label}" ${active === key ? 'aria-current="page"' : ''}><span class="nav-icon">${icon}</span><span class="nav-text">${label}</span></button>`).join('')}<div class="side-bottom"><div class="actions"><span class="avatar">海</span><div>海鹚交付空间<div class="sub">default · 演示租户</div></div></div></div></aside><div class="main"><header class="topbar"><div class="crumb">${button(demo.navCollapsed ? '☰' : '☷', 'toggle-nav', 'quiet small', false, 'aria-label="切换左侧菜单"')}<span>工作空间</span><span>/</span><strong>${titles[route.page]}</strong></div><div class="top-actions"><span class="prototype">交互原型 V0.3 · 本地演示</span>${button('评审说明', 'design', 'quiet small')}<select id="role" class="role" aria-label="演示角色">${['产品经理', '测试人员', '只读成员'].map(role => `<option ${role === demo.role ? 'selected' : ''}>${role}</option>`).join('')}</select><span class="avatar">陈</span><span class="user-name sub">陈敏</span></div></header><main class="content">${content}<footer class="footer"><span>DaoVibe V0.3 · 设计建议与演示数据 · 操作仅保存在本浏览器</span>${button('重置演示', 'reset', 'quiet small')}</footer></main></div>`;
}

function homePage() {
  const tasks = demo.tasks.filter(task => task.lifecycle === '在用' && projectById(task.projectId)?.lifecycle === '在用');
  return head('工作台', '聚焦需要确认、处理异常和验收的事项。', button('查看全部项目 →', 'go:projects', 'primary'), 'DELIVERY WORKSPACE') +
    `<div class="metrics">${metric('在用项目', demo.projects.filter(project => project.lifecycle === '在用').length, '项目空间与协作入口', 'go:projects')}${metric('待确认需求', tasks.filter(task => task.baselineState !== '已确认').length, '补齐目标、边界与验收依据')}${metric('执行异常', tasks.filter(task => task.round === '失败').length, '轮次失败与产物分别核对')}${metric('待业务验收', tasks.filter(task => task.test === '通过' && task.accept !== '通过').length, '基于固定候选版本')}</div><div class="grid two-col"><section class="panel"><div class="panel-head"><h2>待我处理</h2><span class="sub">来自当前演示项目</span></div>${table(['任务', '当前关注', '负责人', '操作'], tasks.filter(task => task.baselineState !== '已确认' || task.round === '失败' || task.test === '通过' && task.accept !== '通过').map(task => row([`<strong>${esc(task.name)}</strong><span class="sub">${esc(projectById(task.projectId).name)} · ${task.id}</span>`, badge(task.round === '失败' ? '执行异常' : task.baselineState !== '已确认' ? '需求待确认' : '待业务验收'), esc(task.owner), button('进入处理 →', `go:${task.test === '通过' ? 'accept' : 'task'}/${task.id}`, 'link')])) , empty('暂无待处理事项', '可进入项目继续协作。'))}</section><section class="panel"><div class="panel-head"><h2>最近动态</h2></div><div class="pad">${timeline(demo.events.length ? demo.events : [{ text: '体检服务候选版本已生成，等待测试', time: '2026-11-18 10:42' }, { text: '报告查询测试通过，等待业务验收', time: '2026-11-17 16:30' }])}</div></section></div>`;
}

function projectsPage() {
  const visible = demo.projects.filter(project => project.lifecycle === '在用');
  const list = visible.filter(project => (!filters.query || (project.name + project.id + project.owner).toLowerCase().includes(filters.query.toLowerCase())) && (!filters.team || filters.team === '全部团队' || project.team === filters.team) && (!filters.status || filters.status === '全部项目状态' || project.status === filters.status)).sort((a, b) => b.updated.localeCompare(a.updated));
  const tasks = demo.tasks.filter(task => task.lifecycle === '在用' && visible.some(project => project.id === task.projectId));
  return head('项目', '从项目空间进入任务协作，查看需求、执行与交付状态。', button('＋ 新建项目', 'project-new', 'primary', readOnly()), 'PROJECTS') +
    `<div class="metrics">${metric('在用项目', visible.length, '已归档项目可在项目管理中恢复')}${metric('进行中的任务', tasks.filter(task => stageOf(task) !== '已关闭').length, '按任务阶段统计')}${metric('需要关注', tasks.filter(isBlocked).length, '需求待确认或执行、产物异常')}${metric('待业务验收', tasks.filter(task => stageOf(task) === '待验收').length, '测试通过后逐项确认')}</div><div class="toolbar projects-toolbar">${filterInput('query', '搜索项目名称、编号或负责人')}${filterSelect('team', ['全部团队', ...TEAMS])}${filterSelect('status', ['全部项目状态', '未开始', '进行中', '已暂停', '已结束'])}${button('重置', 'clear-filters', 'quiet small')}<div class="push actions"><span class="sub">${list.length} 个项目</span><div class="segmented">${button('卡片', 'view:cards', projectView === 'cards' ? 'active' : '')}${button('列表', 'view:list', projectView === 'list' ? 'active' : '')}</div></div></div>` +
    (list.length ? projectView === 'cards' ? `<div class="project-grid">${list.map(projectCard).join('')}</div>` : `<section class="panel">${table(['项目', '所属团队 / 负责人', '项目状态', '任务 / 验收', '操作'], list.map(project => row([`<strong>${button(esc(project.name), `go:project/${project.id}`, 'link project-name')}</strong><div class="sub">${project.id} · ${esc(project.agent)}</div>`, `${esc(project.team)}<div class="sub">${project.owner}</div>`, badge(project.status), `${projectTasks(project.id).length} 项任务 · ${projectTasks(project.id).filter(task => task.accept === '通过').length} 项验收通过`, `<div class="actions">${button('进入项目', `go:project/${project.id}`, 'link')}${button('更多', `project-menu:${project.id}`, 'quiet small')}</div>`])))}</section>` : `<section class="panel">${empty('没有匹配的项目', '调整关键词或筛选条件后重试。', button('清空筛选', 'clear-filters'))}</section>`);
}
function projectCard(project) {
  const tasks = projectTasks(project.id);
  const accepted = tasks.filter(task => task.accept === '通过').length;
  return `<article class="panel project-card"><div class="card-body"><div class="card-heading"><span class="project-symbol">▦</span><div class="grow">${button(esc(project.name), `go:project/${project.id}`, 'link project-name')}<div class="sub">${project.id}</div></div>${button('⋯', `project-menu:${project.id}`, 'quiet small', false, `aria-label="${esc(project.name)}的更多操作"`)}</div><div class="actions">${badge(project.status)}<span class="sub">${project.industry === '医疗' ? '医疗试点' : '通用场景'}</span></div><p class="card-desc">${esc(project.description || '尚未填写项目描述。')}</p><span class="badge">${esc(project.agent)}</span><div class="card-info"><span>${tasks.length} 项任务</span><span class="sub">业务验收 ${accepted} / ${tasks.length}</span></div><div class="progress"><i style="width:${tasks.length ? accepted / tasks.length * 100 : 0}%"></i></div><div class="card-info"><div class="actions"><span class="avatar">${project.owner.slice(0, 1)}</span><span class="sub">${esc(project.owner)}</span></div><span class="sub">${esc(project.team)}</span></div></div><div class="card-foot"><span>更新于 ${project.updated.slice(5)}</span>${button('进入项目 →', `go:project/${project.id}`, 'link')}</div></article>`;
}
function taskRows(tasks, management = false) {
  return tasks.map(task => row([
    `<strong>${button(esc(task.name), `go:task/${task.id}`, 'link project-name')}</strong><div class="sub">${task.id} · 更新于 ${task.updated}</div>`,
    esc(task.owner), badge(stageOf(task)), badge(task.round), management ? badge(task.lifecycle) : `${badge(task.web)}<div class="sub">${task.version || '候选版本未固定'}</div>`,
    management ? `<div class="actions">${button('查看 Flow', `go:flows/${task.id}`, 'link')}${button('分析日志', `go:logs/${task.id}`, 'link')}${['清理中', '清理失败'].includes(task.lifecycle) ? button(task.lifecycle === '清理中' ? '清理进度' : '重试清理', `cleanup:task:${task.id}`, 'link danger') : button(task.lifecycle === '已归档' ? '恢复' : '归档', `task-archive:${task.id}`, 'link', readOnly() || currentProject()?.lifecycle !== '在用') + button('彻底删除', `task-delete:${task.id}`, 'link danger', readOnly() || currentProject()?.lifecycle !== '在用')}</div>` : `${badge(task.test)}<div class="sub">验收 ${task.accept}</div>`,
    ...(management ? [] : [badge(task.priority), `<div class="actions">${button('会话', `go:task/${task.id}`, 'link')}${button('验收', `go:accept/${task.id}`, 'link')}${button('⋯', `task-menu:${task.id}`, 'quiet small')}</div>`])
  ]));
}
function projectPage() {
  const project = currentProject();
  const tasks = projectTasks(project.id);
  const list = tasks.filter(task => (!filters.query || (task.name + task.id + task.owner).includes(filters.query)) && (!filters.stage || filters.stage === '全部任务阶段' || filters.stage === '当前阻塞' && isBlocked(task) || stageOf(task) === filters.stage) && (!filters.owner || filters.owner === '全部负责人' || task.owner === filters.owner));
  return head(project.name, `${project.id} / ${project.team} / 负责人 ${project.owner}`, button('返回项目', 'go:projects') + button('项目操作', `project-menu:${project.id}`) + button('＋ 新建任务', 'task-new', 'primary', projectLocked()), project.industry === '医疗' ? 'PROJECT / 医疗试点样例' : 'PROJECT / 通用场景') +
    (project.lifecycle !== '在用' ? `<div class="notice amber gap">项目${project.lifecycle}，可查看历史记录；恢复入口位于项目管理。</div>` : '') +
    `<section class="panel"><div class="summary"><div><span class="label">项目状态 · 人工维护</span>${badge(project.status)}</div><div><span class="label">执行助手</span>${esc(project.agent)}</div><div><span class="label">业务验收</span>${tasks.filter(task => task.accept === '通过').length} / ${tasks.length} 项通过</div><div><span class="label">项目生命周期</span>${badge(project.lifecycle)}</div></div></section><div class="metrics gap">${metric('任务总数', tasks.length, '查看全部任务 ↗', 'task-filter:全部任务阶段')}${metric('待测试', tasks.filter(task => stageOf(task) === '待测试').length, '固定候选版本后提交 ↗', 'task-filter:待测试')}${metric('待验收', tasks.filter(task => stageOf(task) === '待验收').length, '业务方逐项核对 ↗', 'task-filter:待验收')}${metric('当前阻塞', tasks.filter(isBlocked).length, '需求、执行或产物异常 ↗', 'task-filter:当前阻塞')}</div><section class="panel">${tabs([['tasks', `任务 ${tasks.length}`], ['context', '项目上下文'], ['events', '项目动态']], projectTab, 'project-tab')}${projectTab === 'tasks' ? `<div class="toolbar">${filterInput('query', '搜索任务标题、编号或负责人')}${filterSelect('stage', ['全部任务阶段', ...STAGES, '当前阻塞'])}${filterSelect('owner', ['全部负责人', ...PEOPLE])}${button('重置', 'clear-filters', 'quiet small')}<span class="push sub">${list.length} 个结果</span></div>${table(['任务', '负责人', '任务阶段', '最近 Agent 轮次', '候选产物', '测试 / 业务验收', '优先级', '操作'], taskRows(list), empty('没有匹配的任务', '可调整筛选或创建本地演示任务。', button('清空筛选', 'clear-filters')))}<div class="table-foot"><span>任务阶段、Agent 轮次、产物、测试、业务验收和发布分别记录。</span>${button('管理归档任务 →', `go:manage-tasks/${project.id}`, 'link')}</div>` : projectTab === 'context' ? `<div class="pad"><div class="grid half"><div class="version-box"><span class="label">项目目标与范围</span><p>${esc(project.description || '待补充')}</p>${button('编辑项目信息', `project-edit:${project.id}`, 'link small', projectLocked())}</div><div class="version-box"><span class="label">知识与环境</span><p>任务引用按版本保存，凭证按范围授权。</p><div class="actions">${button('查看知识库', 'go:knowledge', 'link')}${button('查看凭证', 'go:credentials', 'link')}</div></div></div></div>` : `<div class="pad">${timeline([...project.events, ...demo.events.filter(entry => entry.projectId === project.id && entry.taskId)].sort((a, b) => b.time.localeCompare(a.time)))}</div>`}</section>`;
}

function taskPage() {
  const task = currentTask();
  const project = projectById(task.projectId);
  return head(task.name, `${project.name} / ${task.id} / 负责人 ${task.owner}`, button('返回项目', `go:project/${project.id}`) + button(demo.inspectorHidden ? '展开项目面板' : '收起项目面板', 'toggle-inspector') + button('交付验收 →', `go:accept/${task.id}`, 'primary'), 'TASK WORKSPACE') +
    `<section class="panel task-summary"><div class="summary"><div><span class="label">任务阶段</span>${badge(stageOf(task))}</div><div><span class="label">最近 Agent 轮次</span>${badge(task.round)}</div><div><span class="label">需求基线</span>PRD 1.${task.baseline} ${badge(task.baselineState)}</div><div><span class="label">测试</span>${badge(task.test)}</div><div><span class="label">业务验收 / 发布</span>${badge(task.accept)} ${badge(task.release)}</div></div></section>` +
    (locked(task) ? '<div class="notice amber" style="margin-bottom:18px">当前为只读角色或归档记录，可查看会话、产物和历史。</div>' : '') +
    `<div class="task-workspace"><section class="panel chat-panel">${tabs([['chat', '任务会话'], ['context', '需求与引用上下文'], ['run', '执行记录'], ['events', '决策与动态']], taskTab, 'task-tab')}<div class="chat-scroll" id="chat-scroll">${taskTab === 'chat' ? chatContent(task) : taskTab === 'context' ? contextContent(task) : taskTab === 'run' ? runContent(task) : timeline(task.events)}</div>${taskTab === 'chat' ? composer(task) : ''}</section><aside class="inspector"><section class="panel"><div class="panel-head"><h2>项目面板</h2><span class="sub">当前候选产物</span></div><div class="resource"><span class="label">固定候选版本</span><strong class="mono">${esc(task.version || '尚未生成')}</strong><div class="sub">需求 PRD 1.${task.baseline} · Mock 沙箱</div>${button('更换版本', 'version-change', 'link small', locked(task) || task.round === '执行中')}</div>${artifactCard(task, 'web', 'PC 管理端', 'Web')}${artifactCard(task, 'mini', '患者端', '小程序') }<div class="resource"><div class="resource-head"><strong>后台服务 / 需求文档</strong>${badge(task.version ? '已登记' : '未提供')}</div><div class="sub">与当前候选版本关联的演示目录</div>${button('查看产物目录', 'artifact-directory', 'link small')}</div></section><section class="panel gap"><div class="panel-head"><h2>测试与交付</h2></div><div class="resource">${badge(task.test)}<div class="sub">${esc(task.testEvidence || '尚未登记独立测试报告')}</div><div class="actions">${button('提交测试', 'test-submit', 'primary small', locked(task) || task.round === '执行中')}${button('登记结果', 'test-result', 'small', locked(task) || task.test === '未提交' || task.round === '执行中')}</div></div><div class="resource"><div class="resource-head"><strong>业务验收</strong>${badge(task.accept)}</div><div class="sub">${task.checks.filter(check => check.result === '通过').length} / ${task.checks.length} 项通过 · 发布独立记录</div><div class="actions">${button('进入验收工作区 →', `go:accept/${task.id}`, 'link small')}</div></div></section></aside></div>`;
}
function chatContent(task) {
  return `${task.round === '失败' ? `<div class="notice red" style="margin-bottom:20px"><strong>本轮执行失败，已有产物仍可单独核查</strong>请查看失败原因与上下文后决定是否重试。${button('查看 Flow', `go:flows/${task.id}`, 'link small')}</div>` : ''}${task.messages.length ? task.messages.map(message => `<div class="message ${message.role}"><span class="avatar">${message.role === 'user' ? '陈' : 'AI'}</span><div class="bubble"><div class="bubble-head"><strong>${message.role === 'user' ? '陈敏' : esc(projectById(task.projectId).agent)}</strong><span class="sub">${message.time}</span></div>${(message.files || []).map(name => `<span class="attachment">▧ ${esc(name)}</span>`).join('')}<p>${esc(message.text)}</p>${message.role === 'agent' ? '<div class="sub">本地模拟回复 · 测试与业务验收另行确认</div>' : ''}</div></div>`).join('') : empty('开始本任务的协作', '先明确需求与引用上下文，再开始一轮本地模拟执行。', button('查看需求与上下文', 'task-tab:context'))}${task.round === '执行中' ? `<div class="notice"><strong>模拟执行中</strong>本轮上下文已固定，下一步可模拟完成或停止。<div class="actions gap">${button('完成本轮（模拟）', 'run-complete', 'primary small', locked(task))}${button('停止本轮', 'run-stop', 'small', locked(task))}</div></div>` : ''}`;
}
function composer(task) {
  return `<div class="composer"><textarea id="message" aria-label="任务消息" placeholder="描述需求、补充说明或待澄清问题。Enter 发送，Shift+Enter 换行。" maxlength="150000" ${locked(task) || task.round === '执行中' ? 'disabled' : ''}>${esc(task.draft)}</textarea><div id="attachments">${attachmentDraft.map(file => `<span class="attachment">${esc(file.name)} ${button('×', `attachment-remove:${file.name}`, 'quiet small')}</span>`).join('')}</div><div class="actions">${button('＋ 附件', 'attach', 'quiet small', locked(task) || task.round === '执行中')}${button('引用知识 / Skill', 'refs', 'quiet small', locked(task) || task.round === '执行中')}<span id="message-count" class="sub push">${task.draft.length.toLocaleString()} / 150,000</span>${button('仅记录消息', 'message-note', 'small', locked(task) || task.round === '执行中')}${button('发送并模拟执行 ↑', 'send', 'primary small', locked(task) || task.round === '执行中' || (!task.draft.trim() && !attachmentDraft.length))}</div></div>`;
}
function contextContent(task) {
  return `<div class="context-card"><div class="resource-head"><h3>需求基线 · PRD 1.${task.baseline}</h3>${badge(task.baselineState)}</div><p>${esc(task.goal)}</p><div class="sub">验收依据与候选版本逐项关联。${task.industry === '医疗' ? '本任务为医疗试点样例，HIS 等行业接口需另行核验。' : '本任务为通用软件业务样例。'}</div><div class="actions">${button('查看 / 确认需求', 'baseline', 'small', locked(task))}${button('提出变更', 'baseline-change', 'link small', locked(task) || task.round === '执行中')}</div></div><div class="context-card"><div class="resource-head"><h3>引用资源</h3>${button('关联资源', 'refs', 'small', locked(task) || task.round === '执行中')}</div>${task.refs.length ? task.refs.map(ref => `<p>${badge(ref.kind)} <strong>${esc(ref.name)}</strong> · V${ref.version}<br><span class="sub">${ref.source} · 固定版本快照</span></p>`).join('') : '<p>未记录引用。可人工关联生效版本，并随轮次保留快照。</p>'}<div class="notice">人工关联与 Agent 实际使用证据分别记录，原型仅演示关联快照。</div></div><div class="context-card"><h3>执行凭证</h3><p>${esc(demo.credentials.find(credential => credential.id === task.credentialId)?.name || '未绑定')} · 按项目范围筛选</p>${button('绑定凭证', 'bind-credential', 'small', locked(task) || task.round === '执行中')}</div>`;
}
function runContent(task) {
  return `${task.round === '执行中' ? `<div class="notice"><strong>本轮模拟执行中</strong><div class="actions">${button('完成本轮（模拟）', 'run-complete', 'primary small', locked(task))}${button('停止本轮', 'run-stop', 'small', locked(task))}</div></div>` : ''}<div class="context-card"><h3>执行过程与业务结果</h3><p>Flow 记录每轮执行状态和引用快照，产物生成后需独立测试与业务验收。</p><div class="actions">${button('完整 Flow 列表', `go:flows/${task.id}`, 'small')}${button('日志分析', `go:logs/${task.id}`, 'small')}${button('重试本轮', 'run-retry', 'primary small', locked(task) || task.round !== '失败')}</div></div>${task.runs.map(run => `<div class="context-card"><div class="resource-head"><strong>${run.id}</strong>${badge(run.status)}</div><p>${esc(run.reason)} · ${run.duration}</p><div class="sub">${run.time} · PRD 1.${run.baseline} · ${esc(run.version || '尚无候选版本')}</div></div>`).join('')}`;
}
function artifactCard(task, key, title, type) {
  const status = task[key];
  return `<div class="resource"><div class="resource-head"><strong>${title}</strong><span class="badge">${type}</span></div><p>${badge(status)}</p><div class="sub">${key === 'web' ? 'web-app · 当前候选版本' : 'mini-app · 二维码与真机验收分别记录'}</div><div class="actions">${button(key === 'web' ? '打开预览' : '查看二维码', `preview:${key}`, 'small', key === 'web' ? status !== '可预览' : !status.startsWith('已生成'))}${button('复制地址', `copy-preview:${key}`, 'small', !task.version || key === 'mini' && !status.startsWith('已生成'))}</div><div class="actions">${button(key === 'web' ? status === '可预览' ? '模拟预览异常' : '准备 / 恢复预览' : '重新生成预览记录', `preview-prepare:${key}`, 'link small', locked(task) || !task.version || task.round === '执行中')}</div></div>`;
}

function knowledgePage() {
  const kind = route.page === 'skills' ? 'Skill' : '文档';
  const list = demo.knowledge.filter(resource => resource.kind === kind && (!filters.query || (resource.name + resource.body).includes(filters.query)) && (!filters.scope || filters.scope === '全部知识范围' || resource.scope === filters.scope) && (!filters.status || filters.status === '全部状态' || resource.status === filters.status) && (!filters.team || filters.team === '全部团队' || resource.team === filters.team) && (!filters.project || filters.project === '全部项目' || resource.projectId === demo.projects.find(project => project.name === filters.project)?.id) && (!filters.type || filters.type === '全部类型' || resource.type === filters.type));
  return head('知识库', '按归属范围管理文档与 Skill，保留生效版本和任务引用依据。', button(kind === 'Skill' ? '＋ 新建 Skill' : '↑ 上传文档', kind === 'Skill' ? 'skill-new' : 'knowledge-upload', 'primary', readOnly()), 'KNOWLEDGE LIBRARY') +
    `<div class="toolbar projects-toolbar">${filterSelect('scope', ['全部知识范围', '平台', '租户', '团队', '项目'])}${filterSelect('team', ['全部团队', ...TEAMS])}${filterSelect('project', ['全部项目', ...demo.projects.map(project => project.name)])}${filterSelect('status', ['全部状态', '草稿', '待审核', '生效', '已归档'])}${button('重置', 'clear-filters', 'quiet small')}</div><div class="notice" style="margin-bottom:20px">仅显示当前演示范围内的资源。新内容经审核生效后，可在适用项目中人工关联；历史轮次保留原版本。</div><section class="panel knowledge-panel">${tabs([['knowledge', '文档'], ['skills', 'Skill']], route.page, 'go')}<div class="toolbar">${filterInput('query', kind === 'Skill' ? '搜索 Skill 名称或正文' : '搜索文档名称或摘要')}${filterSelect('type', ['全部类型', ...KNOWLEDGE_TYPES])}<span class="sub push">${list.length} 个结果</span></div>${table([kind === 'Skill' ? 'Skill / 适用边界' : '文档 / 摘要', '知识归属', '类型 / 标签', '版本', '状态', '更新时间', '操作'], list.map(resource => row([`<strong>${esc(resource.name)}</strong><div class="sub">${esc((resource.boundary || resource.body).slice(0, 48))}</div>`, `${resource.scope}${resource.scope === '团队' ? `<div class="sub">${esc(resource.team)}</div>` : resource.scope === '项目' ? `<div class="sub">${esc(projectById(resource.projectId)?.name || '历史项目')}</div>` : ''}`, resource.kind === 'Skill' ? `${esc(resource.domain)}<div class="sub">${esc(resource.ability)} · ${esc(resource.phase)}</div>` : resource.type, `V${resource.version}`, badge(resource.status), resource.updated, `<div class="actions">${button('详情', `resource:${resource.id}`, 'link')}${button(resource.status === '生效' ? '新版本' : '编辑', `resource-edit:${resource.id}`, 'link', readOnly() || resource.scope === '平台' || resource.status === '已归档')}${button(resource.status === '已归档' ? '恢复草稿' : '归档', `resource-archive:${resource.id}`, 'link', readOnly() || resource.scope === '平台')}${resource.status === '已归档' ? button('删除', `resource-delete:${resource.id}`, 'link danger', readOnly() || resource.scope === '平台') : ''}</div>`])), empty(`没有匹配的${kind}`, '调整筛选条件，或创建本地演示草稿。', button('清空筛选', 'clear-filters')))}<div class="table-foot"><span>平台 / 租户范围只用于筛选展示；本轮创建入口演示团队、项目归属。</span><span>分页 1 / 1</span></div></section>`;
}

function credentialsPage() {
  const list = demo.credentials.filter(credential => (!filters.query || (credential.name + credential.identifier).includes(filters.query)) && (!filters.category || filters.category === '全部大类' || credential.category === filters.category) && (!filters.type || filters.type === '全部凭证类型' || credential.type === filters.type) && (!filters.scope || filters.scope === '全部使用范围' || credential.scope === filters.scope));
  return head('凭证管理', '统一维护连接配置，向适用项目提供可绑定的凭证。', button('＋ 新建凭证', 'credential-new', 'primary', readOnly()), 'ADMINISTRATION / CREDENTIALS') + `<div class="notice" style="margin-bottom:20px">演示凭证仅保存公开配置与“已配置”状态。秘密字段输入后转为状态标记；本原型使用虚构地址。</div><section class="panel"><div class="toolbar">${filterInput('query', '搜索凭证名称或标识')}${filterSelect('category', ['全部大类', ...Object.keys(CREDENTIAL_TYPES)])}${filterSelect('type', ['全部凭证类型', ...Object.values(CREDENTIAL_TYPES).flat()])}${filterSelect('scope', ['全部使用范围', '当前租户', '项目'])}${button('重置', 'clear-filters', 'quiet small')}${button('刷新', 'refresh', 'small push')}</div>${table(['凭证名称 / 标识', '大类 / 类型', '使用范围', '公开配置', '秘密字段', '状态', '操作'], list.map(credential => row([`<strong>${esc(credential.name)}</strong><div class="sub mono">${esc(credential.identifier)}</div>`, `${credential.category}<div class="sub">${credential.type}</div>`, `${credential.scope}<div class="sub">${credential.projectId ? esc(projectById(credential.projectId)?.name || '历史项目') : 'default'}</div>`, `<div style="max-width:270px;overflow-wrap:anywhere">${esc(credential.address)}</div><div class="sub">${esc(credential.username || '无需用户名')}</div>`, badge(`${credential.auth} · ${credential.configured ? '已配置' : '未配置'}`), badge(credential.status), `<div class="actions">${button('编辑', `credential-edit:${credential.id}`, 'link', readOnly())}${button(credential.status === '启用' ? '停用' : '启用', `credential-toggle:${credential.id}`, 'link', readOnly())}${button('删除', `credential-delete:${credential.id}`, 'link danger', readOnly())}</div>`])), empty('没有匹配的凭证', '调整搜索或筛选条件。', button('清空筛选', 'clear-filters')))}<div class="table-foot"><span>凭证停用会阻止新一轮绑定执行，已有轮次保留使用快照。</span><span>${list.length} 条</span></div></section>`;
}

function managementPage() {
  const list = demo.projects.filter(project => (!filters.query || project.name.includes(filters.query)) && (!filters.lifecycle || filters.lifecycle === '全部项目' || project.lifecycle === filters.lifecycle)).sort((a, b) => b.created.localeCompare(a.created));
  return head('项目管理', '管理演示账号创建的项目，保留归档与清理过程记录。', button('返回协作项目', 'go:projects'), 'PROJECT ADMINISTRATION') + `<div class="notice amber" style="margin-bottom:20px">归档保留任务与工作目录，可恢复后继续协作。彻底删除进入后台清理；失败时保留记录并支持重试。</div><section class="panel"><div class="toolbar">${filterInput('query', '搜索项目名称')}${filterSelect('lifecycle', ['全部项目', '在用', '已归档', '清理中', '清理失败'])}${button('重置', 'clear-filters', 'quiet small')}<span class="sub push">共 ${list.length} 个项目</span></div>${table(['项目', '所属租户 / 创建者', '生命周期', '任务', '操作'], list.map(project => row([`<strong>${esc(project.name)}</strong><div class="sub">${project.id} · ${project.agent}<br>创建于 ${project.created}</div>`, `default<div class="sub">创建者 陈敏 · 负责人 ${project.owner}</div>`, badge(project.lifecycle), `${projectTasks(project.id, true).length} 项`, `<div class="actions">${button('项目详情', `project-detail:${project.id}`, 'link')}${button('查看任务', `go:manage-tasks/${project.id}`, 'link')}${project.lifecycle === '清理中' ? button('查看清理进度', `cleanup:project:${project.id}`, 'link') : project.lifecycle === '清理失败' ? button('重试清理', `cleanup:project:${project.id}`, 'link danger', readOnly()) : button(project.lifecycle === '已归档' ? '恢复' : '归档', `project-archive:${project.id}`, 'link', readOnly())}</div>`])), empty('没有匹配的项目', '可清空筛选查看归档与清理记录。', button('清空筛选', 'clear-filters')))}</section>`;
}
function manageTasksPage() {
  const project = currentProject();
  const list = projectTasks(project.id, true).filter(task => (!filters.query || (task.name + task.id).includes(filters.query)) && (!filters.lifecycle || filters.lifecycle === '全部任务' || filters.lifecycle === task.lifecycle));
  return head(`${project.name} · 任务管理`, '查看执行记录与日志，管理任务归档和清理。', button('返回项目管理', 'go:management') + button('进入项目协作', `go:project/${project.id}`)) + `<section class="panel"><div class="toolbar">${filterInput('query', '搜索任务标题或编号')}${filterSelect('lifecycle', ['全部任务', '在用', '已归档', '清理中', '清理失败'])}${button('重置', 'clear-filters', 'quiet small')}<span class="sub push">${list.length} 项任务</span></div>${table(['任务', '负责人', '任务阶段', '最近 Agent 轮次', '生命周期', '操作'], taskRows(list, true), empty('暂无任务', '可返回项目协作创建任务。'))}</section>`;
}
function flowsPage() {
  const task = currentTask();
  return head('Flow 执行记录', `${projectById(task.projectId).name} / ${task.name} / ${task.id}`, button('返回任务列表', `go:manage-tasks/${task.projectId}`) + button('返回会话', `go:task/${task.id}`)) + `<section class="panel pad"><div class="flow-metrics"><div><span class="label">Flow 数</span><b>${task.runs.length}</b></div><div><span class="label">执行完成率</span><b>${task.runs.length ? Math.round(task.runs.filter(run => run.status === '本轮已完成').length / task.runs.length * 100) : 0}%</b></div><div><span class="label">失败 / 已取消 / 执行中</span><b>${task.runs.filter(run => run.status === '失败').length} / ${task.runs.filter(run => run.status === '已取消').length} / ${task.runs.filter(run => run.status === '执行中').length}</b></div><div class="push">${button('分析日志 →', `go:logs/${task.id}`, 'link')}</div></div><div class="sub gap">执行统计仅描述 Flow 终态，测试和业务验收在独立工作区记录。</div></section><section class="panel gap"><div class="panel-head"><h2>Flow 列表</h2><span class="sub">点击详情查看本轮上下文与产物</span></div>${table(['Flow ID', '执行状态', '结束原因', '需求基线', '候选版本', '时间 / 耗时', '操作'], task.runs.map(run => row([`<span class="mono">${run.id}</span>`, badge(run.status), esc(run.reason), `PRD 1.${run.baseline}`, esc(run.version || '未生成'), `${run.time}<div class="sub">${run.duration}</div>`, button('详情', `flow-detail:${run.id}`, 'link')])), empty('暂无 Flow 执行记录', '当前任务尚无已记录轮次，可返回会话开始一轮演示。', button('返回会话', `go:task/${task.id}`)))}</section>`;
}
function logsPage() {
  const task = currentTask();
  const report = task.reports.find(item => item.id === selectedReportId) || task.reports[0];
  return head('日志分析', `${task.name} / ${task.id}`, button('返回任务列表', `go:manage-tasks/${task.projectId}`) + button('查看 Flow', `go:flows/${task.id}`)) + `<div class="grid two-col"><section class="panel" style="min-height:490px"><div class="panel-head"><h2>分析报告</h2>${task.reports.length ? `<select id="report-history" aria-label="历史报告">${task.reports.map((item, index) => `<option value="${index}" ${item.id === report.id ? 'selected' : ''}>${item.time} · ${item.id}</option>`).join('')}</select>` : '<span class="sub">暂无历史报告</span>'}</div><div class="pad" id="report-content">${task.logError ? `<div class="notice red"><strong>分析未完成</strong>name resolution failed · 服务地址解析失败，保留当前选择后可重试。<div class="actions gap">${button('重试分析（模拟恢复）', 'logs-retry', 'small', locked(task))}</div></div>` : report ? reportContent(report) : empty('尚未生成分析报告', task.runs.length ? '选择 Flow 后点击“分析所选 Flow”。' : '当前任务暂无 Flow，可返回任务会话开始演示。') }</div></section><aside><section class="panel"><div class="panel-head"><h2>选择 Flow</h2><span class="sub">已选 ${selectedFlows.length}</span></div><div class="pad"><div class="sub">默认最近 3 轮，最多同时分析 10 个 Flow。</div>${task.runs.map(run => `<label class="check-row"><input type="checkbox" data-flow="${run.id}" ${selectedFlows.includes(run.id) ? 'checked' : ''} ${run.status === '执行中' ? 'disabled' : ''}><span><strong>${run.id}</strong><br>${badge(run.status)}</span></label>`).join('')}${!task.runs.length ? '<p class="sub">当前无可选 Flow</p>' : ''}<div class="gap">${button('分析所选 Flow', 'logs-analyze', 'primary', locked(task) || !selectedFlows.length)}</div></div></section><section class="panel gap"><div class="panel-head"><h2>继续追问</h2></div><div class="pad"><textarea id="follow-up" aria-label="日志分析追问" maxlength="2000" placeholder="例如，核对失败前后的工具记录。" ${!report || task.logError || locked(task) ? 'disabled' : ''}></textarea>${button('提交追问', 'logs-follow', 'small gap', !report || task.logError || locked(task))}</div></section></aside></div>`;
}
function reportContent(report) { return `<div class="notice"><strong>分析完成 · 本地模拟报告</strong>选中 ${report.flowIds.join('、')}，执行结果与产物分别核查。</div><div class="details-block"><h3>排查结论</h3><p>${esc(report.text)}</p></div>${report.followUps.map(text => `<div class="details-block"><h3>追问记录</h3><p>${esc(text)}</p><p class="sub">模拟答复：请对照 Flow 结束原因、候选版本与测试报告逐项核查。</p></div>`).join('')}`; }

function validationMissing(task) {
  const missing = [];
  if (task.baselineState !== '已确认') missing.push('需求基线待确认');
  if (!task.version) missing.push('候选版本未固定');
  if (task.web !== '可预览') missing.push('Web 预览不可访问');
  if (task.round === '执行中') missing.push('当前轮次尚在执行');
  if (task.test !== '通过' || !task.testEvidence.trim()) missing.push('独立测试未通过或缺少报告');
  if (task.checks.some(check => check.required && (check.result !== '通过' || !check.actual.trim() || !check.evidence.trim()))) missing.push('必验项、实际结果或证据尚未齐备');
  return missing;
}
function acceptPage() {
  const task = currentTask();
  const missing = validationMissing(task);
  return head('交付验收', `${task.name} / ${task.id} / 固定候选版本逐项确认`, button('返回任务会话', `go:task/${task.id}`) + button('记录汇总结论', 'accept-conclusion', 'primary', locked(task) || task.round === '执行中'), 'DELIVERY / ACCEPTANCE') + `<div class="notice ${missing.length ? 'amber' : ''}" style="margin-bottom:20px"><strong>${task.accept === '通过' ? '当前候选版本已记录业务验收通过' : missing.length ? '验收依据待补齐' : '必验项齐备，可记录业务验收汇总'}</strong>${missing.length ? missing.join('，') : '发布结果独立于业务验收记录。'}</div><div class="grid two-col"><div><section class="panel"><div class="panel-head"><h2>固定验收版本</h2>${button('更换版本', 'version-change', 'small', locked(task) || task.round === '执行中')}</div><div class="summary"><div><span class="label">需求基线</span>PRD 1.${task.baseline} ${badge(task.baselineState)}</div><div><span class="label">候选版本</span><strong class="mono">${esc(task.version || '未固定')}</strong></div><div><span class="label">环境</span>Mock 沙箱</div></div><div class="summary"><div><span class="label">预览</span>${badge(task.web)} ${button('查看', 'preview:web', 'link small', task.web !== '可预览')}</div><div><span class="label">测试</span>${badge(task.test)} ${button(task.test === '未提交' ? '提交测试' : '登记结果', task.test === '未提交' ? 'test-submit' : 'test-result', 'link small', locked(task) || task.round === '执行中')}</div><div><span class="label">发布</span>${badge(task.release)} ${button('查看记录', 'release', 'link small')}</div></div></section><section class="panel gap"><div class="panel-head"><h2>业务验收项</h2><span class="sub">必验 ${task.checks.filter(check => check.required && check.result === '通过').length} / ${task.checks.filter(check => check.required).length} 通过</span></div>${table(['场景与预期', '实际结果 / 证据', '结论', '操作'], task.checks.map(check => row([`<strong>${check.id} · ${check.name}</strong><div class="sub">${check.required ? '必验' : '补充'} · ${check.expected}</div>`, `<div style="max-width:280px">${esc(check.actual || '尚未记录')}</div><div class="sub">${esc(check.evidence || '证据未提供')}</div>`, badge(check.result), button('记录', `check:${check.id}`, 'small', locked(task) || task.round === '执行中')])))}<div class="table-foot"><span>每次更换版本，当前验证恢复“未验证”，旧结果保留在历史归档。</span></div></section></div><aside><section class="panel"><div class="panel-head"><h2>验收前检查</h2></div><div class="pad">${[['需求基线已确认', task.baselineState === '已确认'], ['候选版本已固定', !!task.version], ['预览可访问', task.web === '可预览'], ['独立测试通过', task.test === '通过' && !!task.testEvidence], ['必验项及证据齐备', !task.checks.some(check => check.required && (check.result !== '通过' || !check.actual || !check.evidence))]].map(([label, passed]) => `<div class="check-row"><span class="${passed ? 'ok' : 'missing'}">${passed ? '✓' : '○'}</span>${label}</div>`).join('')}</div></section><section class="panel gap"><div class="panel-head"><h2>历史与复验</h2>${button('版本归档', 'archives', 'small')}</div><div class="pad">${timeline(task.events)}</div></section></aside></div>`;
}
function teamsPage() {
  return head('团队', '查看演示账号的团队与成员角色。') + `<section class="panel">${table(['团队', '团队管理员', '我的角色', '操作'], TEAMS.map(team => row([`<strong>${team}</strong>`, '陈敏、林舟', `${badge('项目管理员')} ${badge('项目开发人员')}`, button('查看成员', `members:${team}`, 'link')])))}</section>`;
}
function render() {
  const requiresTask = ['task', 'accept', 'flows', 'logs'].includes(route.page);
  const requiresProject = ['project', 'manage-tasks'].includes(route.page);
  const missing = requiresTask && !currentTask() || requiresProject && !currentProject();
  const pages = { home: homePage, teams: teamsPage, projects: projectsPage, project: projectPage, task: taskPage, knowledge: knowledgePage, skills: knowledgePage, credentials: credentialsPage, management: managementPage, 'manage-tasks': manageTasksPage, flows: flowsPage, logs: logsPage, accept: acceptPage };
  document.body.classList.toggle('nav-collapsed', demo.navCollapsed);
  document.body.classList.toggle('inspector-hidden', demo.inspectorHidden);
  $('#app').innerHTML = shell(missing ? empty('该记录已清理或不存在', '返回列表选择其他项目或任务。', button('返回项目', 'go:projects', 'primary')) : pages[route.page]());
  document.title = `${titles[route.page]} · DaoVibe 原型 V0.3`;
}

function modal(title, body, footer = '', mode = '') {
  returnFocus = document.activeElement;
  $('#overlay').innerHTML = `<div class="shade"><section class="modal ${mode}" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div class="modal-head"><h2 id="dialog-title">${esc(title)}</h2>${button('×', 'close', 'quiet', false, 'aria-label="关闭弹窗"')}</div><div class="modal-body">${body}<div id="form-error" class="error" role="alert"></div></div>${footer ? `<div class="modal-foot">${footer}</div>` : ''}</section></div>`;
  $('#overlay input:not(:disabled), #overlay select:not(:disabled), #overlay textarea:not(:disabled), #overlay button')?.focus();
}
function closeModal() { $('#overlay').innerHTML = ''; returnFocus?.isConnected && returnFocus.focus(); }
function formActions(action, label = '保存') { return button('取消', 'close') + button(label, action, 'primary'); }
function formError(text, fieldId = '') {
  $('#form-error').textContent = text;
  if (fieldId && $(`#${fieldId}`)) {
    $(`#${fieldId}`).setAttribute('aria-invalid', 'true');
    $(`#${fieldId}-error`).textContent = text;
    $(`#${fieldId}`).focus();
  }
}
function value(id) { return $(`#${id}`).value.trim(); }
function finish(text) { save(); closeModal(); render(); if (text) toast(text); }
function requireFields(fields) {
  const missing = fields.filter(([id]) => !value(id));
  missing.forEach(([id, text]) => {
    $(`#${id}`).setAttribute('aria-invalid', 'true');
    $(`#${id}-error`).textContent = text;
  });
  if (!missing.length) return true;
  $('#form-error').textContent = '请补齐标记的必填项。';
  $(`#${missing[0][0]}`).focus();
  return false;
}

function projectForm(id = '') {
  const project = projectById(id);
  const body = field('所属团队', 'project-team', project?.team || '', { required: true, choices: [['', '请选择团队'], ...TEAMS] }) +
    field('项目名称', 'project-name', project?.name || '', { required: true, max: 80, placeholder: '例如，企业协同业务平台' }) +
    field('执行助手', 'project-agent', project?.agent || AGENTS[0], { choices: AGENTS }) +
    `<div id="template-field" class="field" ${project && project.agent !== AGENTS[0] ? 'hidden' : ''}><label class="choice"><input type="checkbox" id="project-template" ${project?.template ? 'checked' : ''}>使用内部模板</label><small>BMAD 研发助手可使用模板；其他助手沿用所选项目配置。</small></div>` +
    `<div class="form-row">${field('负责人', 'project-owner', project?.owner || PEOPLE[0], { choices: PEOPLE })}${field('适用行业', 'project-industry', project?.industry || '通用', { choices: ['通用', '医疗'] })}</div>` +
    field('描述', 'project-description', project?.description || '', { textarea: true, max: 500 }) +
    (project ? field('项目状态', 'project-status', project.status, { choices: ['未开始', '进行中', '已暂停', '已结束'], help: '人工维护项目状态；任务阶段、业务验收与发布另行记录。' }) : '<p class="sub">保存后进入项目，可新建任务并确认需求上下文。</p>');
  modal(project ? '编辑项目' : '新建项目', body, formActions(`project-save:${id}`, project ? '保存项目' : '创建项目'));
}
function projectDetail(project) {
  modal('项目详情', `<h1>${esc(project.name)}</h1><div class="summary"><div><span class="label">生命周期</span>${badge(project.lifecycle)}</div><div><span class="label">项目状态</span>${badge(project.status)}</div></div>${[['项目编号', project.id], ['所属团队', project.team], ['执行助手', project.agent], ['负责人', project.owner], ['创建时间', project.created], ['项目描述', project.description || '未填写']].map(([label, text]) => `<div class="details-block"><span class="label">${label}</span><p>${esc(text)}</p></div>`).join('')}<div class="actions gap">${button('进入项目协作', `go:project/${project.id}`, 'primary small')}${button(project.lifecycle === '已归档' ? '恢复项目' : '归档项目', `project-archive:${project.id}`, 'small', readOnly() || !['在用', '已归档'].includes(project.lifecycle))}${button('彻底删除项目', `project-delete:${project.id}`, 'small danger', readOnly())}</div>`, '', 'drawer');
}
function taskForm(task = null) {
  modal(task ? '编辑任务' : '新建任务', field('任务标题', 'task-name', task?.name || '', { required: true, max: 100 }) +
    field('业务目标、边界与验收依据', 'task-goal', task?.goal || '', { required: true, textarea: true, max: 3000, disabled: !!task, help: task ? '变更业务目标请在任务上下文提出需求变更。' : '' }) +
    `<div class="form-row">${field('负责人', 'task-owner', task?.owner || '', { required: true, choices: [['', '请选择负责人'], ...PEOPLE] })}${field('优先级', 'task-priority', task?.priority || '普通', { choices: ['普通', '高', '紧急'] })}</div><div class="notice">创建后进入“待确认”。确认需求、关联资源后，可在会话中开始本地模拟执行。</div>`, formActions(`task-save:${task?.id || ''}`, task ? '保存任务' : '创建任务'));
}
function resourceScopeFields(resource) {
  return field('知识归属', 'resource-scope', resource?.scope || '', { required: true, choices: [['', '请选择知识范围'], '团队', '项目'] }) +
    `<div id="resource-team-field" ${resource?.scope !== '团队' ? 'hidden' : ''}>${field('所属团队', 'resource-team', resource?.team || TEAMS[0], { choices: TEAMS })}</div>` +
    `<div id="resource-project-field" ${resource?.scope !== '项目' ? 'hidden' : ''}>${field('所属项目', 'resource-project', resource?.projectId || '', { choices: [['', '请选择项目'], ...demo.projects.filter(project => project.lifecycle === '在用').map(project => [project.id, project.name])] })}</div>`;
}
function resourceForm(kind, id = '') {
  const savedResource = demo.knowledge.find(item => item.id === id);
  const resource = savedResource?.pending ? { ...savedResource, ...savedResource.pending, status: savedResource.status } : savedResource;
  const skill = kind === 'Skill';
  const body = resourceScopeFields(resource) + field('知识类型', 'resource-type', resource?.type || KNOWLEDGE_TYPES[0], { required: true, choices: KNOWLEDGE_TYPES }) +
    field(skill ? 'Skill 名称' : '文档名称', 'resource-name', resource?.name || '', { required: true, max: 120, help: skill ? '名称、适用边界和正文分别填写，便于评审。' : '多文件时分别登记为文档，名称默认使用各文件名。' }) +
    (skill ? `<div class="field"><label>模式</label><label class="choice"><input type="radio" name="skill-mode" value="single" ${resource?.mode !== 'zip' ? 'checked' : ''}>单文件编辑</label><label class="choice"><input type="radio" name="skill-mode" value="zip" ${resource?.mode === 'zip' ? 'checked' : ''}>ZIP 上传</label></div><div class="notice">领域与能力可填写当前知识位置的标签；研发阶段从公共分类选择。每类 1～5 个。</div><div class="form-row gap">${field('领域', 'skill-domain', resource?.domain || '', { required: true, help: '多个标签用逗号分隔，例如 通用软件、医疗' })}${field('能力', 'skill-ability', resource?.ability || '', { required: true, help: '多个标签用逗号分隔，例如 异常检查、回归' })}</div><div class="field"><label><span class="required">*</span>研发阶段（1～5 个）</label>${['需求', '设计', '开发', '测试', '部署', '运营'].map(phase => `<label class="choice"><input type="checkbox" name="skill-phase" value="${phase}" ${resource?.phase?.includes(phase) ? 'checked' : ''}>${phase}</label>`).join('')}</div>${field('适用场景与边界', 'skill-boundary', resource?.boundary || '', { required: true, textarea: true, max: 1000 })}<div id="skill-file-label" class="filebox">可选择 .md 文件载入正文，或直接编辑。<input type="file" id="resource-file" accept="${resource?.mode === 'zip' ? '.zip' : '.md'}" aria-label="选择 Skill 文件"></div><div id="skill-body-field" class="gap" ${resource?.mode === 'zip' ? 'hidden' : ''}>${field('SKILL.md 全文', 'resource-body', resource?.body || '---\nname: my-skill\ndescription: 描述用途与调用时机\n---\n\n# 在此填写指令正文', { required: true, textarea: true, max: 100000 })}</div>` :
      `<div class="filebox">选择或拖入文档，支持多选，单个文件最大 5 MiB。<input type="file" id="resource-file" accept=".md,.txt,.pdf,.docx" multiple aria-label="选择知识文档"><span id="file-summary" class="sub">${resource?.files?.length ? '原文件 ' + resource.files.map(esc).join('、') : '尚未选择文件'}</span></div>${field('内容摘要', 'resource-body', resource?.body || '', { textarea: true, max: 2000, help: '仅用于评审摘要。PDF、Word 在原型中只登记文件名与大小。' })}`) +
    `<div class="notice amber gap">${resource?.status === '生效' ? '保存新版本为草稿，当前生效版本继续可引用；新版本审核通过后再替换。' : '先保存草稿，再提交审核和记录生效。上传、解析、审核结果为本地演示。'}</div>`;
  modal(resource?.status === '生效' ? `新建 ${kind} 版本` : `${resource ? '编辑' : skill ? '新建' : '上传'}${kind}`, body, formActions(`resource-save:${kind}:${id}`, '保存草稿'), skill ? 'wide' : '');
}
function resourceDetail(resource) {
  const references = demo.tasks.filter(task => task.refs.some(ref => ref.id === resource.id));
  const pending = resource.pending;
  modal(`${resource.kind}详情`, `<div class="resource-head"><h2>${esc(resource.name)}</h2>${badge(resource.status)}</div><p class="sub">${resource.id} · V${resource.version} · ${resource.scope}范围</p><div class="details-block"><h3>当前版本内容</h3><pre>${esc(resource.body || '正文未解析，仅登记文件信息。')}</pre>${resource.boundary ? `<p>适用边界 ${esc(resource.boundary)}</p>` : ''}</div>${pending ? `<div class="details-block"><div class="resource-head"><h3>待生效版本 V${pending.version}</h3>${badge(pending.status)}</div><p>${esc(pending.name)}</p><pre>${esc(pending.body)}</pre><div class="actions">${button('编辑新版本', `resource-edit:${resource.id}`, 'small', readOnly())}${button(pending.status === '草稿' ? '提交审核' : '审核并生效', `resource-review:${resource.id}`, 'primary small', readOnly())}${pending.status === '待审核' ? button('退回草稿', `resource-return:${resource.id}`, 'small', readOnly()) : ''}</div></div>` : ''}<div class="details-block"><h3>引用记录</h3>${references.length ? references.map(task => `<p>${button(`${task.id} · ${esc(task.name)}`, `go:task/${task.id}`, 'link')}<br><span class="sub">人工关联 · ${task.refs.filter(ref => ref.id === resource.id).map(ref => 'V' + ref.version).join('、')}</span></p>`).join('') : '<p class="sub">未记录引用</p>'}</div><div class="details-block"><h3>历史版本</h3>${resource.versions.length ? resource.versions.map(version => `<details><summary>V${version.version} · 历史内容</summary><pre>${esc(version.body)}</pre></details>`).join('') : '<p class="sub">暂无历史版本</p>'}</div><div class="actions gap">${['草稿', '待审核'].includes(resource.status) ? button(resource.status === '草稿' ? '提交审核' : '审核并生效', `resource-review:${resource.id}`, 'primary', readOnly()) : ''}${resource.status === '待审核' ? button('退回草稿', `resource-return:${resource.id}`, '', readOnly()) : ''}${resource.status === '生效' ? button('关联到当前任务', `resource-link:${resource.id}`, 'primary', locked() || !canUseResource(resource, currentProject())) : ''}</div>`, button('关闭', 'close'), 'drawer');
}
function credentialForm(id = '') {
  const credential = demo.credentials.find(item => item.id === id);
  const category = credential?.category || 'Git';
  modal(credential ? '编辑凭证' : '新建凭证', `<div class="form-row">${field('大类', 'credential-category', category, { choices: Object.keys(CREDENTIAL_TYPES), disabled: !!credential, required: true })}${field('凭证类型', 'credential-type', credential?.type || CREDENTIAL_TYPES[category][0], { choices: CREDENTIAL_TYPES[category], disabled: !!credential, required: true })}</div>` +
    field('凭证名称', 'credential-name', credential?.name || '', { required: true, max: 80 }) +
    field('凭证标识', 'credential-identifier', credential?.identifier || '', { required: true, disabled: !!credential, max: 100, help: '项目内稳定标识，例如 demo/web-app。' }) +
    field('使用范围', 'credential-scope', credential?.scope || '当前租户', { required: true, choices: ['当前租户', '项目'] }) +
    `<div id="credential-project-field" ${credential?.scope !== '项目' ? 'hidden' : ''}>${field('所属项目', 'credential-project', credential?.projectId || '', { choices: [['', '请选择项目'], ...demo.projects.filter(project => project.lifecycle === '在用').map(project => [project.id, project.name])] })}</div>` +
    field('服务器地址 / 站点地址 / AppID', 'credential-address', credential?.address || '', { required: true, help: '原型演示请使用虚构配置。' }) +
    field('用户名', 'credential-username', credential?.username || '') +
    field('认证方式', 'credential-auth', credential?.auth || 'Token', { choices: ['Token', '密码', 'SSH 私钥', 'CLI 私钥'] }) +
    field('秘密字段', 'credential-secret', '', { type: 'password', placeholder: credential?.configured ? '留空保留已配置状态' : '输入演示占位内容', help: `${credential?.configured ? '已配置。' : '未配置。'} 输入仅转为配置状态，不保留秘密字段值。` }) +
    field('备注', 'credential-note', credential?.note || '', { textarea: true, max: 1000 }) +
    field('状态', 'credential-status', credential?.status || '启用', { choices: ['启用', '停用'] }), formActions(`credential-save:${id}`, '保存凭证'));
}
function snapshot(task, reason) {
  if (!task.version && !task.testEvidence) return;
  task.archives.unshift({ reason, time: now(), version: task.version, baseline: task.baseline, baselineState: task.baselineState, refs: structuredClone(task.refs), test: task.test, testEvidence: task.testEvidence, accept: task.accept, release: task.release, checks: structuredClone(task.checks) });
}
function resetValidation(task) {
  task.test = '未提交';
  task.testEvidence = '';
  task.accept = '未提交';
  task.release = '未申请';
  task.checks = task.checks.map(check => ({ ...check, result: '未验证', actual: '', evidence: '' }));
}
function startRun(task, text, files) {
  if (task.baselineState !== '已确认') return formErrorOrModal('请先确认需求基线，再开始执行。', 'baseline');
  const project = projectById(task.projectId);
  if (project.status === '已暂停' || project.status === '已结束') return formErrorOrModal('项目当前已暂停或已结束，请先调整项目状态。', `project-edit:${project.id}`);
  const invalidRef = task.refs.find(ref => {
    const resource = demo.knowledge.find(item => item.id === ref.id);
    return !resource || resource.status !== '生效' || !canUseResource(resource, project);
  });
  if (invalidRef) return formErrorOrModal(`引用“${invalidRef.name}”已归档或不在当前范围，请重新选择引用。`, 'refs');
  const credential = demo.credentials.find(item => item.id === task.credentialId);
  if (task.credentialId && (!credential || !canUseCredential(credential, project))) return formErrorOrModal('已绑定的凭证停用、未配置或超出使用范围，请重新绑定。', 'bind-credential');
  task.messages.push({ role: 'user', text: text || '请结合附件继续本轮任务。', files, time: now() });
  task.runs.unshift({ id: uid('FLOW'), status: '执行中', reason: '等待本地模拟完成', version: '', baseline: task.baseline, refs: structuredClone(task.refs), credential: credential ? { id: credential.id, name: credential.name } : null, duration: '模拟中', time: now() });
  task.round = '执行中';
  task.stage = '执行中';
  task.draft = '';
  task.attachments = [];
  attachmentDraft = [];
  event(task, '开始新一轮模拟执行，已固定需求与引用快照');
  taskTab = 'chat';
  finish('模拟执行已开始，可在会话中完成或停止本轮。');
}
function formErrorOrModal(text, action) {
  modal('暂不能继续', `<div class="notice amber">${esc(text)}</div>`, button('关闭', 'close') + button('前往补齐', action, 'primary'));
}
function deleteDialog(kind, target) {
  const type = kind === 'project' ? '项目' : '任务';
  modal(`彻底删除${type}`, `<div class="notice red"><strong>将清理${type}及其本地演示记录</strong>${kind === 'project' ? '包含该项目下的任务、轮次、会话与验收记录。' : '包含会话、执行轮次与验收记录。'}清理成功后从当前演示列表移除。</div>` + field(`输入${type}名称确认`, 'delete-name', '', { required: true, help: esc(target.name) }) + `<label class="choice"><input type="checkbox" id="delete-failure">模拟清理失败（用于评审重试路径）</label>`, formActions(`delete-confirm:${kind}:${target.id}`, '确认删除并开始清理'));
}
function cleanupDialog(kind, target) {
  const failed = target.lifecycle === '清理失败';
  modal('后台清理 · 本地模拟', `<h3>${esc(target.name)}</h3>${badge(target.lifecycle)}<div class="notice ${failed ? 'red' : ''} gap">${failed ? '工作目录清理失败，记录已保留。可重试同一清理任务。' : '清理任务已登记，等待模拟回执。刷新页面后仍可继续处理。'}</div>`, button('关闭', 'close') + button(failed ? '重试并完成清理' : '模拟清理成功回执', `cleanup-success:${kind}:${target.id}`, 'primary', readOnly()) + (!failed ? button('模拟清理失败', `cleanup-failure:${kind}:${target.id}`, 'danger', readOnly()) : ''));
}
function action(actionName) {
  const [command, key = '', id = ''] = actionName.split(':');
  const task = currentTask();
  const project = currentProject();
  const readActions = ['go', 'close', 'design', 'toggle-nav', 'toggle-inspector', 'clear-filters', 'view', 'task-filter', 'task-tab', 'project-tab', 'project-menu', 'project-detail', 'task-menu', 'resource', 'flow-detail', 'archives', 'artifact-directory', 'preview', 'copy-preview', 'members', 'refresh', 'report-view'];
  if (readOnly() && !readActions.includes(command) && !['reset', 'reset-confirm', 'cleanup', 'release'].includes(command)) return toast('当前演示角色为只读成员。');
  if (command === 'go') return go(key);
  if (command === 'close') return closeModal();
  if (command === 'toggle-nav' || command === 'toggle-inspector') {
    const setting = command === 'toggle-nav' ? 'navCollapsed' : 'inspectorHidden';
    demo[setting] = !demo[setting]; save(); return render();
  }
  if (command === 'view') { projectView = key; return render(); }
  if (command === 'clear-filters') { filters = {}; return render(); }
  if (command === 'task-filter') { filters = { stage: key }; projectTab = 'tasks'; return render(); }
  if (command === 'project-tab') { projectTab = key; closeModal(); return render(); }
  if (command === 'task-tab') { taskTab = key; closeModal(); return render(); }
  if (command === 'refresh') return toast('已刷新当前本地演示数据。');
  if (command === 'reset') return modal('重置演示', '<p>恢复初始演示项目、会话、文档与验收记录，清除本浏览器 V0.3 的演示操作。</p>', formActions('reset-confirm', '确认重置'));
  if (command === 'reset-confirm') {
    demo = makeSeed(); taskTab = 'chat'; projectTab = 'tasks'; save(); closeModal(); return go('projects');
  }
  if (command === 'design') return modal('本页评审说明', `<div class="notice amber">V0.3 设计建议与本地演示，平台真实能力以走查与验证记录为依据。</div><div class="details-block"><h3>关联功能 ID</h3><p>${designIds[route.page]}</p></div><div class="details-block"><h3>本页评审重点</h3><p>检查入口、必填反馈、保存后的结果、异常与恢复、返回路径及跨页面状态的一致性。</p></div><div class="details-block"><h3>截图证据边界</h3><p>2026-11-18 用户提供的 23 张截图显示页面、字段、空态、错误与操作入口；保存、权限、实际引用、测试、业务验收和发布效果仍需实际验证。</p></div><div class="details-block"><h3>样式来源</h3><p>采用 ui-styles-reference 的品牌色 #3eceb6、语义文字与表单层级，并按桌面端调整排版。移动端源码尺寸仅按其原场景理解。</p></div><p class="sub">完整改动、证据与评审路径见同目录 README_使用与评审说明.md 和 优化追踪与验证.md。</p>`, button('关闭', 'close'), 'drawer');
  if (command === 'project-new') return projectForm();
  if (command === 'project-edit') return projectForm(key);
  if (command === 'project-save') {
    if (!requireFields([['project-team', '请选择所属团队。'], ['project-name', '项目名称不能为空。']])) return;
    const existing = projectById(key);
    if (existing && projectLocked(existing)) return formError('当前项目已归档或处于清理状态。');
    if (demo.projects.some(item => item.id !== key && item.team === value('project-team') && item.name === value('project-name'))) return formError('同一团队已有同名项目。', 'project-name');
    const data = { name: value('project-name'), team: value('project-team'), owner: value('project-owner'), agent: value('project-agent'), industry: value('project-industry'), description: value('project-description'), template: value('project-agent') === AGENTS[0] && $('#project-template').checked, updated: now() };
    if (existing) {
      if (existing.team !== data.team && projectTasks(existing.id, true).some(item => item.round === '执行中')) return formError('当前项目仍有执行中的任务，请先完成或停止本轮后再调整所属团队。');
      Object.assign(existing, data, { status: value('project-status') });
      event(existing, '项目信息已更新');
      finish('项目信息已保存。');
    } else {
      const created = { ...data, id: uid('PRJ'), lifecycle: '在用', status: '未开始', created: now(), events: [] };
      event(created, '项目已创建'); demo.projects.unshift(created); save(); go(`project/${created.id}`); toast('项目已创建，可继续新建任务。');
    }
    return;
  }
  if (command === 'project-menu') {
    const item = projectById(key);
    return modal('项目操作', `<h3>${esc(item.name)}</h3><div class="actions gap">${button('编辑项目信息', `project-edit:${key}`, '', projectLocked(item))}${button('项目动态', `project-events:${key}`)}${button('转交项目', `project-transfer:${key}`, '', projectLocked(item))}${button('复制项目链接', `project-copy:${key}`)}${button('归档 / 生命周期管理', `project-detail:${key}`)}</div>`, button('关闭', 'close'));
  }
  if (command === 'project-detail') return projectDetail(projectById(key));
  if (command === 'project-events') return modal('项目动态', timeline(projectById(key).events), button('关闭', 'close'), 'drawer');
  if (command === 'project-copy') return copyText(`${location.href.split('#')[0]}#/project/${key}`);
  if (command === 'project-transfer') return modal('转交项目', field('接收负责人', 'transfer-owner', projectById(key).owner, { required: true, choices: PEOPLE }) + field('转交说明', 'transfer-note', '', { required: true, textarea: true }) + '<p class="sub">本轮建议规则为更换项目负责人，任务负责人逐项保留，可继续单独调整。</p>', formActions(`project-transfer-save:${key}`, '确认转交'));
  if (command === 'project-transfer-save') {
    if (!value('transfer-note')) return formError('请填写转交说明。', 'transfer-note');
    const item = projectById(key);
    const previous = item.owner;
    item.owner = value('transfer-owner');
    event(item, `项目负责人 ${previous} → ${item.owner}，${value('transfer-note')}`);
    return finish('项目已转交，动态中保留交接说明。');
  }
  if (command === 'project-archive') {
    const item = projectById(key);
    if (item.lifecycle === '已归档') { item.lifecycle = '在用'; event(item, '项目已恢复'); return finish('项目已恢复，可从项目列表继续协作。'); }
    if (projectTasks(key, true).some(item => item.round === '执行中')) return modal('暂不能归档', '<p>项目存在执行中的任务，请先完成或停止本轮。</p>', button('查看项目任务', `go:project/${key}`, 'primary'));
    return modal('归档项目', `<p>归档“${esc(item.name)}”后保留任务、会话与验收历史，并停止新增协作。可在项目管理恢复。</p>`, formActions(`project-archive-confirm:${key}`, '确认归档'));
  }
  if (command === 'project-archive-confirm') {
    const item = projectById(key); item.lifecycle = '已归档'; event(item, '项目已归档'); save(); closeModal(); go('management'); return toast('项目已归档，项目管理中可恢复。');
  }
  if (command === 'project-delete') return deleteDialog('project', projectById(key));
  if (command === 'task-new') return taskForm();
  if (command === 'task-edit') return taskForm(demo.tasks.find(item => item.id === key));
  if (command === 'task-save') {
    if (!requireFields([['task-name', '任务标题不能为空。'], ['task-goal', '请填写业务目标、边界与验收依据。'], ['task-owner', '请选择负责人。']])) return;
    const existing = demo.tasks.find(item => item.id === key);
    if (existing && locked(existing) || !existing && projectLocked()) return formError('当前记录仅可查看。');
    const item = existing || makeTask(uid('DV'), project.id, '', '', project.industry);
    if (existing && existing.goal !== value('task-goal')) return formError('业务目标变更请从任务“需求与引用上下文”提出，保留旧版验证记录。');
    Object.assign(item, { name: value('task-name'), owner: value('task-owner'), goal: value('task-goal'), priority: value('task-priority'), updated: now() });
    event(item, existing ? '任务基本信息已更新' : '任务已创建，需求待确认');
    if (!existing) demo.tasks.unshift(item);
    save(); closeModal(); taskTab = 'context'; go(`task/${item.id}`); return toast(existing ? '任务已保存。' : '任务已创建，请确认需求基线。');
  }
  if (command === 'task-menu') {
    const item = demo.tasks.find(item => item.id === key);
    return modal('任务操作', `<h3>${esc(item.name)}</h3><div class="actions">${button('编辑基本信息', `task-edit:${key}`, '', locked(item) || item.round === '执行中')}${button('查看 Flow', `go:flows/${key}`)}${button('分析日志', `go:logs/${key}`)}${button('归档 / 清理', `go:manage-tasks/${item.projectId}`)}</div>`, button('关闭', 'close'));
  }
  if (command === 'task-archive') {
    const item = demo.tasks.find(item => item.id === key);
    if (item.round === '执行中') return toast('请先完成或停止本轮，再归档任务。');
    if (item.lifecycle === '已归档') { item.lifecycle = '在用'; event(item, '任务已恢复'); return finish('任务已恢复。'); }
    return modal('归档任务', `<p>归档“${esc(item.name)}”后保留历史，恢复后可继续协作。</p>`, formActions(`task-archive-confirm:${key}`, '确认归档'));
  }
  if (command === 'task-archive-confirm') { const item = demo.tasks.find(item => item.id === key); item.lifecycle = '已归档'; event(item, '任务已归档'); return finish('任务已归档。'); }
  if (command === 'task-delete') return deleteDialog('task', demo.tasks.find(item => item.id === key));
  if (command === 'delete-confirm') {
    const target = key === 'project' ? projectById(id) : demo.tasks.find(item => item.id === id);
    if (value('delete-name') !== target.name) return formError('输入的名称与当前记录不一致。', 'delete-name');
    if ((key === 'project' ? projectTasks(id, true) : [target]).some(item => item.round === '执行中')) return formError('请先停止执行中的任务，再开始清理。');
    target.lifecycle = $('#delete-failure').checked ? '清理失败' : '清理中';
    event(target, '已登记彻底删除清理任务'); save(); render(); return cleanupDialog(key, target);
  }
  if (command === 'cleanup' || command === 'cleanup-failure' || command === 'cleanup-success') {
    const target = key === 'project' ? projectById(id) : demo.tasks.find(item => item.id === id);
    if (command === 'cleanup') return cleanupDialog(key, target);
    if (command === 'cleanup-failure') { target.lifecycle = '清理失败'; save(); render(); return cleanupDialog(key, target); }
    if (key === 'project') {
      demo.projects = demo.projects.filter(item => item.id !== id);
      demo.tasks = demo.tasks.filter(item => item.projectId !== id);
      demo.knowledge = demo.knowledge.filter(item => item.projectId !== id);
      demo.credentials = demo.credentials.filter(item => item.projectId !== id);
    } else demo.tasks = demo.tasks.filter(item => item.id !== id);
    if (!currentProject()) demo.selectedProject = demo.projects[0]?.id || '';
    if (!currentTask()) demo.selectedTask = demo.tasks[0]?.id || '';
    save(); closeModal(); go(key === 'project' ? 'management' : `manage-tasks/${target.projectId}`); return toast('清理成功，演示记录已移除。');
  }
  if (command === 'baseline') return modal('需求基线', `<div class="version-box"><strong>PRD 1.${task.baseline}</strong> ${badge(task.baselineState)}</div><div class="details-block"><h3>目标与范围</h3><p>${esc(task.goal)}</p></div><div class="details-block"><h3>验收依据</h3>${task.checks.map(check => `<p>${check.id} · ${check.name}<br><span class="sub">${check.required ? '必验' : '补充'} · ${check.expected}</span></p>`).join('')}</div>`, button('关闭', 'close') + button('确认当前需求', 'baseline-confirm', 'primary', locked(task) || task.round === '执行中'));
  if (command === 'baseline-confirm') { task.baselineState = '已确认'; event(task, `PRD 1.${task.baseline} 已确认`); return finish('需求基线已确认。'); }
  if (command === 'baseline-change') return modal('提出需求变更', field('变更后的业务目标与范围', 'new-goal', task.goal, { required: true, textarea: true }) + field('变更说明与影响', 'change-note', '', { required: true, textarea: true }) + '<div class="notice amber">旧版需求与验收结果归档，新需求需重新确认、执行、生成候选产物并复验。</div>', formActions('baseline-change-save', '保存变更'));
  if (command === 'baseline-change-save') {
    if (!value('new-goal')) return formError('请填写变更后的业务目标与范围。', 'new-goal');
    if (!value('change-note')) return formError('请填写变更说明与影响。', 'change-note');
    snapshot(task, '需求变更'); task.goal = value('new-goal'); task.baseline += 1; task.baselineState = '待确认';
    task.version = ''; task.web = '未生成'; task.mini = '未生成'; resetValidation(task); task.stage = '待确认';
    event(task, `需求变更为 PRD 1.${task.baseline}，${value('change-note')}`); return finish('新需求待确认，旧版验证已归档。');
  }
  if (command === 'refs') {
    const available = demo.knowledge.filter(resource => resource.status === '生效' && canUseResource(resource, project));
    return modal('关联知识与 Skill', `<p class="sub">仅列出当前项目范围内的生效资源。保存时固定所选版本，可在轮次详情查看引用快照。</p>${available.map(resource => `<label class="check-row"><input type="checkbox" name="resource-ref" value="${resource.id}" ${task.refs.some(ref => ref.id === resource.id) ? 'checked' : ''}><span><strong>${esc(resource.name)}</strong><br><span class="sub">${resource.kind} · V${resource.version} · ${resource.scope}</span></span></label>`).join('') || '<p>没有适用的生效资源，可先在知识库创建、审核。</p>'}`, formActions('refs-save', '保存关联'));
  }
  if (command === 'refs-save') {
    task.refs = $$('input[name=resource-ref]:checked').map(input => {
      const resource = demo.knowledge.find(item => item.id === input.value);
      return { id: resource.id, name: resource.name, version: resource.version, kind: resource.kind, source: '人工关联' };
    });
    event(task, '已更新后续轮次的引用关联，历史轮次快照保留'); return finish('引用版本已固定，后续执行使用本次关联。');
  }
  if (command === 'resource-link') {
    if (locked(task) || task.round === '执行中') return toast('请在当前轮次结束后再调整引用。');
    const resource = demo.knowledge.find(item => item.id === key);
    task.refs = task.refs.filter(ref => ref.id !== key);
    task.refs.push({ id: resource.id, name: resource.name, version: resource.version, kind: resource.kind, source: '人工关联' });
    event(task, `人工关联 ${resource.name} V${resource.version}`); return finish(`已关联到 ${task.id}。`);
  }
  if (command === 'bind-credential') return modal('绑定执行凭证', field('可用凭证', 'bound-credential', task.credentialId, { choices: [['', '暂不绑定'], ...demo.credentials.filter(item => canUseCredential(item, project)).map(item => [item.id, `${item.name} · ${item.scope}`])] }) + '<p class="sub">执行前重新检查范围、启用与配置状态，历史轮次保留绑定快照。</p>', formActions('bind-credential-save'));
  if (command === 'bind-credential-save') { task.credentialId = value('bound-credential'); event(task, '执行凭证绑定已更新'); return finish('凭证绑定已保存。'); }
  if (command === 'attach') return modal('添加会话附件', '<div class="filebox">支持图片、文档，单个最大 5 MiB。本原型登记文件名，不传输文件。<input id="chat-files" type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.md,.txt,.docx" aria-label="选择会话附件"></div>', formActions('attach-save', '添加附件'));
  if (command === 'attach-save') {
    const files = [...$('#chat-files').files];
    if (!files.length) return formError('请先选择文件。');
    if (files.some(file => file.size > 5 * 1024 * 1024)) return formError('单个附件不能超过 5 MiB。');
    if (files.some(file => !/\.(png|jpe?g|pdf|md|txt|docx)$/i.test(file.name))) return formError('请选择图片、PDF、Markdown、文本或 Word 文档。');
    attachmentDraft.push(...files.map(file => ({ name: file.name, size: file.size })));
    task.attachments = attachmentDraft; save(); closeModal(); return render();
  }
  if (command === 'attachment-remove') { attachmentDraft = attachmentDraft.filter(file => file.name !== actionName.slice('attachment-remove:'.length)); task.attachments = attachmentDraft; save(); return render(); }
  if (command === 'send' || command === 'message-note') {
    if (locked(task) || task.round === '执行中') return;
    const text = task.draft.trim();
    const files = attachmentDraft.map(file => file.name);
    if (!text && !files.length) return toast('请输入消息或添加附件。');
    if (command === 'send') return startRun(task, text, files);
    task.messages.push({ role: 'user', text, files, time: now() }); task.draft = ''; task.attachments = []; attachmentDraft = []; event(task, '新增本地会话说明'); return finish('消息已记录。');
  }
  if (command === 'run-complete') {
    if (task.round !== '执行中' || locked(task)) return;
    snapshot(task, '新轮次生成候选版本'); resetValidation(task);
    task.version = `RC-${now().slice(0, 10).replaceAll('-', '')}.${demo.nextId + 1}`; demo.nextId += 1;
    task.web = '可预览'; task.mini = '已生成·真机待验证'; task.round = '本轮已完成'; task.stage = '待测试';
    Object.assign(task.runs[0], { status: '本轮已完成', reason: '本地模拟正常结束', version: task.version, duration: '演示完成', time: now() });
    task.messages.push({ role: 'agent', text: `本轮已完成，已生成候选版本 ${task.version}。请核对预览后提交独立测试，再开展业务验收。`, files: [], time: now() });
    event(task, `生成候选版本 ${task.version}，当前测试与验收重新开始`); return finish('候选版本已生成，下一步提交测试。');
  }
  if (command === 'run-stop') {
    if (task.round !== '执行中') return;
    task.round = '已取消'; task.stage = task.version ? '待测试' : '待确认';
    Object.assign(task.runs[0], { status: '已取消', reason: '人工停止本地模拟', duration: '已停止' });
    event(task, '本轮已停止，已存在的候选版本及历史保留'); return finish('本轮模拟已停止，可继续补充需求。');
  }
  if (command === 'run-retry') return startRun(task, '重试上一轮，请结合原有失败原因和已确认上下文继续。', []);
  if (command === 'flow-detail') {
    const run = task.runs.find(item => item.id === key);
    return modal('Flow 轮次详情', `<h3 class="mono">${run.id}</h3>${badge(run.status)}<div class="details-block"><h3>执行结果</h3><p>${esc(run.reason)}</p><p>候选版本 ${esc(run.version || '尚未生成')}</p></div><div class="details-block"><h3>本轮上下文快照</h3><p>需求基线 PRD 1.${run.baseline}</p>${run.refs.length ? run.refs.map(ref => `<p>${esc(ref.name)} · V${ref.version} · ${ref.source || '人工关联快照'}</p>`).join('') : '<p class="sub">引用未记录</p>'}<p>凭证 ${esc(run.credential?.name || '未记录')}</p></div><div class="notice">本地演示快照仅用于解释关联方式，真实 Agent 使用证据需由平台记录核验。</div>`, button('关闭', 'close'), 'drawer');
  }
  if (command === 'artifact-directory') return modal('产物目录', `<p>候选版本 ${esc(task.version || '未提供')}</p>${table(['产物', '类型', '状态'], [['web-app', 'PC 管理端', task.web], ['mini-app', '患者端小程序', task.mini], ['server-app', '后台服务', task.version ? '已登记·运行待验证' : '未提供'], ['prd-docs', '需求文档', task.baselineState]].map(cells => row(cells.map(esc))))}`, button('关闭', 'close'));
  if (command === 'preview') {
    if (key === 'web') return modal('应用预览 · 本地演示', `<div class="preview-bar"><strong>${task.industry === '医疗' ? '体检套餐管理' : '业务单据管理'}</strong><span>Mock</span></div><div class="preview-content">${table(['名称', '所属范围', '状态'], (task.industry === '医疗' ? [['基础体检套餐', '示例院区 A', '上架'], ['专项体检套餐', '示例院区 B', '上架']] : [['采购订单 A', '示例组织 A', '待审批'], ['采购订单 B', '示例组织 B', '已确认']]).map(cells => row(cells.map(esc))))}</div><div class="notice">${esc(task.version)} · 本地样例数据，预览可访问、测试通过、业务验收分别记录。</div>`, button('关闭预览', 'close'), 'wide');
    return modal('小程序预览记录', `<div class="notice"><strong>${esc(task.mini)}</strong>候选版本 ${esc(task.version)}，真机访问与业务结果需单独确认。</div><p class="gap">本原型演示二维码记录、失效与重新生成流程，显示演示占位标识。</p><div class="empty"><span class="empty-symbol">▦</span><span class="sub">演示占位 · 无真实扫码地址</span></div>`, button('关闭', 'close'));
  }
  if (command === 'copy-preview') return copyText(`https://preview.example.invalid/${task.id}/${task.version}/${key}`);
  if (command === 'preview-prepare') {
    if (key === 'web') task.web = task.web === '可预览' ? '不可用' : '可预览';
    else task.mini = '已生成·真机待验证';
    event(task, `${key === 'web' ? 'Web 预览状态 ' + task.web : '重新生成小程序预览记录，真机待验证'}`); return finish('预览状态已更新，历史验证记录保留。');
  }
  if (command === 'version-change') return modal('更换候选版本', field('新候选版本号', 'new-version', '', { required: true, max: 80 }) + field('更换说明', 'version-note', '', { required: true, textarea: true }) + '<div class="notice amber">旧版结果归档，新版预览需重新确认，测试、验收和发布状态重置。</div>', formActions('version-change-save', '固定新版本'));
  if (command === 'version-change-save') {
    const version = value('new-version');
    if (!version || version === task.version || task.archives.some(item => item.version === version)) return formError('请填写未使用过的新版本号。', 'new-version');
    if (!value('version-note')) return formError('请填写更换说明。', 'version-note');
    snapshot(task, value('version-note')); task.version = version; task.web = '待确认'; task.mini = '未生成'; resetValidation(task); task.stage = '待测试';
    event(task, `候选版本变更为 ${version}，${value('version-note')}`); return finish('新版已固定，请重新确认预览并测试。');
  }
  if (command === 'test-submit') {
    if (!task.version || task.web !== '可预览' || task.baselineState !== '已确认' || task.round === '执行中') return formErrorOrModal('请补齐已确认需求、固定候选版本和可访问预览，并等待当前轮次结束。', 'task-tab:context');
    if (task.test !== '未提交') return toast('当前候选版本已提交测试，可登记或更新结果。');
    task.test = '待测试'; event(task, `${task.version} 已提交测试`); return finish('已提交本地测试，可继续登记报告。');
  }
  if (command === 'test-result') return modal('登记测试结果', `<div class="notice">${esc(task.version)} · Mock 沙箱 · 测试结果仅记录在本地演示中。</div><div class="gap">${field('测试结论', 'test-result', task.test === '不通过' ? '不通过' : '通过', { choices: ['通过', '不通过', '阻塞'] })}${field('测试报告与证据说明', 'test-evidence', task.testEvidence, { required: true, textarea: true, max: 2000 })}</div>`, formActions('test-save', '保存测试结果'));
  if (command === 'test-save') {
    if (!value('test-evidence')) return formError('请填写测试报告或证据说明。', 'test-evidence');
    if (!task.version || task.web !== '可预览' || task.baselineState !== '已确认') return formError('请先确认需求、候选版本和预览状态。');
    if (task.accept === '通过') snapshot(task, '测试结论更新');
    task.test = value('test-result'); task.testEvidence = value('test-evidence'); task.accept = task.test === '通过' ? '待验收' : '未提交'; task.release = '未申请';
    event(task, `${task.version} 测试${task.test}，${task.testEvidence}`); return finish('测试结果已保存，业务验收状态已同步。');
  }
  if (command === 'check') {
    const check = task.checks.find(item => item.id === key);
    return modal(`${check.id} · ${check.name}`, `<div class="notice">${check.expected}<br>候选版本 ${esc(task.version || '待固定')}</div><div class="gap">${field('结论', 'check-result', check.result, { choices: ['未验证', '通过', '不通过'] })}${field('实际结果', 'check-actual', check.actual, { required: true, textarea: true, max: 2000 })}${field('证据名称与说明', 'check-evidence', check.evidence, { required: true, textarea: true, max: 2000 })}</div>`, formActions(`check-save:${key}`, '保存验收项'));
  }
  if (command === 'check-save') {
    if (!task.version) return formError('请先固定候选版本。');
    if (value('check-result') !== '未验证' && (!value('check-actual') || !value('check-evidence'))) return formError('记录已验证结论前，请补齐实际结果和证据说明。');
    if (task.accept === '通过') snapshot(task, '验收项重新登记');
    Object.assign(task.checks.find(item => item.id === key), { result: value('check-result'), actual: value('check-actual'), evidence: value('check-evidence') });
    task.accept = '验收中'; task.release = '未申请'; event(task, `${key} 已记录为${value('check-result')}`); return finish('验收项已保存，请核对汇总结论。');
  }
  if (command === 'accept-conclusion') return modal('业务验收汇总', field('汇总结论', 'accept-result', '通过', { choices: ['通过', '退回', '暂缓'] }) + field('结论说明', 'accept-note', '', { required: true, textarea: true, max: 2000 }) + '<div class="notice amber">通过前核对需求、候选版本、预览、独立测试及全部必验项和证据。</div>', formActions('accept-save', '记录汇总结论'));
  if (command === 'accept-save') {
    if (!value('accept-note')) return formError('请填写结论说明。', 'accept-note');
    if (value('accept-result') === '通过' && validationMissing(task).length) return formError('暂不能通过\n' + validationMissing(task).join('；'));
    if (task.accept === '通过') snapshot(task, '汇总结论更新');
    task.accept = value('accept-result'); task.release = '未申请'; event(task, `业务验收${task.accept}，${value('accept-note')}`); return finish('业务验收已记录，发布状态单独维护。');
  }
  if (command === 'release') return modal('发布记录 · 本地模拟', `<div class="version-box"><strong>${esc(task.version || '尚无候选版本')}</strong><p>业务验收 ${badge(task.accept)} · 发布 ${badge(task.release)}</p></div><p class="sub gap">验收通过后可模拟发布结果。发布失败保留业务验收结论，并允许重试。</p>`, button('关闭', 'close') + button('模拟发布失败', 'release-fail', 'danger', locked(task) || task.accept !== '通过' || !!validationMissing(task).length) + button('模拟发布成功', 'release-success', 'primary', locked(task) || task.accept !== '通过' || !!validationMissing(task).length));
  if (command === 'release-fail' || command === 'release-success') {
    if (validationMissing(task).length || task.accept !== '通过') return;
    task.release = command === 'release-fail' ? '发布失败' : '发布成功'; event(task, `${task.version} ${task.release}，业务验收结论保留`); return finish('发布结果已记录。');
  }
  if (command === 'archives') return modal('版本归档与历史结果', task.archives.length ? task.archives.map(item => `<div class="details-block"><h3>${esc(item.version || '无候选版本')} · ${esc(item.reason)}</h3><p class="sub">${item.time} · PRD 1.${item.baseline}</p><p>测试 ${badge(item.test)} · 验收 ${badge(item.accept)} · 发布 ${badge(item.release)}</p><p>${esc(item.testEvidence || '未登记测试报告')}</p>${item.checks.map(check => `<p>${check.id} · ${badge(check.result)}<br>${esc(check.actual)}<br><span class="sub">${esc(check.evidence)}</span></p>`).join('')}</div>`).join('') : empty('暂无版本归档', '需求或候选版本变化后，旧验证会保留在这里。'), button('关闭', 'close'), 'drawer');
  if (command === 'knowledge-upload') return resourceForm('文档');
  if (command === 'skill-new') return resourceForm('Skill');
  if (command === 'resource-edit') {
    const resource = demo.knowledge.find(item => item.id === key);
    return resourceForm(resource.kind, resource.id);
  }
  if (command === 'resource-save') return saveResource(key, id);
  if (command === 'resource') return resourceDetail(demo.knowledge.find(item => item.id === key));
  if (command === 'resource-review') {
    const resource = demo.knowledge.find(item => item.id === key);
    const target = resource.pending || resource;
    if (target.status === '草稿') { target.status = '待审核'; target.updated = now(); save(); render(); return resourceDetail(resource); }
    if (target.status === '待审核') return modal('审核并记录生效', `<h3>${esc(target.name)} · V${target.version}</h3>` + field('审核说明', 'review-note', '', { required: true, textarea: true }) + '<p class="sub">生效后在适用范围内可关联，历史任务和轮次保留原版本。</p>', formActions(`resource-publish:${key}`, '审核通过并生效'));
  }
  if (command === 'resource-publish') {
    if (!value('review-note')) return formError('请填写审核说明。', 'review-note');
    const resource = demo.knowledge.find(item => item.id === key);
    if (resource.pending) {
      resource.versions.unshift({ version: resource.version, body: resource.body });
      const pending = resource.pending;
      Object.assign(resource, pending); delete resource.pending;
    }
    resource.status = '生效'; resource.updated = now(); resource.reviewNote = value('review-note');
    return finish('已记录生效，可在适用任务中关联该版本。');
  }
  if (command === 'resource-return') {
    const resource = demo.knowledge.find(item => item.id === key);
    (resource.pending || resource).status = '草稿'; save(); render(); return resourceDetail(resource);
  }
  if (command === 'resource-archive') {
    const resource = demo.knowledge.find(item => item.id === key);
    if (resource.status === '已归档') { resource.status = '草稿'; resource.updated = now(); return finish('已恢复为草稿，审核生效后可重新引用。'); }
    return modal('归档资源', `<p>归档“${esc(resource.name)}”后，新执行不能继续使用该关联；历史轮次保留引用版本。</p>`, formActions(`resource-archive-confirm:${key}`, '确认归档'));
  }
  if (command === 'resource-archive-confirm') { const resource = demo.knowledge.find(item => item.id === key); resource.status = '已归档'; resource.updated = now(); return finish('资源已归档，历史引用保留。'); }
  if (command === 'resource-delete') {
    const used = demo.tasks.filter(item => item.refs.some(ref => ref.id === key));
    if (used.length) return modal('资源仍有关联', `<p>先在任务上下文调整当前引用，历史轮次快照保留。</p>${used.map(item => `<p>${button(`${item.id} · ${esc(item.name)}`, `go:task/${item.id}`, 'link')}</p>`).join('')}`, button('关闭', 'close'));
    return modal('删除演示资源', '<p>清理该资源的本地版本记录与演示内容，历史轮次中的固定引用摘要保留。</p>', formActions(`resource-delete-confirm:${key}`, '确认删除'));
  }
  if (command === 'resource-delete-confirm') { demo.knowledge = demo.knowledge.filter(item => item.id !== key); return finish('演示资源已删除。'); }
  if (command === 'credential-new') return credentialForm();
  if (command === 'credential-edit') return credentialForm(key);
  if (command === 'credential-save') {
    for (const [name, label] of [['credential-name', '凭证名称'], ['credential-identifier', '凭证标识'], ['credential-address', '服务器地址 / AppID']]) {
      if (!value(name)) return formError(`请填写${label}。`, name);
    }
    if (value('credential-scope') === '项目' && !value('credential-project')) return formError('请选择所属项目。', 'credential-project');
    const existing = demo.credentials.find(item => item.id === key);
    if (demo.credentials.some(item => item.id !== key && item.identifier === value('credential-identifier'))) return formError('该凭证标识已存在。', 'credential-identifier');
    if (!existing?.configured && !value('credential-secret')) return formError('请填写演示秘密字段以登记已配置状态。', 'credential-secret');
    if (existing && existing.auth !== value('credential-auth') && !value('credential-secret')) return formError('更换认证方式时，请重新填写对应的演示秘密字段。', 'credential-secret');
    const credential = existing || { id: uid('CR') };
    Object.assign(credential, { category: value('credential-category'), type: value('credential-type'), name: value('credential-name'), identifier: value('credential-identifier'), scope: value('credential-scope'), projectId: value('credential-scope') === '项目' ? value('credential-project') : '', address: value('credential-address'), username: value('credential-username'), auth: value('credential-auth'), configured: !!(existing?.configured || value('credential-secret')), note: value('credential-note'), status: value('credential-status') });
    if (!existing) demo.credentials.unshift(credential);
    $('#credential-secret').value = '';
    return finish('凭证配置已保存为演示状态。');
  }
  if (command === 'credential-toggle') {
    const credential = demo.credentials.find(item => item.id === key);
    if (!credential.configured && credential.status === '停用') return toast('请先编辑并配置该凭证。');
    return modal(credential.status === '启用' ? '停用凭证' : '启用凭证', `<p>${esc(credential.name)}</p><div class="notice amber">范围内的新一轮执行将重新检查凭证状态，已记录轮次保留快照。</div>`, formActions(`credential-toggle-confirm:${key}`, '确认'));
  }
  if (command === 'credential-toggle-confirm') { const credential = demo.credentials.find(item => item.id === key); credential.status = credential.status === '启用' ? '停用' : '启用'; return finish('凭证状态已更新。'); }
  if (command === 'credential-delete') {
    const used = demo.tasks.filter(item => item.credentialId === key);
    if (used.length) return modal('凭证仍有关联', `<p>请先在以下任务的上下文中解绑或更换凭证，再删除。</p>${used.map(item => `<p>${button(`${item.id} · ${esc(item.name)}`, `go:task/${item.id}`, 'link')}</p>`).join('')}`, button('关闭', 'close'));
    return modal('删除演示凭证', '<p>删除该凭证的本地演示配置，历史轮次快照保留。</p>', formActions(`credential-delete-confirm:${key}`, '确认删除'));
  }
  if (command === 'credential-delete-confirm') { demo.credentials = demo.credentials.filter(item => item.id !== key); return finish('演示凭证已删除。'); }
  if (command === 'logs-analyze' || command === 'logs-retry') {
    if (!selectedFlows.length) selectedFlows = task.runs.filter(run => run.status !== '执行中').slice(0, 3).map(run => run.id);
    if (!selectedFlows.length) return toast('当前没有可分析的 Flow。');
    if (selectedFlows.length > 10) return toast('最多同时分析 10 个 Flow。');
    if (task.logError && command !== 'logs-retry') return render();
    task.logError = false;
    selectedReportId = uid('RPT');
    task.reports.unshift({ id: selectedReportId, flowIds: [...selectedFlows], time: now(), text: '请重点核对执行结束原因、引用版本及最终产物。轮次失败时可保留已生成的候选产物，修复后重新执行并复验。此内容为预置模拟分析。', followUps: [] });
    event(task, '已生成本地日志分析报告'); return finish('本地模拟分析报告已生成，可继续追问。');
  }
  if (command === 'logs-follow') {
    if (!value('follow-up')) return toast('请输入追问内容。');
    const report = task.reports.find(item => item.id === selectedReportId) || task.reports[0];
    report.followUps.push(value('follow-up')); event(task, '新增日志分析追问'); return finish('追问已记录。');
  }
  if (command === 'members') return modal('团队成员', table(['成员', '角色'], PEOPLE.map((person, index) => row([person, index === 0 ? '团队管理员、项目管理员' : index === 1 ? '项目开发人员' : '测试人员']))), button('关闭', 'close'));
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('地址已复制。'); }
  catch { modal('复制地址', field('地址', 'copy-address', text, { help: '当前浏览器未授予自动复制权限，可手动选中复制。' }), button('关闭', 'close')); }
}

async function saveResource(kind, id) {
  if (!value('resource-scope')) return formError('请选择知识归属。', 'resource-scope');
  if (value('resource-scope') === '项目' && !value('resource-project')) return formError('请选择所属项目。', 'resource-project');
  if (!value('resource-name')) return formError('请填写名称。', 'resource-name');
  const resource = demo.knowledge.find(item => item.id === id);
  const files = [...$('#resource-file').files];
  if (files.some(file => file.size > 5 * 1024 * 1024)) return formError('单个文件不能超过 5 MiB。');
  if (kind === '文档' && files.some(file => !/\.(md|txt|pdf|docx)$/i.test(file.name))) return formError('请选择 Markdown、文本、PDF 或 Word 文档。');
  if (kind === 'Skill' && files.length > 1) return formError('Skill 模式每次请选择一个文件。');
  const scope = value('resource-scope');
  const data = { name: value('resource-name'), kind, scope, team: scope === '团队' ? value('resource-team') : projectById(value('resource-project'))?.team || '', projectId: scope === '项目' ? value('resource-project') : '', type: value('resource-type'), body: value('resource-body'), files: files.length ? files.map(file => file.name) : resource?.files || [], status: '草稿', updated: now() };
  if (kind === 'Skill') {
    const domains = value('skill-domain').split(/[,，、]/).map(text => text.trim()).filter(Boolean);
    const abilities = value('skill-ability').split(/[,，、]/).map(text => text.trim()).filter(Boolean);
    const phases = $$('input[name=skill-phase]:checked').map(input => input.value);
    if ([domains, abilities, phases].some(items => !items.length || items.length > 5)) return formError('领域、能力和研发阶段每类均需选择或填写 1～5 个。');
    if (!value('skill-boundary')) return formError('请填写适用场景与边界。', 'skill-boundary');
    const zipMode = $('input[name=skill-mode]:checked').value === 'zip';
    if (zipMode && !(files[0]?.name || resource?.files?.[0] || '').toLowerCase().endsWith('.zip')) return formError('ZIP 模式请选择 .zip 文件。');
    if (!zipMode && files.some(file => !/\.md$/i.test(file.name))) return formError('单文件模式请选择 .md 文件。');
    if (!zipMode && !data.body) return formError('请填写 SKILL.md 全文。', 'resource-body');
    Object.assign(data, { domain: [...new Set(domains)].join('、'), ability: [...new Set(abilities)].join('、'), phase: phases.join('、'), boundary: value('skill-boundary'), mode: zipMode ? 'zip' : 'single' });
    if (zipMode) data.body = 'ZIP 包已登记，目录与正文解析待真实平台核验。';
  } else if (!resource && !files.length) return formError('请至少选择一个文档文件。');
  if (resource?.status === '生效') resource.pending = { ...data, version: resource.version + 1 };
  else if (resource) Object.assign(resource, data);
  else if (kind === '文档' && files.length > 1) {
    files.forEach(file => demo.knowledge.unshift({ ...data, id: uid('KD'), name: file.name, files: [file.name], version: 1, versions: [] }));
  } else demo.knowledge.unshift({ ...data, id: uid(kind === 'Skill' ? 'SK' : 'KD'), version: 1, versions: [] });
  return finish('草稿已保存，下一步可在详情提交审核。');
}

document.addEventListener('click', eventObject => {
  const element = eventObject.target.closest('[data-action]');
  if (!element || element.disabled) return;
  action(element.dataset.action);
});
document.addEventListener('input', eventObject => {
  const element = eventObject.target;
  if (element.id === 'message') {
    currentTask().draft = element.value; save();
    $('#message-count').textContent = `${element.value.length.toLocaleString()} / 150,000`;
    $('[data-action="send"]').disabled = !element.value.trim() && !attachmentDraft.length;
  }
  if (element.dataset.filter && element.tagName === 'INPUT') {
    const position = element.selectionStart;
    const name = element.dataset.filter;
    filters[name] = element.value;
    render();
    const replacement = $(`[data-filter="${name}"]`);
    replacement.focus(); replacement.setSelectionRange(position, position);
  }
  if (element.getAttribute('aria-invalid') === 'true') {
    element.removeAttribute('aria-invalid');
    const errorElement = $(`#${element.id}-error`);
    if (errorElement) errorElement.textContent = '';
  }
});
document.addEventListener('change', async eventObject => {
  const element = eventObject.target;
  if (element.id === 'role') { demo.role = element.value; save(); return render(); }
  if (element.dataset.filter) { filters[element.dataset.filter] = element.value; return render(); }
  if (element.id === 'project-agent') $('#template-field').hidden = element.value !== AGENTS[0];
  if (element.id === 'resource-scope') {
    $('#resource-team-field').hidden = element.value !== '团队';
    $('#resource-project-field').hidden = element.value !== '项目';
  }
  if (element.id === 'credential-scope') $('#credential-project-field').hidden = element.value !== '项目';
  if (element.id === 'credential-category') {
    $('#credential-type').innerHTML = CREDENTIAL_TYPES[element.value].map(type => `<option>${type}</option>`).join('');
    $('#credential-auth').value = { Git: 'Token', 微信: 'CLI 私钥', 第三方: 'Token', 服务器: 'SSH 私钥' }[element.value];
  }
  if (element.name === 'skill-mode') {
    const zip = element.value === 'zip';
    $('#resource-file').accept = zip ? '.zip' : '.md';
    $('#resource-file').value = '';
    $('#skill-body-field').hidden = zip;
  }
  if (element.id === 'resource-file') {
    const files = [...element.files];
    if (files.length && !value('resource-name')) $('#resource-name').value = files[0].name.replace(/\.[^.]+$/, '');
    if ($('#file-summary')) $('#file-summary').textContent = files.map(file => `${file.name} (${Math.ceil(file.size / 1024)} KiB)`).join('、');
    const file = files[0];
    if (file && /\.md$/i.test(file.name) && file.size <= 5 * 1024 * 1024 && $('input[name=skill-mode]')) {
      const text = await file.text();
      if ($('#resource-body')) $('#resource-body').value = text;
    }
  }
  if (element.dataset.flow) {
    if (element.checked && selectedFlows.length >= 10) { element.checked = false; return toast('最多同时分析 10 个 Flow。'); }
    selectedFlows = element.checked ? [...selectedFlows, element.dataset.flow] : selectedFlows.filter(id => id !== element.dataset.flow);
    return render();
  }
  if (element.id === 'report-history') {
    selectedReportId = currentTask().reports[Number(element.value)].id;
    $('#report-content').innerHTML = reportContent(currentTask().reports[Number(element.value)]);
  }
});
document.addEventListener('dragover', eventObject => {
  if (eventObject.target.closest('.filebox')) eventObject.preventDefault();
});
document.addEventListener('drop', eventObject => {
  const box = eventObject.target.closest('.filebox');
  if (!box) return;
  eventObject.preventDefault();
  const input = box.querySelector('input[type=file]');
  if (!input || !eventObject.dataTransfer.files.length) return;
  input.files = eventObject.dataTransfer.files;
  input.dispatchEvent(new Event('change', { bubbles: true }));
});
document.addEventListener('keydown', eventObject => {
  if (eventObject.key === 'Escape') return closeModal();
  if (eventObject.target.id === 'message' && eventObject.key === 'Enter' && !eventObject.shiftKey && !eventObject.isComposing) {
    eventObject.preventDefault(); return action('send');
  }
  if (eventObject.key === 'Tab' && $('#overlay .modal')) {
    const elements = $$('#overlay button:not(:disabled), #overlay input:not(:disabled), #overlay select:not(:disabled), #overlay textarea:not(:disabled), #overlay summary').filter(element => element.offsetParent !== null);
    const first = elements[0], last = elements.at(-1);
    if (eventObject.shiftKey && document.activeElement === first) { last.focus(); eventObject.preventDefault(); }
    else if (!eventObject.shiftKey && document.activeElement === last) { first.focus(); eventObject.preventDefault(); }
  }
});
window.addEventListener('hashchange', navigate);
navigate();
