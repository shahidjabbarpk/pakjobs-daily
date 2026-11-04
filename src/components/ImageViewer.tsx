import { Image } from 'expo-image';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '@/lib/i18n';
import { font } from '@/lib/theme';
import { Icon, Tap } from './ui';

/** Full-screen advert viewer: pinch to zoom, drag to pan, double-tap to toggle 2.5x. */
export function ImageViewer({ uri, visible, onClose, onOpenOriginal }: {
  uri: string; visible: boolean; onClose: () => void; onOpenOriginal: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withTiming(1);
    saved.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    sx.value = 0;
    sy.value = 0;
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(5, Math.max(1, saved.value * e.scale)); })
    .onEnd(() => { saved.value = scale.value; if (scale.value <= 1.01) reset(); });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      tx.value = sx.value + e.translationX;
      ty.value = sy.value + e.translationY;
    })
    .onEnd(() => { sx.value = tx.value; sy.value = ty.value; });
  const doubleTap = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    if (scale.value > 1) reset();
    else { scale.value = withTiming(2.5); saved.value = 2.5; }
  });
  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.fill, style]}>
            <Image source={{ uri }} style={styles.fill} contentFit="contain" transition={250} />
          </Animated.View>
        </GestureDetector>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Tap onPress={onClose} style={styles.btn}><Icon name="close" size={24} color="#fff" /></Tap>
          <Tap onPress={onOpenOriginal} style={[styles.btn, styles.wide]}>
            <Icon name="open-in-new" size={18} color="#fff" />
            <Text style={styles.btnText}>{t('openOriginal')}</Text>
          </Tap>
        </View>
        <Animated.Text style={[styles.hint, { bottom: insets.bottom + 20 }]}>{t('zoomHint')}</Animated.Text>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  fill: { flex: 1, width: '100%' },
  top: { position: 'absolute', left: 0, right: 0, top: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14 },
  btn: { height: 44, minWidth: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  wide: { flexDirection: 'row', gap: 6, paddingHorizontal: 14 },
  btnText: { color: '#fff', fontFamily: font.semi, fontSize: 13 },
  hint: { position: 'absolute', alignSelf: 'center', color: 'rgba(255,255,255,0.7)', fontFamily: font.regular, fontSize: 12 },
});
