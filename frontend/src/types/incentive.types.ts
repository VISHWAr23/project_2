// User instruction: "Phase 7: Employee Incentive Management - Create frontend incentive type definitions"
// Importers/callers: frontend/src/lib/api/incentives.ts, frontend/src/app/incentives/page.tsx, frontend/src/app/incentives/[id]/page.tsx, frontend/src/app/orders/[id]/page.tsx
// Affected API: Incentive type interfaces for frontend application
// Data schemas: Incentive, IncentiveRule, IncentiveStatus, IncentiveSummary, IncentiveListResponse, IncentiveQueryParams, UpdateIncentiveRulePayload

export type IncentiveStatus = 'UNPAID' | 'PAID';

export interface IncentiveRule {
  _id: string;
  percentage: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Incentive {
  _id: string;
  orderId: {
    _id: string;
    orderDate: string;
    totalAmount: number;
    status: string;
    customer?: {
      _id: string;
      customerName: string;
      businessName: string;
      phone?: string;
      address?: string;
    };
    items?: Array<{
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    notes?: string;
  };
  employeeId: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  orderAmount: number;
  percentage: number;
  incentiveAmount: number;
  status: IncentiveStatus;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncentiveSummary {
  totalPending: number;
  totalPaid: number;
  totalEarned: number;
}

export interface IncentiveQueryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  status?: IncentiveStatus;
  startDate?: string;
  endDate?: string;
  orderId?: string;
}

export interface IncentiveListResponse {
  items: Incentive[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  summary: IncentiveSummary;
}

export interface UpdateIncentiveRulePayload {
  percentage: number;
}
