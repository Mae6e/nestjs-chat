import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  getSchemaPath,
} from '@nestjs/swagger';

interface ApiBaseResponseOptions {
  created?: boolean;
  isArray?: boolean;
  description?: string;
}

/**
 * Documents a controller response that is wrapped by BaseResponseInterceptor.
 */
export function ApiBaseResponse<T>(
  type: Type<T>,
  options: ApiBaseResponseOptions = {},
) {
  const { created = false, isArray = false, description } = options;

  const dataSchema = isArray
    ? { type: 'array' as const, items: { $ref: getSchemaPath(type) } }
    : { $ref: getSchemaPath(type) };

  const responseOptions = {
    description,
    schema: {
      type: 'object' as const,
      properties: {
        message: {
          type: 'string' as const,
          example: 'Success',
        },
        data: dataSchema,
      },
    },
  };

  const responseDecorator = created
    ? ApiCreatedResponse(responseOptions)
    : ApiOkResponse(responseOptions);

  return applyDecorators(ApiExtraModels(type), responseDecorator);
}
