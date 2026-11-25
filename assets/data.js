'use strict';

const DEMO_STORE = 'daovibe-prototype-v03';
const DEMO_SCHEMA = 3;
const AGENTS = ['BMAD 研发助手', '通用执行助手', '海鹚B端业务 Agent', '海鹚B端业务标板AGENT'];
const TEAMS = ['海鹚交付团队', '通用产品团队'];
const PEOPLE = ['陈敏', '林舟', '许然'];
const KNOWLEDGE_TYPES = ['产品与业务知识', '代码仓库知识', '环境与部署知识'];
const STAGES = ['待确认', '执行中', '待测试', '待验收', '已关闭'];
const CREDENTIAL_TYPES = {
  Git: ['Git HTTP(S)', 'Git SSH'],
  微信: ['微信小程序上传'],
  第三方: ['Jira', 'API Token'],
  服务器: ['服务器登录（SSH）']
};

function makeChecks(industry = '医疗') {
  const medical = industry === '医疗';
  return [
    { id: 'AC-01', name: medical ? '按院区查询体检套餐' : '按条件查询业务记录', expected: '仅显示当前范围内符合条件的数据，字段与生效规则一致。', required: true },
    { id: 'AC-02', name: medical ? '重复提交预约' : '重复提交业务单据', expected: '重复点击只产生一笔有效记录，并提供明确反馈。', required: true },
    { id: 'AC-03', name: '接口超时与恢复', expected: '超时状态可追踪，重试不产生重复业务记录。', required: true },
    { id: 'AC-04', name: '空数据提示', expected: '说明无数据原因，并提供返回或重试入口。', required: false }
  ].map(item => ({ ...item, result: '未验证', actual: '', evidence: '' }));
}

function makeTask(id, projectId, name, owner, industry = '医疗') {
  return {
    id, projectId, name, owner, industry, goal: '明确本轮业务目标、边界、异常规则和验收依据。',
    priority: '普通', stage: '待确认', round: '未开始', lifecycle: '在用',
    baseline: 1, baselineState: '待确认', version: '', web: '未生成', mini: '未生成',
    test: '未提交', testEvidence: '', accept: '未提交', release: '未申请',
    checks: makeChecks(industry), refs: [], credentialId: '', messages: [], draft: '',
    attachments: [], runs: [], archives: [], events: [], reports: [], logError: false,
    created: '2026-11-18 10:00', updated: '2026-11-18 10:00',
    credentialSnapshot: null
  };
}

function makeSeed() {
  const projects = [
    { id: 'PRJ-001', name: '智慧医院 · 存量需求优化', team: TEAMS[0], owner: '陈敏', agent: AGENTS[3], industry: '医疗', description: '围绕体检、预约与门诊服务，逐项确认需求、产物与业务验收。', status: '进行中', lifecycle: '在用', template: false, created: '2026-11-06 10:30', updated: '2026-11-18 10:42', events: [] },
    { id: 'PRJ-002', name: '三大目录演示', team: TEAMS[0], owner: '林舟', agent: AGENTS[3], industry: '医疗', description: 'PC 管理端、患者端小程序与后台服务的多端产物对照。', status: '未开始', lifecycle: '在用', template: false, created: '2026-11-05 14:54', updated: '2026-11-17 15:01', events: [] },
    { id: 'PRJ-003', name: '供应链协同 · 订单变更', team: TEAMS[1], owner: '许然', agent: AGENTS[1], industry: '通用', description: '验证需求确认、执行、测试与验收流程的跨行业适用性。', status: '进行中', lifecycle: '在用', template: false, created: '2026-11-12 09:30', updated: '2026-11-17 14:28', events: [] },
    { id: 'PRJ-004', name: '1110-1.3.0 发布验证', team: TEAMS[0], owner: '陈敏', agent: AGENTS[3], industry: '医疗', description: '候选版本、测试与发布结果分别留痕。', status: '未开始', lifecycle: '在用', template: false, created: '2026-11-10 15:16', updated: '2026-11-10 15:16', events: [] },
    { id: 'PRJ-005', name: 'BMAD 研发试点', team: TEAMS[1], owner: '林舟', agent: AGENTS[0], industry: '通用', description: '从已确认需求开始，试用研发助手与项目模板。', status: '未开始', lifecycle: '在用', template: true, created: '2026-11-11 15:08', updated: '2026-11-11 15:08', events: [] },
    { id: 'PRJ-006', name: '历史框架验证', team: TEAMS[0], owner: '陈敏', agent: AGENTS[2], industry: '医疗', description: '已归档样例，可查看历史、恢复后继续协作。', status: '已暂停', lifecycle: '已归档', template: false, created: '2026-10-26 16:31', updated: '2026-11-01 09:00', events: [] }
  ];
  const main = makeTask('DV-102', 'PRJ-001', '体检服务 · 套餐与预约优化', '陈敏');
  Object.assign(main, {
    goal: '按院区筛选套餐，处理重复预约和接口超时，补齐空态与失败反馈。医疗样例中的 HIS 需另行联调。',
    stage: '待测试', round: '本轮已完成', baseline: 2, baselineState: '已确认',
    version: 'RC-20261118.01', web: '可预览', mini: '已生成·真机待验证', credentialId: 'CR-001',
    refs: [{ id: 'KD-001', name: '体检预约业务规则', version: 2, kind: '文档', source: '人工关联' }],
    messages: [
      { role: 'user', text: '请按已确认的需求基线优化套餐筛选、重复预约和接口超时反馈，保留异常状态。', time: '2026-11-18 10:02', files: [] },
      { role: 'agent', text: '本轮已完成，已生成候选版本 RC-20261118.01。\nPC 管理端可预览，小程序已生成预览记录，真机业务待验证。下一步请核对候选版本并提交测试。', time: '2026-11-18 10:42', files: [] }
    ],
    runs: [{ id: 'FLOW-001', status: '本轮已完成', reason: '正常结束', version: 'RC-20261118.01', refs: [{ name: '体检预约业务规则', version: 2, source: '人工关联快照' }], baseline: 2, duration: '2分57秒', time: '2026-11-18 10:42' }],
    events: [{ text: '候选版本已生成，等待测试', time: '2026-11-18 10:42' }]
  });
  const failed = makeTask('DV-103', 'PRJ-001', '表扬管理 · 患者端预览', '林舟');
  Object.assign(failed, { stage: '执行中', round: '失败', baselineState: '已确认', version: 'RC-20261117.02', web: '可预览',
    runs: [{ id: 'FLOW-002', status: '失败', reason: '最终答复校验未通过', version: 'RC-20261117.02', refs: [], baseline: 1, duration: '3分10秒', time: '2026-11-17 14:28' }], logError: true,
    messages: [{ role: 'agent', text: '本轮最终答复校验未通过。已有产物可预览，请结合 Flow 与产物分别核查后决定是否重试。', time: '2026-11-17 14:28', files: [] }] });
  const pending = makeTask('DV-104', 'PRJ-001', '门诊缴费 · 超时状态核对', '许然');
  pending.goal = '等待产品确认接口超时后的业务状态与重试规则。';
  pending.round = '待回复';
  const ready = makeTask('DV-105', 'PRJ-001', '报告查询 · 文案与空态', '陈敏');
  Object.assign(ready, { stage: '待验收', round: '本轮已完成', baselineState: '已确认', version: 'RC-20261116.01', web: '可预览', test: '通过', testEvidence: 'TR-105 · 空态与文案回归报告（演示）', accept: '待验收' });
  const catalog = makeTask('DV-201', 'PRJ-002', '合并版本演示', '林舟');
  Object.assign(catalog, { stage: '待测试', round: '本轮已完成', baselineState: '已确认', version: 'merge-demo-v9', web: '可预览', mini: '已生成·真机待验证' });
  const order = makeTask('DV-301', 'PRJ-003', '订单变更 · 审批与重复提交', '许然', '通用');
  return {
    schema: DEMO_SCHEMA, role: '产品经理', navCollapsed: false, inspectorHidden: false,
    selectedProject: 'PRJ-001', selectedTask: 'DV-102', nextId: 400, projects,
    tasks: [main, failed, pending, ready, catalog, order],
    knowledge: [
      { id: 'KD-001', kind: '文档', name: '体检预约业务规则', scope: '团队', team: TEAMS[0], projectId: '', type: KNOWLEDGE_TYPES[0], version: 2, status: '生效', body: '按院区查询套餐。重复提交不产生重复预约。接口超时后保留可追踪状态并允许重试。医疗试点样例，真实 HIS 待联调。', files: ['体检预约业务规则.md'], versions: [{ version: 1, body: '初版业务规则。' }], updated: '2026-11-18 09:30' },
      { id: 'KD-002', kind: '文档', name: '桌面端界面与交互规范', scope: '租户', team: '', projectId: '', type: KNOWLEDGE_TYPES[0], version: 1, status: '生效', body: '主次按钮、字段校验、空态、异常恢复、明确的状态和操作反馈。', files: [], versions: [], updated: '2026-11-16 14:00' },
      { id: 'KD-003', kind: '文档', name: 'HIS 接口字段约定', scope: '项目', team: TEAMS[0], projectId: 'PRJ-001', type: KNOWLEDGE_TYPES[2], version: 1, status: '待审核', body: 'Mock 接口说明草稿，真实字段及幂等规则待确认。', files: [], versions: [], updated: '2026-11-17 16:20' },
      { id: 'SK-001', kind: 'Skill', name: '重复提交与异常恢复检查', scope: '团队', team: TEAMS[0], projectId: '', type: KNOWLEDGE_TYPES[0], version: 1, status: '草稿', body: '核对需求基线、固定候选版本、检查重复提交与超时恢复，逐项登记结果和证据。', boundary: '测试环境使用，业务预期需人工确认。', domain: '通用软件', ability: '异常检查', phase: '测试', files: [], versions: [], updated: '2026-11-18 09:00' }
    ],
    credentials: [
      { id: 'CR-001', name: 'demo-web-repository', identifier: 'demo/web-app', category: 'Git', type: 'Git HTTP(S)', scope: '当前租户', projectId: '', address: 'https://git.example.invalid/demo/web-app.git', username: 'demo-user', auth: 'Token', configured: true, status: '启用', note: '原型示例仓库凭证' },
      { id: 'CR-002', name: 'demo-mini-preview', identifier: 'demo-mini', category: '微信', type: '微信小程序上传', scope: '项目', projectId: 'PRJ-001', address: 'demo-appid', username: '', auth: 'CLI 私钥', configured: true, status: '启用', note: '小程序预览样例' },
      { id: 'CR-003', name: 'demo-test-server', identifier: 'demo/test-server', category: '服务器', type: '服务器登录（SSH）', scope: '当前租户', projectId: '', address: 'test.example.invalid:22', username: 'demo', auth: 'SSH 私钥', configured: false, status: '停用', note: '待配置测试环境' },
      { id: 'CR-004', name: 'demo-jira', identifier: 'demo/jira', category: '第三方', type: 'Jira', scope: '当前租户', projectId: '', address: 'https://jira.example.invalid', username: 'demo', auth: 'Token', configured: true, status: '启用', note: '' }
    ], events: []
  };
}
