import { useState } from 'react';

export default function useCardFilter() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  return {
    selectedTag,
    setSelectedTag,
  };
}
