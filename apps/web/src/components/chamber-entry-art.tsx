'use client';
import Image from 'next/image';

export function ChamberEntryArt({
  scene,
}: {
  scene: 'observer-access' | 'quick-orientation';
}) {
  return (
    <span
      className={`chamber-entry-art chamber-entry-art-${scene}`}
      aria-hidden="true"
    >
      <Image
        src={`/art/chamber-entry/${scene}.webp`}
        alt=""
        fill
        sizes="(min-width: 1240px) 1150px, (min-width: 768px) 94vw, 100vw"
        loading={scene === 'observer-access' ? 'eager' : 'lazy'}
        onError={(event) => {
          event.currentTarget.hidden = true;
        }}
      />
    </span>
  );
}
