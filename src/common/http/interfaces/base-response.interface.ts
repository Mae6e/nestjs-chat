export interface BaseResponse<T> {
  data: T;
  message: string;
}

export interface PaginatedBaseResponse<T, M = unknown> extends BaseResponse<
  T[]
> {
  meta: M;
}
