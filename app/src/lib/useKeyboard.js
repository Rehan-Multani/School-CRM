import { useCallback, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Tracks keyboard visibility and height across iOS and Android with
 * transition debouncing to prevent flickering when switching between inputs.
 */
export function useKeyboard() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    let hideTimer = null;

    const showSub = Keyboard.addListener(showEvent, (e) => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      const height = e.endCoordinates?.height || 280;
      setKeyboardHeight(height);
      setKeyboardVisible(true);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      // Debounce hide slightly so fast keyboard switches between inputs (e.g. text -> password)
      // do not cause jarring jumps or reset state mid-transition
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setKeyboardHeight(0);
        setKeyboardVisible(false);
      }, 100);
    });

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return { keyboardHeight, keyboardVisible };
}

/**
 * Provides scroll auto-adjustment when focusing inputs, ensuring the
 * active input and action buttons are positioned comfortably above the virtual keyboard.
 * Handles input switching and reopening seamlessly.
 */
export function useKeyboardScroll({ defaultOffset = 180, autoReset = true } = {}) {
  const scrollRef = useRef(null);
  const { keyboardHeight, keyboardVisible } = useKeyboard();
  const activeOffsetRef = useRef(defaultOffset);
  const resetTimerRef = useRef(null);

  const scrollToInput = useCallback((offset = defaultOffset) => {
    activeOffsetRef.current = offset;
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
    // Immediate scroll + follow-up checks as keyboard animation finishes
    scrollRef.current?.scrollTo({ y: offset, animated: true });
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 60);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: offset, animated: true });
    }, 160);
  }, [defaultOffset]);

  const resetScroll = useCallback(() => {
    if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
    }, 120);
  }, []);

  useEffect(() => {
    if (keyboardVisible) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      const target = activeOffsetRef.current || defaultOffset;
      const t1 = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }, 50);
      const t2 = setTimeout(() => {
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }, 160);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    } else if (autoReset) {
      resetScroll();
    }
  }, [keyboardVisible, defaultOffset, autoReset, resetScroll]);

  return {
    scrollRef,
    keyboardHeight,
    keyboardVisible,
    scrollToInput,
    resetScroll,
  };
}
