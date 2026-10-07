import { createHash } from 'node:crypto';
import { canonicalJson } from './canonical.ts';

// PCG XSH-RR 64/32 reference algorithm, expressed with explicit unsigned masks.
// Construction only. Not a CSPRNG or an approved reveal/assignment protocol.
export class Pcg32 {
  private state = 0n;
  private readonly increment: bigint;
  constructor(initialState: bigint, sequence: bigint) {
    if (
      initialState < 0n ||
      initialState > 0xffffffffffffffffn ||
      sequence < 0n ||
      sequence > 0xffffffffffffffffn
    )
      throw new Error('PCG initialization requires unsigned 64-bit integers');
    this.increment = ((sequence << 1n) | 1n) & 0xffffffffffffffffn;
    this.next();
    this.state = (this.state + initialState) & 0xffffffffffffffffn;
    this.next();
  }
  next(): number {
    const previous = this.state;
    this.state =
      (previous * 6364136223846793005n + this.increment) & 0xffffffffffffffffn;
    const shifted = Number(
      (((previous >> 18n) ^ previous) >> 27n) & 0xffffffffn,
    );
    const rotation = Number(previous >> 59n);
    return ((shifted >>> rotation) | (shifted << (-rotation & 31))) >>> 0;
  }
  bounded(bound: number): number {
    if (!Number.isSafeInteger(bound) || bound < 1 || bound > 0x100000000)
      throw new Error('Invalid PRNG bound');
    const threshold = (0x100000000 - bound) % bound;
    for (let attempt = 0; attempt < 128; attempt++) {
      const value = this.next();
      if (value >= threshold) return value % bound;
    }
    throw new Error('PRNG range sampling bound exhausted');
  }
}

export function constructionPrng(recipe: unknown): Pcg32 {
  const digest = createHash('sha256')
    .update('LAMMB construction seed v1\n', 'utf8')
    .update(canonicalJson(recipe), 'utf8')
    .digest();
  return new Pcg32(digest.readBigUInt64BE(0), digest.readBigUInt64BE(8));
}
