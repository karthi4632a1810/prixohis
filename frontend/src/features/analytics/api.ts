import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/axios'
import { endpoints } from '../../api/endpoints'
import type { ApiResponse } from '../../api/types/api'
import type { CustomerAnalyticsSummary } from './types'

export function useCustomerAnalyticsSummary() {
  return useQuery({
    queryKey: ['customer-analytics', 'summary'],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<CustomerAnalyticsSummary>>(
        endpoints.customerAnalytics.summary
      )
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useSyncRazorpay() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<ApiResponse<CustomerAnalyticsSummary>>(
        endpoints.customerAnalytics.sync
      )
      return data.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['customer-analytics', 'summary'], data)
      queryClient.invalidateQueries({ queryKey: ['customer-analytics'] })
    },
  })
}
