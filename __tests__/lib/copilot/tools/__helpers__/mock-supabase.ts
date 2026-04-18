/**
 * Shared thenable Supabase chain mock for Assistente FrotaViva tool tests.
 *
 * The Supabase PostgREST query builder is thenable: every method in the
 * chain returns the same builder, and awaiting the builder executes the
 * HTTP request. Regular jest.fn().mockResolvedValue() doesn't work
 * because `.limit()` is only sometimes the terminal — other methods may
 * be the last call. So we attach `.then` to the chain itself.
 */

export interface MockResult {
  data: unknown[] | null;
  error: { message: string } | null;
  count?: number;
}

export type MockChain = {
  select: jest.Mock;
  in: jest.Mock;
  gte: jest.Mock;
  lte: jest.Mock;
  gt: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  not: jest.Mock;
  or: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  range: jest.Mock;
};

const CHAIN_METHODS = [
  'select',
  'in',
  'gte',
  'lte',
  'gt',
  'eq',
  'neq',
  'not',
  'or',
  'order',
  'limit',
  'range',
] as const;

export function createChain(result: MockResult): MockChain {
  const chain: Record<string, unknown> = {};
  for (const method of CHAIN_METHODS) {
    chain[method] = jest.fn().mockReturnValue(chain);
  }
  (
    chain as {
      then: (cb: (v: MockResult) => unknown) => Promise<unknown>;
    }
  ).then = (cb) => Promise.resolve(cb(result));
  return chain as unknown as MockChain;
}
