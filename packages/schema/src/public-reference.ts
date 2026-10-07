import { z } from 'zod';

export const publicTextSchema = z
  .string()
  .trim()
  .min(1)
  .max(240)
  .refine(
    (text) => !/[\u0000-\u001f\u007f]/.test(text),
    'Plain public text required',
  );

// References only. No fetching, storage, publication, or HTML interpolation.
export const publicReferenceSchema = z
  .string()
  .min(1)
  .max(2048)
  .refine((reference) => {
    if (/\s|[<>]/.test(reference)) return false;
    if (/^urn:[a-z0-9][a-z0-9-]*:[a-zA-Z0-9:._/-]+$/.test(reference))
      return true;
    if (/^ipfs:\/\/[a-zA-Z0-9][a-zA-Z0-9/._-]*$/.test(reference)) return true;
    return (
      /^https:\/\/[^/?#@\\]+(?:[/?#]|$)/.test(reference) &&
      z.url({ protocol: /^https$/ }).safeParse(reference).success
    );
  }, 'Use a public HTTPS, IPFS, or URN reference without credentials');
