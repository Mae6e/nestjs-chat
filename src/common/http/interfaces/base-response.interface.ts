export interface BaseResponse<T> {
  succeed: boolean;
  data: T;
  message: string;
}

export interface PaginatedBaseResponse<T, M = unknown> extends BaseResponse<
  T[]
> {
  meta: M;
}
