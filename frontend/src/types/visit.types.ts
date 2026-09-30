// User instruction: "Phase 5: Customer Visit Management - Create frontend visit type definitions"
// Importers/callers: frontend/src/lib/api/visits.ts, frontend/src/app/visits/page.tsx, frontend/src/app/customers/[id]/page.tsx
// Affected API: Visit type interfaces for frontend application
// Data schemas: Visit, CreateVisitPayload, UpdateVisitPayload, VisitListResponse, VisitQueryParams

export interface Visit {
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
  visitDate: string;
  purpose: string;
  notes?: string;
  result: string;
  followUpDate?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisitPayload {
  customer: string;
  employee?: string;
  visitDate: string;
  purpose: string;
  notes?: string;
  result: string;
  followUpDate?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateVisitPayload {
  visitDate?: string;
  purpose?: string;
  notes?: string;
  result?: string;
  followUpDate?: string;
  photoUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface VisitQueryParams {
  page?: number;
  limit?: number;
  employeeId?: string;
  customerId?: string;
  startDate?: string;
  endDate?: string;
}

export interface VisitListResponse {
  items: Visit[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
