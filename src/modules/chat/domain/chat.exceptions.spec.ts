import {
  BlockedUserException,
  ChatDomainError,
  ConversationAlreadyExistsException,
  ConversationNotFoundException,
  ReportConversationNotFoundException,
  ReportNotFoundException,
  TargetUserNotFoundException,
} from './chat.exceptions';

describe('ChatExceptions', () => {
  it('should instantiate ChatDomainError correctly', () => {
    const ex = new ChatDomainError('message');
    expect(ex.message).toBe('message');
    expect(ex.code).toBe('CHAT_DOMAIN_ERROR');
    expect(ex.type).toBe('BUSINESS_RULE');
  });

  it('should instantiate ConversationNotFoundException correctly', () => {
    const ex = new ConversationNotFoundException();
    expect(ex.message).toBe('Conversation not found');
    expect(ex.code).toBe('CHAT_CONVERSATION_NOT_FOUND');
  });

  it('should instantiate TargetUserNotFoundException correctly', () => {
    const ex = new TargetUserNotFoundException();
    expect(ex.message).toBe('Target user does not exist');
    expect(ex.code).toBe('CHAT_TARGET_USER_NOT_FOUND');
  });

  it('should instantiate BlockedUserException correctly', () => {
    const ex = new BlockedUserException();
    expect(ex.message).toBe('Cannot interact with blocked user');
    expect(ex.code).toBe('CHAT_BLOCKED_USER');
  });

  it('should instantiate ConversationAlreadyExistsException correctly', () => {
    const ex = new ConversationAlreadyExistsException();
    expect(ex.message).toBe('Conversation already exists');
    expect(ex.code).toBe('CHAT_CONVERSATION_ALREADY_EXISTS');
  });

  it('should instantiate ReportNotFoundException correctly', () => {
    const ex = new ReportNotFoundException();
    expect(ex.message).toBe('Report not found');
    expect(ex.code).toBe('CHAT_REPORT_NOT_FOUND');
    expect(ex.type).toBe('NOT_FOUND');
  });

  it('should instantiate ReportConversationNotFoundException correctly', () => {
    const ex = new ReportConversationNotFoundException();
    expect(ex.message).toBe('Reported conversation not found');
    expect(ex.code).toBe('CHAT_REPORT_CONVERSATION_NOT_FOUND');
    expect(ex.type).toBe('NOT_FOUND');
  });
});
