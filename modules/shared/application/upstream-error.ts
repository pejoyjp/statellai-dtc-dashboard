/** 外部服务返回非成功 HTTP 状态。 */
export class UpstreamHttpError extends Error {
  constructor(public readonly status: number) { super(`上游服务 HTTP ${status}`); }
}
