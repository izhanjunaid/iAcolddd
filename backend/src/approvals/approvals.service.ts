import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Inject,
  Type,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  ApprovalRequest,
  ApprovalStatus,
  ApprovalAction,
  ApprovalEntityType,
} from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';

// Define interface for services that support approval actions
export interface ApprovalHandler {
  executeApprovalAction(
    action: ApprovalAction,
    entityId: string,
    payload?: any,
  ): Promise<void>;
}

@Injectable()
export class ApprovalsService {
  // Registry of handlers (avoid circular dependency via manual registration or event emitter)
  // For simplicity and type safety, we'll use a registry pattern.
  private handlers = new Map<ApprovalEntityType, ApprovalHandler>();

  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRequestRepository: Repository<ApprovalRequest>,
    private readonly dataSource: DataSource,
  ) {}

  registerHandler(entityType: ApprovalEntityType, handler: ApprovalHandler) {
    this.handlers.set(entityType, handler);
  }

  async createRequest(
    entityType: ApprovalEntityType,
    entityId: string,
    action: ApprovalAction,
    requestedByID: string,
    payload?: any,
  ): Promise<ApprovalRequest> {
    // Check if pending request exists
    const existing = await this.approvalRequestRepository.findOne({
      where: {
        entityType,
        entityId,
        action,
        status: ApprovalStatus.PENDING,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `A pending approval request already exists for this ${entityType} action.`,
      );
    }

    const request = this.approvalRequestRepository.create({
      entityType,
      entityId,
      action,
      requestedById: requestedByID,
      payload,
      status: ApprovalStatus.PENDING,
    });

    return await this.approvalRequestRepository.save(request);
  }

  async findMyPendingRequests(userId: string) {
    // Logic to find requests user can approve usually depends on Roles/Permissions.
    // For MVP, we assume any authorised user (except requester) *could* potentially be an approver,
    // or we just list all pending. Real-world would filter by Role.
    return await this.approvalRequestRepository.find({
      where: { status: ApprovalStatus.PENDING },
      relations: ['requestedBy'],
    });
  }

  async findOne(id: string) {
    const request = await this.approvalRequestRepository.findOne({
      where: { id },
      relations: ['requestedBy', 'approvedBy'],
    });
    if (!request)
      throw new NotFoundException(`Approval Request ${id} not found`);
    return request;
  }

  async approveRequest(
    requestId: string,
    approverId: string,
  ): Promise<ApprovalRequest> {
    const request = await this.findOne(requestId);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Request is not in PENDING status.');
    }

    // Segregation of Duties: Requester cannot Approve
    if (request.requestedById === approverId) {
      throw new ForbiddenException(
        'You cannot approve your own request (Segregation of Duties).',
      );
    }

    // Execute logic
    const handler = this.handlers.get(request.entityType);
    if (!handler) {
      throw new Error(
        `No handler registered for entity type ${request.entityType}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      // 1. Update Request
      request.status = ApprovalStatus.APPROVED;
      request.approvedById = approverId;
      const savedRequest = await manager.save(ApprovalRequest, request);

      // 2. Execute Action (We need to ensure handler executes within this transaction if possible,
      // but handlers might use their own transactions. For now, we trust the handler.)
      // Note: Ideal if handler accepts a EntityManager.
      // For this MVP, we call the handler. If it fails, we rollback?
      // NestJS generic handlers are tricky with transactions passed around.
      // We will perform the action *after* saving status, but if action fails, needed to revert.
      // Better: execute action, THEN save status?
      // Let's rely on standard flow:

      try {
        await handler.executeApprovalAction(
          request.action,
          request.entityId,
          request.payload,
        );
      } catch (e) {
        throw new BadRequestException(
          `Failed to execute approved action: ${e.message}`,
        );
      }

      return savedRequest;
    });
  }

  async findAll(criteria: any = {}): Promise<ApprovalRequest[]> {
    return await this.approvalRequestRepository.find({
      where: criteria,
      relations: ['requestedBy', 'approvedBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async rejectRequest(
    requestId: string,
    approverId: string,
    reason: string,
  ): Promise<ApprovalRequest> {
    const request = await this.findOne(requestId);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new BadRequestException('Request is not in PENDING status.');
    }

    // Self-rejection is usually allowed, but let's be consistent or allow it?
    // Usually Maker can cancel their own request. Checker rejects.
    // If Maker cancels, it leads to REJECTED or CANCELLED status.
    // We'll allow self-rejection (Cancellation).

    request.status = ApprovalStatus.REJECTED;
    request.approvedById = approverId; // captured as the actor who rejected
    request.rejectionReason = reason;

    return await this.approvalRequestRepository.save(request);
  }
}
