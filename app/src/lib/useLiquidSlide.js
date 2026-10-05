import { useEffect } from 'react';
import { useDerivedValue, useSharedValue, withSpring } from 'react-native-reanimated';

// Drives a selection thumb that springs from one slot to the next like a drop of
// liquid: `position` is the animated slot index, `stretch` rises 0 → 1 → 0 across
// each move so the thumb can elongate mid-flight and settle back to its own shape.
export function useLiquidSlide(index, spring) {
  const position = useSharedValue(index);
  const from = useSharedValue(index);
  const to = useSharedValue(index);

  useEffect(() => {
    from.set(position.get());
    to.set(index);
    position.set(withSpring(index, spring));
  }, [index, spring, position, from, to]);

  const stretch = useDerivedValue(() => {
    const span = to.get() - from.get();
    if (span === 0) return 0;
    const progress = Math.min(Math.max((position.get() - from.get()) / span, 0), 1);
    return Math.sin(progress * Math.PI);
  });

  return { position, stretch };
}
