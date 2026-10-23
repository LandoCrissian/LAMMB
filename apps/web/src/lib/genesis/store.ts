import type { Pool } from 'pg';
import { emptyState, validateState, GenesisError, type State } from './model';

export interface Store {
  transaction<T>(fn: (state: State) => Promise<T> | T): Promise<T>;
}

// One bounded document is locked for each transaction: approvals, nonce consumption,
// rate limits and exports are serialized across serverless instances, not in memory.
export class PostgresStore implements Store {
  constructor(private readonly pool: Pool) {}
  async transaction<T>(fn: (state: State) => Promise<T> | T): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SET LOCAL statement_timeout = '5000ms'");
      const result = await client.query(
        'SELECT data FROM genesis_registration_state WHERE id = 1 FOR UPDATE',
      );
      if (result.rowCount !== 1)
        throw new Error('Registration migration required');
      let state: State;
      try {
        state = validateState(result.rows[0].data);
      } catch {
        throw new GenesisError('REGISTRATION_STATE_INVALID', 503);
      }
      const output = await fn(state);
      const serialized = JSON.stringify(validateState(state));
      if (Buffer.byteLength(serialized) > 8 * 1024 * 1024)
        throw new Error('Registration storage bound reached');
      await client.query(
        'UPDATE genesis_registration_state SET data = $1::jsonb, revision = revision + 1 WHERE id = 1',
        [serialized],
      );
      await client.query('COMMIT');
      return output;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
export const initialState = emptyState;
