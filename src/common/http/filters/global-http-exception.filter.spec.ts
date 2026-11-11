import { ConflictException } from '@nestjs/common';
import { GlobalHttpExceptionFilter } from './global-http-exception.filter';
import { ConversationNotFoundException } from '@modules/chat/domain/chat.exceptions';

describe('GlobalHttpExceptionFilter', () => {
  const response = {};
  let reply: jest.Mock;
  let filter: GlobalHttpExceptionFilter;
  let host: any;

  beforeEach(() => {
    reply = jest.fn();
    filter = new GlobalHttpExceptionFilter({
      httpAdapter: { reply },
    } as any);
    host = {
      switchToHttp: () => ({ getResponse: () => response }),
    };
  });

  it('returns a domain exception code in the code property', () => {
    filter.catch(new ConversationNotFoundException(), host);

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        data: null,
        statusCode: 404,
        message: 'Conversation not found',
        code: 'CHAT_CONVERSATION_NOT_FOUND',
      },
      404,
    );
  });

  it('renames the standard HTTP error property to code', () => {
    filter.catch(new ConflictException('Already exists'), host);

    expect(reply).toHaveBeenCalledWith(
      response,
      {
        statusCode: 409,
        message: 'Already exists',
        code: 'Conflict',
        data: null,
      },
      409,
    );
  });
});
