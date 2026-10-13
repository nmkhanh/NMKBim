import React, { useState } from 'react';
import { useViewerStore } from '../../../state/viewerStore';
import { t } from '../../i18n/translations';
import { Trash2, Users } from 'lucide-react';
import styles from './PropertyGrid.module.css';

const PRESET_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#a855f7'];

export const PropertyGrid: React.FC = () => {
  const {
    language,
    getSelectedObjects,
    setColorOverride,
    elementOpacities,
    setElementOpacity,
    resetElementOpacity,
    groups,
    createGroup,
    removeGroup,
    selectGroup,
  } = useViewerStore();

  const selectedObjs = getSelectedObjects();
  const selectedIds = selectedObjs.map((o) => o.id);

  const [groupName, setGroupName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#10b981');

  // Xử lý tạo Group
  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;
    createGroup(groupName || `Group ${groups.length + 1}`, selectedIds, selectedColor);
    setGroupName('');
  };

  // Tính toán gộp thuộc tính
  const consolidatedProperties = React.useMemo(() => {
    if (selectedObjs.length === 0) return [];

    const keysSet = new Set<string>();
    selectedObjs.forEach((o) => {
      Object.keys(o.properties).forEach((k) => keysSet.add(k));
    });

    const rows: { name: string; value: string; isVaries: boolean }[] = [];

    Array.from(keysSet).sort().forEach((key) => {
      const firstVal = selectedObjs[0].properties[key];
      let isSame = true;

      for (let i = 1; i < selectedObjs.length; i++) {
        const val = selectedObjs[i].properties[key];
        if (val !== firstVal) {
          isSame = false;
          break;
        }
      }

      if (isSame && firstVal !== undefined) {
        rows.push({ name: key, value: String(firstVal), isVaries: false });
      } else {
        rows.push({ name: key, value: t('props.varies', language), isVaries: true });
      }
    });

    return rows;
  }, [selectedObjs, language]);

  return (
    <div className={styles.propertyContainer}>
      <div className={styles.header}>
        <h3 className={styles.title}>{t('props.title', language)}</h3>
        {selectedObjs.length > 0 && (
          <span className={styles.countBadge}>
            {selectedObjs.length}
          </span>
        )}
      </div>

      {selectedObjs.length === 0 ? (
        <div className={styles.emptyState}>
          <p>{t('props.empty', language)}</p>

          {/* Hiển thị Element Groups nếu có */}
          {groups.length > 0 && (
            <div className={styles.groupsSection} style={{ textAlign: 'left', marginTop: 20 }}>
              <div className={styles.actionSectionTitle}>{t('props.groups', language)}</div>
              {groups.map((g) => (
                <div
                  key={g.id}
                  className={styles.groupItem}
                  onClick={() => selectGroup(g.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={12} color={g.color || 'var(--color-primary)'} />
                    <span>{g.name} ({g.objectIds.length})</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGroup(g.id);
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.content}>
          {/* Action Bar: Color Override & Create Group */}
          <div className={styles.actionBar}>
            <div className={styles.actionSectionTitle}>{t('props.overrideColor', language)}</div>
            <div className={styles.colorBar}>
              <input
                type="color"
                className={styles.colorPicker}
                value={selectedColor}
                onChange={(e) => {
                  setSelectedColor(e.target.value);
                  setColorOverride(selectedIds, e.target.value);
                }}
                title={t('props.overrideColor', language)}
              />
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={styles.colorPreset}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setSelectedColor(c);
                    setColorOverride(selectedIds, c);
                  }}
                />
              ))}
              <button
                className={styles.resetColorBtn}
                onClick={() => setColorOverride(selectedIds, null)}
                title={t('props.resetColor', language)}
              >
                {t('props.resetColor', language)}
              </button>
            </div>

            {/* Element Opacity Slider */}
            <div className={styles.actionSectionTitle} style={{ marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
              <span>Element Opacity</span>
              <span>{Math.round((elementOpacities[selectedIds[0]] ?? 1) * 100)}%</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={elementOpacities[selectedIds[0]] ?? 1}
                onChange={(e) => setElementOpacity(selectedIds, parseFloat(e.target.value))}
                style={{ flex: 1, accentColor: 'var(--color-primary)', cursor: 'pointer' }}
              />
              <button
                className={styles.resetColorBtn}
                onClick={() => resetElementOpacity(selectedIds)}
                title="Reset Element Opacity to 100%"
                style={{ marginLeft: 0 }}
              >
                Reset
              </button>
            </div>

            <div className={styles.actionSectionTitle} style={{ marginTop: 6 }}>
              {t('props.createGroup', language)}
            </div>
            <form className={styles.groupRow} onSubmit={handleCreateGroup}>
              <input
                type="text"
                className={styles.groupInput}
                placeholder="Group name..."
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
              <button type="submit" className={styles.groupBtn}>
                + Group
              </button>
            </form>
          </div>

          {/* Meta card */}
          <div className={styles.metaCard}>
            {selectedObjs.length === 1 ? (
              <>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>{t('props.id', language)}:</span>
                  <span className={styles.metaValue}>{selectedObjs[0].id}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>{t('props.category', language)}:</span>
                  <span className={styles.metaValueHighlight}>{selectedObjs[0].name}</span>
                </div>
              </>
            ) : (
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>Selection:</span>
                <span className={styles.metaValueHighlight}>
                  {selectedObjs.length} {t('props.multipleSelected', language)}
                </span>
              </div>
            )}
          </div>

          {/* Consolidated Table */}
          <table className={styles.propertyTable}>
            <thead>
              <tr>
                <th className={styles.colName}>{t('props.name', language)}</th>
                <th className={styles.colValue}>{t('props.value', language)}</th>
              </tr>
            </thead>
            <tbody>
              {consolidatedProperties.map((row) => (
                <tr key={row.name} className={styles.row}>
                  <td className={styles.cellName}>{row.name}</td>
                  <td className={styles.cellValue}>
                    {row.isVaries ? (
                      <span className={styles.variesBadge}>{row.value}</span>
                    ) : (
                      row.value
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Saved Groups section */}
          {groups.length > 0 && (
            <div className={styles.groupsSection}>
              <div className={styles.actionSectionTitle}>{t('props.groups', language)}</div>
              {groups.map((g) => (
                <div
                  key={g.id}
                  className={styles.groupItem}
                  onClick={() => selectGroup(g.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={12} color={g.color || 'var(--color-primary)'} />
                    <span>{g.name} ({g.objectIds.length})</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeGroup(g.id);
                    }}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
