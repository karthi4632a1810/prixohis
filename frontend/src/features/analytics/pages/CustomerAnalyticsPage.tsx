import {
  Award,
  BarChart3,
  CheckCircle2,
  Download,
  Mail,
  Package,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Spinner } from '../../../components/ui/Spinner'
import { useCustomerAnalyticsSummary, useSyncRazorpay } from '../api'

export function CustomerAnalyticsPage() {
  const { data, isLoading } = useCustomerAnalyticsSummary()
  const syncMutation = useSyncRazorpay()

  const [activeTab, setActiveTab] = useState<'customers' | 'products' | 'orders'>('customers')
  const [customerFilter, setCustomerFilter] = useState<'all' | 'regular' | 'repeat' | 'single'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [productSearch, setProductSearch] = useState('')

  // Handle Sync from Razorpay
  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync()
    } catch (e) {
      console.error('Failed to sync Razorpay orders', e)
    }
  }

  // Filtered customer list
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

  return (
    <div className="relative min-h-screen text-[#191919] antialiased">
      {/* Background Ambient Glow & Grid matching Transvaal theme */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-80"
        style={{
          background: `
            radial-gradient(700px 380px at 18% -8%, rgba(198,99,40,0.12), transparent 60%),
            radial-gradient(600px 420px at 88% 0%, rgba(198,99,40,0.12), transparent 60%),
            radial-gradient(900px 600px at 50% 110%, rgba(198,161,91,0.10), transparent 60%)
          `,
        }}
      />
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(25,25,25,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(25,25,25,0.035) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(90% 70% at 50% 0%, black 30%, transparent 100%)',
        }}
      />

      <div className="relative z-10 space-y-4">
        {/* Top Header Row with Title & Razorpay Live Sync Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-[#191919] dark:text-white">
              Customer Analytics
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#c66328]/35 bg-[#f8ece5] px-2.5 py-0.5 text-xs font-bold text-[#9e4f20] dark:border-[#9e4f20]/50 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
              <span className="size-2 rounded-full bg-[#16a34a] animate-pulse inline-block" />
              Razorpay Live Connected
            </span>
            <span className="text-xs text-[#8a94ad]">
              | Product-Wise & Repeat Customer Duplication Intelligence
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={exportCustomersCsv}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e9f2] bg-white px-3.5 py-2 text-xs font-bold text-[#191919] shadow-sm hover:border-[#dcc7a8] hover:bg-[#fdf8f2] dark:border-white/10 dark:bg-white/5 dark:text-white transition"
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
            <span>{data.totalOrders.toLocaleString()} captured transactions in database cache</span>
          </div>
        )}

        {isLoading || !data ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : (
          <>
            {/* 6 Key Executive KPI Cards matching Transvaal Design */}
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
                  <span className="text-[#67748e] dark:text-[#a09a90]">From Razorpay</span>
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
                  <span className="text-[#67748e] dark:text-[#a09a90]">Successful Orders</span>
                  <span className="rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    Captured
                  </span>
                </div>
              </div>

              {/* 3. Unique Customers */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>UNIQUE CUSTOMERS</span>
                  <span className="font-mono text-xs text-[#8a94ad]">👥</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  {data.uniqueCustomers.toLocaleString()}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">Phone / Email Base</span>
                  <span className="rounded-md bg-[#f0eae2] px-2 py-0.5 text-[10.5px] font-extrabold text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]">
                    Deduplicated
                  </span>
                </div>
              </div>

              {/* 4. Duplication / Repeat Rate */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>DUPLICATION RATE</span>
                  <span className="font-mono text-xs text-[#8a94ad]">%</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#9e4f20] dark:text-[#e0a989]">
                  {data.duplicationRatePercent}%
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">{data.totalRepeatCustomers} Repeat Buyers</span>
                  <span className="rounded-md bg-[#f8ece5] px-2 py-0.5 text-[10.5px] font-extrabold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                    ▲ Active
                  </span>
                </div>
              </div>

              {/* 5. Regular Loyal Buyers (4+ Orders) */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>REGULAR BUYERS</span>
                  <span className="font-mono text-xs text-[#c6a15b]">★</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  {data.regularBuyersCount}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">4+ Orders Each</span>
                  <span className="rounded-md bg-[#fdf3dc] px-2 py-0.5 text-[10.5px] font-extrabold text-[#b98a1e] dark:bg-[#b98a1e]/20 dark:text-[#eed0be]">
                    VIP Tier
                  </span>
                </div>
              </div>

              {/* 6. Average Order Value (AOV) */}
              <div className="rounded-[16px] border border-[#e5e9f2] bg-white p-4 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between text-[11px] font-extrabold tracking-wider text-[#67748e] uppercase dark:text-[#a09a90]">
                  <span>AVG ORDER VALUE</span>
                  <span className="font-mono text-xs text-[#8a94ad]">₹</span>
                </div>
                <div className="mt-2 text-[22px] font-extrabold tracking-tight text-[#191919] dark:text-white">
                  ₹{data.averageOrderValue.toFixed(0)}
                </div>
                <div className="mt-3 flex items-center justify-between gap-1 text-xs">
                  <span className="text-[#67748e] dark:text-[#a09a90]">Avg Basket</span>
                  <span className="rounded-md bg-[#f0eae2] px-2 py-0.5 text-[10.5px] font-extrabold text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]">
                    {data.averageOrdersPerCustomer}x freq
                  </span>
                </div>
              </div>
            </section>

            {/* Duplication & Repeat Customer Distribution Visual Card */}
            <section className="rounded-[18px] border border-[#e5e9f2] bg-white p-5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-[#191919] dark:text-white">
                    Customer Duplication & Buying Frequency Breakdown
                  </h3>
                  <p className="text-xs text-[#67748e] dark:text-[#a09a90]">
                    Breakdown of one-time vs repeat and regular buying customer segments
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-[#191919] dark:bg-white" />
                    First-Time (1 Order): <b>{data.singleOrderCustomers}</b> (
                    {((data.singleOrderCustomers / data.uniqueCustomers) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-[#c66328]" />
                    Repeat Buyers (2-3 Orders): <b>{data.repeatBuyersCount}</b> (
                    {((data.repeatBuyersCount / data.uniqueCustomers) * 100).toFixed(1)}%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-[2px] bg-[#c6a15b]" />
                    Regular Buyers (4+ Orders): <b>{data.regularBuyersCount}</b> (
                    {((data.regularBuyersCount / data.uniqueCustomers) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Segmented Distribution Bar */}
              <div className="mt-4 flex h-3.5 w-full overflow-hidden rounded-full bg-[#f0eae2] dark:bg-[#2a2a2a]">
                <div
                  className="bg-[#191919] dark:bg-white transition-all duration-500"
                  style={{ width: `${(data.singleOrderCustomers / data.uniqueCustomers) * 100}%` }}
                  title={`Single: ${data.singleOrderCustomers}`}
                />
                <div
                  className="bg-[#c66328] transition-all duration-500"
                  style={{ width: `${(data.repeatBuyersCount / data.uniqueCustomers) * 100}%` }}
                  title={`Repeat: ${data.repeatBuyersCount}`}
                />
                <div
                  className="bg-[#c6a15b] transition-all duration-500"
                  style={{ width: `${(data.regularBuyersCount / data.uniqueCustomers) * 100}%` }}
                  title={`Regular: ${data.regularBuyersCount}`}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-[#8a94ad]">
                <span>Total Customer Base: {data.uniqueCustomers.toLocaleString()} distinct profiles</span>
                <span className="font-semibold text-[#9e4f20] dark:text-[#e0a989]">
                  {data.totalRepeatCustomers} repeat customers contribute {data.duplicationRatePercent}% duplicate purchase rate
                </span>
              </div>
            </section>

            {/* Navigation Tabs (Customer Intelligence vs Product-Wise Performance vs Orders Log) */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9f2] pb-1 dark:border-white/8">
              <div className="flex items-center gap-2">
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
                  Customer Intelligence & Duplication ({data.customers.length})
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

            {/* TAB 1: Customer Duplication & Repeat Intelligence */}
            {activeTab === 'customers' && (
              <section className="space-y-3.5">
                {/* Filters toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  {/* Segment Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomerFilter('all')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'all'
                          ? 'bg-[#191919] text-white shadow-sm dark:bg-white dark:text-[#191919]'
                          : 'bg-[#f7f2ec] text-[#67748e] hover:text-[#191919] dark:bg-white/5 dark:text-[#a09a90]'
                      }`}
                    >
                      All Customers ({data.uniqueCustomers})
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerFilter('regular')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'regular'
                          ? 'bg-[#b98a1e] text-white shadow-sm'
                          : 'bg-[#fdf3dc] text-[#b98a1e] hover:brightness-95 dark:bg-[#b98a1e]/20 dark:text-[#eed0be]'
                      }`}
                    >
                      <Award className="size-3" />
                      Regular Buyers (4+ Orders) ({data.regularBuyersCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerFilter('repeat')}
                      className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'repeat'
                          ? 'bg-[#c66328] text-white shadow-sm'
                          : 'bg-[#f8ece5] text-[#9e4f20] hover:brightness-95 dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                      }`}
                    >
                      <UserCheck className="size-3" />
                      Repeat Buyers (2-3 Orders) ({data.repeatBuyersCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerFilter('single')}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        customerFilter === 'single'
                          ? 'bg-[#191919] text-white shadow-sm dark:bg-white dark:text-[#191919]'
                          : 'bg-[#f7f2ec] text-[#67748e] hover:text-[#191919] dark:bg-white/5 dark:text-[#a09a90]'
                      }`}
                    >
                      First-Time Buyers ({data.singleOrderCustomers})
                    </button>
                  </div>

                  {/* Search box */}
                  <div className="relative min-w-[240px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8b99c8]" />
                    <input
                      type="text"
                      placeholder="Search by name, phone, email, city..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] py-1.5 pl-8 pr-3 text-xs text-[#191919] outline-none transition focus:border-[#c66328] focus:bg-white dark:border-white/10 dark:bg-[#141414] dark:text-white"
                    />
                  </div>
                </div>

                {/* Customer Table */}
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#eef1f7] bg-[#fdf8f2] text-[10.5px] font-extrabold tracking-wider text-[#67748e] uppercase dark:border-white/8 dark:bg-[#141414] dark:text-[#a09a90]">
                          <th className="px-4 py-3">Customer Profile</th>
                          <th className="px-4 py-3">Contact Details</th>
                          <th className="px-4 py-3">Location</th>
                          <th className="px-4 py-3 text-center">Duplication / Orders</th>
                          <th className="px-4 py-3 text-right">Total Spent</th>
                          <th className="px-4 py-3">Latest Order</th>
                          <th className="px-4 py-3">Products Purchased</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/8">
                        {filteredCustomers.slice(0, 100).map((c) => {
                          const isRegular = c.ordersCount >= 4
                          const isRepeat = c.ordersCount >= 2 && c.ordersCount < 4

                          return (
                            <tr key={c.customerKey} className="transition hover:bg-[#fdf8f2] dark:hover:bg-white/5">
                              {/* Customer Profile */}
                              <td className="px-4 py-3">
                                <div className="font-semibold text-[#191919] dark:text-white">
                                  {c.name || 'Anonymous Customer'}
                                </div>
                                <div className="font-mono text-[10.5px] text-[#8a94ad]">
                                  ID: {c.customerKey}
                                </div>
                              </td>

                              {/* Contact */}
                              <td className="px-4 py-3 space-y-0.5">
                                {c.phone && (
                                  <a
                                    href={`tel:${c.phone}`}
                                    className="flex items-center gap-1.5 font-mono text-[11px] text-[#9e4f20] hover:underline dark:text-[#e0a989]"
                                  >
                                    <Phone className="size-3 shrink-0" />
                                    {c.phone}
                                  </a>
                                )}
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    className="flex items-center gap-1.5 text-[11px] text-[#67748e] hover:underline dark:text-[#a09a90]"
                                  >
                                    <Mail className="size-3 shrink-0" />
                                    <span className="truncate max-w-[150px]">{c.email}</span>
                                  </a>
                                )}
                              </td>

                              {/* Location */}
                              <td className="px-4 py-3">
                                <div className="text-[11.5px] text-[#191919] dark:text-white">
                                  {c.city || '—'}
                                </div>
                                <div className="text-[10px] text-[#8a94ad]">
                                  {c.state} {c.pincode && `• ${c.pincode}`}
                                </div>
                              </td>

                              {/* Duplication Count & Status */}
                              <td className="px-4 py-3 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                                      isRegular
                                        ? 'bg-[#fdf3dc] text-[#b98a1e] border border-[#e6c374] dark:bg-[#b98a1e]/20 dark:text-[#eed0be]'
                                        : isRepeat
                                        ? 'bg-[#f8ece5] text-[#9e4f20] border border-[#eed0be] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]'
                                        : 'bg-[#f0eae2] text-[#67748e] dark:bg-[#2a2a2a] dark:text-[#a09a90]'
                                    }`}
                                  >
                                    {isRegular && <Award className="size-3" />}
                                    {isRepeat && <UserCheck className="size-3" />}
                                    {c.ordersCount} {c.ordersCount === 1 ? 'Order' : 'Orders'}
                                  </span>
                                  <span className="text-[10px] font-medium text-[#8a94ad]">
                                    {c.classification}
                                  </span>
                                </div>
                              </td>

                              {/* Total Spent */}
                              <td className="px-4 py-3 text-right">
                                <div className="font-mono text-sm font-bold text-[#191919] dark:text-white">
                                  ₹{c.totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                                <div className="text-[10px] text-[#8a94ad]">
                                  avg ₹{(c.totalSpend / c.ordersCount).toFixed(0)}/order
                                </div>
                              </td>

                              {/* Latest Order */}
                              <td className="px-4 py-3">
                                <div className="text-[11.5px] text-[#191919] dark:text-white">
                                  {new Date(c.lastOrderAt).toLocaleDateString()}
                                </div>
                                <div className="text-[10px] text-[#8a94ad]">
                                  First: {new Date(c.firstOrderAt).toLocaleDateString()}
                                </div>
                              </td>

                              {/* Products Bought */}
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-1 max-w-[280px]">
                                  {c.productsBought.map((prod, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-block truncate max-w-[260px] rounded-md bg-[#f7f2ec] px-1.5 py-0.5 text-[10.5px] text-[#67748e] dark:bg-white/5 dark:text-[#a09a90]"
                                      title={prod}
                                    >
                                      {prod}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>

                  {filteredCustomers.length === 0 && (
                    <div className="py-12 text-center text-xs text-[#8a94ad]">
                      No customers match the current filter or search criteria.
                    </div>
                  )}

                  <div className="border-t border-[#eef1f7] bg-[#fdf8f2] px-4 py-2.5 text-xs text-[#67748e] dark:border-white/8 dark:bg-[#141414] dark:text-[#a09a90]">
                    Showing {Math.min(100, filteredCustomers.length)} of {filteredCustomers.length} matching customers
                  </div>
                </div>
              </section>
            )}

            {/* TAB 2: Product-Wise Performance */}
            {activeTab === 'products' && (
              <section className="space-y-4">
                {/* Search Bar */}
                <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e5e9f2] bg-white p-3.5 shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div>
                    <h3 className="font-display text-sm font-bold text-[#191919] dark:text-white">
                      Product-Wise Revenue & Customer Loyalty Analysis
                    </h3>
                    <p className="text-xs text-[#67748e] dark:text-[#a09a90]">
                      Track order volume, total billing, and repeat buyer rate per product
                    </p>
                  </div>
                  <div className="relative min-w-[240px]">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-[#8b99c8]" />
                    <input
                      type="text"
                      placeholder="Search products…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full rounded-xl border border-[#e5e9f2] bg-[#fdf8f2] py-1.5 pl-8 pr-3 text-xs text-[#191919] outline-none transition focus:border-[#c66328] focus:bg-white dark:border-white/10 dark:bg-[#141414] dark:text-white"
                    />
                  </div>
                </div>

                {/* Product Table */}
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#eef1f7] bg-[#fdf8f2] text-[10.5px] font-extrabold tracking-wider text-[#67748e] uppercase dark:border-white/8 dark:bg-[#141414] dark:text-[#a09a90]">
                          <th className="px-4 py-3">Product / Bundle Title</th>
                          <th className="px-4 py-3 text-right">Total Revenue</th>
                          <th className="px-4 py-3 text-center">Orders</th>
                          <th className="px-4 py-3 text-center">Unique Buyers</th>
                          <th className="px-4 py-3 text-center">Repeat Buyers</th>
                          <th className="px-4 py-3">Repeat Customer Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/8">
                        {filteredProducts.map((p, idx) => {
                          const revenueShare =
                            data.totalRevenue > 0 ? (p.revenue / data.totalRevenue) * 100 : 0

                          return (
                            <tr key={idx} className="transition hover:bg-[#fdf8f2] dark:hover:bg-white/5">
                              {/* Product Title */}
                              <td className="px-4 py-3.5 max-w-[340px]">
                                <div className="font-semibold text-[#191919] dark:text-white truncate" title={p.productName}>
                                  {p.productName}
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f0eae2] dark:bg-[#2a2a2a]">
                                  <div
                                    className="h-full rounded-full bg-[#c66328]"
                                    style={{ width: `${Math.min(100, Math.max(3, revenueShare))}%` }}
                                  />
                                </div>
                              </td>

                              {/* Revenue */}
                              <td className="px-4 py-3.5 text-right font-mono text-sm font-bold text-[#191919] dark:text-white">
                                ₹{p.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                <div className="text-[10px] font-normal text-[#8a94ad]">
                                  {revenueShare.toFixed(1)}% of total
                                </div>
                              </td>

                              {/* Orders */}
                              <td className="px-4 py-3.5 text-center font-mono font-bold text-[#191919] dark:text-white">
                                {p.ordersCount.toLocaleString()}
                              </td>

                              {/* Unique Buyers */}
                              <td className="px-4 py-3.5 text-center font-mono text-[#586a86] dark:text-[#a09a90]">
                                {p.uniqueCustomers.toLocaleString()}
                              </td>

                              {/* Repeat Buyers */}
                              <td className="px-4 py-3.5 text-center font-mono font-semibold text-[#9e4f20] dark:text-[#e0a989]">
                                {p.repeatCustomers.toLocaleString()}
                              </td>

                              {/* Repeat Rate Bar */}
                              <td className="px-4 py-3.5 min-w-[160px]">
                                <div className="flex items-center justify-between text-xs font-semibold text-[#191919] dark:text-white">
                                  <span>{p.repeatCustomerRatePercent}%</span>
                                  <span className="text-[10px] text-[#8a94ad]">
                                    {p.repeatCustomers} of {p.uniqueCustomers}
                                  </span>
                                </div>
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[#f0eae2] dark:bg-[#2a2a2a]">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-[#c66328] to-[#c6a15b]"
                                    style={{ width: `${Math.min(100, p.repeatCustomerRatePercent)}%` }}
                                  />
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* TAB 3: Recent Razorpay Orders Log */}
            {activeTab === 'orders' && (
              <section className="space-y-4">
                <div className="overflow-hidden rounded-[18px] border border-[#e5e9f2] bg-white shadow-sm dark:border-white/8 dark:bg-[#1f1f1f]">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#eef1f7] bg-[#fdf8f2] text-[10.5px] font-extrabold tracking-wider text-[#67748e] uppercase dark:border-white/8 dark:bg-[#141414] dark:text-[#a09a90]">
                          <th className="px-4 py-3">Payment ID / Order ID</th>
                          <th className="px-4 py-3">Customer Details</th>
                          <th className="px-4 py-3">Items / Description</th>
                          <th className="px-4 py-3 text-right">Amount</th>
                          <th className="px-4 py-3 text-center">Method</th>
                          <th className="px-4 py-3 text-center">Status</th>
                          <th className="px-4 py-3">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#eef1f7] dark:divide-white/8">
                        {data.recentOrders.map((o) => (
                          <tr key={o.paymentId} className="transition hover:bg-[#fdf8f2] dark:hover:bg-white/5">
                            <td className="px-4 py-3">
                              <div className="font-mono font-bold text-[#191919] dark:text-white">
                                {o.paymentId}
                              </div>
                              <div className="font-mono text-[10px] text-[#8a94ad]">
                                {o.orderId}
                              </div>
                            </td>

                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#191919] dark:text-white">
                                {o.customerName}
                              </div>
                              <div className="font-mono text-[10.5px] text-[#9e4f20] dark:text-[#e0a989]">
                                {o.phone}
                              </div>
                              {o.email && (
                                <div className="text-[10px] text-[#8a94ad] truncate max-w-[140px]">
                                  {o.email}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 max-w-[280px]">
                              <div className="truncate font-medium text-[#191919] dark:text-white" title={o.products}>
                                {o.products}
                              </div>
                              {o.city && <div className="text-[10px] text-[#8a94ad]">{o.city}</div>}
                            </td>

                            <td className="px-4 py-3 text-right font-mono text-sm font-bold text-[#191919] dark:text-white">
                              ₹{o.amount.toFixed(2)}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="rounded-md bg-[#f7f2ec] px-2 py-0.5 text-[10.5px] font-bold text-[#67748e] uppercase dark:bg-white/5 dark:text-[#a09a90]">
                                {o.method}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-center">
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#f8ece5] px-2.5 py-0.5 text-[10.5px] font-bold text-[#9e4f20] dark:bg-[#9e4f20]/20 dark:text-[#e0a989]">
                                <span className="size-1.5 rounded-full bg-[#16a34a]" />
                                {o.status}
                              </span>
                            </td>

                            <td className="px-4 py-3 text-[11px] text-[#67748e] dark:text-[#a09a90]">
                              {new Date(o.createdAt).toLocaleString()}
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
    </div>
  )
}
