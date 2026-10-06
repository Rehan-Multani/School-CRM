import { router } from 'expo-router';
import { Card } from '../ui';
import { ListRow } from '../kit';
import { spacing } from '../../theme';

// A card of tappable rows that open a Principal module screen. `items`:
// `[{ icon, title, subtitle, href }]` (href is an expo-router path).
export default function ModuleList({ items, style }) {
  return (
    <Card style={[{ paddingVertical: spacing.xs }, style]}>
      {items.map((it) => (
        <ListRow
          key={it.href}
          icon={it.icon}
          title={it.title}
          subtitle={it.subtitle}
          onPress={() => router.push(it.href)}
        />
      ))}
    </Card>
  );
}
