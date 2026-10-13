import React from 'react';
import { useViewerStore } from '../../../state/viewerStore';
import { X, Check } from 'lucide-react';
import styles from './SettingsModal.module.css';

const SELECTION_COLORS = [
  { label: 'Rose Red (Default)', hex: '#e11d48' },
  { label: 'Vibrant Blue', hex: '#3b82f6' },
  { label: 'Cyan Teal', hex: '#06b6d4' },
  { label: 'Emerald Green', hex: '#10b981' },
  { label: 'Amber Orange', hex: '#f59e0b' },
  { label: 'Purple Violet', hex: '#8b5cf6' },
  { label: 'Bright Yellow', hex: '#eab308' },
];

export const SettingsModal: React.FC = () => {
  const {
    isSettingsOpen,
    setSettingsOpen,
    selectionColor,
    setSelectionColor,
  } = useViewerStore();

  if (!isSettingsOpen) return null;

  return (
    <div className={styles.overlay} onClick={() => setSettingsOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3 className={styles.title}>⚙️ Application Settings</h3>
          <button
            className={styles.closeBtn}
            onClick={() => setSettingsOpen(false)}
            title="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Element Selection Highlight Color</h4>
            <p className={styles.sectionDesc}>
              Choose the highlight color for selected elements across 3D, Plan, and Section views.
            </p>

            <div className={styles.colorPalette}>
              {SELECTION_COLORS.map((c) => (
                <div
                  key={c.hex}
                  className={`${styles.colorChip} ${
                    selectionColor === c.hex ? styles.colorChipActive : ''
                  }`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => setSelectionColor(c.hex)}
                  title={c.label}
                >
                  {selectionColor === c.hex && <Check size={14} color="#fff" />}
                </div>
              ))}
            </div>

            <div className={styles.customColorRow}>
              <span>Or choose custom color:</span>
              <input
                type="color"
                value={selectionColor || '#e11d48'}
                onChange={(e) => setSelectionColor(e.target.value)}
                className={styles.colorInput}
              />
              <span className={styles.hexCode}>{selectionColor}</span>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button
            className={styles.doneBtn}
            onClick={() => setSettingsOpen(false)}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
