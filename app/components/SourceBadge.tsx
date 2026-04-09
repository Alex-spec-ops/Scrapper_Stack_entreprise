'use client';

import { JobSource, SOURCE_COLORS, SOURCE_LABELS } from '../../lib/types';

interface Props {
  source: JobSource;
  small?: boolean;
}

export default function SourceBadge({ source, small }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${SOURCE_COLORS[source]} ${
        small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      }`}
    >
      {SOURCE_LABELS[source]}
    </span>
  );
}
