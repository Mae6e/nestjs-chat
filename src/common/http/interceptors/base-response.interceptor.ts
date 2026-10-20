import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, Observable } from 'rxjs';
import {
  BaseResponse,
  PaginatedBaseResponse,
} from '@common/http/interfaces/base-response.interface';
import { RESPONSE_MESSAGE_KEY } from '@common/http/decorators/response-message.decorator';

interface PaginatedPayload {
  data: unknown[];
  meta: unknown;
}

function isPaginatedPayload(value: unknown): value is PaginatedPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const payload = value as { data?: unknown; meta?: unknown };

  return (
    Array.isArray(payload.data) &&
    typeof payload.meta === 'object' &&
    payload.meta !== null
  );
}

/**
 * Wraps every successful HTTP controller response in a consistent
 * `{ data, message }` envelope. Paginated payloads (`{ data, meta }`) are
 * flattened so the response keeps a single top-level `data` array:
 * `{ data: [...], meta, message }`.
 */
@Injectable()
export class BaseResponseInterceptor<T> implements NestInterceptor<
  T,
  BaseResponse<T | null> | PaginatedBaseResponse<unknown>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponse<T | null> | PaginatedBaseResponse<unknown>> {
    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    return next.handle().pipe(
      map((payload) => {
        if (isPaginatedPayload(payload)) {
          return {
            data: payload.data,
            meta: payload.meta,
            message,
          };
        }

        return {
          data: payload ?? null,
          message,
        };
      }),
    );
  }
}
