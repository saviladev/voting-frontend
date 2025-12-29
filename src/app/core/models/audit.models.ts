export interface AuditLogDto {
  id: string;
  userId?: string | null;
  user?: {
    dni: string;
    firstName: string;
    lastName: string;
  } | null;
  action: string;
  entity: string;
  entityId: string;
  metadata?: Record<string, unknown> | null;
  ipHash?: string | null;
  createdAt: string;
}
