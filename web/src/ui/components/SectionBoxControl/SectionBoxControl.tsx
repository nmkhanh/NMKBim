import React from 'react';
import { useViewerStore } from '../../../state/viewerStore';
import { t } from '../../i18n/translations';
import { Scissors, RotateCcw } from 'lucide-react';
import styles from './SectionBoxControl.module.css';

export const SectionBoxControl: React.FC = () => {
  const { sectionBox, setSectionBox, toggleSectionBox, modelBounds, recomputeBounds, language } =
    useViewerStore();

  const stepX = Math.max(0.01, (modelBounds.maxX - modelBounds.minX) / 100);
  const stepY = Math.max(0.01, (modelBounds.maxY - modelBounds.minY) / 100);
  const stepZ = Math.max(0.01, (modelBounds.maxZ - modelBounds.minZ) / 100);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <Scissors size={15} className={styles.icon} />
          <span className={styles.title}>{t('sectionbox.title', language)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {sectionBox.enabled && (
            <button
              onClick={() => recomputeBounds()}
              title="Reset Section Box to Model Bounds"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RotateCcw size={13} />
            </button>
          )}
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={sectionBox.enabled}
              onChange={toggleSectionBox}
            />
            <span className={styles.slider} />
          </label>
        </div>
      </div>

      {sectionBox.enabled && (
        <div className={styles.slidersList}>
          {/* X Range */}
          <div className={styles.axisGroup}>
            <div className={styles.axisLabel}>
              <span>{t('sectionbox.x', language)}</span>
              <span className={styles.values}>
                [{sectionBox.minX.toFixed(2)}, {sectionBox.maxX.toFixed(2)}]
              </span>
            </div>
            <div className={styles.rangeInputs}>
              <input
                type="range"
                min={modelBounds.minX}
                max={sectionBox.maxX}
                step={stepX}
                value={sectionBox.minX}
                onChange={(e) => setSectionBox({ minX: parseFloat(e.target.value) })}
              />
              <input
                type="range"
                min={sectionBox.minX}
                max={modelBounds.maxX}
                step={stepX}
                value={sectionBox.maxX}
                onChange={(e) => setSectionBox({ maxX: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Y Range */}
          <div className={styles.axisGroup}>
            <div className={styles.axisLabel}>
              <span>{t('sectionbox.y', language)}</span>
              <span className={styles.values}>
                [{sectionBox.minY.toFixed(2)}, {sectionBox.maxY.toFixed(2)}]
              </span>
            </div>
            <div className={styles.rangeInputs}>
              <input
                type="range"
                min={modelBounds.minY}
                max={sectionBox.maxY}
                step={stepY}
                value={sectionBox.minY}
                onChange={(e) => setSectionBox({ minY: parseFloat(e.target.value) })}
              />
              <input
                type="range"
                min={sectionBox.minY}
                max={modelBounds.maxY}
                step={stepY}
                value={sectionBox.maxY}
                onChange={(e) => setSectionBox({ maxY: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          {/* Z Range */}
          <div className={styles.axisGroup}>
            <div className={styles.axisLabel}>
              <span>{t('sectionbox.z', language)}</span>
              <span className={styles.values}>
                [{sectionBox.minZ.toFixed(2)}, {sectionBox.maxZ.toFixed(2)}]
              </span>
            </div>
            <div className={styles.rangeInputs}>
              <input
                type="range"
                min={modelBounds.minZ}
                max={sectionBox.maxZ}
                step={stepZ}
                value={sectionBox.minZ}
                onChange={(e) => setSectionBox({ minZ: parseFloat(e.target.value) })}
              />
              <input
                type="range"
                min={sectionBox.minZ}
                max={modelBounds.maxZ}
                step={stepZ}
                value={sectionBox.maxZ}
                onChange={(e) => setSectionBox({ maxZ: parseFloat(e.target.value) })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
