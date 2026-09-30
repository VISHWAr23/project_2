// User instruction: "Phase 6: Order Management - Create frontend order type definitions"
// Importers/callers: frontend/src/lib/api/orders.ts, frontend/src/app/orders/page.tsx, frontend/src/app/orders/[id]/page.tsx
// Affected API: Order type interfaces for frontend application
// Data schemas: Order, OrderItem, OrderStatus, CreateOrderPayload, UpdateOrderPayload, RejectOrderPayload, OrderQueryParams, OrderListResponse

export type OrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

export interface OrderItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  _id: string;
  customer: {
    _id: string;
    customerName: string;
    businessName: string;
    phone?: string;
    address?: string;
  };
  employee: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  orderDate: string;
  items: OrderItem[];
  totalAmount: number;
  notes?: string;
  status: OrderStatus;
  approvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemPayload {
  productName: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderPayload {
  customer: string;
  employee?: string;
  orderDate?: string;
  items: CreateOrderItemPayload[];
  notes?: string;
}

export interface UpdateOrderPayload {
  orderDate?: string;
  items?: CreateOrderItemPayload[];
  notes?: string;
}

export interface RejectOrderPayload {
  reason?: string;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  customerId?: string;
  status?: OrderStatus;
  startDate?: string;
  endDate?: string;
}

export interface OrderListResponse {
  items: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
