import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { color, font, fontWeight, size, space } from './theme';
import { EmptyState, ErrorState, Skeleton } from './States';

export interface TableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => React.ReactNode;
  /** Relative width. Defaults to 1. */
  flex?: number;
  /** Numbers, codes and IDs in the mono face (DESIGN.md §3). */
  mono?: boolean;
}

export interface TableProps<Row> {
  caption: string;
  columns: ReadonlyArray<TableColumn<Row>>;
  rows: ReadonlyArray<Row> | null;
  rowKey: (row: Row) => string;
  loading?: boolean;
  error?: { title: string; body: string; onRetry: () => void } | null;
  empty: { title: string; body: string };
  /** Row actions: rendered in a trailing cell. */
  actions?: (row: Row) => React.ReactNode;
  testID?: string;
}

/**
 * Table for consoles (DESIGN.md §4: data, loading, empty, error, row actions).
 * Exposed as a table to assistive tech; scrolls sideways on a phone rather
 * than squeezing columns.
 */
export function Table<Row>({ caption, columns, rows, rowKey, loading = false, error = null, empty, actions, testID }: TableProps<Row>) {
  if (loading && !rows) return <Skeleton label={`Loading ${caption}`} lines={['100%', '92%', '96%', '88%']} />;
  if (error) return <ErrorState title={error.title} body={error.body} retryLabel="Try again" onRetry={error.onRetry} />;
  if (!rows || rows.length === 0) return <EmptyState title={empty.title} body={empty.body} />;
  return (
    <ScrollView horizontal testID={testID}>
      <View role="table" accessibilityLabel={caption} style={styles.table}>
        <View role="row" style={[styles.row, styles.headRow]}>
          {columns.map((c) => (
            <View key={c.key} role="columnheader" style={[styles.cell, { flex: c.flex ?? 1 }]}>
              <Text style={styles.head}>{c.header}</Text>
            </View>
          ))}
          {actions ? <View role="columnheader" style={[styles.cell, styles.actions]}><Text style={styles.head}>Actions</Text></View> : null}
        </View>
        {rows.map((row) => (
          <View key={rowKey(row)} role="row" style={styles.row}>
            {columns.map((c) => (
              <View key={c.key} role="cell" style={[styles.cell, { flex: c.flex ?? 1 }]}>
                {(() => {
                  const content = c.render(row);
                  return typeof content === 'string' || typeof content === 'number'
                    ? <Text style={[styles.text, c.mono ? styles.mono : null]}>{content}</Text>
                    : content;
                })()}
              </View>
            ))}
            {actions ? <View role="cell" style={[styles.cell, styles.actions]}>{actions(row)}</View> : null}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  table: { minWidth: '100%', borderWidth: 1, borderColor: color.ruleSoft, borderRadius: 12, overflow: 'hidden', backgroundColor: color.surface },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: size.touchTarget, borderBottomWidth: 1, borderBottomColor: color.ruleSoft },
  headRow: { backgroundColor: color.surface2 },
  cell: { minWidth: 120, paddingVertical: space.s10, paddingHorizontal: space.s12 },
  actions: { flexDirection: 'row', gap: space.s8, minWidth: 160 },
  head: { fontFamily: font.family.sans, fontSize: font.size.caption, fontWeight: fontWeight(font.weight.heavy), letterSpacing: 1, color: color.text3, textTransform: 'uppercase' },
  text: { fontFamily: font.family.sans, fontSize: font.size.bodySm, color: color.text },
  mono: { fontFamily: font.family.mono, color: color.clinicalValue },
});
