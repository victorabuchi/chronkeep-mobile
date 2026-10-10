import { Alert, View } from 'react-native';
import EvMark from '../../components/EvMark';
import Screen from '../../components/Screen';
import { Btn, Card, Empty, Note, PageHead, Txt, useToast } from '../../components/ui';
import * as commands from '../../lib/commands';
import { useData } from '../../lib/data';
import { DOW, MON, ago, typeLabel } from '../../lib/dates';
import { day } from '../../lib/recur';
import { colorOf } from '../../lib/selectors';
import { useTheme } from '../../lib/theme-context';

export default function Bin() {
  const { c } = useTheme();
  const settings = useData((d) => d.settings), trash = useData((d) => d.trash), toast = useToast();
  const emptyIt = () => Alert.alert(`Delete ${trash.length} item${trash.length === 1 ? '' : 's'} for good?`, 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => { commands.emptyBin(); toast.show('Bin emptied'); } }]);
  return (
    <Screen>
      <PageHead eyebrow="Deleted items" title="Bin" />
      <View style={{ gap: 8 }}>
        <Note>Deleted tasks and events stay here for 30 days, then they are removed for good.</Note>
        {trash.length ? <View style={{ alignSelf: 'flex-start' }}><Btn variant="ghost" small onPress={emptyIt}>Empty bin</Btn></View> : null}
      </View>
      {trash.length ? (
        <Card style={{ overflow: 'hidden', padding: 0 }}>
          {trash.map((it, i) => {
            const col = colorOf(settings, it.category, c.b), left = Math.max(0, 30 - Math.floor((Date.now() - it.deletedAt) / 86400000)), meta = { fontSize: 12, lineHeight: 18, color: c.muted };
            return (
              <View key={it.id} style={{ gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }}>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <EvMark color={col} icon={it.done ? 'check' : 'dot'} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt style={{ fontWeight: '600' }}>{it.title}</Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 8, rowGap: 2, alignItems: 'center' }}>
                      <Txt style={{ ...meta, fontSize: 11, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' }}>{typeLabel(it.type)}</Txt>
                      {it.category ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: col }} /><Txt style={meta}>{it.category}</Txt></View> : null}
                      {it.date ? <Txt style={meta}>{it.type === 'event' ? '' : 'Due '}{DOW[day(it.date).getDay()]} {day(it.date).getDate()} {MON[day(it.date).getMonth()]!.slice(0, 3)}{it.time ? `, ${it.time}` : ''}</Txt> : null}
                      <Txt style={meta}>Deleted {ago(it.deletedAt)}</Txt>
                      <Txt style={meta}>{left} day{left === 1 ? '' : 's'} left</Txt>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, paddingLeft: 32 }}>
                  <Btn small onPress={() => { const b = commands.restoreItem(it.id); if (b) toast.show(`Restored "${b.title}"`); }}>Restore</Btn>
                  <Btn small variant="danger" onPress={() => { commands.purgeItem(it.id); toast.show('Deleted for good'); }}>Delete forever</Btn>
                </View>
              </View>
            );
          })}
        </Card>
      ) : <Empty>The bin is empty. Anything you delete lands here first, so you can always get it back.</Empty>}
    </Screen>
  );
}
