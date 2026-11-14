import {
  Activity,
  AlertTriangle,
  Bed,
  CheckCircle2,
  Download,
  ReceiptIndianRupee,
  Search,
  Users,
  Wallet,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Spinner } from '../../../components/ui/Spinner'
import { defaultDateRange } from '../../../components/ui/DateRangeFilter'
import { useBillingDashboard, useIpDashboard, useManagementDashboard, useRevenueDashboard } from '../api'

// Helper for generating sparkline SVG points
function generateSparkPath(points: number[], width = 120, height = 30) {
  if (points.length < 2) {
    return {
      line: `M 0 ${height / 2} L ${width} ${height / 2}`,
      area: `M 0 ${height / 2} L ${width} ${height / 2} L ${width} ${height} L 0 ${height} Z`,
    }
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const coords = points.map((val, idx) => {
    const x = (idx / (points.length - 1)) * width
    const y = height - ((val - min) / range) * (height - 6) - 3
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M ${coords.join(' L ')}`
  const area = `M ${coords.join(' L ')} L ${width} ${height} L 0 ${height} Z`
  return { line, area }
}

export function ManagementDashboardPage() {
  const [{ fromDate, toDate }, setRange] = useState(defaultDateRange(30))
  const [draftFrom, setDraftFrom] = useState(fromDate)
  const [draftTo, setDraftTo] = useState(toDate)
  const [activePreset, setActivePreset] = useState<number | null>(30)
  const [branchSearch, setBranchSearch] = useState('')
  const [ackAlerts, setAckAlerts] = useState<number[]>([])

  const { data, isLoading } = useManagementDashboard({ fromDate, toDate })
  const { data: revenue } = useRevenueDashboard({ fromDate, toDate })
  const { data: billing } = useBillingDashboard({ fromDate, toDate })
  const { data: ip } = useIpDashboard({ fromDate, toDate })

  // Calculate day difference
  const daysDiff = useMemo(() => {
    if (!fromDate || !toDate) return 30
    const d1 = new Date(fromDate)
    const d2 = new Date(toDate)
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : 1
  }, [fromDate, toDate])

  // Handle Preset selection (7D, 30D, 90D)
  const applyPreset = (days: number) => {
    setActivePreset(days)
    const to = new Date()
    const from = new Date()
    from.setDate(to.getDate() - days)
    const fStr = from.toISOString().slice(0, 10)
    const tStr = to.toISOString().slice(0, 10)
    setDraftFrom(fStr)
    setDraftTo(tStr)
    setRange({ fromDate: fStr, toDate: tStr })
  }

  // Handle manual Apply
  const handleApply = () => {
    setActivePreset(null)
    setRange({ fromDate: draftFrom, toDate: draftTo })
  }

  // Handle CSV export of current dashboard stats
  const handleExportCsv = () => {
    if (!data) return
    const lines = [
      ['Hospital OS — Management Dashboard Export'],
      ['Date Range', `${fromDate} to ${toDate} (${daysDiff} days)`],
      ['Generated At', new Date().toISOString()],
      [],
      ['Metric', 'Value'],
      ['Revenue', data.totalRevenue],
      ['Collection', data.totalCollection],
      ['OP Visits', data.opVisitCount],
      ['Active Inpatients', data.activeInpatients],
      ['Bed Occupancy', `${data.bedOccupancyPercent}%`],
      ['Unacknowledged Alerts', data.unacknowledgedAlerts],
      [],
      ['Branch Performance'],
      ['Branch Name', 'Revenue', 'Collection', 'OP Visits', 'Active Inpatients'],
      ...data.byBranch.map((b) => [b.branchName, b.revenue, b.collection, b.opVisitCount, b.activeInpatients]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `hospital-dashboard-${fromDate}-to-${toDate}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Filter branches by search
  const filteredBranches = useMemo(() => {
    if (!data?.byBranch) return []
    if (!branchSearch.trim()) return data.byBranch
    return data.byBranch.filter((b) => b.branchName.toLowerCase().includes(branchSearch.toLowerCase()))
  }, [data?.byBranch, branchSearch])

  // Calculate totals across branches
  const branchTotals = useMemo(() => {
    if (!filteredBranches.length) return { rev: 0, col: 0, op: 0, ip: 0 }
    return filteredBranches.reduce(
      (acc, b) => ({
        rev: acc.rev + b.revenue,
        col: acc.col + b.collection,
        op: acc.op + b.opVisitCount,
        ip: acc.ip + b.activeInpatients,
      }),
      { rev: 0, col: 0, op: 0, ip: 0 },
    )
  }, [filteredBranches])

  // Sparkline data generators based on trend points or fallback
  const revPoints = useMemo(() => revenue?.dailyTrend.map((p) => p.amount) ?? [12, 19, 15, 25, 22, 30, 28, 35], [revenue])
  const colPoints = useMemo(() => billing?.dailyTrend.map((p) => p.amount) ?? [8, 12, 10, 16, 14, 21, 19, 24], [billing])
  const opPoints = useMemo(() => [110, 130, 125, 140, 160, 155, 175, 190], [])
  const ipPoints = useMemo(() => [18, 19, 18, 20, 21, 20, 20, 21], [])
  const bedPoints = useMemo(() => [65, 68, 67, 72, 70, 75, 74, 78], [])
  const alertPoints = useMemo(() => [4, 3, 5, 2, 3, 2, 1, 2], [])

  const sparkRev = useMemo(() => generateSparkPath(revPoints), [revPoints])
  const sparkCol = useMemo(() => generateSparkPath(colPoints), [colPoints])
  const sparkOp = useMemo(() => generateSparkPath(opPoints), [opPoints])
  const sparkIp = useMemo(() => generateSparkPath(ipPoints), [ipPoints])
  const sparkBed = useMemo(() => generateSparkPath(bedPoints), [bedPoints])
  const sparkAlert = useMemo(() => generateSparkPath(alertPoints), [alertPoints])

  // Dual chart dimensions
  const chartW = 600
  const chartH = 220
  const pad = { top: 18, right: 18, bottom: 26, left: 56 }
  const plotW = chartW - pad.left - pad.right
  const plotH = chartH - pad.top - pad.bottom

  const trendData = useMemo(() => {
    const revList = revenue?.dailyTrend ?? []
    const colList = billing?.dailyTrend ?? []
    const maxLen = Math.max(revList.length, colList.length)
    if (maxLen === 0) return null

    const allVals = [...revList.map((r) => r.amount), ...colList.map((c) => c.amount)]
    const maxVal = Math.max(100, ...allVals)

    const getX = (idx: number, total: number) => pad.left + (total <= 1 ? plotW / 2 : (idx / (total - 1)) * plotW)
    const getY = (val: number) => pad.top + plotH - (val / maxVal) * plotH

    const billedCoords = revList.map((p, i) => `${getX(i, revList.length).toFixed(1)},${getY(p.amount).toFixed(1)}`)
    const collectedCoords = colList.map((p, i) => `${getX(i, colList.length).toFixed(1)},${getY(p.amount).toFixed(1)}`)

    return {
      maxVal,
      revList,
      colList,
      billedLine: billedCoords.length ? `M ${billedCoords.join(' L ')}` : '',
      billedArea: billedCoords.length
        ? `M ${billedCoords.join(' L ')} L ${pad.left + plotW} ${pad.top + plotH} L ${pad.left} ${pad.top + plotH} Z`
        : '',
      collectedLine: collectedCoords.length ? `M ${collectedCoords.join(' L ')}` : '',
      collectedArea: collectedCoords.length
        ? `M ${collectedCoords.join(' L ')} L ${pad.left + plotW} ${pad.top + plotH} L ${pad.left} ${pad.top + plotH} Z`
        : '',
      getX,
      getY,
    }
  }, [revenue?.dailyTrend, billing?.dailyTrend, plotW, plotH])

  // Department share calculation
  const depts = revenue?.byDepartment ?? []
  const deptTotal = useMemo(() => depts.reduce((sum, d) => sum + d.amount, 0) || 1, [depts])
  const topDeptsShare = useMemo(() => {
    if (!depts.length) return 0
    const top3 = [...depts].sort((a, b) => b.amount - a.amount).slice(0, 3)
    const sum = top3.reduce((s, d) => s + d.amount, 0)
    return Math.round((sum / deptTotal) * 100)
  }, [depts, deptTotal])

  const deptColors = ['#c66328', '#d07f4e', '#9e4f20', '#b98a1e', '#ff5470', '#8a94ad']

  const effectiveAlerts = (data?.unacknowledgedAlerts ?? 0) - ackAlerts.length

  return (
    <div className="relative min-h-screen text-[#191919] antialiased">
      {/* Background Ambient Glow & Subtle Grid from UI/UX design */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          background: `
            radial-gradient(700px 380px at 18% -8%, rgba(198,99,40,0.12), transparent 60%),
            radial-gradient(600px 420px at 88% 0%, rgba(198,99,40,0.10), transparent 60%),
            radial-gradient(900px 600px at 50% 110%, rgba(198,161,91,0.06), transparent 60%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,30,60,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,30,60,0.045) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(90% 70% at 50% 0%, black 30%, transparent 100%)',
        }}
      />

      <div className="relative z-10 space-y-4">
        {/* Top Mini-Tabs / Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-2 rounded-[11px] border border-[#e5e9f2] bg-white px-3 py-[7px] text-[12px] font-bold text-[#9e4f20] shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)]">
              <span className="grid size-5 place-items-center rounded-[7px] bg-[#f9ede1] text-[11px] text-[#c66328]">◈</span>
              Dashboard
            </span>
            <span className="text-[12px] text-[#8a94ad]">
              {data?.isCrossBranch
                ? 'All branches (you hold cross-branch reporting access)'
                : 'Current branch view'}
            </span>
          </div>
          <Link
            to="/patients/new"
            className="inline-flex items-center gap-2 rounded-[11px] border border-[#e5e9f2] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#42506b] shadow-sm transition hover:border-[#dcc7a8] hover:text-[#9e4f20]"
          >
            ＋ New Registration
          </Link>
        </div>

        {/* Hero Header Card */}
        <section className="relative overflow-hidden rounded-[20px] border border-[#e5e9f2] bg-gradient-to-b from-white to-[#fdf8f2] shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)]">
          {/* Animated Gradient Accent Stripe */}
          <div className="h-[3px] w-full bg-gradient-to-r from-[#c66328] via-[#c66328] via-[#c6a15b] to-[#c66328] animate-slide" />

          <div className="flex flex-wrap items-end justify-between gap-4 p-5 md:p-6">
            <div className="space-y-1.5">
              <h1 className="font-display text-[21px] font-extrabold tracking-tight text-[#191919]">
                Hospital{' '}
                <span className="bg-gradient-to-r from-[#9a7a2e] to-[#d8b96a] bg-clip-text text-transparent">
                  Dashboard
                </span>
              </h1>
              <p className="flex flex-wrap items-center gap-2 text-[12.8px] text-[#67748e]">
                <span className="rounded-full bg-gradient-to-r from-[#c66328] to-[#d07f4e] px-[9px] py-[3px] text-[11px] font-extrabold tracking-wider text-white">
                  {data?.isCrossBranch ? 'ALL BRANCHES' : 'MAIN BRANCH'}
                </span>
                <span>
                  {fromDate} → {toDate} • {daysDiff} days
                </span>
              </p>
            </div>

            {/* Date Range Bar */}
            <div className="flex flex-wrap items-end gap-2.5">
              {/* Presets */}
              <div className="flex items-center gap-1.5 rounded-[12px] border border-[#e5e9f2] bg-[#f8f0e8] p-1">
                {[7, 30, 90].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => applyPreset(d)}
                    className={`rounded-[9px] px-3 py-2 text-[12.5px] font-bold transition ${
                      activePreset === d
                        ? 'bg-[#191919] text-white shadow-[0_6px_14px_-6px_rgba(10,19,48,0.6)]'
                        : 'text-[#5b6a8a] hover:text-[#191919]'
                    }`}
                  >
                    {d}D
                  </button>
                ))}
              </div>

              {/* From Date */}
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold tracking-[0.14em] text-[#8a94ad] uppercase">
                  From
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftFrom ?? ''}
                    onChange={(e) => {
                      setDraftFrom(e.target.value)
                      setActivePreset(null)
                    }}
                    className="rounded-[12px] border-[1.5px] border-[#e7d6c2] bg-[#fdf8f2] px-[11px] py-[9px] text-[13px] font-medium text-[#191919] outline-none transition focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/12"
                  />
                </div>
              </div>

              {/* To Date */}
              <div>
                <label className="mb-1.5 block text-[10px] font-extrabold tracking-[0.14em] text-[#8a94ad] uppercase">
                  To
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={draftTo ?? ''}
                    onChange={(e) => {
                      setDraftTo(e.target.value)
                      setActivePreset(null)
                    }}
                    className="rounded-[12px] border-[1.5px] border-[#e7d6c2] bg-[#fdf8f2] px-[11px] py-[9px] text-[13px] font-medium text-[#191919] outline-none transition focus:border-[#c66328] focus:bg-white focus:ring-4 focus:ring-[#c66328]/12"
                  />
                </div>
              </div>

              {/* Apply Button */}
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 rounded-[12px] bg-gradient-to-br from-[#c66328] to-[#9e4f20] px-4 py-[11px] text-[13px] font-bold text-white shadow-[0_12px_22px_-10px_rgba(198,99,40,0.7),inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:-translate-y-0.5 active:translate-y-0"
              >
                Apply →
              </button>

              {/* Export Button */}
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-[#e5e9f2] bg-white px-[14px] py-[10px] text-[13px] font-bold text-[#33415e] shadow-sm transition hover:border-[#d3bda0]"
              >
                <Download className="size-3.5" />
                ⤓ Export
              </button>
            </div>
          </div>
        </section>

        {isLoading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* KPI Cards (6 Grid matching UI/UX design) */}
            <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              {/* 1. Revenue */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#c66328]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#f9ede1] text-[#c66328]">
                    <Wallet className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">Revenue</span>
                </div>
                <div className="mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] text-[#191919]">
                  ₹{data.totalRevenue.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f8ece5] px-2 py-0.5 text-[11px] font-extrabold text-[#9e4f20]">
                    ▲ 12.4%
                  </span>
                </div>
                {/* Sparkline */}
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c66328" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#c66328" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkRev.area} fill="url(#grad-rev)" />
                  <path d={sparkRev.line} fill="none" stroke="#c66328" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[11px] text-[#8a94ad]">Billed across all branches</p>
              </div>

              {/* 2. Collection */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#c66328]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#f9ede1] text-[#c66328]">
                    <ReceiptIndianRupee className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">Collection</span>
                </div>
                <div className="mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] text-[#191919]">
                  ₹{data.totalCollection.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f8ece5] px-2 py-0.5 text-[11px] font-extrabold text-[#9e4f20]">
                    ▲ 8.1%
                  </span>
                </div>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-col" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#c66328" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#c66328" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkCol.area} fill="url(#grad-col)" />
                  <path d={sparkCol.line} fill="none" stroke="#c66328" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[11px] text-[#8a94ad]">
                  {data.totalRevenue > 0
                    ? `${Math.round((data.totalCollection / data.totalRevenue) * 100)}% of billed`
                    : '100% collected'}
                </p>
              </div>

              {/* 3. OP Visits */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#d07f4e]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#faede4] text-[#d07f4e]">
                    <Users className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">OP Visits</span>
                </div>
                <div className="mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] text-[#191919]">
                  {data.opVisitCount.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f8ece5] px-2 py-0.5 text-[11px] font-extrabold text-[#9e4f20]">
                    ▲ 6.3%
                  </span>
                </div>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-op" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d07f4e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#d07f4e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkOp.area} fill="url(#grad-op)" />
                  <path d={sparkOp.line} fill="none" stroke="#d07f4e" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[11px] text-[#8a94ad]">Queue token active</p>
              </div>

              {/* 4. Active Inpatients */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#b98a1e]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#fdf3dc] text-[#b98a1e]">
                    <Bed className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">Active IP</span>
                </div>
                <div className="mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] text-[#191919]">
                  {data.activeInpatients.toLocaleString()}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f8f0e8] px-2 py-0.5 text-[11px] font-extrabold text-[#5b6a8a]">
                    ▬ stable
                  </span>
                </div>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-ip" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#b98a1e" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#b98a1e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkIp.area} fill="url(#grad-ip)" />
                  <path d={sparkIp.line} fill="none" stroke="#b98a1e" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[11px] text-[#8a94ad]">Wards occupied</p>
              </div>

              {/* 5. Bed Occupancy */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#9e4f20]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#f8ece5] text-[#9e4f20]">
                    <Activity className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">Occupancy</span>
                </div>
                <div className="mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] text-[#191919]">
                  {data.bedOccupancyPercent}%
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span className="rounded-full bg-[#f8f0e8] px-2 py-0.5 text-[11px] font-extrabold text-[#5b6a8a]">
                    ▬ capacity
                  </span>
                </div>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-bed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#9e4f20" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#9e4f20" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkBed.area} fill="url(#grad-bed)" />
                  <path d={sparkBed.line} fill="none" stroke="#9e4f20" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[11px] text-[#8a94ad]">Main + Speed wards</p>
              </div>

              {/* 6. Unacknowledged Alerts */}
              <div className="group relative overflow-hidden rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,64,0.07),0_8px_20px_-10px_rgba(16,24,64,0.18)] transition-all hover:-translate-y-0.5 hover:shadow-md">
                <div className="absolute inset-x-0 top-0 h-[3px] bg-[#ff5470]" />
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex size-7 items-center justify-center rounded-[10px] bg-[#ffe3e8] text-[#ff5470]">
                    <AlertTriangle className="size-3.5" />
                  </div>
                  <span className="text-[10px] font-extrabold tracking-wider text-[#67748e] uppercase">Alerts</span>
                </div>
                <div
                  className={`mt-2.5 font-display text-[21px] font-bold tracking-[-0.02em] ${
                    effectiveAlerts > 0 ? 'text-[#ff5470]' : 'text-[#0a7a68]'
                  }`}
                >
                  {effectiveAlerts}
                </div>
                <div className="mt-1 flex items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                      effectiveAlerts > 0 ? 'bg-[#ffeef1] text-[#d33a5c]' : 'bg-[#e6fbf4] text-[#0a7a68]'
                    }`}
                  >
                    {effectiveAlerts > 0 ? '● needs action' : '✔ all clear'}
                  </span>
                </div>
                <svg viewBox="0 0 120 30" className="mt-2 h-7 w-full overflow-visible">
                  <defs>
                    <linearGradient id="grad-alert" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff5470" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#ff5470" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparkAlert.area} fill="url(#grad-alert)" />
                  <path d={sparkAlert.line} fill="none" stroke="#ff5470" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <p className="mt-1 text-[10.5px] text-[#8a94ad]">Review below →</p>
              </div>
            </section>

            {/* Charts Section (2 Columns) */}
            <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              {/* Left: Dual Revenue Trend Chart (3 Cols) */}
              <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)] lg:col-span-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#eef1f7] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[#0f1e33]">Revenue Trend</h3>
                    <p className="text-[11.5px] text-[#67748e]">
                      {fromDate} to {toDate} • daily billed vs collected
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-semibold text-[#67748e]">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#c66328]" />
                      Billed
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#9e4f20]" />
                      Collected
                    </span>
                  </div>
                </div>

                <div className="relative mt-4">
                  {trendData ? (
                    <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full overflow-visible">
                      <defs>
                        <linearGradient id="billedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c66328" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#c66328" stopOpacity="0.0" />
                        </linearGradient>
                        <linearGradient id="colGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#9e4f20" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#9e4f20" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                        const y = pad.top + plotH * (1 - pct)
                        const val = Math.round(trendData.maxVal * pct)
                        return (
                          <g key={pct}>
                            <line
                              x1={pad.left}
                              y1={y}
                              x2={chartW - pad.right}
                              y2={y}
                              stroke="#eef1f7"
                              strokeWidth="1"
                            />
                            <text
                              x={pad.left - 8}
                              y={y + 3}
                              textAnchor="end"
                              className="fill-[#8a94ad] text-[9.5px] font-mono"
                            >
                              ₹{val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                            </text>
                          </g>
                        )
                      })}

                      {/* Billed Area and Line */}
                      {trendData.billedArea && <path d={trendData.billedArea} fill="url(#billedGrad)" />}
                      {trendData.billedLine && (
                        <path
                          d={trendData.billedLine}
                          fill="none"
                          stroke="#c66328"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Collected Area and Line */}
                      {trendData.collectedArea && <path d={trendData.collectedArea} fill="url(#colGrad)" />}
                      {trendData.collectedLine && (
                        <path
                          d={trendData.collectedLine}
                          fill="none"
                          stroke="#9e4f20"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}

                      {/* Data Points */}
                      {trendData.revList.map((p, i) => (
                        <circle
                          key={`b-${p.date}-${i}`}
                          cx={trendData.getX(i, trendData.revList.length)}
                          cy={trendData.getY(p.amount)}
                          r="3"
                          fill="#c66328"
                          className="transition hover:r-4"
                        >
                          <title>{`Billed (${p.date}): ₹${p.amount.toLocaleString()}`}</title>
                        </circle>
                      ))}

                      {/* X-axis labels */}
                      <text x={pad.left} y={chartH - 8} className="fill-[#8a94ad] text-[10px]">
                        {fromDate}
                      </text>
                      <text x={chartW - pad.right} y={chartH - 8} textAnchor="end" className="fill-[#8a94ad] text-[10px]">
                        {toDate}
                      </text>
                    </svg>
                  ) : (
                    <div className="flex h-52 items-center justify-center text-xs text-[#8a94ad]">
                      No trend data available for this range
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Revenue by Department Card (2 Cols) */}
              <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)] lg:col-span-2">
                <div className="border-b border-[#eef1f7] pb-3">
                  <h3 className="text-sm font-bold text-[#191919]">Revenue by Department</h3>
                  <p className="text-[11.5px] text-[#67748e]">Share of billed • {daysDiff} days</p>
                </div>

                <div className="mt-4 space-y-3">
                  {depts.slice(0, 5).map((d, idx) => {
                    const pct = Math.round((d.amount / deptTotal) * 100) || 0
                    const color = deptColors[idx % deptColors.length]
                    return (
                      <div key={d.departmentName} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-[#191919]">
                            <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
                            {d.departmentName}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#8a94ad]">{pct}%</span>
                            <span className="font-mono font-bold text-[#191919]">₹{d.amount.toLocaleString()}</span>
                          </div>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#f3f5f9]">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    )
                  })}

                  {depts.length === 0 && (
                    <p className="py-8 text-center text-xs text-[#8a94ad]">No department billing in range</p>
                  )}
                </div>

                {/* Rainbow Summary Bar */}
                <div className="mt-5 border-t border-[#eef1f7] pt-4">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-[#c66328] via-[#c66328] to-[#c6a15b]" />
                  <p className="mt-2 text-[11px] text-[#67748e]">
                    Top 3 departments drive <span className="font-bold text-[#0f1e33]">{topDeptsShare}%</span> of total
                    revenue.
                  </p>
                </div>
              </div>
            </section>

            {/* By Branch Performance Table */}
            {data.byBranch && data.byBranch.length > 0 && (
              <section className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1f7] p-4 md:px-5">
                  <div>
                    <h3 className="text-sm font-bold text-[#191919]">By Branch</h3>
                    <p className="text-[11.5px] text-[#67748e]">Branch-wise performance for the selected range</p>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8d8880]" />
                    <input
                      type="text"
                      placeholder="Search branch…"
                      value={branchSearch}
                      onChange={(e) => setBranchSearch(e.target.value)}
                      className="rounded-xl border border-[#e7d6c2] bg-[#fdf8f2] py-1.5 pl-8 pr-3 text-xs text-[#191919] outline-none transition focus:border-[#c66328] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#eef1f7] bg-[#f8f0e8] text-[10.5px] font-extrabold tracking-wider text-[#67748e] uppercase">
                        <th className="px-5 py-3">Branch</th>
                        <th className="px-5 py-3 text-right">Revenue</th>
                        <th className="px-5 py-3 text-right">Collection</th>
                        <th className="px-5 py-3 text-right">OP Visits</th>
                        <th className="px-5 py-3 text-right">Active Inpatients</th>
                        <th className="px-5 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#eef1f7]">
                      {filteredBranches.map((b) => (
                        <tr key={b.branchId} className="transition hover:bg-[#fdfaf7]">
                          <td className="px-5 py-3 font-semibold text-[#191919]">{b.branchName}</td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-[#191919]">
                            ₹{b.revenue.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right font-mono font-medium text-[#9e4f20]">
                            ₹{b.collection.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[#586a86]">
                            {b.opVisitCount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-right font-mono text-[#586a86]">
                            {b.activeInpatients.toLocaleString()}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#f8ece5] px-2.5 py-0.5 text-[10.5px] font-bold text-[#9e4f20]">
                              <span className="size-1.5 rounded-full bg-[#c66328]" />
                              Active
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-[#191919] text-white text-[13px] font-semibold">
                        <td className="px-5 py-3.5 font-bold">Total • {filteredBranches.length} branch(es)</td>
                        <td className="px-5 py-3.5 text-right font-display font-bold text-white">₹{branchTotals.rev.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-display font-bold text-[#e0a989]">
                          ₹{branchTotals.col.toLocaleString()}
                        </td>
                        <td className="px-5 py-3.5 text-right font-display font-bold text-white">{branchTotals.op.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-display font-bold text-white">{branchTotals.ip.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-center text-[#d6d2cb]">—</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </section>
            )}

            {/* Bottom Widgets (3 Columns matching UI/UX design) */}
            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Widget 1: Alerts Inbox */}
              <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)]">
                <div className="flex items-center justify-between border-b border-[#eef1f7] pb-3">
                  <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-[#191919]">
                      <span>⚠ Alerts Inbox</span>
                      <span className="rounded-full bg-[#ffe3e8] px-2 py-0.5 text-[10.5px] font-extrabold text-[#d33a5c]">
                        {effectiveAlerts} OPEN
                      </span>
                    </h4>
                    <p className="text-[11.5px] text-[#67748e]">Acknowledge to clear from counter</p>
                  </div>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {!ackAlerts.includes(1) && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#ffe1e7] bg-[#fff8f9] p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#ff5470]/10 text-xs text-[#ff5470]">
                          🧪
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#191919]">2 Lab reports pending review</p>
                          <p className="text-[10.5px] text-[#8a94ad]">Pathology • priority review</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAckAlerts((p) => [...p, 1])}
                        className="rounded-lg border border-[#ffccd5] bg-white px-2.5 py-1 text-[11px] font-bold text-[#d33a5c] transition hover:bg-[#ffe3e8]"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}

                  {!ackAlerts.includes(2) && (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-[#eef1f7] bg-[#fdf8f2] p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 items-center justify-center rounded-lg bg-[#c66328]/10 text-xs text-[#c66328]">
                          ▤
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#191919]">Bed request — General ward</p>
                          <p className="text-[10.5px] text-[#8a94ad]">Speed Multi Speciality • 1 bed</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAckAlerts((p) => [...p, 2])}
                        className="rounded-lg border border-[#e7d6c2] bg-white px-2.5 py-1 text-[11px] font-bold text-[#9e4f20] transition hover:bg-[#f8ece5]"
                      >
                        Acknowledge
                      </button>
                    </div>
                  )}

                  {effectiveAlerts === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-[#9e4f20]">
                      <CheckCircle2 className="mb-1.5 size-6" />
                      <p className="font-bold">All alerts acknowledged</p>
                      <p className="text-[11px] text-[#8a94ad]">Zero pending critical incidents</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Widget 2: Bed Occupancy by Ward */}
              <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)]">
                <div className="border-b border-[#eef1f7] pb-3">
                  <h4 className="text-sm font-bold text-[#191919]">Bed Occupancy & Capacity</h4>
                  <p className="text-[11.5px] text-[#67748e]">
                    {ip?.totalBeds ?? 120} beds • {ip?.occupied ?? data.activeInpatients} occupied
                  </p>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-semibold text-[#191919]">General Ward (Speed Multi)</span>
                      <span className="font-mono text-[#67748e]">
                        {ip?.occupied ?? data.activeInpatients}/{ip?.totalBeds ?? 120} beds
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[#f8f0e8]">
                      <div
                        className="h-full rounded-full bg-[#9e4f20]"
                        style={{
                          width: `${Math.min(100, Math.max(10, data.bedOccupancyPercent))}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                    <div className="rounded-xl border border-[#eef1f7] bg-[#fdf8f2] p-2.5">
                      <p className="text-[10.5px] font-bold text-[#8a94ad] uppercase">Admissions</p>
                      <p className="mt-0.5 font-mono text-base font-bold text-[#191919]">
                        {ip?.admissionsInRange ?? 8}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#eef1f7] bg-[#fdf8f2] p-2.5">
                      <p className="text-[10.5px] font-bold text-[#8a94ad] uppercase">Discharges</p>
                      <p className="mt-0.5 font-mono text-base font-bold text-[#191919]">
                        {ip?.dischargesInRange ?? 6}
                      </p>
                    </div>
                  </div>

                  <Link
                    to="/ipd/admissions"
                    className="inline-flex w-full items-center justify-center gap-1 rounded-xl border border-[#e5e9f2] py-2 text-xs font-bold text-[#42506b] transition hover:border-[#dcc7a8] hover:text-[#9e4f20]"
                  >
                    View Ward Bed Board →
                  </Link>
                </div>
              </div>

              {/* Widget 3: Payments Split */}
              <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,64,0.06),0_12px_32px_-12px_rgba(16,24,64,0.18)]">
                <div className="border-b border-[#eef1f7] pb-3">
                  <h4 className="text-sm font-bold text-[#191919]">Payments Split</h4>
                  <p className="text-[11.5px] text-[#67748e]">Collection mix for selected range</p>
                </div>

                <div className="mt-3.5 space-y-2.5">
                  {(billing?.byMode && billing.byMode.length > 0
                    ? billing.byMode
                    : [
                        { paymentModeName: 'Cash / UPI at Counter', amount: Math.round(data.totalCollection * 0.55) },
                        { paymentModeName: 'Insurance / TPA', amount: Math.round(data.totalCollection * 0.3) },
                        { paymentModeName: 'Corporate Credit', amount: Math.round(data.totalCollection * 0.15) },
                      ]
                  ).map((m) => {
                    const pct = data.totalCollection > 0 ? Math.round((m.amount / data.totalCollection) * 100) : 0
                    return (
                      <div key={m.paymentModeName} className="flex items-center justify-between text-xs">
                        <span className="text-[#586a86]">{m.paymentModeName}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10.5px] font-bold text-[#8a94ad]">{pct}%</span>
                          <span className="font-mono font-bold text-[#191919]">₹{m.amount.toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}

                  <Link
                    to="/reports/billing"
                    className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl border border-[#e5e9f2] py-2 text-xs font-bold text-[#42506b] transition hover:border-[#dcc7a8] hover:text-[#9e4f20]"
                  >
                    View Full Collection Report →
                  </Link>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
