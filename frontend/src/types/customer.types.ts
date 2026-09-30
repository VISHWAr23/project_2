// User instruction: "Phase 4: Customer Management - Create customer frontend type definitions"
// Importers/callers: frontend/src/lib/api/customers.ts, frontend/src/app/customers/page.tsx, frontend/src/app/customers/[id]/page.tsx
// Affected API: Customer type interfaces for frontend application
// Data schemas: Customer, CreateCustomerPayload, UpdateCustomerPayload, CustomerListResponse

export interface Customer {
  _id: string;
  customerName: string;
  businessName: string;
  phone: string;
  address: string;
  assignedEmployee: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
  };
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerPayload {
  customerName: string;
  businessName: string;
  phone: string;
  address: string;
  assignedEmployee?: string;
}

export interface UpdateCustomerPayload {
  customerName?: string;
  businessName?: string;
  phone?: string;
  address?: string;
  assignedEmployee?: string;
}

export interface CustomerListResponse {
  items: Customer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
