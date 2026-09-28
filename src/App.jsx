import React, { useState, useEffect } from 'react';
import SnakeGame from './components/SnakeGame';
import { audioEngine } from './audio';

export default function App() {
  const [speedLevel, setSpeedLevel] = useState('medium'); // slow, medium, fast
  const [mode, setMode] = useState('classic'); // classic, nowalls, rush
  const [highScores, setHighScores] = useState(() => {
    try {
      const saved = localStorage.getItem('neon_snake_scores');
      return saved ? JSON.parse(saved) : [
        { name: 'Halimat', score: 120, date: '2026-09-28' },
        { name: 'CyberSnake', score: 80, date: '2026-09-28' }
      ];
    } catch (e) {
      return [];
    }
  });

  const [currentScore, setCurrentScore] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [githubStatus, setGithubStatus] = useState('Connected');

  // Save High Scores to LocalStorage
  const handleGameOver = (finalScore) => {
    if (finalScore <= 0) return;
    const newEntry = {
      name: 'halimatfeyisara50-glitch',
      score: finalScore,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [...highScores, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5
    
    setHighScores(updated);
    try {
      localStorage.setItem('neon_snake_scores', JSON.stringify(updated));
    } catch (e) {}
  };

  const toggleAudio = () => {
    const muted = audioEngine.toggleMute();
    setIsMuted(muted);
  };

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="header-bar glass-panel">
        <div className="brand">
          <span className="brand-icon">🐍</span>
          <h1 className="brand-title">NEON ARCADE SNAKE</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button className="btn-secondary" onClick={toggleAudio}>
            {isMuted ? '🔇 MUTED' : '🔊 SOUND ON'}
          </button>
          <a
            href="https://github.com/halimatfeyisara50-glitch"
            target="_blank"
            rel="noopener noreferrer"
            className="github-badge"
          >
            <span>🐱 halimatfeyisara50-glitch</span>
          </a>
        </div>
      </header>

      {/* Control Settings Bar (Speed Levels & Game Modes) */}
      <div className="game-settings-bar glass-panel">
        {/* Speed Levels Selector */}
        <div className="setting-group">
          <span className="setting-label">⚡ Speed Level:</span>
          <div className="segmented-control">
            <button
              className={`segmented-btn ${speedLevel === 'slow' ? 'active' : ''}`}
              onClick={() => setSpeedLevel('slow')}
            >
              🐢 SLOW
            </button>
            <button
              className={`segmented-btn ${speedLevel === 'medium' ? 'active' : ''}`}
              onClick={() => setSpeedLevel('medium')}
            >
              🏃 MEDIUM
            </button>
            <button
              className={`segmented-btn ${speedLevel === 'fast' ? 'active' : ''}`}
              onClick={() => setSpeedLevel('fast')}
            >
              ⚡ FAST
            </button>
          </div>
        </div>

        {/* Game Mode Selector */}
        <div className="setting-group">
          <span className="setting-label">🎮 Game Mode:</span>
          <div className="segmented-control">
            <button
              className={`segmented-btn ${mode === 'classic' ? 'active' : ''}`}
              onClick={() => setMode('classic')}
            >
              🛡️ CLASSIC
            </button>
            <button
              className={`segmented-btn ${mode === 'nowalls' ? 'active' : ''}`}
              onClick={() => setMode('nowalls')}
            >
              🌀 NO WALLS
            </button>
            <button
              className={`segmented-btn ${mode === 'rush' ? 'active' : ''}`}
              onClick={() => setMode('rush')}
            >
              💣 SPEED RUSH
            </button>
          </div>
        </div>
      </div>

      {/* Main Dashboard Layout */}
      <main className="dashboard-layout">
        {/* Left Game Canvas Viewport */}
        <SnakeGame
          speedLevel={speedLevel}
          mode={mode}
          highScores={highScores}
          onGameOver={handleGameOver}
          onScoreUpdate={setCurrentScore}
        />

        {/* Right Sidebar Leaderboard & Game Rules */}
        <aside className="sidebar-panel glass-panel">
          <div>
            <h2 className="sidebar-title">🏆 Top High Scores</h2>
            <div className="leaderboard-list" style={{ marginTop: '0.8rem' }}>
              {highScores.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No high scores recorded yet.</p>
              ) : (
                highScores.map((item, idx) => (
                  <div className="leaderboard-item" key={idx}>
                    <span className="rank">#{idx + 1}</span>
                    <span className="player-name">{item.name}</span>
                    <span className="score-val">{item.score} pts</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h2 className="sidebar-title">✨ Power-Up Items</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.8rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                <span><strong>Green Apple</strong> (+10 pts)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ffee00', display: 'inline-block' }}></span>
                <span><strong>Golden Apple</strong> (+50 pts)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
                <span><strong>Freeze Time</strong> (Slower tick rate)</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff007f', display: 'inline-block' }}></span>
                <span><strong>Speed Rush</strong> (Double pts multiplier)</span>
              </li>
            </ul>
          </div>
        </aside>
      </main>
    </div>
  );
}
