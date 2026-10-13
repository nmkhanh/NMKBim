import React from 'react';
import { useViewerStore, type LoadedFileEntry } from '../../../state/viewerStore';
import { t } from '../../i18n/translations';
import { Eye, EyeOff, FileCode, Trash2, Palette, RotateCcw } from 'lucide-react';
import styles from './FileListBox.module.css';

export const FileListBox: React.FC = () => {
  const { files, toggleFileVisibility, removeFile, clearAllFiles, setFileColor, setFileOpacity, language } =
    useViewerStore();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <FileCode size={15} className={styles.icon} />
          <h3 className={styles.title}>{t('file.title', language)}</h3>
        </div>
        {files.length > 0 && (
          <button
            className={styles.clearAllBtn}
            onClick={() => {
              if (window.confirm('Clear all loaded models?')) {
                clearAllFiles();
              }
            }}
            title={t('file.clearAll', language)}
          >
            {t('file.clearAll', language)}
          </button>
        )}
      </div>

      <div className={styles.list}>
        {files.length === 0 ? (
          <div className={styles.empty}>{t('file.empty', language)}</div>
        ) : (
          files.map((file: LoadedFileEntry) => (
            <div key={file.id} className={styles.fileItem}>
              <label className={styles.label}>
                <input
                  type="checkbox"
                  checked={file.visible}
                  onChange={() => toggleFileVisibility(file.id)}
                  className={styles.checkbox}
                />
                <span className={styles.customCheck}>
                  {file.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </span>
                <div className={styles.fileInfo}>
                  <span className={styles.fileName} title={file.name}>
                    {file.name}
                  </span>
                  <span className={styles.fileMeta}>
                    {file.document.objects.length} {t('file.elements', language)}
                  </span>
                </div>
              </label>

              <div className={styles.fileActions}>
                {/* Chọn màu cho file (Add color cho file) */}
                <div
                  className={styles.fileColorWrapper}
                  style={{ backgroundColor: file.color || 'var(--color-bg-card)' }}
                  title="Assign File Discipline Color"
                >
                  <Palette size={11} color={file.color ? '#fff' : 'var(--color-text-muted)'} />
                  <input
                    type="color"
                    className={styles.fileColorInput}
                    value={file.color || '#3b82f6'}
                    onChange={(e) => setFileColor(file.id, e.target.value)}
                  />
                </div>

                {/* Reset màu của file về ban đầu nếu đã đổi màu */}
                {file.color && (
                  <button
                    className={styles.resetColorBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileColor(file.id, null);
                    }}
                    title="Reset to Original Model Color"
                  >
                    <RotateCcw size={11} />
                  </button>
                )}

                {/* Opacity Slider cho File */}
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 3 }}
                  title={`File Opacity: ${Math.round((file.opacity ?? 1) * 100)}%`}
                  onClick={(e) => e.stopPropagation()}
                >
                  <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', minWidth: '24px' }}>
                    {Math.round((file.opacity ?? 1) * 100)}%
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={file.opacity ?? 1}
                    onChange={(e) => setFileOpacity(file.id, parseFloat(e.target.value))}
                    style={{ width: '42px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                  />
                </div>

                {/* Xóa file */}
                <button
                  className={styles.deleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                  }}
                  title={t('file.remove', language)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
