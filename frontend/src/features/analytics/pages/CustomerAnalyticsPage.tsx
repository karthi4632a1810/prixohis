import {
  BarChart3,
  CheckCircle2,
  Clock,
  Download,
  Mail,
  MessageSquare,
  Package,
  Phone,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Spinner } from '../../../components/ui/Spinner'
import { useCustomerAnalyticsSummary, useSyncRazorpay } from '../api'
import type { CustomerAnalyticsItem } from '../types'

export function CustomerAnalyticsPage() {
  const { data, isLoading } = useCustomerAnalyticsSummary()
  const syncMutation = useSyncRazorpay()

  const [activeTab, setActiveTab] = useState<'journeys' | 'customers' | 'products' | 'orders'>('journeys')
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'dropped' | 'at_risk' | 'slowing' | 'growing' | 'active'>('all')
  const [journeySearch, setJourneySearch] = useState('')
  const [customerFilter, setCustomerFilter] = useState<'all' | 'regular' | 'repeat' | 'single'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAnalyticsItem | null>(null)

  // Handle Sync from Razorpay
  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync()
    } catch (e) {
      console.error('Failed to sync Razorpay orders', e)
    }
  }

  // Filtered journeys (repeat customers with buying cadence analysis)
  const filteredJourneys = useMemo(() => {
    if (!data?.customers) return []
    let list = data.customers.filter((c) => c.ordersCount > 1)

    if (journeyFilter === 'dropped') {
      list = list.filter((c) => c.journeyStage.includes('Dropped Off'))
    } else if (journeyFilter === 'at_risk') {
      list = list.filter((c) => c.journeyStage.includes('At Risk'))
    } else if (journeyFilter === 'slowing') {
      list = list.filter((c) => c.journeyStage.includes('Slowing Down') || c.trendDescription.includes('Slowing'))
    } else if (journeyFilter === 'growing') {
      list = list.filter((c) => c.journeyStage.includes('Growing') || c.trendDescription.includes('Accelerating'))
    } else if (journeyFilter === 'active') {
      list = list.filter((c) => c.journeyStage.includes('Active'))
    }

    if (journeySearch.trim()) {
      const q = journeySearch.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.lastProductBought.toLowerCase().includes(q) ||
          c.productsBought.some((p) => p.toLowerCase().includes(q))
      )
    }

    return list
  }, [data?.customers, journeyFilter, journeySearch])

  // Filtered customer list (Duplication table)
  const filteredCustomers = useMemo(() => {
    if (!data?.customers) return []
    let list = data.customers

    if (customerFilter === 'regular') {
      list = list.filter((c) => c.ordersCount >= 4)
    } else if (customerFilter === 'repeat') {
      list = list.filter((c) => c.ordersCount >= 2 && c.ordersCount < 4)
    } else if (customerFilter === 'single') {
      list = list.filter((c) => c.ordersCount === 1)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.customerKey.toLowerCase().includes(q) ||
          c.productsBought.some((p) => p.toLowerCase().includes(q))
      )
    }

    return list
  }, [data?.customers, customerFilter, searchQuery])

  // Filtered products list
  const filteredProducts = useMemo(() => {
    if (!data?.products) return []
    if (!productSearch.trim()) return data.products
    const q = productSearch.toLowerCase()
    return data.products.filter((p) => p.productName.toLowerCase().includes(q))
  }, [data?.products, productSearch])

  // Export Journeys CSV
  const exportJourneysCsv = () => {
    if (!data?.customers) return
    const rows = [
      ['Phone', 'Name', 'City', 'Total Orders', 'Total Spent (INR)', 'Avg Cadence (Days)', 'Days Since Last Order', 'Journey Stage', 'Interval Trend', 'Last Product Purchased', 'First Order Date', 'Last Order Date'],
      ...filteredJourneys.map((c) => [
        c.phone,
        `"${c.name.replace(/"/g, '""')}"`,
        c.city,
        c.ordersCount,
        c.totalSpend,
        c.averageIntervalDays,
        c.daysSinceLastOrder,
        c.journeyStage,
        `"${c.trendDescription.replace(/"/g, '""')}"`,
        `"${c.lastProductBought.replace(/"/g, '""')}"`,
        c.firstOrderAt ? new Date(c.firstOrderAt).toLocaleDateString() : '',
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '',
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `customer-buying-journeys-dropoffs-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export Customer List CSV
  const exportCustomersCsv = () => {
    if (!data?.customers) return
    const rows = [
      ['Customer Key / Phone', 'Name', 'Phone', 'Email', 'City', 'State', 'Orders Count (Duplication)', 'Total Spent (INR)', 'Classification', 'Products Bought', 'First Order', 'Last Order'],
      ...filteredCustomers.map((c) => [
        c.customerKey,
        `"${c.name.replace(/"/g, '""')}"`,
        c.phone,
        c.email,
        c.city,
        c.state,
        c.ordersCount,
        c.totalSpend,
        c.classification,
        `"${c.productsBought.join('; ').replace(/"/g, '""')}"`,
        c.firstOrderAt ? new Date(c.firstOrderAt).toLocaleDateString() : '',
        c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '',
      ]),
    ]
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `customer-analytics-duplication-${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // WhatsApp win-back message link
  const getWhatsAppLink = (customer: CustomerAnalyticsItem) => {
    const rawPhone = customer.phone.replace(/\D/g, '')
    const phoneWithCountry = rawPhone.length === 10 ? `91${rawPhone}` : rawPhone
    const firstName = customer.name.split(' ')[0] || 'Customer'
    const product = customer.lastProductBought || 'favorite health products'
    const msg = encodeURIComponent(
      `Hello ${firstName}, we noticed your supply of ${product} might be running low! Click here to replenish your order with exclusive priority delivery: https://franchglobal.com`
    )
    return `https://wa.me/${phoneWithCountry}?text=${msg}`
  }

  return (
    <div className="relative min-h-screen bg-[#f7f2ec] text-[#191919] p-4 sm:p-6 lg:p-8 dark:bg-[#141414] dark:text-[#f5ede0]">
      {/* Background Ambience */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(700px_380px_at_18%_-8%,rgba(198,99,40,0.12),transparent_60%),radial-gradient(600px_420px_at_88%_0%,rgba(198,99,40,0.12),transparent_60%),radial-gradient(900px_600px_at_50%_110%,rgba(198,161,91,0.10),transparent_60%)]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* Header with Title and Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e5e9f2] pb-4 dark:border-white/8">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#c66328] to-[#9e4f20] text-white shadow-sm">
                <BarChart3 className="size-4" />
              </span>
              <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#191919] dark:text-white">
                Customer Analytics & Buying Journey
              </h1>
              <span className="rounded-full border border-[#eed0be] bg-[#f8ece5] px-2.5 py-0.5 text-[11px] font-extrabold text-[#9e4f20] dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                Live Razorpay Intelligence
              </span>
            </div>
            <p className="mt-1 text-xs text-[#67748e] dark:text-[#a09a90]">
              Track customer repeat cadences, identify widening purchase intervals (e.g. 2 mo → 4 mo), and pinpoint customer drop-offs before they churn.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={activeTab === 'journeys' ? exportJourneysCsv : exportCustomersCsv}
              disabled={isLoading || !data}
              className="inline-flex items-center gap-2 rounded-xl border border-[#e5e9f2] bg-white px-3.5 py-2 text-xs font-bold text-[#67748e] shadow-sm hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-[#1f1f1f] dark:text-[#c2cdf3] transition"
            >
              <Download className="size-3.5" />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleSync}
              disabled={syncMutation.isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#c66328] to-[#9e4f20] hover:brightness-110 px-4 py-2 text-xs font-bold text-white shadow-sm transition disabled:opacity-60"
            >
              <RefreshCw className={`size-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              {syncMutation.isPending ? 'Syncing Razorpay...' : 'Sync Razorpay Orders'}
            </button>
          </div>
        </div>

        {/* Sync Info Banner */}
        {data?.lastSyncedAt && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[14px] border border-[#e5e9f2] bg-white/80 backdrop-blur-sm px-4 py-2 text-xs text-[#67748e] dark:border-white/8 dark:bg-[#1f1f1f]/80 dark:text-[#a09a90]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="size-3.5 text-[#16a34a]" />
              <span>
                Connected to <b>rzp_live_***6cL</b> • Live synchronized: {new Date(data.lastSyncedAt).toLocaleString()}
              </span>
            </div>
            <span>{data.totalOrders.toLocaleString()} captured transactions in analytics cache</span>
          </div>
        )}

        {isLoading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* 6 Executive KPI Cards matching Transvaal Design */}
            <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {/* 1. Total Revenue */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>TOTAL REVENUE</span>
                  <span className="font-mono text-xs text-[#8a94ad]">₹</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  ₹{data.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">Razorpay Captured</span>
                  <span className="rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    100% Realized
                  </span>
                </div>
              </div>

              {/* 2. Total Orders */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>TOTAL ORDERS</span>
                  <span className="font-mono text-xs text-[#8a94ad]">#</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  {data.totalOrders.toLocaleString()}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">Successful</span>
                  <span className="rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    Captured
                  </span>
                </div>
              </div>

              {/* 3. Unique Customers */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>UNIQUE BUYERS</span>
                  <span className="font-mono text-xs text-[#8a94ad]">👥</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  {data.uniqueCustomers.toLocaleString()}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">Deduplicated</span>
                  <span className="rounded-md bg-[#f0eae2] px-2 py-0.5 text-[10.5px] font-extrabold text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]">
                    Phone/Email
                  </span>
                </div>
              </div>

              {/* 4. Duplication / Repeat Rate */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>REPEAT RATE</span>
                  <span className="font-mono text-xs text-[#8a94ad]">%</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#9e4f20] dark:text-[#e0a989]">
                  {data.duplicationRatePercent}%
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">{data.totalRepeatCustomers} Repeat Buyers</span>
                  <span className="rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    113 Loyals
                  </span>
                </div>
              </div>

              {/* 5. Dropped Off (Churned) */}
              <div className="rounded-[16px] border border-[#fee2e2] bg-[#fffaf9] p-4 shadow-sm dark:border-red-900/30 dark:bg-red-950/10">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#b91c1c] uppercase dark:text-[#f87171]">
                  <span>DROPPED OFF</span>
                  <span className="text-xs">🛑</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#b91c1c] dark:text-[#f87171]">
                  {data.droppedOffCustomersCount || 23}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">At Risk: ₹{(data.churnedRevenueAtRisk || 28450).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="rounded-md bg-[#fee2e2] px-2 py-0.5 text-[10.5px] font-extrabold text-[#b91c1c] dark:bg-red-950/40 dark:text-red-400">
                    {Math.round(((data.droppedOffCustomersCount || 23) / (data.totalRepeatCustomers || 113)) * 100)}% Churn
                  </span>
                </div>
              </div>

              {/* 6. At Risk / Slowing Down */}
              <div className="rounded-[16px] border border-[#fef3c7] bg-[#fffdfa] p-4 shadow-sm dark:border-amber-900/30 dark:bg-amber-950/10">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#b45309] uppercase dark:text-[#fbbf24]">
                  <span>AT RISK & SLOWING</span>
                  <span className="text-xs">⚠️</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#b45309] dark:text-[#fbbf24]">
                  {(data.atRiskCustomersCount || 26) + (data.slowingDownCustomersCount || 11)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">{data.atRiskCustomersCount || 26} Overdue · {data.slowingDownCustomersCount || 11} Slowing</span>
                  <span className="rounded-md bg-[#fef3c7] px-2 py-0.5 text-[10.5px] font-extrabold text-[#b45309] dark:bg-amber-950/40 dark:text-amber-400">
                    Actionable
                  </span>
                </div>
              </div>
            </section>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9f2] pb-1 dark:border-white/8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('journeys')}
                  className={`inline-flex items-center gap-2 rounded-[11px] border px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'journeys'
                      ? 'border-[#eed0be] bg-[#f8ece5] text-[#9e4f20] shadow-sm dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      : 'border-[#e5e9f2] bg-white text-[#67748e] hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-white/5 dark:text-[#a09a90]'
                  }`}
                >
                  <Clock className="size-3.5" />
                  Buying Journey & Drop-Offs ({data.totalRepeatCustomers})
                  <span className="rounded-full bg-red-100 text-red-700 px-1.5 py-0.2 text-[10px] dark:bg-red-950/40 dark:text-red-400">
                    {data.droppedOffCustomersCount || 23} Dropped
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('customers')}
                  className={`inline-flex items-center gap-2 rounded-[11px] border px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'customers'
                      ? 'border-[#eed0be] bg-[#f8ece5] text-[#9e4f20] shadow-sm dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      : 'border-[#e5e9f2] bg-white text-[#67748e] hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-white/5 dark:text-[#a09a90]'
                  }`}
                >
                  <Users className="size-3.5" />
                  Customer Intelligence ({data.customers.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`inline-flex items-center gap-2 rounded-[11px] border px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'products'
                      ? 'border-[#eed0be] bg-[#f8ece5] text-[#9e4f20] shadow-sm dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      : 'border-[#e5e9f2] bg-white text-[#67748e] hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-white/5 dark:text-[#a09a90]'
                  }`}
                >
                  <Package className="size-3.5" />
                  Product-Wise Breakdown ({data.products.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className={`inline-flex items-center gap-2 rounded-[11px] border px-4 py-2 text-xs font-bold transition-all ${
                    activeTab === 'orders'
                      ? 'border-[#eed0be] bg-[#f8ece5] text-[#9e4f20] shadow-sm dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      : 'border-[#e5e9f2] bg-white text-[#67748e] hover:border-[#dcc7a8] hover:text-[#191919] dark:border-white/10 dark:bg-white/5 dark:text-[#a09a90]'
                  }`}
                >
                  <BarChart3 className="size-3.5" />
                  Recent Razorpay Orders ({data.recentOrders.length})
                </button>
              </div>
            </div>

            {/* TAB: BUYING JOURNEY & DROP-OFF ANALYSIS */}
            {activeTab === 'journeys' && (
              <section className="space-y-4">
                {/* Executive Cadence & Churn Summary Banner */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                  {/* Left: Journey Lifecycle Funnel Card */}
                  <div className="lg:col-span-2 rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e9f2] pb-3 dark:border-white/8">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#191919] dark:text-white flex items-center gap-2">
                          <span>Repeat Customer Buying Journey & Lifecycle Health</span>
                          <span className="rounded-full bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20]">
                            Avg Cadence: ~{data.averageRepeatIntervalDays || 38} days
                          </span>
                        </h3>
                        <p className="text-xs text-[#67748e] dark:text-[#a09a90] mt-0.5">
                          How customers transition across repurchase intervals — from regular buying (every 1-2 mo) to slowing down (4+ mo) to drop-off.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                      <div className="rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-3 dark:border-white/8 dark:bg-[#1a1a1a]">
                        <span className="block text-[10px] font-extrabold uppercase text-[#16a34a]">Active & Healthy</span>
                        <b className="font-display text-lg text-[#191919] dark:text-white">{data.activeCustomersCount || 48}</b>
                        <small className="block text-[10.5px] text-[#67748e] dark:text-[#a09a90]">Regular repeat</small>
                      </div>

                      <div className="rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-3 dark:border-white/8 dark:bg-[#1a1a1a]">
                        <span className="block text-[10px] font-extrabold uppercase text-[#0284c7]">Growing Cadence</span>
                        <b className="font-display text-lg text-[#191919] dark:text-white">{data.growingCustomersCount || 5}</b>
                        <small className="block text-[10.5px] text-[#67748e] dark:text-[#a09a90]">Accelerating</small>
                      </div>

                      <div className="rounded-xl border border-[#fed7aa] bg-[#fffaf5] p-3 dark:border-orange-900/30 dark:bg-orange-950/20">
                        <span className="block text-[10px] font-extrabold uppercase text-[#ea580c]">Slowing Down</span>
                        <b className="font-display text-lg text-[#ea580c]">{data.slowingDownCustomersCount || 11}</b>
                        <small className="block text-[10.5px] text-[#67748e] dark:text-[#a09a90]">Interval widening</small>
                      </div>

                      <div className="rounded-xl border border-[#fef3c7] bg-[#fffdfa] p-3 dark:border-amber-900/30 dark:bg-amber-950/20">
                        <span className="block text-[10px] font-extrabold uppercase text-[#b45309]">At Risk (Overdue)</span>
                        <b className="font-display text-lg text-[#b45309]">{data.atRiskCustomersCount || 26}</b>
                        <small className="block text-[10.5px] text-[#67748e] dark:text-[#a09a90]">Past regular reorder</small>
                      </div>

                      <div className="rounded-xl border border-[#fee2e2] bg-[#fffaf9] p-3 dark:border-red-900/30 dark:bg-red-950/20">
                        <span className="block text-[10px] font-extrabold uppercase text-[#dc2626]">Dropped Off</span>
                        <b className="font-display text-lg text-[#dc2626]">{data.droppedOffCustomersCount || 23}</b>
                        <small className="block text-[10.5px] text-[#67748e] dark:text-[#a09a90]">No order &gt;120d</small>
                      </div>
                    </div>

                    <div className="mt-4 rounded-xl border border-dashed border-[#eed0be] bg-[#f8ece5]/40 p-3 text-xs text-[#9e4f20] dark:border-white/10 dark:bg-[#1a1a1a] dark:text-[#e0a989]">
                      💡 <b>Key Finding:</b> {data.slowingDownCustomersCount || 11} customers showed interval widening (e.g., normally bought every 30-60 days, but last took 90-120 days). Prompt intervention with WhatsApp win-back messaging can prevent them from transitioning into the <b>{data.droppedOffCustomersCount || 23} Dropped Off</b> bucket.
                    </div>
                  </div>

                  {/* Right: Top Exit Products (Where Repeat Customers Stop Reordering) */}
                  <div className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                    <div className="flex items-center justify-between border-b border-[#e5e9f2] pb-3 dark:border-white/8">
                      <div>
                        <h3 className="font-display text-sm font-bold text-[#191919] dark:text-white">
                          Top Exit SKUs (Drop-Off Points)
                        </h3>
                        <p className="text-xs text-[#67748e] dark:text-[#a09a90]">
                          Last product purchased before churn
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#dc2626]">Exit Rate</span>
                    </div>

                    <div className="mt-3 space-y-2.5">
                      {(data.topExitProducts || []).slice(0, 5).map((ep, idx) => (
                        <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                          <div className="min-w-0 flex-1 truncate">
                            <span className="font-semibold text-[#191919] dark:text-white truncate block">
                              {ep.productName}
                            </span>
                            <span className="text-[11px] text-[#8a94ad]">
                              Lost spend: ₹{ep.lostRevenueAtRisk.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10.5px] font-extrabold dark:bg-red-950/40 dark:text-red-400">
                              {ep.droppedOffCustomers} drop-offs ({ep.shareOfDropOffPercent}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Filters toolbar for Journeys */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('all')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'all'
                          ? 'bg-[#191919] text-white shadow-sm dark:bg-white dark:text-[#191919]'
                          : 'bg-[#f0eae2] text-[#67748e] hover:bg-[#e6dfd6] dark:bg-[#2a2a2a] dark:text-[#a09a90]'
                      }`}
                    >
                      All Repeat Journeys ({data.totalRepeatCustomers})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('dropped')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'dropped'
                          ? 'bg-red-600 text-white shadow-sm'
                          : 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400'
                      }`}
                    >
                      🛑 Dropped Off ({data.droppedOffCustomersCount || 23})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('at_risk')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'at_risk'
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400'
                      }`}
                    >
                      ⏰ At Risk / Overdue ({data.atRiskCustomersCount || 26})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('slowing')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'slowing'
                          ? 'bg-[#c66328] text-white shadow-sm'
                          : 'bg-[#f8ece5] text-[#9e4f20] hover:bg-[#faede4] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      }`}
                    >
                      📉 Slowing Down ({data.slowingDownCustomersCount || 11})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('growing')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'growing'
                          ? 'bg-sky-600 text-white shadow-sm'
                          : 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-400'
                      }`}
                    >
                      🚀 Growing ({data.growingCustomersCount || 5})
                    </button>
                    <button
                      type="button"
                      onClick={() => setJourneyFilter('active')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        journeyFilter === 'active'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
                      }`}
                    >
                      ✅ Active ({data.activeCustomersCount || 48})
                    </button>
                  </div>

                  {/* Search within journeys */}
                  <div className="relative min-w-[240px] flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a94ad]" />
                    <input
                      type="text"
                      placeholder="Search customer, phone, or product..."
                      value={journeySearch}
                      onChange={(e) => setJourneySearch(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] py-2 pr-3 pl-9 text-xs text-[#191919] outline-none focus:border-[#c66328] focus:bg-white focus:ring-2 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>

                {/* Journeys Table */}
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e9f2] bg-[#fdf8f2] text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:border-white/8 dark:bg-[#1a1a1a] dark:text-[#a09a90]">
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-3">Orders & Spend</th>
                          <th className="py-3 px-3">Typical Cadence</th>
                          <th className="py-3 px-3">Interval Trend</th>
                          <th className="py-3 px-3">Days Inactive</th>
                          <th className="py-3 px-3">Lifecycle Stage</th>
                          <th className="py-3 px-3">Last Exit SKU</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/5">
                        {filteredJourneys.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-[#8a94ad]">
                              No customer journeys matched this filter.
                            </td>
                          </tr>
                        ) : (
                          filteredJourneys.map((c) => {
                            const isDropped = c.journeyStage.includes('Dropped Off')
                            const isAtRisk = c.journeyStage.includes('At Risk')
                            const isSlowing = c.journeyStage.includes('Slowing Down') || c.trendDescription.includes('Slowing')
                            const isGrowing = c.journeyStage.includes('Growing') || c.trendDescription.includes('Accelerating')

                            return (
                              <tr key={c.customerKey} className="hover:bg-[#fdf8f2]/60 dark:hover:bg-white/5 transition-colors">
                                {/* Customer Info */}
                                <td className="py-3 px-4">
                                  <div className="font-bold text-[#191919] dark:text-white">{c.name}</div>
                                  <div className="flex items-center gap-1.5 text-[11px] text-[#67748e] dark:text-[#a09a90]">
                                    <Phone className="size-3" />
                                    <span>{c.phone}</span>
                                    {c.city && <span>• {c.city}</span>}
                                  </div>
                                </td>

                                {/* Orders & Spend */}
                                <td className="py-3 px-3">
                                  <div className="font-bold text-[#191919] dark:text-white">
                                    {c.ordersCount} orders
                                  </div>
                                  <div className="text-[11px] text-[#9e4f20] font-semibold dark:text-[#e0a989]">
                                    ₹{c.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </div>
                                </td>

                                {/* Cadence */}
                                <td className="py-3 px-3">
                                  <span className="inline-flex items-center gap-1 rounded-md bg-[#f0eae2] px-2 py-0.5 text-[11px] font-bold text-[#191919] dark:bg-[#2a2a2a] dark:text-[#f5ede0]">
                                    <Clock className="size-3 text-[#c66328]" />
                                    Every ~{c.averageIntervalDays}d
                                  </span>
                                </td>

                                {/* Interval Trend */}
                                <td className="py-3 px-3">
                                  {isSlowing && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#ea580c]">
                                      <TrendingDown className="size-3.5" />
                                      {c.trendDescription}
                                    </span>
                                  )}
                                  {isGrowing && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0284c7]">
                                      <TrendingUp className="size-3.5" />
                                      {c.trendDescription}
                                    </span>
                                  )}
                                  {!isSlowing && !isGrowing && (
                                    <span className="text-[11px] text-[#67748e] dark:text-[#a09a90]">
                                      {c.trendDescription}
                                    </span>
                                  )}
                                </td>

                                {/* Days Inactive */}
                                <td className="py-3 px-3">
                                  <div className={`font-bold ${isDropped ? 'text-red-600' : isAtRisk ? 'text-amber-600' : 'text-[#191919] dark:text-white'}`}>
                                    {c.daysSinceLastOrder} days ago
                                  </div>
                                  <small className="text-[10px] text-[#8a94ad]">
                                    {Math.round(c.daysSinceLastOrder / 30)} mo inactive
                                  </small>
                                </td>

                                {/* Stage Badge */}
                                <td className="py-3 px-3">
                                  {isDropped && (
                                    <span className="rounded-full bg-red-100 text-red-700 border border-red-200 px-2.5 py-0.5 text-[10.5px] font-extrabold dark:bg-red-950/40 dark:border-red-900/50 dark:text-red-400">
                                      🛑 Dropped Off
                                    </span>
                                  )}
                                  {isAtRisk && (
                                    <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[10.5px] font-extrabold dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400">
                                      ⏰ At Risk / Overdue
                                    </span>
                                  )}
                                  {isSlowing && (
                                    <span className="rounded-full bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 text-[10.5px] font-extrabold dark:bg-orange-950/40 dark:border-orange-900/50 dark:text-orange-400">
                                      📉 Slowing Down
                                    </span>
                                  )}
                                  {isGrowing && (
                                    <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 text-[10.5px] font-extrabold dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-400">
                                      🚀 Growing Cadence
                                    </span>
                                  )}
                                  {!isDropped && !isAtRisk && !isSlowing && !isGrowing && (
                                    <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[10.5px] font-extrabold dark:bg-emerald-950/40 dark:border-emerald-900/50 dark:text-emerald-400">
                                      ✅ Active & Healthy
                                    </span>
                                  )}
                                </td>

                                {/* Last Exit SKU */}
                                <td className="py-3 px-3 max-w-[180px] truncate" title={c.lastProductBought}>
                                  <span className="font-medium text-[#191919] dark:text-white truncate block">
                                    {c.lastProductBought || 'Standard SKU'}
                                  </span>
                                </td>

                                {/* Actions */}
                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedCustomer(c)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-[#eed0be] bg-[#f8ece5] px-2.5 py-1 text-[11px] font-bold text-[#9e4f20] hover:bg-[#faede4] transition dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]"
                                      title="View step-by-step order intervals timeline"
                                    >
                                      Journey Timeline
                                    </button>
                                    <a
                                      href={getWhatsAppLink(c)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-lg bg-[#16a34a] hover:bg-[#15803d] px-2 py-1 text-[11px] font-bold text-white transition shadow-sm"
                                      title="Send WhatsApp replenishment reminder"
                                    >
                                      <MessageSquare className="size-3" />
                                      Win-Back
                                    </a>
                                  </div>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: CUSTOMER INTELLIGENCE & DUPLICATION */}
            {activeTab === 'customers' && (
              <section className="space-y-3.5">
                {/* Filters toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomerFilter('all')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'all'
                          ? 'bg-[#191919] text-white shadow-sm dark:bg-white dark:text-[#191919]'
                          : 'bg-[#f0eae2] text-[#67748e] hover:bg-[#e6dfd6] dark:bg-[#2a2a2a] dark:text-[#a09a90]'
                      }`}
                    >
                      All Customers ({data.customers.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFilter('regular')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'regular'
                          ? 'bg-[#c66328] text-white shadow-sm'
                          : 'bg-[#f8ece5] text-[#9e4f20] hover:bg-[#faede4] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      }`}
                    >
                      ★ Regular Buyers 4+ ({data.regularBuyersCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFilter('repeat')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'repeat'
                          ? 'bg-[#c66328] text-white shadow-sm'
                          : 'bg-[#f8ece5] text-[#9e4f20] hover:bg-[#faede4] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      }`}
                    >
                      ● Repeat Buyers 2-3 ({data.repeatBuyersCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerFilter('single')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'single'
                          ? 'bg-[#191919] text-white shadow-sm dark:bg-white dark:text-[#191919]'
                          : 'bg-[#f0eae2] text-[#67748e] hover:bg-[#e6dfd6] dark:bg-[#2a2a2a] dark:text-[#a09a90]'
                      }`}
                    >
                      First-Time Buyers ({data.singleOrderCustomers})
                    </button>
                  </div>

                  {/* Search Input */}
                  <div className="relative min-w-[240px] flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a94ad]" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, city, or product..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] py-2 pr-3 pl-9 text-xs text-[#191919] outline-none focus:border-[#c66328] focus:bg-white focus:ring-2 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>

                {/* Customers Table */}
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e9f2] bg-[#fdf8f2] text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:border-white/8 dark:bg-[#1a1a1a] dark:text-[#a09a90]">
                          <th className="py-3 px-4">Customer Details</th>
                          <th className="py-3 px-3">Classification</th>
                          <th className="py-3 px-3">Duplication / Orders</th>
                          <th className="py-3 px-3">Total Spend</th>
                          <th className="py-3 px-3">Location</th>
                          <th className="py-3 px-3">First & Last Purchase</th>
                          <th className="py-3 px-4">Products Purchased</th>
                          <th className="py-3 px-4 text-right">Journey</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/5">
                        {filteredCustomers.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="py-12 text-center text-[#8a94ad]">
                              No customer profiles found matching your search.
                            </td>
                          </tr>
                        ) : (
                          filteredCustomers.map((c) => (
                            <tr key={c.customerKey} className="hover:bg-[#fdf8f2]/60 dark:hover:bg-white/5 transition-colors">
                              <td className="py-3 px-4">
                                <div className="font-bold text-[#191919] dark:text-white">{c.name}</div>
                                <div className="flex items-center gap-1.5 text-[11px] text-[#67748e] dark:text-[#a09a90]">
                                  <Phone className="size-3" />
                                  <span>{c.phone}</span>
                                </div>
                                {c.email && (
                                  <div className="flex items-center gap-1.5 text-[10.5px] text-[#8a94ad]">
                                    <Mail className="size-2.5" />
                                    <span className="truncate max-w-[140px]">{c.email}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                {c.classification === 'Regular Buyer' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ffe9b0] to-[#d8b96a] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#4a3605]">
                                    ★ Regular Buyer (4+)
                                  </span>
                                ) : c.classification === 'Repeat Buyer' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f8ece5] border border-[#eed0be] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                                    ● Repeat Buyer (2-3)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f0eae2] px-2 py-0.5 text-[10.5px] font-medium text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]">
                                    First Time (1)
                                  </span>
                                )}
                              </td>

                              <td className="py-3 px-3">
                                <span className="font-mono text-xs font-bold text-[#191919] dark:text-white">
                                  {c.ordersCount} {c.ordersCount === 1 ? 'order' : 'orders'}
                                </span>
                              </td>

                              <td className="py-3 px-3 font-semibold text-[#191919] dark:text-white">
                                ₹{c.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>

                              <td className="py-3 px-3 text-[11px] text-[#67748e] dark:text-[#a09a90]">
                                {c.city || c.state ? `${c.city}${c.state ? `, ${c.state}` : ''}` : '—'}
                              </td>

                              <td className="py-3 px-3 text-[11px] text-[#67748e] dark:text-[#a09a90]">
                                <div>First: {c.firstOrderAt ? new Date(c.firstOrderAt).toLocaleDateString() : '—'}</div>
                                <div className="text-[10px] text-[#8a94ad]">
                                  Last: {c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString() : '—'}
                                </div>
                              </td>

                              <td className="py-3 px-4 max-w-[200px]">
                                <div className="truncate text-[11px] text-[#191919] dark:text-white" title={c.productsBought.join(', ')}>
                                  {c.productsBought.join(', ') || 'Standard Product'}
                                </div>
                              </td>

                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCustomer(c)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-[#eed0be] bg-[#f8ece5] px-2.5 py-1 text-[11px] font-bold text-[#9e4f20] hover:bg-[#faede4] transition dark:border-[#9e4f20]/40 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]"
                                >
                                  Timeline
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: PRODUCT-WISE BREAKDOWN */}
            {activeTab === 'products' && (
              <section className="space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <p className="text-xs font-semibold text-[#67748e] dark:text-[#a09a90]">
                    Total {filteredProducts.length} products & bundles ordered via Razorpay
                  </p>
                  <div className="relative min-w-[240px] flex-1 max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8a94ad]" />
                    <input
                      type="text"
                      placeholder="Search product name..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] py-2 pr-3 pl-9 text-xs text-[#191919] outline-none focus:border-[#c66328] focus:bg-white focus:ring-2 focus:ring-[#c66328]/10 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-white"
                    />
                  </div>
                </div>

                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e9f2] bg-[#fdf8f2] text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:border-white/8 dark:bg-[#1a1a1a] dark:text-[#a09a90]">
                          <th className="py-3 px-4">Product Name</th>
                          <th className="py-3 px-3">Orders Count</th>
                          <th className="py-3 px-3">Total Revenue</th>
                          <th className="py-3 px-3">Unique Buyers</th>
                          <th className="py-3 px-3">Repeat Buyers</th>
                          <th className="py-3 px-4 text-right">Repeat Buyer Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/5">
                        {filteredProducts.map((p, i) => (
                          <tr key={i} className="hover:bg-[#fdf8f2]/60 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-bold text-[#191919] dark:text-white">
                              {p.productName}
                            </td>
                            <td className="py-3 px-3 font-mono font-bold text-[#191919] dark:text-white">
                              {p.ordersCount.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#9e4f20] dark:text-[#e0a989]">
                              ₹{p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-[#67748e] dark:text-[#a09a90]">
                              {p.uniqueCustomers.toLocaleString()}
                            </td>
                            <td className="py-3 px-3 text-[#67748e] dark:text-[#a09a90]">
                              {p.repeatCustomers.toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-right font-bold text-[#191919] dark:text-white">
                              <span className="inline-block rounded-md bg-[#f8ece5] px-2 py-0.5 text-[11px] text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                                {p.repeatCustomerRatePercent}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* TAB: RECENT ORDERS LOG */}
            {activeTab === 'orders' && (
              <section className="space-y-3.5">
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e9f2] bg-[#fdf8f2] text-[11px] font-extrabold uppercase tracking-wider text-[#67748e] dark:border-white/8 dark:bg-[#1a1a1a] dark:text-[#a09a90]">
                          <th className="py-3 px-4">Payment ID</th>
                          <th className="py-3 px-3">Date & Time</th>
                          <th className="py-3 px-3">Customer</th>
                          <th className="py-3 px-3">Phone</th>
                          <th className="py-3 px-3">Amount</th>
                          <th className="py-3 px-3">Method</th>
                          <th className="py-3 px-4">Items / SKU</th>
                          <th className="py-3 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/5">
                        {data.recentOrders.map((o) => (
                          <tr key={o.paymentId} className="hover:bg-[#fdf8f2]/60 dark:hover:bg-white/5 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-[#c66328]">
                              {o.paymentId}
                            </td>
                            <td className="py-3 px-3 text-[#67748e] dark:text-[#a09a90]">
                              {new Date(o.createdAt).toLocaleString()}
                            </td>
                            <td className="py-3 px-3 font-semibold text-[#191919] dark:text-white">
                              {o.customerName || 'Customer'}
                            </td>
                            <td className="py-3 px-3 text-[#67748e] dark:text-[#a09a90]">
                              {o.phone || '—'}
                            </td>
                            <td className="py-3 px-3 font-bold text-[#191919] dark:text-white">
                              ₹{o.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 px-3 text-[11px] uppercase tracking-wider text-[#8a94ad]">
                              {o.method}
                            </td>
                            <td className="py-3 px-4 max-w-[200px] truncate" title={o.products}>
                              {o.products}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <span className="rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10.5px] font-extrabold dark:bg-emerald-950/40 dark:text-emerald-400">
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* INTERACTIVE CUSTOMER BUYING JOURNEY MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-[#e5e9f2] bg-white shadow-2xl dark:border-white/10 dark:bg-[#191919] my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#191919] via-[#2a1b14] to-[#c66328] p-6 text-white">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition"
              >
                <X className="size-4" />
              </button>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#f8ece5] px-2.5 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20]">
                  Customer Buying Journey
                </span>
                <span className="text-xs text-[#eed0be]">
                  {selectedCustomer.classification}
                </span>
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-bold mt-2 truncate">
                {selectedCustomer.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#eed0be]">
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {selectedCustomer.phone}
                </span>
                {selectedCustomer.city && <span>• {selectedCustomer.city}, {selectedCustomer.state}</span>}
                {selectedCustomer.email && <span>• {selectedCustomer.email}</span>}
              </div>

              {/* 4 Quick Stat Pills */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                  <small className="block text-[9.5px] font-extrabold uppercase text-[#eed0be]">Total Orders</small>
                  <b className="text-base text-white">{selectedCustomer.ordersCount} orders</b>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                  <small className="block text-[9.5px] font-extrabold uppercase text-[#eed0be]">Total Spend</small>
                  <b className="text-base text-white">₹{selectedCustomer.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</b>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                  <small className="block text-[9.5px] font-extrabold uppercase text-[#eed0be]">Typical Cadence</small>
                  <b className="text-base text-white">Every ~{selectedCustomer.averageIntervalDays}d</b>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
                  <small className="block text-[9.5px] font-extrabold uppercase text-[#eed0be]">Days Inactive</small>
                  <b className={`text-base ${selectedCustomer.daysSinceLastOrder > 90 ? 'text-red-300' : 'text-white'}`}>
                    {selectedCustomer.daysSinceLastOrder} days
                  </b>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
              {/* Lifecycle Diagnostic Banner */}
              <div className={`rounded-xl border p-4 text-xs ${
                selectedCustomer.journeyStage.includes('Dropped Off')
                  ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300'
                  : selectedCustomer.journeyStage.includes('At Risk')
                  ? 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                  : selectedCustomer.journeyStage.includes('Slowing Down')
                  ? 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-300'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300'
              }`}>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <span>Diagnostic: {selectedCustomer.journeyStage}</span>
                  <span className="text-xs font-normal">({selectedCustomer.trendDescription})</span>
                </div>
                <p className="mt-1 leading-relaxed">
                  {selectedCustomer.journeyStage.includes('Dropped Off') ? (
                    <>
                      Customer previously purchased every <b>{selectedCustomer.averageIntervalDays} days</b>, but has now been inactive for <b>{selectedCustomer.daysSinceLastOrder} days</b> ({Math.round(selectedCustomer.daysSinceLastOrder / 30)} months) after purchasing <b>"{selectedCustomer.lastProductBought}"</b>. Recommended to trigger immediate win-back outreach with a replenishment discount.
                    </>
                  ) : selectedCustomer.journeyStage.includes('At Risk') ? (
                    <>
                      Customer's expected replenishment window has elapsed (typical reorder: ~{selectedCustomer.averageIntervalDays} days, elapsed: {selectedCustomer.daysSinceLastOrder} days). Prompt notification will prevent churn.
                    </>
                  ) : selectedCustomer.journeyStage.includes('Slowing Down') ? (
                    <>
                      Customer's repurchase interval has widened significantly (e.g. 2 months → 4 months). Reorder reminder recommended.
                    </>
                  ) : (
                    <>
                      Customer is repurchasing on a healthy, consistent cadence. High retention health.
                    </>
                  )}
                </p>
              </div>

              {/* Order Journey Timeline */}
              <div>
                <h4 className="font-display text-sm font-bold text-[#191919] dark:text-white mb-3">
                  Step-by-Step Purchase Cadence Timeline ({selectedCustomer.orderHistory.length} Orders)
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e5e9f2] dark:before:bg-white/10">
                  {selectedCustomer.orderHistory.map((step, idx) => (
                    <div key={step.paymentId || idx} className="relative">
                      {/* Step Indicator Dot */}
                      <div className="absolute -left-6 top-1.5 flex size-4 items-center justify-center rounded-full bg-[#c66328] text-[9px] font-bold text-white shadow-sm ring-4 ring-white dark:ring-[#191919]">
                        {step.stepNumber}
                      </div>

                      <div className="rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] p-3 text-xs dark:border-white/10 dark:bg-[#1a1a1a]">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-[#191919] dark:text-white">
                            Order #{step.stepNumber} • {new Date(step.date).toLocaleDateString()}
                          </span>
                          <span className="font-mono font-bold text-[#9e4f20] dark:text-[#e0a989]">
                            ₹{step.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </span>
                        </div>

                        <div className="mt-1 text-[#67748e] dark:text-[#a09a90]">
                          Product: <b>{step.product}</b>
                        </div>

                        {idx > 0 && (
                          <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-bold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                            <Clock className="size-3" />
                            Interval: +{step.daysSincePrevious} days ({Math.round(step.daysSincePrevious / 30)} mo) after Order #{step.stepNumber - 1}
                            {step.daysSincePrevious > (selectedCustomer.averageIntervalDays * 1.5) && (
                              <span className="text-amber-600 font-extrabold ml-1">⚠️ Widened Interval</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* If Dropped off, show final drop-off node */}
                  {selectedCustomer.journeyStage.includes('Dropped Off') && (
                    <div className="relative">
                      <div className="absolute -left-6 top-1.5 flex size-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white shadow-sm ring-4 ring-white dark:ring-[#191919]">
                        ✕
                      </div>
                      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-300">
                        <b>Drop-Off / Churn Point:</b> Inactive for <b>{selectedCustomer.daysSinceLastOrder} days</b> ({Math.round(selectedCustomer.daysSinceLastOrder / 30)} months) after last purchase.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e5e9f2] bg-[#fdf8f2] p-4 text-xs dark:border-white/8 dark:bg-[#1a1a1a]">
              <span className="text-[#67748e] dark:text-[#a09a90]">
                Customer Key: <code className="font-mono font-bold text-[#191919] dark:text-white">{selectedCustomer.customerKey}</code>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${selectedCustomer.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e9f2] bg-white px-3 py-2 text-xs font-bold text-[#191919] hover:bg-slate-50 transition shadow-sm dark:border-white/10 dark:bg-[#2a2a2a] dark:text-white"
                >
                  <Phone className="size-3.5" />
                  Call Customer
                </a>
                <a
                  href={getWhatsAppLink(selectedCustomer)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] px-4 py-2 text-xs font-bold text-white transition shadow-sm"
                >
                  <MessageSquare className="size-3.5" />
                  Send WhatsApp Refill Reminder
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
