import { z } from 'zod';

const localMedia = z
  .string()
  .regex(/^\/media\/[a-z0-9/-]+\.(mp4|webm|vtt|webp)$/);
const episodeBase = {
  id: z.string().regex(/^EPISODE \d{3}$/),
  title: z.string().min(1).max(100),
  synopsis: z.string().min(1).max(500),
};

// Editorial publication is independent of mint state and NFT metadata.
export const episodeSchema = z.discriminatedUnion('status', [
  z
    .object({
      ...episodeBase,
      status: z.literal('IN_DEVELOPMENT'),
      media: z.null(),
      releaseDate: z.null(),
    })
    .strict(),
  z
    .object({
      ...episodeBase,
      status: z.literal('PUBLISHED'),
      media: z
        .object({
          video: localMedia.refine((path) => /\.(mp4|webm)$/.test(path)),
          poster: localMedia.refine((path) => path.endsWith('.webp')),
          captions: z
            .array(
              z
                .object({
                  src: localMedia.refine((path) => path.endsWith('.vtt')),
                  language: z.string().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
                  label: z.string().min(1),
                })
                .strict(),
            )
            .min(1),
          transcript: z.string().min(1),
        })
        .strict(),
      releaseDate: z.iso.date(),
    })
    .strict(),
]);
export const episodeCatalogSchema = z
  .array(episodeSchema)
  .superRefine((episodes, ctx) => {
    if (new Set(episodes.map((episode) => episode.id)).size !== episodes.length)
      ctx.addIssue({
        code: 'custom',
        message: 'Episode identifiers must be unique',
      });
  });
export type Episode = z.infer<typeof episodeSchema>;
