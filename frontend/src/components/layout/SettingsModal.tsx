import { useState, useRef } from 'react';
import { useProfileStore } from '../../store/profileStore';
import { buildExportBundle, applyImportBundle, exportToFile } from '../../utils/backup';

type Tab = 'training' | 'data';

export default function SettingsModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('training');

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-title">Settings</span>
          <button className="settings-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>
        <div className="settings-body">
          <nav className="settings-nav">
            <button
              className={`settings-nav-item${tab === 'training' ? ' active' : ''}`}
              onClick={() => setTab('training')}
            >
              Training
            </button>
            <button
              className={`settings-nav-item${tab === 'data' ? ' active' : ''}`}
              onClick={() => setTab('data')}
            >
              Data
            </button>
          </nav>
          <div className="settings-panel">
            {tab === 'training' ? <TrainingTab /> : <DataTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function TrainingTab() {
  const speechRate         = useProfileStore(s => s.speechRate);
  const setSpeechRate      = useProfileStore(s => s.setSpeechRate);
  const autoAdvanceMs      = useProfileStore(s => s.autoAdvanceMs);
  const setAutoAdvanceMs   = useProfileStore(s => s.setAutoAdvanceMs);
  const noveltyMultiplier  = useProfileStore(s => s.noveltyMultiplier);
  const setNoveltyMultiplier = useProfileStore(s => s.setNoveltyMultiplier);
  const dailyTarget        = useProfileStore(s => s.dailyTarget);
  const setDailyTarget     = useProfileStore(s => s.setDailyTarget);
  const boardMaxWidth      = useProfileStore(s => s.boardMaxWidth);
  const setBoardMaxWidth   = useProfileStore(s => s.setBoardMaxWidth);

  return (
    <div className="settings-rows">
      <SettingRow
        label="Speed"
        value={`${speechRate}×`}
        description="How fast moves are read aloud during replay. Higher is faster. Applies to all text-to-speech narration."
      >
        <input
          type="range" min={0.5} max={3} step={0.25}
          value={speechRate}
          onChange={e => setSpeechRate(Number(e.target.value))}
          className="settings-slider"
        />
        <div className="settings-slider-labels">
          <span>0.5×</span><span>3×</span>
        </div>
      </SettingRow>

      <SettingRow
        label="Cadence"
        value={`${(autoAdvanceMs / 1000).toFixed(1)}s`}
        description="During auto-play (▶), how long the board stays on each position before moving to the next move. Short = fast clip, leaves little time to picture the position. Long = leisurely, room to breathe between moves."
      >
        <input
          type="range" min={500} max={8000} step={250}
          value={autoAdvanceMs}
          onChange={e => setAutoAdvanceMs(Number(e.target.value))}
          className="settings-slider"
        />
        <div className="settings-slider-labels">
          <span>0.5s</span><span>8s</span>
        </div>
      </SettingRow>

      <SettingRow
        label="Novelty"
        value={`${noveltyMultiplier}× (${((autoAdvanceMs * noveltyMultiplier) / 1000).toFixed(1)}s)`}
        description={`Inactivity watchdog during auto-play. If you don't touch the board for Cadence × Novelty seconds, playback stops and the last move is re-read aloud — so you can't zone out. Currently: ${(autoAdvanceMs / 1000).toFixed(1)}s × ${noveltyMultiplier} = ${((autoAdvanceMs * noveltyMultiplier) / 1000).toFixed(1)}s grace period. Higher = more forgiving. Lower = keeps you sharp.`}
      >
        <input
          type="range" min={0.5} max={3} step={0.25}
          value={noveltyMultiplier}
          onChange={e => setNoveltyMultiplier(Number(e.target.value))}
          className="settings-slider"
        />
        <div className="settings-slider-labels">
          <span>0.5× (repeat)</span><span>3× (variety)</span>
        </div>
      </SettingRow>

      <SettingRow
        label="Daily goal"
        value={`${dailyTarget} reads`}
        description="Target number of game reads per day shown in the motivation bar at the top."
      >
        <input
          type="range" min={1} max={20} step={1}
          value={dailyTarget}
          onChange={e => setDailyTarget(Number(e.target.value))}
          className="settings-slider"
        />
        <div className="settings-slider-labels">
          <span>1</span><span>20</span>
        </div>
      </SettingRow>

      <SettingRow
        label="Board size"
        value={`${boardMaxWidth}px`}
        description="Maximum width of the chess board. Increase on large screens to see the board more clearly. The board never exceeds the available layout width."
      >
        <input
          type="range" min={260} max={1200} step={20}
          value={boardMaxWidth}
          onChange={e => setBoardMaxWidth(Number(e.target.value))}
          className="settings-slider"
        />
        <div className="settings-slider-labels">
          <span>260px</span><span>1200px</span>
        </div>
      </SettingRow>
    </div>
  );
}

function DataTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  function handleExport() {
    exportToFile(buildExportBundle());
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        applyImportBundle(JSON.parse(reader.result as string));
        setImportStatus('ok');
        setTimeout(() => window.location.reload(), 800);
      } catch {
        setImportStatus('error');
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="settings-rows">
      <SettingRow
        label="Export data"
        description="Download a JSON backup of all your progress: game replays, session time log, flagged moves, puzzle history, and settings."
      >
        <button className="settings-action-btn" onClick={handleExport}>
          Download backup
        </button>
      </SettingRow>

      <SettingRow
        label="Import data"
        description="Restore from a previously exported backup file. This replaces all current data and reloads the page."
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={handleImport}
        />
        <button className="settings-action-btn" onClick={() => fileInputRef.current?.click()}>
          Choose file…
        </button>
        {importStatus === 'ok'    && <span className="settings-import-ok">Imported — reloading…</span>}
        {importStatus === 'error' && <span className="settings-import-err">Invalid file.</span>}
        <p className="settings-data-warning">
          Import replaces all current data permanently.
        </p>
      </SettingRow>

      <div className="settings-build-info">
        <span>Build</span>
        <code className="settings-build-hash">{__BUILD_HASH__}</code>
        <span className="settings-build-date">{__BUILD_DATE__}</span>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  value,
  description,
  children,
}: {
  label: string;
  value?: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="settings-row">
      <div className="settings-row-header">
        <span className="settings-row-label">{label}</span>
        {value && <span className="settings-row-value">{value}</span>}
      </div>
      <p className="settings-row-desc">{description}</p>
      {children && <div className="settings-row-control">{children}</div>}
    </div>
  );
}
