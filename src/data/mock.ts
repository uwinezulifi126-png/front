import type {
  AlertItem,
  LadderRow,
  MarketStat,
  NewsItem,
  SectorDetail,
  SectorHeatItem,
  Stock,
  StrongStock,
} from '../types'

export const TODAY = '2026-08-07'

function guessTsCode(code: string): string {
  if (code.startsWith('6') || code.startsWith('9')) return `${code}.SH`
  return `${code}.SZ`
}

export const generateStocks = (): Stock[] => [
  { code: '300750', tsCode: guessTsCode('300750'), name: '宁德时代', price: 231.8, change: 21.08, pct: 10.0, volume: 128.4, amount: 29.7, limitTime: '09:31', opens: 0, sector: '新能源', status: 'locked', strength: 97, bidAmount: 32.4, riseSpeed: 3.21 },
  { code: '002594', tsCode: guessTsCode('002594'), name: '比亚迪', price: 187.56, change: 17.05, pct: 10.0, volume: 92.1, amount: 17.3, limitTime: '09:33', opens: 1, sector: '新能源', status: 'locked', strength: 88, bidAmount: 18.6, riseSpeed: 2.87 },
  { code: '600519', tsCode: guessTsCode('600519'), name: '贵州茅台', price: 1892.0, change: 172.0, pct: 10.0, volume: 8.2, amount: 15.5, limitTime: '09:46', opens: 0, sector: '消费电子', status: 'sealed', strength: 72, bidAmount: 9.1, riseSpeed: 1.54 },
  { code: '000858', tsCode: guessTsCode('000858'), name: '五粮液', price: 156.78, change: 14.25, pct: 10.0, volume: 34.5, amount: 5.4, limitTime: '10:02', opens: 2, sector: '消费电子', status: 'open', strength: 51, bidAmount: 3.2, riseSpeed: 0.93 },
  { code: '688599', tsCode: guessTsCode('688599'), name: '天合光能', price: 23.46, change: 2.13, pct: 10.0, volume: 218.7, amount: 5.1, limitTime: '09:35', opens: 0, sector: '光伏', status: 'locked', strength: 94, bidAmount: 12.7, riseSpeed: 4.12 },
  { code: '002415', tsCode: guessTsCode('002415'), name: '海康威视', price: 34.88, change: 3.17, pct: 10.0, volume: 176.3, amount: 6.1, limitTime: '09:42', opens: 0, sector: '人工智能', status: 'locked', strength: 85, bidAmount: 8.3, riseSpeed: 2.44 },
  { code: '300059', tsCode: guessTsCode('300059'), name: '东方财富', price: 18.34, change: 1.67, pct: 10.0, volume: 423.6, amount: 7.8, limitTime: '09:30', opens: 0, sector: '数据要素', status: 'locked', strength: 99, bidAmount: 41.2, riseSpeed: 5.67 },
  { code: '600900', tsCode: guessTsCode('600900'), name: '长江电力', price: 28.64, change: 2.6, pct: 10.0, volume: 89.2, amount: 2.6, limitTime: '09:58', opens: 1, sector: '储能', status: 'sealed', strength: 63, bidAmount: 4.1, riseSpeed: 1.18 },
  { code: '688561', tsCode: guessTsCode('688561'), name: '奇安信', price: 67.24, change: 6.11, pct: 10.0, volume: 44.8, amount: 3.0, limitTime: '10:15', opens: 3, sector: '人工智能', status: 'open', strength: 38, bidAmount: 1.8, riseSpeed: 0.62 },
  { code: '300014', tsCode: guessTsCode('300014'), name: '亿纬锂能', price: 43.12, change: 3.92, pct: 10.0, volume: 112.3, amount: 4.8, limitTime: '09:37', opens: 0, sector: '新能源', status: 'locked', strength: 91, bidAmount: 16.4, riseSpeed: 3.55 },
  { code: '002049', tsCode: guessTsCode('002049'), name: '紫光国微', price: 89.6, change: 8.15, pct: 10.0, volume: 56.9, amount: 5.1, limitTime: '09:50', opens: 0, sector: '半导体', status: 'locked', strength: 79, bidAmount: 6.7, riseSpeed: 1.89 },
  { code: '601127', tsCode: guessTsCode('601127'), name: '赛力斯', price: 74.32, change: 6.76, pct: 10.0, volume: 138.4, amount: 10.3, limitTime: '09:44', opens: 1, sector: '新能源', status: 'sealed', strength: 68, bidAmount: 7.9, riseSpeed: 2.31 },
  { code: '688041', tsCode: guessTsCode('688041'), name: '海光信息', price: 112.4, change: 10.22, pct: 10.0, volume: 31.6, amount: 3.6, limitTime: '10:22', opens: 0, sector: '半导体', status: 'locked', strength: 83, bidAmount: 5.2, riseSpeed: 1.47 },
  { code: '300308', tsCode: guessTsCode('300308'), name: '中际旭创', price: 143.56, change: 13.05, pct: 10.0, volume: 48.7, amount: 7.0, limitTime: '09:31', opens: 0, sector: '人工智能', status: 'locked', strength: 96, bidAmount: 19.8, riseSpeed: 4.78 },
  { code: '600030', tsCode: guessTsCode('600030'), name: '中信证券', price: 25.84, change: 2.35, pct: 10.0, volume: 298.1, amount: 7.7, limitTime: '10:38', opens: 2, sector: '数据要素', status: 'open', strength: 42, bidAmount: 2.1, riseSpeed: 0.71 },
]

function seededRand(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return Math.abs(s) / 0x7fffffff
  }
}

export function generateStocksForDate(date: string): Stock[] {
  const seed = date.split('-').reduce((a, v) => a * 100 + parseInt(v, 10), 0)
  const rand = seededRand(seed)
  return generateStocks().map((s) => {
    const strength = s.strength ?? 50
    const bidAmount = s.bidAmount ?? 1
    return {
      ...s,
      strength: Math.min(99, Math.max(30, Math.round(strength * (0.85 + rand() * 0.3)))),
      bidAmount: +(Math.max(0.5, bidAmount * (0.7 + rand() * 0.6))).toFixed(1),
      status: (rand() > 0.75 ? 'open' : rand() > 0.55 ? 'sealed' : 'locked') as Stock['status'],
    }
  })
}

export const generateMarketStats = (): MarketStat[] => [
  { label: '涨停数', value: 87, sub: '今日', highlight: true },
  { label: '跌停数', value: 12, sub: '今日' },
  { label: '炸板数', value: 31, sub: '涨停后开板' },
  { label: '涨停封板率', value: '73.8%', sub: '封板成功' },
  { label: '平均涨幅', value: '+3.24%', sub: '全市场', highlight: true },
  { label: '上涨家数', value: 2847, sub: '家' },
  { label: '下跌家数', value: 1523, sub: '家' },
  { label: '成交额', value: '11,432亿', sub: '全市场', highlight: true },
]

export const LIMIT_CHAIN_DATA = [
  { date: '今天', count: 87 },
  { date: '昨天', count: 64 },
  { date: '前天', count: 102 },
  { date: '3天前', count: 45 },
  { date: '4天前', count: 78 },
]

export const SECTOR_HEAT: SectorHeatItem[] = [
  { name: '新能源', count: 18, pct: 4.82 },
  { name: '人工智能', count: 14, pct: 3.91 },
  { name: '半导体', count: 11, pct: 5.23 },
  { name: '医药生物', count: 9, pct: 2.14 },
  { name: '军工', count: 8, pct: 3.67 },
  { name: '光伏', count: 7, pct: 4.12 },
  { name: '储能', count: 6, pct: 3.44 },
  { name: '数据要素', count: 5, pct: 2.88 },
  { name: '消费电子', count: 4, pct: 1.76 },
  { name: '低空经济', count: 3, pct: 2.31 },
]

export const SECTOR_DETAIL: SectorDetail[] = [
  { name: '新能源', count: 18, locked: 14, open: 4, avgStrength: 88, topStock: '宁德时代', topPct: 10.0, amount: 86.4, leadingStocks: ['宁德时代', '比亚迪', '亿纬锂能', '赛力斯', '天合光能'] },
  { name: '人工智能', count: 14, locked: 10, open: 4, avgStrength: 79, topStock: '中际旭创', topPct: 10.0, amount: 48.2, leadingStocks: ['中际旭创', '海康威视', '奇安信', '科大讯飞', '寒武纪'] },
  { name: '半导体', count: 11, locked: 9, open: 2, avgStrength: 83, topStock: '海光信息', topPct: 10.0, amount: 32.7, leadingStocks: ['海光信息', '紫光国微', '中芯国际', '北方华创', '澜起科技'] },
  { name: '医药生物', count: 9, locked: 6, open: 3, avgStrength: 61, topStock: '迈瑞医疗', topPct: 10.0, amount: 21.3, leadingStocks: ['迈瑞医疗', '药明康德', '恒瑞医药', '爱尔眼科', '片仔癀'] },
  { name: '军工', count: 8, locked: 7, open: 1, avgStrength: 85, topStock: '中航沈飞', topPct: 10.0, amount: 18.9, leadingStocks: ['中航沈飞', '航天电子', '中国重工', '航发动力', '北方导航'] },
  { name: '光伏', count: 7, locked: 6, open: 1, avgStrength: 91, topStock: '天合光能', topPct: 10.0, amount: 24.1, leadingStocks: ['天合光能', '晶科能源', '隆基绿能', '通威股份', '阳光电源'] },
  { name: '储能', count: 6, locked: 4, open: 2, avgStrength: 72, topStock: '长江电力', topPct: 10.0, amount: 16.3, leadingStocks: ['长江电力', '南都电源', '鹏辉能源', '派能科技', '科陆电子'] },
  { name: '数据要素', count: 5, locked: 4, open: 1, avgStrength: 77, topStock: '东方财富', topPct: 10.0, amount: 19.8, leadingStocks: ['东方财富', '同花顺', '大智慧', '财富趋势', '恒生电子'] },
  { name: '消费电子', count: 4, locked: 2, open: 2, avgStrength: 54, topStock: '贵州茅台', topPct: 10.0, amount: 22.4, leadingStocks: ['贵州茅台', '五粮液', '歌尔股份', '立讯精密'] },
  { name: '低空经济', count: 3, locked: 3, open: 0, avgStrength: 90, topStock: '中直股份', topPct: 10.0, amount: 8.6, leadingStocks: ['中直股份', '万丰奥威', '宗申动力'] },
]

export const ALERTS: AlertItem[] = [
  { time: '13:47:23', msg: '东方财富 封单增加至 41.2亿', level: 'up' },
  { time: '13:45:11', msg: '中际旭创 涨停强度99 高度关注', level: 'up' },
  { time: '13:42:08', msg: '奇安信 三次开板 封板强度弱', level: 'warn' },
  { time: '13:38:55', msg: '中信证券 二度炸板 警惕风险', level: 'warn' },
  { time: '13:35:02', msg: '宁德时代 首板封单32亿强势', level: 'up' },
  { time: '13:31:14', msg: '五粮液 第2次打开涨停板', level: 'warn' },
]

export const INDEX_TICKERS = [
  { label: '上证', val: '3,412.86', pct: '+1.23%', up: true },
  { label: '深证', val: '10,823.45', pct: '+1.87%', up: true },
  { label: '创业板', val: '2,134.67', pct: '+2.41%', up: true },
  { label: '科创50', val: '987.32', pct: '-0.34%', up: false },
]

export const SENTIMENT = [
  { label: '市场热度', val: 78, color: 'var(--up-bright)' },
  { label: '资金活跃度', val: 85, color: 'var(--accent)' },
  { label: '板块轮动', val: 62, color: '#b794f4' },
]

export const DRAGON_TIGER = [
  { name: '华泰证券上海', net: '+3.84亿', dir: 'up' as const },
  { name: '中信证券北京', net: '+2.17亿', dir: 'up' as const },
  { name: '游资敦和', net: '+1.93亿', dir: 'up' as const },
  { name: '机构专用', net: '-2.41亿', dir: 'down' as const },
  { name: '量化对冲席位', net: '-1.68亿', dir: 'down' as const },
]

export const BOARD_RATES = [
  { label: '首板→二板', rate: '34%' },
  { label: '二板→三板', rate: '22%' },
  { label: '三板→四板', rate: '15%' },
  { label: '四板→五板', rate: '8%' },
]

export const NEWS_DATA: NewsItem[] = [
  // 昨日新闻头条
  { time: '昨日 21:45', tag: '财联社', urgent: true, category: 'yesterday', title: '央行宣布下调MLF利率10bp，释放流动性信号', body: '中国人民银行宣布，中期借贷便利（MLF）操作利率下调10个基点，至2.40%，本次操作规模1200亿元，市场流动性预期宽松。' },
  { time: '昨日 20:10', tag: '政策', urgent: true, category: 'yesterday', title: '证监会：研究优化转融通机制，限制做空行为', body: '证监会新闻发言人表示，正在研究进一步优化转融通相关制度，防范过度做空行为，切实维护市场公平秩序。' },
  { time: '昨日 18:30', tag: '财联社', urgent: false, category: 'yesterday', title: '7月CPI同比+0.8%，PPI同比-1.2%，通缩压力仍存', body: '国家统计局公布7月物价数据，CPI同比上涨0.8%，低于预期；PPI同比下降1.2%，工业品价格持续承压。' },
  { time: '昨日 17:55', tag: '证券时报', urgent: false, category: 'yesterday', title: '国防白皮书发布，未来五年军费增速维持8%以上', body: '国防部发布年度国防白皮书，明确未来五年国防预算增速不低于8%，重点支持信息化、智能化武器装备研发采购。' },
  { time: '昨日 16:20', tag: '热点', urgent: false, category: 'yesterday', title: '两市成交额连续三日破万亿，杠杆资金小幅回升', body: '沪深两市成交额连续三个交易日突破万亿元，融资余额较前一交易日增加约48亿元，市场交投情绪有所回暖。' },
  // 实时新闻：其它来源仍为示例；财联社实时改由 API（加红电报），不再用 mock 冒充
  { time: '13:52', tag: '热点', urgent: false, category: 'realtime', title: '工信部：加快推进人工智能产业发展专项政策落地', body: '工信部召开新闻发布会，强调加快AI大模型在制造业、医疗、教育等领域落地应用，相关配套政策将于下季度出台。' },
  { time: '13:48', tag: '上海证券报', urgent: false, category: 'realtime', title: '宁德时代麒麟3.0电池实现量产，能量密度再创新高', body: '宁德时代官方确认麒麟3.0电池系列正式进入量产阶段，能量密度达到330Wh/kg，较上代提升18%，首批供货比亚迪汉EV车型。' },
  { time: '13:41', tag: '中国证券报', urgent: false, category: 'realtime', title: '海光信息获国家大基金三期战略入股，持股比例5.2%', body: '国家集成电路产业投资基金三期正式入股海光信息，持股5.2%，成为第三大股东，国产算力芯片发展再获重磅背书。' },
  { time: '13:35', tag: '北向', urgent: false, category: 'realtime', title: '北向资金今日净流入82.4亿，连续三日净买入', body: '截至午盘，沪深股通北向资金合计净流入82.4亿元，重点加仓食品饮料、电力设备、银行板块。' },
]

export const NEWS_TAG_COLORS: Record<string, string> = {
  财联社: '#b794f4',
  热点: '#fc5252',
  上海证券报: '#48bb78',
  政策: '#f6ad55',
  中国证券报: '#76e4f7',
  证券时报: '#fc8181',
  北向: '#68d391',
}

export const LADDER_DATA: LadderRow[] = [
  { boards: 10, label: '十板', color: '#ff00ff', stocks: [{ code: '300750', name: '宁德时代', price: 231.8, sector: '新能源', amount: 29.7, strength: 99, limitTime: '09:31', zhaban: false }] },
  { boards: 9, label: '九板', color: '#e040fb', stocks: [{ code: '300059', name: '东方财富', price: 18.34, sector: '数据要素', amount: 7.8, strength: 97, limitTime: '09:30', zhaban: false }] },
  { boards: 8, label: '八板', color: '#ef5350', stocks: [
    { code: '688041', name: '海光信息', price: 112.4, sector: '半导体', amount: 3.6, strength: 95, limitTime: '09:31', zhaban: false },
    { code: '300308', name: '中际旭创', price: 143.56, sector: '人工智能', amount: 7.0, strength: 96, limitTime: '09:31', zhaban: false },
  ]},
  { boards: 7, label: '七板', color: '#f44336', stocks: [
    { code: '002049', name: '紫光国微', price: 89.6, sector: '半导体', amount: 5.1, strength: 88, limitTime: '09:42', zhaban: false },
    { code: '688599', name: '天合光能', price: 23.46, sector: '光伏', amount: 5.1, strength: 90, limitTime: '09:35', zhaban: true },
    { code: '002415', name: '海康威视', price: 34.88, sector: '人工智能', amount: 6.1, strength: 82, limitTime: '09:42', zhaban: false },
  ]},
  { boards: 6, label: '六板', color: '#ff7043', stocks: [
    { code: '002594', name: '比亚迪', price: 187.56, sector: '新能源', amount: 17.3, strength: 84, limitTime: '09:33', zhaban: false },
    { code: '300014', name: '亿纬锂能', price: 43.12, sector: '新能源', amount: 4.8, strength: 79, limitTime: '09:37', zhaban: true },
  ]},
  { boards: 5, label: '五板', color: '#ff8a65', stocks: [
    { code: '601127', name: '赛力斯', price: 74.32, sector: '新能源', amount: 10.3, strength: 76, limitTime: '09:44', zhaban: false },
    { code: '600900', name: '长江电力', price: 28.64, sector: '储能', amount: 2.6, strength: 68, limitTime: '09:58', zhaban: false },
    { code: '688561', name: '奇安信', price: 67.24, sector: '人工智能', amount: 3.0, strength: 55, limitTime: '10:15', zhaban: true },
  ]},
  { boards: 4, label: '四板', color: '#ffa726', stocks: [
    { code: '000858', name: '五粮液', price: 156.78, sector: '消费', amount: 5.4, strength: 48, limitTime: '10:02', zhaban: false },
    { code: '600030', name: '中信证券', price: 25.84, sector: '金融', amount: 7.7, strength: 41, limitTime: '10:38', zhaban: true },
  ]},
  { boards: 3, label: '三板', color: '#ffca28', stocks: [
    { code: '002230', name: '科大讯飞', price: 43.58, sector: '人工智能', amount: 8.2, strength: 44, limitTime: '10:33', zhaban: false },
    { code: '688036', name: '传音控股', price: 94.2, sector: '消费电子', amount: 4.4, strength: 47, limitTime: '10:47', zhaban: false },
  ]},
  { boards: 2, label: '二板', color: '#9e9e9e', stocks: [
    { code: '300433', name: '蓝思科技', price: 14.32, sector: '消费电子', amount: 3.2, strength: 28, limitTime: '11:42', zhaban: false },
    { code: '300274', name: '阳光电源', price: 68.4, sector: '光伏', amount: 5.7, strength: 35, limitTime: '13:18', zhaban: false },
  ]},
]

export const STRONG_STOCKS: StrongStock[] = [
  { code: '300059', name: '东方财富', price: 18.34, pct: 10.0, amount: 7.8, sector: '数据要素', score: 98, tag: '人工智能', reason: '连续九板涨停，封单超41亿', mktCap: 243.8, industry: '非银金融', riseSpeed: 5.67 },
  { code: '300308', name: '中际旭创', price: 143.56, pct: 10.0, amount: 7.0, sector: '人工智能', score: 96, tag: '人工智能', reason: '八板强势，AI光模块龙头', mktCap: 87.4, industry: '电子', riseSpeed: 4.78 },
  { code: '688041', name: '海光信息', price: 112.4, pct: 10.0, amount: 3.6, sector: '半导体', score: 94, tag: '半导体', reason: '国产算力芯片稀缺标的', mktCap: 312.6, industry: '电子', riseSpeed: 4.12 },
  { code: '300750', name: '宁德时代', price: 231.8, pct: 10.0, amount: 29.7, sector: '新能源', score: 93, tag: '新能源', reason: '十板涨停，封单32亿', mktCap: 5384.2, industry: '电力设备', riseSpeed: 3.21 },
  { code: '688599', name: '天合光能', price: 23.46, pct: 10.0, amount: 5.1, sector: '光伏', score: 91, tag: '新能源', reason: '光伏板块领涨，七板强封', mktCap: 128.4, industry: '电力设备', riseSpeed: 3.55 },
  { code: '002415', name: '海康威视', price: 34.88, pct: 10.0, amount: 6.1, sector: '人工智能', score: 88, tag: '人工智能', reason: 'AI+安防龙头', mktCap: 918.6, industry: '计算机', riseSpeed: 2.44 },
  { code: '300014', name: '亿纬锂能', price: 43.12, pct: 10.0, amount: 4.8, sector: '新能源', score: 86, tag: '新能源', reason: '固态电池先发优势', mktCap: 342.1, industry: '电力设备', riseSpeed: 2.87 },
  { code: '002594', name: '比亚迪', price: 187.56, pct: 10.0, amount: 17.3, sector: '新能源', score: 85, tag: '新能源', reason: '销量创历史新高', mktCap: 5468.3, industry: '汽车', riseSpeed: 2.31 },
  { code: '002049', name: '紫光国微', price: 89.6, pct: 10.0, amount: 5.1, sector: '半导体', score: 83, tag: '半导体', reason: '信创+军工双轮驱动', mktCap: 214.8, industry: '电子', riseSpeed: 1.89 },
  { code: '601127', name: '赛力斯', price: 74.32, pct: 10.0, amount: 10.3, sector: '新能源', score: 80, tag: '军工', reason: '问界交付创高', mktCap: 286.4, industry: '汽车', riseSpeed: 1.54 },
]

export const STRONG_TAG_BG: Record<string, string> = {
  新能源: 'rgba(72,187,120,0.18)',
  人工智能: 'rgba(229,62,62,0.18)',
  半导体: 'rgba(118,228,247,0.18)',
  医药生物: 'rgba(183,148,246,0.18)',
  军工: 'rgba(252,129,129,0.18)',
  自选: 'rgba(246,173,85,0.18)',
}

export const STRONG_TAG_CLR: Record<string, string> = {
  新能源: '#48bb78',
  人工智能: '#fc5252',
  半导体: '#76e4f7',
  医药生物: '#b794f6',
  军工: '#fc8181',
  自选: '#f6ad55',
}

/** 待从 Figma Make 导出到 public/assets/ 的资源清单 */
export const FIGMA_ASSETS_TODO = [
  { id: 'logo', note: '顶栏品牌 Logo / Favicon' },
  { id: 'calendar-icon', note: '日期选择器日历图标' },
  { id: 'empty-state-icon', note: '空状态图标（天梯/新闻）' },
  { id: 'refresh-icon', note: '刷新按钮图标（当前 SVG 占位）' },
  { id: '7ed96a3941d9c56b3e4f8971aa6f949402f179c0.png', note: 'Make 预览/装饰图' },
  { id: 'a6770be7d3c967bab5b85d7ebac365517f9a9b88.png', note: 'Make 预览/装饰图' },
  { id: 'a6c828a82e4cfd807ff0100e2202d078b7363e96.png', note: 'Make 预览/装饰图' },
  { id: 'f9fa15e4d059e2296fbba4ce2634dfa142469348.png', note: 'Make 预览/装饰图' },
] as const
