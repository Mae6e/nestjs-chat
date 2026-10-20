import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { firstValueFrom, of } from 'rxjs';
import { BaseResponseInterceptor } from './base-response.interceptor';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

describe('BaseResponseInterceptor', () => {
  const context = {
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  function createInterceptor(message?: string) {
    const reflector = {
      getAllAndOverride: jest.fn((key: string) =>
        key === RESPONSE_MESSAGE_KEY ? message : undefined,
      ),
    } as unknown as Reflector;

    return new BaseResponseInterceptor(reflector);
  }

  function nextWith(payload: unknown): CallHandler {
    return {
      handle: () => of(payload),
    } as CallHandler;
  }

  it('wraps a payload in the base response envelope', async () => {
    const interceptor = createInterceptor('Group created successfully');

    const result = await firstValueFrom(
      interceptor.intercept(context, nextWith({ id: 'group-1' })),
    );

    expect(result).toEqual({
      data: { id: 'group-1' },
      message: 'Group created successfully',
    });
  });

  it('uses the default message when no message is configured', async () => {
    const interceptor = createInterceptor();

    const result = await firstValueFrom(
      interceptor.intercept(context, nextWith({ id: 'group-1' })),
    );

    expect(result).toEqual({
      data: { id: 'group-1' },
      message: 'Success',
    });
  });

  it('flattens paginated payloads into data, meta and message', async () => {
    const interceptor = createInterceptor('Groups retrieved successfully');
    const payload = {
      data: [{ id: 'group-1' }],
      meta: { page: 1, pageSize: 15, total: 1 },
    };

    const result = await firstValueFrom(
      interceptor.intercept(context, nextWith(payload)),
    );

    expect(result).toEqual({
      data: payload.data,
      meta: payload.meta,
      message: 'Groups retrieved successfully',
    });
  });

  it('returns data null when the handler returns nothing', async () => {
    const interceptor = createInterceptor();

    const result = await firstValueFrom(
      interceptor.intercept(context, nextWith(undefined)),
    );

    expect(result).toEqual({
      data: null,
      message: 'Success',
    });
  });
});
