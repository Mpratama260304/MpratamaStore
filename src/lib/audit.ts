import { prisma } from './prisma'
import { getSession } from './auth'
import { Prisma } from '@prisma/client'

export type AuditAction =
  | 'user.login'
  | 'user.logout'
  | 'user.register'
  | 'user.password_reset'
  | 'product.create'
  | 'product.update'
  | 'product.delete'
  | 'product.publish'
  | 'product.archive'
  | 'category.create'
  | 'category.update'
  | 'category.delete'
  | 'tag.create'
  | 'tag.update'
  | 'tag.delete'
  | 'order.create'
  | 'order.update'
  | 'order.approve'
  | 'order.reject'
  | 'order.fulfill'
  | 'order.cancel'
  | 'payment.approve'
  | 'payment.reject'
  | 'settings.site.update'
  | 'settings.seo.update'
  | 'settings.payment.update'
  | 'download.request'
  | 'download.complete'

interface AuditLogParams {
  action: AuditAction
  entityType: string
  entityId?: string
  description?: string
  metadata?: Prisma.InputJsonValue
  userId?: string  // alias for actorId
  actorId?: string
  ipAddress?: string
  userAgent?: string
}

export async function createAuditLog(params: AuditLogParams) {
  try {
    // Get current user if not provided
    let actorId = params.actorId || params.userId
    if (!actorId) {
      const session = await getSession()
      actorId = session?.user.id
    }

    await prisma.auditLog.create({
      data: {
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        metadata: params.description 
          ? { description: params.description, ...(params.metadata as object || {}) }
          : params.metadata ?? Prisma.JsonNull,
        actorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export async function getAuditLogs(options: {
  action?: string
  entityType?: string
  entityId?: string
  actorId?: string
  limit?: number
  offset?: number
}) {
  const { action, entityType, entityId, actorId, limit = 50, offset = 0 } = options

  const where = {
    ...(action && { action }),
    ...(entityType && { entityType }),
    ...(entityId && { entityId }),
    ...(actorId && { actorId }),
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total }
}
