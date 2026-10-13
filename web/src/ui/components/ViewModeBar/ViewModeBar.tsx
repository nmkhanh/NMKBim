import React from 'react';
import { useViewerStore } from '../../../state/viewerStore';
import { t } from '../../i18n/translations';
import {
  Box,
  Layers,
  AlignVerticalSpaceAround,
  Grid3X3,
} from 'lucide-react';
import styles from './ViewModeBar.module.css';

export const ViewModeBar: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    planDirection,
    setPlanDirection,
    sectionBox,
    setSectionBox,
    graphicMode,
    toggleGraphicMode,
    language,
  } = useViewerStore();

  return (
    <div className={styles.container}>
      <button
        className={`${styles.button} ${viewMode === '3d' ? styles.active : ''}`}
        onClick={() => setViewMode('3d')}
        title={t('view.3d', language)}
      >
        <Box size={16} />
        <span>{t('view.3d', language)}</span>
      </button>

      {/* Plan Mode Button + Direction Select (Top / Bottom) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className={`${styles.button} ${viewMode === 'top' ? styles.active : ''}`}
          onClick={() => setViewMode('top')}
          title="Plan 2D Flat View"
        >
          <Layers size={16} />
          <span>Plan</span>
        </button>

        {viewMode === 'top' && (
          <select
            value={planDirection}
            onChange={(e) => setPlanDirection(e.target.value as any)}
            className={styles.directionSelect}
            title="Plan View Direction"
          >
            <option value="top">Top (Nhìn xuống)</option>
            <option value="bottom">Bottom (Nhìn lên)</option>
          </select>
        )}
      </div>

      {/* Section Mode Button + Direction Select & Depth Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          className={`${styles.button} ${viewMode === 'section' ? styles.active : ''}`}
          onClick={() => setViewMode('section')}
          title="Section 2D Flat Cut View"
        >
          <AlignVerticalSpaceAround size={16} />
          <span>Section</span>
        </button>

        {viewMode === 'section' && (
          <>
            <select
              value={sectionBox.direction || 'front'}
              onChange={(e) => setSectionBox({ direction: e.target.value as any })}
              className={styles.directionSelect}
              title="Section Cut Direction"
            >
              <option value="front">Front</option>
              <option value="back">Back</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </select>

            <button
              className={`${styles.subModeBtn} ${
                sectionBox.hasDepth === false ? styles.subModeActive : ''
              }`}
              onClick={() => setSectionBox({ hasDepth: !sectionBox.hasDepth })}
              title={
                sectionBox.hasDepth === false
                  ? 'Current: Instant Slice (No Depth). Click for Box Depth.'
                  : 'Current: Box Depth. Click for Instant Slice.'
              }
            >
              {sectionBox.hasDepth === false ? 'Instant Slice' : 'Box Depth'}
            </button>
          </>
        )}
      </div>

      <div className={styles.divider} />

      {/* Graphic Display Mode Toggle (Shaded vs Wireframe) */}
      <button
        className={`${styles.button} ${graphicMode === 'wireframe' ? styles.active : ''}`}
        onClick={toggleGraphicMode}
        title="Toggle Graphic Display Mode: Shaded / Wireframe"
      >
        <Grid3X3 size={16} />
        <span>Graphic: {graphicMode === 'wireframe' ? 'Wireframe' : 'Shaded'}</span>
      </button>
    </div>
  );
};
