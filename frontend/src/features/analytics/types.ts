export interface CustomerOrderStep {
  stepNumber: number
  paymentId: string
  date: string
  amount: number
  product: string
  daysSincePrevious: number
}

export interface ExitProductAnalytics {
  productName: string
  droppedOffCustomers: number
  lostRevenueAtRisk: number
  shareOfDropOffPercent: number
}

export interface CustomerAnalyticsItem {
  customerKey: string
  name: string
  phone: string
  email: string
  city: string
  state: string
  pincode: string
  ordersCount: number // Duplication count
  totalSpend: number
  firstOrderAt: string
  lastOrderAt: string
  classification: 'Regular Buyer' | 'Repeat Buyer' | 'First Time' | string
  productsBought: string[]
  averageIntervalDays: number
  daysSinceLastOrder: number
  journeyStage: 'Active & Healthy' | 'Growing Cadence' | 'Slowing Down' | 'At Risk (Overdue)' | 'Dropped Off (Churned)' | 'One-Time Lapsed' | 'One-Time Recent' | string
  trendDescription: string
  lastProductBought: string
  orderHistory: CustomerOrderStep[]
}

export interface ProductAnalyticsItem {
  productName: string
  ordersCount: number
  revenue: number
  uniqueCustomers: number
  repeatCustomers: number
  repeatCustomerRatePercent: number
}

export interface RazorpayRecentOrder {
  paymentId: string
  orderId: string
  amount: number
  status: string
  method: string
  customerName: string
  phone: string
  email: string
  city: string
  products: string
  createdAt: string
}

export interface CustomerAnalyticsSummary {
  totalRevenue: number
  totalOrders: number
  uniqueCustomers: number
  singleOrderCustomers: number
  repeatBuyersCount: number
  regularBuyersCount: number
  totalRepeatCustomers: number
  duplicationRatePercent: number
  averageOrderValue: number
  averageOrdersPerCustomer: number
  lastSyncedAt: string | null
  droppedOffCustomersCount: number
  atRiskCustomersCount: number
  slowingDownCustomersCount: number
  growingCustomersCount: number
  activeCustomersCount: number
  churnedRevenueAtRisk: number
  averageRepeatIntervalDays: number
  topExitProducts: ExitProductAnalytics[]
  customers: CustomerAnalyticsItem[]
  products: ProductAnalyticsItem[]
  recentOrders: RazorpayRecentOrder[]
}
