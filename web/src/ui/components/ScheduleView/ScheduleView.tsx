import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useViewerStore } from '../../../state/viewerStore';
import type { SceneObjectDefinition } from '../../../core/types/model';
import { t } from '../../i18n/translations';
import {
  Table,
  SlidersHorizontal,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import styles from './ScheduleView.module.css';

const ROW_HEIGHT = 30;

interface ScheduleRowItem {
  isHeader?: boolean;
  groupName?: string;
  count?: number;
  obj?: SceneObjectDefinition;
}

export const ScheduleView: React.FC = () => {
  const {
    getAllVisibleObjects,
    selectedObjectIds,
    selectObject,
    setSelectedObjectIds,
    scheduleColumns,
    toggleScheduleColumn,
    scheduleGroupBy,
    setScheduleGroupBy,
    scheduleSortBy,
    scheduleSortOrder,
    setScheduleSort,
    language,
  } = useViewerStore();

  const [showColPicker, setShowColPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  // Search filter query
  const [searchFilter, setSearchFilter] = useState('');
  const [colSearchQuery, setColSearchQuery] = useState('');
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [sortSearchQuery, setSortSearchQuery] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const lastClickedIdxRef = useRef<number | null>(null);

  const visibleObjects = getAllVisibleObjects();

  // Danh sách toàn bộ thuộc tính khả dụng
  const allAvailableProps = useMemo(() => {
    const set = new Set<string>();
    visibleObjects.forEach((obj) => {
      Object.keys(obj.properties).forEach((k) => set.add(k));
    });
    return Array.from(set).sort();
  }, [visibleObjects]);

  // Lọc đối tượng theo từ khóa tìm kiếm (Element ID hoặc bất kỳ property nào)
  const filteredObjects = useMemo(() => {
    if (!searchFilter.trim()) return visibleObjects;
    const q = searchFilter.toLowerCase();
    return visibleObjects.filter((obj) => {
      if (obj.id.toLowerCase().includes(q)) return true;
      if (obj.name && obj.name.toLowerCase().includes(q)) return true;
      for (const val of Object.values(obj.properties)) {
        if (String(val).toLowerCase().includes(q)) return true;
      }
      return false;
    });
  }, [visibleObjects, searchFilter]);

  // Sắp xếp và nhóm dữ liệu
  const processedData: ScheduleRowItem[] = useMemo(() => {
    let list = [...filteredObjects];

    // Sắp xếp
    if (scheduleSortBy) {
      list.sort((a, b) => {
        let valA = a.properties[scheduleSortBy] ?? (a as any)[scheduleSortBy] ?? '';
        let valB = b.properties[scheduleSortBy] ?? (b as any)[scheduleSortBy] ?? '';

        const numA = parseFloat(valA);
        const numB = parseFloat(valB);
        let cmp = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
          cmp = numA - numB;
        } else {
          cmp = String(valA).localeCompare(String(valB));
        }

        return scheduleSortOrder === 'desc' ? -cmp : cmp;
      });
    }

    // Nhóm theo thuộc tính nếu có
    if (scheduleGroupBy) {
      const groupsMap = new Map<string, typeof list>();
      list.forEach((obj) => {
        const key = String(obj.properties[scheduleGroupBy] ?? (obj as any)[scheduleGroupBy] ?? 'None');
        if (!groupsMap.has(key)) groupsMap.set(key, []);
        groupsMap.get(key)!.push(obj);
      });

      // Trải phẳng danh sách có đánh dấu nhóm
      const flatList: ScheduleRowItem[] = [];
      groupsMap.forEach((items, groupName) => {
        flatList.push({ isHeader: true, groupName, count: items.length });
        items.forEach((item) => flatList.push({ obj: item }));
      });
      return flatList;
    }

    return list.map((item): ScheduleRowItem => ({ obj: item }));
  }, [filteredObjects, scheduleSortBy, scheduleSortOrder, scheduleGroupBy]);

  const selectedSet = useMemo(() => new Set(selectedObjectIds), [selectedObjectIds]);

  // Cập nhật containerHeight khi resize
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const totalRows = processedData.length;
  const totalHeight = totalRows * ROW_HEIGHT;

  // Tính toán Virtual Scroll windowing
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
  const endIndex = Math.min(totalRows, Math.ceil((scrollTop + containerHeight) / ROW_HEIGHT) + 5);
  const visibleSlice = processedData.slice(startIndex, endIndex);

  // Xử lý Click dòng (hỗ trợ Shift để chọn nhiều dải rows)
  const handleRowClick = (index: number, objId: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedIdxRef.current !== null) {
      const start = Math.min(lastClickedIdxRef.current, index);
      const end = Math.max(lastClickedIdxRef.current, index);
      const rangeIds: string[] = [];

      for (let i = start; i <= end; i++) {
        const item = processedData[i];
        if (item && item.obj) {
          rangeIds.push(item.obj.id);
        }
      }

      // Giữ lại các ID đã chọn trước đó và gộp thêm dải mới
      const merged = Array.from(new Set([...selectedObjectIds, ...rangeIds]));
      setSelectedObjectIds(merged);
    } else if (e.ctrlKey || e.metaKey) {
      selectObject(objId, true);
      lastClickedIdxRef.current = index;
    } else {
      selectObject(objId, false);
      lastClickedIdxRef.current = index;
    }
  };

  // Chọn toàn bộ nhóm khi click Header nhóm
  const handleGroupHeaderClick = (groupName: string) => {
    const groupIds: string[] = [];
    processedData.forEach((item) => {
      if (item.obj) {
        const key = String(item.obj.properties[scheduleGroupBy!] ?? (item.obj as any)[scheduleGroupBy!] ?? 'None');
        if (key === groupName) {
          groupIds.push(item.obj.id);
        }
      }
    });
    setSelectedObjectIds(groupIds);
  };

  return (
    <div className={styles.scheduleContainer}>
      {/* Schedule Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.titleGroup}>
          <Table size={14} color="var(--color-primary)" />
          <span>{t('schedule.title', language)}</span>
        </div>

        <div className={styles.toolbarActions}>
          {/* Schedule Quick Search */}
          <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <input
              type="text"
              placeholder="Search ID, props..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          {/* Select All Filtered / Deselect All Button */}
          <button
            className={styles.actionBtn}
            onClick={() => {
              if (selectedObjectIds.length === filteredObjects.length && filteredObjects.length > 0) {
                setSelectedObjectIds([]);
              } else {
                setSelectedObjectIds(filteredObjects.map((o) => o.id));
              }
            }}
            title="Select / Deselect all visible elements"
          >
            {selectedObjectIds.length > 0 && selectedObjectIds.length === filteredObjects.length ? (
              <>
                <CheckSquare size={12} color="var(--color-primary)" />
                <span>Deselect All</span>
              </>
            ) : (
              <>
                <Square size={12} />
                <span>Select All ({filteredObjects.length})</span>
              </>
            )}
          </button>

          {/* Configure Columns Button */}
          <button
            className={`${styles.actionBtn} ${showColPicker ? styles.activeActionBtn : ''}`}
            onClick={() => {
              setShowColPicker(!showColPicker);
              setShowGroupPicker(false);
              setShowSortPicker(false);
            }}
            title={t('schedule.columns', language)}
          >
            <SlidersHorizontal size={12} />
            <span>Columns ({scheduleColumns.length})</span>
          </button>

          {/* Group By Button */}
          <button
            className={`${styles.actionBtn} ${scheduleGroupBy ? styles.activeActionBtn : ''}`}
            onClick={() => {
              setShowGroupPicker(!showGroupPicker);
              setShowColPicker(false);
              setShowSortPicker(false);
            }}
            title="Group By Field"
          >
            <Layers size={12} />
            <span>Group By {scheduleGroupBy ? `(${scheduleGroupBy})` : ''}</span>
          </button>

          {/* Sort By Button */}
          <button
            className={`${styles.actionBtn} ${scheduleSortBy ? styles.activeActionBtn : ''}`}
            onClick={() => {
              setShowSortPicker(!showSortPicker);
              setShowColPicker(false);
              setShowGroupPicker(false);
            }}
            title="Sort By Field"
          >
            <ArrowUpDown size={12} />
            <span>Sort {scheduleSortBy ? `(${scheduleSortBy})` : ''}</span>
          </button>
        </div>

        {/* Columns Popover with Search */}
        {showColPicker && (
          <div className={styles.dropdownPopover}>
            <div className={styles.dropdownTitle}>{t('schedule.columns', language)}</div>
            <input
              type="text"
              placeholder="Search columns..."
              value={colSearchQuery}
              onChange={(e) => setColSearchQuery(e.target.value)}
              className={styles.popoverSearchInput}
            />
            {allAvailableProps
              .filter((p) => p.toLowerCase().includes(colSearchQuery.toLowerCase()))
              .map((propName) => (
                <label key={propName} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={scheduleColumns.includes(propName)}
                    onChange={() => toggleScheduleColumn(propName)}
                  />
                  <span>{propName}</span>
                </label>
              ))}
          </div>
        )}

        {/* Group By Popover with Search & Checkbox Toggle */}
        {showGroupPicker && (
          <div className={styles.dropdownPopover}>
            <div className={styles.dropdownTitle}>Group By (Checkbox Toggle)</div>
            <input
              type="text"
              placeholder="Search group properties..."
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              className={styles.popoverSearchInput}
            />
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={scheduleGroupBy === null}
                onChange={() => setScheduleGroupBy(null)}
              />
              <span>None (Flat List)</span>
            </label>
            {allAvailableProps
              .filter((p) => p.toLowerCase().includes(groupSearchQuery.toLowerCase()))
              .map((propName) => (
                <label key={propName} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={scheduleGroupBy === propName}
                    onChange={() =>
                      setScheduleGroupBy(scheduleGroupBy === propName ? null : propName)
                    }
                  />
                  <span>{propName}</span>
                </label>
              ))}
          </div>
        )}

        {/* Sort By Popover with Search & Checkbox Toggle */}
        {showSortPicker && (
          <div className={styles.dropdownPopover}>
            <div className={styles.dropdownTitle}>Sort Field (Checkbox Toggle)</div>
            <input
              type="text"
              placeholder="Search sort fields..."
              value={sortSearchQuery}
              onChange={(e) => setSortSearchQuery(e.target.value)}
              className={styles.popoverSearchInput}
            />
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={scheduleSortBy === null}
                onChange={() => setScheduleSort(null)}
              />
              <span>None (Default Order)</span>
            </label>
            <label className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={scheduleSortBy === 'id'}
                onChange={() =>
                  setScheduleSort(scheduleSortBy === 'id' ? null : 'id', scheduleSortOrder)
                }
              />
              <span>Element ID</span>
            </label>
            {allAvailableProps
              .filter((p) => p.toLowerCase().includes(sortSearchQuery.toLowerCase()))
              .map((propName) => (
                <label key={propName} className={styles.checkboxOption}>
                  <input
                    type="checkbox"
                    checked={scheduleSortBy === propName}
                    onChange={() =>
                      setScheduleSort(
                        scheduleSortBy === propName ? null : propName,
                        scheduleSortOrder
                      )
                    }
                  />
                  <span>{propName}</span>
                </label>
              ))}
            <div style={{ borderTop: '1px solid var(--color-border)', margin: '6px 0' }} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className={`${styles.actionBtn} ${scheduleSortOrder === 'asc' ? styles.activeActionBtn : ''}`}
                onClick={() => setScheduleSort(scheduleSortBy, 'asc')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowUp size={11} /> Asc
              </button>
              <button
                className={`${styles.actionBtn} ${scheduleSortOrder === 'desc' ? styles.activeActionBtn : ''}`}
                onClick={() => setScheduleSort(scheduleSortBy, 'desc')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                <ArrowDown size={11} /> Desc
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Table Header */}
      <div className={styles.tableHeaderSticky}>
        <div className={styles.tableHeaderCell} style={{ width: 45, flexShrink: 0 }}>#</div>
        <div className={styles.tableHeaderCell} style={{ width: 140, flexShrink: 0 }}>
          {t('props.id', language)}
        </div>
        {scheduleColumns.map((col) => (
          <div key={col} className={styles.tableHeaderCell} style={{ width: 120, flexShrink: 0 }}>
            {col}
          </div>
        ))}
      </div>

      {/* Virtual Scrolling List Track */}
      <div
        ref={containerRef}
        className={styles.virtualScrollContainer}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div className={styles.virtualScrollTrack} style={{ height: totalHeight || 1 }}>
          {visibleSlice.map((item, sliceIdx) => {
            const actualIndex = startIndex + sliceIdx;
            const topPos = actualIndex * ROW_HEIGHT;

            // Header Nhóm
            if (item.isHeader) {
              return (
                <div
                  key={`group_${item.groupName}_${actualIndex}`}
                  className={styles.groupHeaderRow}
                  style={{ top: topPos }}
                  onClick={() => handleGroupHeaderClick(item.groupName!)}
                  title="Click to select all elements in this group"
                >
                  <span>▼ {scheduleGroupBy}: {item.groupName} ({item.count} elements)</span>
                </div>
              );
            }

            const obj = item.obj!;
            const isSelected = selectedSet.has(obj.id);

            return (
              <div
                key={obj.id}
                className={`${styles.virtualRow} ${isSelected ? styles.selectedRow : ''}`}
                style={{ top: topPos }}
                onClick={(e) => handleRowClick(actualIndex, obj.id, e)}
              >
                <div className={styles.tableCell} style={{ width: 45, flexShrink: 0, color: 'var(--color-text-muted)' }}>
                  {actualIndex + 1}
                </div>
                <div
                  className={styles.tableCell}
                  style={{ width: 140, flexShrink: 0, fontFamily: 'monospace', fontWeight: 600 }}
                  title={obj.id}
                >
                  {obj.id}
                </div>
                {scheduleColumns.map((col) => (
                  <div key={col} className={styles.tableCell} style={{ width: 120, flexShrink: 0 }}>
                    {String(obj.properties[col] ?? '-')}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span>
          {searchFilter.trim()
            ? `Showing: ${filteredObjects.length} / ${visibleObjects.length}`
            : `${t('schedule.total', language)}: ${visibleObjects.length}`}
        </span>
        {selectedObjectIds.length > 0 && (
          <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>
            {selectedObjectIds.length} {t('props.multipleSelected', language)}
          </span>
        )}
      </div>
    </div>
  );
};
