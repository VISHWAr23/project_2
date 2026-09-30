// User instruction: "Phase 5: Customer Visit Management - Create frontend visits API client"
// Importers/callers: frontend/src/app/visits/page.tsx, frontend/src/app/customers/[id]/page.tsx
// Affected API: /api/visits (list, getById, create, update), /api/customers/:customerId/visits (getByCustomer)
// Data schemas: Visit, CreateVisitPayload, UpdateVisitPayload, VisitListResponse, VisitQueryParams

import apiClient from '../api-client';
import type {
  Visit,
  CreateVisitPayload,
  UpdateVisitPayload,
  VisitListResponse,
  VisitQueryParams,
} from '@/types/visit.types';

export const visitsApi = {
  list: async (params?: VisitQueryParams): Promise<VisitListResponse> => {
    const response = await apiClient.get<VisitListResponse>('/visits', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Visit> => {
    const response = await apiClient.get<Visit>(`/visits/${id}`);
    return response.data;
  },

  create: async (data: CreateVisitPayload): Promise<Visit> => {
    const response = await apiClient.post<Visit>('/visits', data);
    return response.data;
  },

  update: async (id: string, data: UpdateVisitPayload): Promise<Visit> => {
    const response = await apiClient.patch<Visit>(`/visits/${id}`, data);
    return response.data;
  },

  getByCustomer: async (customerId: string): Promise<Visit[]> => {
    const response = await apiClient.get<Visit[]>(`/customers/${customerId}/visits`);
    return response.data;
  },
};
