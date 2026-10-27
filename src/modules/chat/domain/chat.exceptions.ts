import { DomainException } from '@common/exceptions/domain.exception';

export class TargetUserNotFoundException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Target user does not exist: ${reason}`
        : 'Target user does not exist',
      'CHAT_TARGET_USER_NOT_FOUND',
      'NOT_FOUND',
    );
  }
}

export class BlockedUserException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Cannot interact with blocked user: ${reason}`
        : 'Cannot interact with blocked user',
      'CHAT_BLOCKED_USER',
      'FORBIDDEN',
    );
  }
}

export class ConversationAlreadyExistsException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Conversation already exists: ${reason}`
        : 'Conversation already exists',
      'CHAT_CONVERSATION_ALREADY_EXISTS',
      'CONFLICT',
    );
  }
}

export class ConversationNotFoundException extends DomainException {
  constructor(reason?: string) {
    super(
      reason ? `Conversation not found: ${reason}` : 'Conversation not found',
      'CHAT_CONVERSATION_NOT_FOUND',
      'NOT_FOUND',
    );
  }
}

export class NotAGroupConversationException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Conversation is not a group: ${reason}`
        : 'Conversation is not a group',
      'CHAT_NOT_A_GROUP',
      'BUSINESS_RULE',
    );
  }
}

export class GroupAdminRequiredException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Admin privileges required: ${reason}`
        : 'Only group admins can perform this action',
      'CHAT_GROUP_ADMIN_REQUIRED',
      'FORBIDDEN',
    );
  }
}

export class GroupMemberLimitExceededException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Group has reached its maximum number of members: ${reason}`
        : 'Group has reached its maximum number of members',
      'CHAT_GROUP_MEMBER_LIMIT_EXCEEDED',
      'BUSINESS_RULE',
    );
  }
}

export class GroupMemberAlreadyExistsException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `User is already a member of the group: ${reason}`
        : 'User is already a member of the group',
      'CHAT_GROUP_MEMBER_ALREADY_EXISTS',
      'CONFLICT',
    );
  }
}

export class GroupMemberRequestPendingException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `User already has a pending request to join the group: ${reason}`
        : 'User already has a pending request to join the group',
      'CHAT_GROUP_MEMBER_REQUEST_PENDING',
      'CONFLICT',
    );
  }
}

export class GroupMemberNotFoundException extends DomainException {
  constructor(reason?: string) {
    super(
      reason ? `Group member not found: ${reason}` : 'Group member not found',
      'CHAT_GROUP_MEMBER_NOT_FOUND',
      'NOT_FOUND',
    );
  }
}

export class GroupJoinRequestNotFoundException extends DomainException {
  constructor(reason?: string) {
    super(
      reason ? `Join request not found: ${reason}` : 'Join request not found',
      'CHAT_GROUP_JOIN_REQUEST_NOT_FOUND',
      'NOT_FOUND',
    );
  }
}

export class LastGroupAdminException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Group must keep at least one admin: ${reason}`
        : 'Group must keep at least one admin',
      'CHAT_GROUP_LAST_ADMIN',
      'BUSINESS_RULE',
    );
  }
}

export class GroupOwnerCannotBeRemovedException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Group owner cannot be removed: ${reason}`
        : 'Group owner cannot be removed',
      'CHAT_GROUP_OWNER_CANNOT_BE_REMOVED',
      'BUSINESS_RULE',
    );
  }
}

export class CannotRemoveSelfException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `You cannot remove yourself from the group: ${reason}`
        : 'You cannot remove yourself from the group',
      'CHAT_CANNOT_REMOVE_SELF',
      'BUSINESS_RULE',
    );
  }
}

export class ChatDomainError extends DomainException {
  constructor(message: string) {
    super(message, 'CHAT_DOMAIN_ERROR', 'BUSINESS_RULE');
  }
}

export class UserNotFoundException extends DomainException {
  constructor(identifier?: string) {
    super(
      identifier
        ? `User with identifier ${identifier} not found`
        : 'User not found',
      'USER_NOT_FOUND',
      'NOT_FOUND',
    );
  }
}

export class UserAlreadyExistsException extends DomainException {
  constructor(reason?: string) {
    super(
      reason ? `User already exists: ${reason}` : 'User already exists',
      'USER_ALREADY_EXISTS',
      'CONFLICT',
    );
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor(reason?: string) {
    super(
      reason
        ? `Username or password combination is invalid: ${reason}`
        : 'Username or password combination is invalid',
      'USER_INVALID_CREDENTIALS',
      'UNAUTHORIZED',
    );
  }
}

export class UserDomainError extends DomainException {
  constructor(message: string) {
    super(message, 'USER_DOMAIN_ERROR', 'BUSINESS_RULE');
  }
}
