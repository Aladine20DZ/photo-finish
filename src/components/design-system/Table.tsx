import React from 'react';
import { Edit2 } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  align?: 'right' | 'center' | 'left';
  width?: string;
  editable?: boolean;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  emptyMessage?: string;
  emptyText?: string;
  loading?: boolean;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
  onCellEdit?: (item: T, columnKey: string, currentValue: any) => void;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage,
  emptyText,
  loading = false,
  className = '',
  onRowClick,
  onCellEdit,
}: TableProps<T>) {
  const displayEmpty = emptyText || emptyMessage || 'لا توجد بيانات متاحة حالياً';
  return (
    <div
      className={`w-full bg-[var(--surface,#FFFFFF)] border border-[var(--border,#DADAD6)] rounded-[var(--radius-sm,2px)] shadow-none overflow-hidden ${className}`}
      dir="rtl"
    >
      <div className="overflow-x-auto max-w-full">
        <table className="w-full border-collapse border-spacing-0 text-right">
          <thead>
            <tr className="h-[40px] bg-[var(--block,#0A0A0A)] text-white border-b border-[var(--border-strong,#0A0A0A)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`sticky top-0 z-10 text-xs font-black text-white px-3 py-0 select-none uppercase tracking-wider ${
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'left'
                      ? 'text-left'
                      : 'text-right'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border,#DADAD6)]">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-8 text-[var(--ink-3,#7C7C77)] text-xs font-medium">
                  جارٍ تحميل البيانات... ⏳
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10 text-[var(--ink-3,#7C7C77)] text-xs">
                  {displayEmpty}
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr
                  key={keyExtractor(item, index)}
                  onClick={() => onRowClick && onRowClick(item, index)}
                  className={`h-[40px] transition-colors hover:bg-[var(--surface-alt,#F3F3F1)] ${
                    onRowClick ? 'cursor-pointer' : ''
                  }`}
                >
                  {columns.map((col) => {
                    const cellVal = (item as any)[col.key];
                    const isEditable = Boolean(col.editable && onCellEdit);

                    return (
                      <td
                        key={col.key}
                        className={`px-3 py-0 text-sm text-[var(--ink,#0A0A0A)] font-normal tabular-nums truncate ${
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'left'
                            ? 'text-left'
                            : 'text-right'
                        } ${col.className || ''}`}
                      >
                        {isEditable ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              onCellEdit!(item, col.key, cellVal);
                            }}
                            className="inline-flex items-center justify-between gap-1.5 px-2 py-0.5 rounded-[var(--radius-sm,2px)] border border-[var(--border-strong,#0A0A0A)] bg-white hover:bg-[var(--surface-alt,#F3F3F1)] transition-all cursor-pointer group"
                            title="انقر للتعديل المباشر"
                          >
                            <span>{col.render ? col.render(item, index) : cellVal}</span>
                            <Edit2 className="w-3 h-3 text-[var(--ink-3)] group-hover:text-[var(--primary)] transition-colors opacity-70 group-hover:opacity-100" />
                          </div>
                        ) : col.render ? (
                          col.render(item, index)
                        ) : (
                          cellVal
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
