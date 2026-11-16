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
  customers: CustomerAnalyticsItem[]
  products: ProductAnalyticsItem[]
  recentOrders: RazorpayRecentOrder[]
}
