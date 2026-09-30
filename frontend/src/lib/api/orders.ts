// User instruction: "Phase 6: Order Management - Create frontend orders API client"
// Importers/callers: frontend/src/app/orders/page.tsx, frontend/src/app/orders/[id]/page.tsx
// Affected API: /api/orders (list, getById, create, update, approve, reject, complete, cancel)
// Data schemas: Order, CreateOrderPayload, UpdateOrderPayload, RejectOrderPayload, OrderQueryParams, OrderListResponse

import apiClient from '../api-client';
import type {
  Order,
  CreateOrderPayload,
  UpdateOrderPayload,
  RejectOrderPayload,
  OrderListResponse,
  OrderQueryParams,
} from '@/types/order.types';

export const ordersApi = {
  list: async (params?: OrderQueryParams): Promise<OrderListResponse> => {
    const response = await apiClient.get<OrderListResponse>('/orders', {
      params,
    });
    return response.data;
  },

  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  create: async (data: CreateOrderPayload): Promise<Order> => {
    const response = await apiClient.post<Order>('/orders', data);
    return response.data;
  },

  update: async (id: string, data: UpdateOrderPayload): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}`, data);
    return response.data;
  },

  approve: async (id: string): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/approve`);
    return response.data;
  },

  reject: async (id: string, data?: RejectOrderPayload): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/reject`, data);
    return response.data;
  },

  complete: async (id: string): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/complete`);
    return response.data;
  },

  cancel: async (id: string): Promise<Order> => {
    const response = await apiClient.patch<Order>(`/orders/${id}/cancel`);
    return response.data;
  },
};
