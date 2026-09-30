// User instruction: "Phase 7: Employee Incentive Management - Create frontend incentives API client"
// Importers/callers: frontend/src/app/incentives/page.tsx, frontend/src/app/incentives/[id]/page.tsx, frontend/src/app/orders/[id]/page.tsx
// Affected API: /api/incentives (getActiveRule, updateActiveRule, list, getById, getByOrderId, markAsPaid)
// Data schemas: Incentive, IncentiveRule, IncentiveListResponse, IncentiveQueryParams, UpdateIncentiveRulePayload

import apiClient from '../api-client';
import type {
  Incentive,
  IncentiveRule,
  IncentiveListResponse,
  IncentiveQueryParams,
  UpdateIncentiveRulePayload,
} from '@/types/incentive.types';

export const incentivesApi = {
  getActiveRule: async (): Promise<IncentiveRule> => {
    const response = await apiClient.get<IncentiveRule>('/incentives/rules/active');
    return response.data;
  },

  updateActiveRule: async (data: UpdateIncentiveRulePayload): Promise<IncentiveRule> => {
    const response = await apiClient.patch<IncentiveRule>('/incentives/rules', data);
    return response.data;
  },

  list: async (params?: IncentiveQueryParams): Promise<IncentiveListResponse> => {
    const response = await apiClient.get<IncentiveListResponse>('/incentives', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Incentive> => {
    const response = await apiClient.get<Incentive>(`/incentives/${id}`);
    return response.data;
  },

  getByOrderId: async (orderId: string): Promise<Incentive | null> => {
    try {
      const response = await apiClient.get<Incentive>(`/incentives/order/${orderId}`);
      return response.data || null;
    } catch {
      return null;
    }
  },

  markAsPaid: async (id: string): Promise<Incentive> => {
    const response = await apiClient.patch<Incentive>(`/incentives/${id}/pay`);
    return response.data;
  },
};
