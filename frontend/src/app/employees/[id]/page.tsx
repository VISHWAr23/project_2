// User instruction: "Phase 3: Employee Management - Create the Employee Management UI using the existing frontend architecture and components. Admin routes: /employees/[id]"
// Importers/callers: Next.js App Router
// Affected API: /api/employees/:id (getById, update)
// Data schemas: Employee, UpdateEmployeePayload

'use client';

import { use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/lib/api/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { UpdateEmployeePayload } from '@/types/employee.types';

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<UpdateEmployeePayload>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: employee, isLoading, error } = useQuery({
    queryKey: ['employee', resolvedParams.id],
    queryFn: () => employeesApi.getById(resolvedParams.id),
    staleTime: 0,
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateEmployeePayload) =>
      employeesApi.update(resolvedParams.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setForm({});
      setErrors({});
    },
    onError: (err: unknown) => {
      const errorObj = err as { response?: { data?: { message?: string } } };
      const msg = errorObj.response?.data?.message || 'Failed to update employee';
      setErrors({ submit: msg });
    },
  });

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (form.name !== undefined && !form.name.trim()) errors.name = 'Name cannot be empty';
    if (form.email !== undefined && !form.email.trim()) errors.email = 'Email cannot be empty';
    if (form.phone !== undefined && !form.phone.trim()) errors.phone = 'Phone cannot be empty';
    setErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = () => {
    if (!validate() || Object.keys(form).length === 0) return;
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              Loading employee...
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <Card>
            <CardContent className="py-12 text-center text-red-600">
              Employee not found or you don&apos;t have permission to view this profile.
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/employees')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Employee Details</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name !== undefined ? form.name : employee.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email !== undefined ? form.email : employee.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={form.phone !== undefined ? form.phone : employee.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
              {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
            </div>
            <div>
              <Label>Status</Label>
              <div className="mt-2">
                {employee.isActive ? (
                  <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <div>
              <Label>Role</Label>
              <p className="mt-2 text-sm text-gray-600">{employee.role}</p>
            </div>
            {errors.submit && <p className="text-sm text-red-600">{errors.submit}</p>}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setForm({});
                  setErrors({});
                }}
              >
                Reset
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || Object.keys(form).length === 0}
              >
                {updateMutation.isPending ? (
                  'Saving...'
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <Label>Created</Label>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(employee.createdAt).toLocaleString()}
              </p>
            </div>
            <div>
              <Label>Last Updated</Label>
              <p className="mt-1 text-sm text-gray-600">
                {new Date(employee.updatedAt).toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
