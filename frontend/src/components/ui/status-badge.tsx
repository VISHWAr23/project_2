import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Truck,
  PackageCheck,
  Check,
  Ban,
  CircleDot,
  UserCheck,
  UserX,
} from 'lucide-react';

export type StatusType =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'
  | 'DELIVERED'
  | 'PAID'
  | 'UNPAID'
  | 'ACTIVE'
  | 'INACTIVE'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | string;

interface StatusBadgeProps {
  status?: StatusType | null;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showIcon?: boolean;
  label?: string;
}

export function StatusBadge({
  status,
  className,
  size = 'default',
  showIcon = true,
  label,
}: StatusBadgeProps) {
  if (!status) return null;

  const normalized = status.toUpperCase();
  const displayLabel = label || status.replace(/_/g, ' ');

  switch (normalized) {
    case 'APPROVED':
    case 'COMPLETED':
    case 'DELIVERED':
    case 'PAID':
    case 'ACTIVE':
      return (
        <Badge
          variant="success"
          size={size}
          icon={showIcon ? <CheckCircle2 className="size-3" /> : undefined}
          className={className}
        >
          {displayLabel}
        </Badge>
      );

    case 'PENDING':
    case 'UNPAID':
    case 'IN_PROGRESS':
      return (
        <Badge
          variant="warning"
          size={size}
          icon={showIcon ? <Clock className="size-3" /> : undefined}
          className={className}
        >
          {displayLabel}
        </Badge>
      );

    case 'REJECTED':
    case 'CANCELLED':
    case 'INACTIVE':
      return (
        <Badge
          variant="destructive"
          size={size}
          icon={showIcon ? <XCircle className="size-3" /> : undefined}
          className={className}
        >
          {displayLabel}
        </Badge>
      );

    case 'ADMIN':
      return (
        <Badge
          variant="purple"
          size={size}
          icon={showIcon ? <UserCheck className="size-3" /> : undefined}
          className={className}
        >
          {displayLabel}
        </Badge>
      );

    case 'EMPLOYEE':
    case 'FIELD_EXECUTIVE':
      return (
        <Badge
          variant="info"
          size={size}
          icon={showIcon ? <CircleDot className="size-3" /> : undefined}
          className={className}
        >
          {displayLabel}
        </Badge>
      );

    default:
      return (
        <Badge variant="neutral" size={size} className={className}>
          {displayLabel}
        </Badge>
      );
  }
}
