import React, { useRef } from 'react';
import { useViewerStore } from './state/viewerStore';
import { Viewport3D } from './ui/components/Viewport3D/Viewport3D';
import { PropertyGrid } from './ui/components/PropertyGrid/PropertyGrid';
import { FileListBox } from './ui/components/FileListBox/FileListBox';
import { ViewModeBar } from './ui/components/ViewModeBar/ViewModeBar';
import { SectionBoxControl } from './ui/components/SectionBoxControl/SectionBoxControl';
import { ScheduleView } from './ui/components/ScheduleView/ScheduleView';
import { SettingsModal } from './ui/components/SettingsModal/SettingsModal';
import { t } from './ui/i18n/translations';
import { Moon, Sun, Globe, FolderOpen, LayoutGrid, Loader2, Settings, Grid3X3 } from 'lucide-react';
import './ui/themes/theme.css';
import styles from './App.module.css';

function App() {
  const {
    theme,
    setTheme,
    language,
    setLanguage,
    addFile,
    layoutMode,
    setLayoutMode,
    isLoading,
    loadingMessage,
    setLoading,
    setSettingsOpen,
    graphicMode,
    toggleGraphicMode,
  } = useViewerStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Xử lý khi người dùng chọn file từ máy tính
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setLoading(true, `Loading ${selectedFiles.length} BIM file(s)...`);

    // Cho phép UI render spinner trước khi xử lý dữ liệu lớn
    setTimeout(() => {
      const fileList = Array.from(selectedFiles);
      let processed = 0;

      fileList.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const content = event.target?.result as string;
            const parsedDoc = JSON.parse(content);
            addFile(file.name, parsedDoc);
          } catch (err) {
            console.error('Failed to parse 3D JSON file:', err);
            alert(`Error reading file: ${file.name}`);
          } finally {
            processed++;
            if (processed === fileList.length) {
              setLoading(false);
            }
          }
        };
        reader.readAsText(file);
      });

      if (fileInputRef.current) fileInputRef.current.value = '';
    }, 50);
  };

  return (
    <div className={styles.appContainer}>
      {/* Loading Spinner Overlay khi nạp model hoặc xử lý tác vụ nặng */}
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
          <div className={styles.loadingText}>
            <Loader2 size={16} className="animate-spin" style={{ display: 'inline', marginRight: 8 }} />
            {loadingMessage}
          </div>
        </div>
      )}

      {/* Hidden File Input hỗ trợ Multi-Select */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        multiple
        style={{ display: 'none' }}
      />

      {/* Top Navigation Bar */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.brandBadge}>NMK</div>
          <div>
            <h1 className={styles.title}>{t('app.title', language)}</h1>
            <p className={styles.subtitle}>{t('app.subtitle', language)}</p>
          </div>

          {/* Button Select File */}
          <button
            className={styles.openFileBtn}
            onClick={() => fileInputRef.current?.click()}
            title={t('file.open', language)}
          >
            <FolderOpen size={16} />
            <span>{t('file.open', language)}</span>
          </button>
        </div>

        <div className={styles.topActions}>
          {/* Multi-Viewport Layout Mode Switcher (1, 2, 3, 4 màn hình) */}
          <div className={styles.layoutSelector} title={t('layout.views', language)}>
            <button
              className={`${styles.layoutBtn} ${layoutMode === '1' ? styles.activeLayoutBtn : ''}`}
              onClick={() => setLayoutMode('1')}
              title={t('layout.1', language)}
            >
              1
            </button>
            <button
              className={`${styles.layoutBtn} ${layoutMode === '2' ? styles.activeLayoutBtn : ''}`}
              onClick={() => setLayoutMode('2')}
              title={t('layout.2', language)}
            >
              2
            </button>
            <button
              className={`${styles.layoutBtn} ${layoutMode === '3' ? styles.activeLayoutBtn : ''}`}
              onClick={() => setLayoutMode('3')}
              title={t('layout.3', language)}
            >
              3
            </button>
            <button
              className={`${styles.layoutBtn} ${layoutMode === '4' ? styles.activeLayoutBtn : ''}`}
              onClick={() => setLayoutMode('4')}
              title={t('layout.4', language)}
            >
              <LayoutGrid size={13} style={{ marginRight: 2 }} />
              4
            </button>
          </div>

          {/* Language Selector */}
          <div className={styles.langSelector}>
            <Globe size={14} className={styles.langIcon} />
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className={styles.select}
            >
              <option value="en">English (EN)</option>
              <option value="de">Deutsch (DE)</option>
              <option value="ja">日本語 (JA)</option>
            </select>
          </div>

          {/* Graphic Render Mode Switcher: Shaded vs Wireframe */}
          <button
            className={styles.themeToggle}
            onClick={toggleGraphicMode}
            title={`Graphic Render Mode: ${graphicMode === 'wireframe' ? 'Wireframe' : 'Shaded'}. Click to toggle.`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', cursor: 'pointer' }}
          >
            <Grid3X3 size={15} color="var(--color-primary)" />
            <span style={{ fontSize: 'var(--font-size-body)', fontWeight: 600 }}>
              {graphicMode === 'wireframe' ? 'Wireframe' : 'Shaded'}
            </span>
          </button>

          {/* Theme Switcher */}
          <button
            className={styles.themeToggle}
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={t('theme.toggle', language)}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Settings Button */}
          <button
            className={styles.themeToggle}
            onClick={() => setSettingsOpen(true)}
            title="Open Application Settings"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      {/* Main Workspace Layout (Left Sidebar, Viewports Area, Right Sidebar) */}
      <div className={styles.mainArea}>
        {/* Left Sidebar: Listbox containing loaded files with checkbox & file color & remove */}
        <aside className={styles.leftSidebar}>
          <FileListBox />
        </aside>

        {/* Center: Multi-Viewport Grid Area (1, 2, 3 hoặc 4 màn hình) */}
        <main className={styles.viewportWrapper}>
          {layoutMode === '1' && (
            <div className={styles.viewportGrid1}>
              <Viewport3D title={t('view.3d', language)} />
              <div className={styles.floatingTopCenter}>
                <ViewModeBar />
              </div>
            </div>
          )}

          {layoutMode === '2' && (
            <div className={styles.viewportGrid2}>
              <div className={styles.gridCell}>
                <Viewport3D title={t('view.3d', language)} modeOverride="3d" />
              </div>
              <div className={styles.gridCell}>
                <ScheduleView />
              </div>
            </div>
          )}

          {layoutMode === '3' && (
            <div className={styles.viewportGrid3}>
              <div className={`${styles.gridCell} ${styles.gridItemSpanRow}`}>
                <Viewport3D title={t('view.3d', language)} modeOverride="3d" />
              </div>
              <div className={styles.gridCell}>
                <Viewport3D
                  title={t('view.top', language)}
                  modeOverride="top"
                  showGizmo={false}
                />
              </div>
              <div className={styles.gridCell}>
                <ScheduleView />
              </div>
            </div>
          )}

          {layoutMode === '4' && (
            <div className={styles.viewportGrid4}>
              <div className={styles.gridCell}>
                <Viewport3D title={t('view.3d', language)} modeOverride="3d" />
              </div>
              <div className={styles.gridCell}>
                <Viewport3D
                  title={t('view.top', language)}
                  modeOverride="top"
                  showGizmo={false}
                />
              </div>
              <div className={styles.gridCell}>
                <Viewport3D
                  title={t('view.section', language)}
                  modeOverride="section"
                  showGizmo={false}
                />
              </div>
              <div className={styles.gridCell}>
                <ScheduleView />
              </div>
            </div>
          )}

          {/* Floating Section Box Control Panel */}
          <div className={styles.floatingBottomLeft}>
            <SectionBoxControl />
          </div>
        </main>

        {/* Right Sidebar: Consolidated Property Grid */}
        <aside className={styles.rightSidebar}>
          <PropertyGrid />
        </aside>
      </div>

      {/* Settings Modal Dialog */}
      <SettingsModal />
    </div>
  );
}

export default App;
