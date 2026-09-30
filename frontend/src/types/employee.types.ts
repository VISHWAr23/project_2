// User instruction: "Phase 3: Employee Management - Create the Employee Management UI"
// Importers/callers: frontend/src/lib/api/employees.ts, frontend/src/app/employees/page.tsx, frontend/src/app/employees/[id]/page.tsx
// Affected API: Employee type definitions for frontend
// Data schemas: Employee, CreateEmployeePayload, UpdateEmployeePayload, EmployeeListResponse

export interface Employee {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'EMPLOYEE';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface UpdateEmployeePayload {
  name?: string;
  email?: string;
  phone?: string;
}

export interface EmployeeListResponse {
  items: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
