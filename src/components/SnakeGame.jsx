import React, { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../audio';

const GRID_SIZE = 20;
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 480;
const CELL_SIZE = CANVAS_WIDTH / GRID_SIZE;

// Speed tick intervals in milliseconds (Slow, Medium, Fast)
export const SPEED_MAP = {
  slow: 160,
  medium: 100,
  fast: 60
};

export default function SnakeGame({ speedLevel, mode, highScores, onGameOver, onScoreUpdate }) {
  const canvasRef = useRef(null);
  
  // Game states
  const [snake, setSnake] = useState([
    { x: 10, y: 10 },
    { x: 10, y: 11 },
    { x: 10, y: 12 }
  ]);
  const [direction, setDirection] = useState({ x: 0, y: -1 }); // UP
  const [food, setFood] = useState({ x: 5, y: 5, type: 'normal' });
  const [obstacles, setObstacles] = useState([]);
  const [particles, setParticles] = useState([]);
  
  const [score, setScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [activePowerup, setActivePowerup] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  // References for mutable state inside game loop
  const snakeRef = useRef(snake);
  const directionRef = useRef(direction);
  const foodRef = useRef(food);
  const obstaclesRef = useRef(obstacles);
  const particlesRef = useRef(particles);
  const powerupTimerRef = useRef(null);

  snakeRef.current = snake;
  directionRef.current = direction;
  foodRef.current = food;
  obstaclesRef.current = obstacles;
  particlesRef.current = particles;

  // Generate random food coordinate
  const generateFood = useCallback((currentSnake, currentObstacles) => {
    let newFood;
    while (true) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = currentSnake.some(seg => seg.x === x && seg.y === y);
      const onObstacle = currentObstacles.some(obs => obs.x === x && obs.y === y);
      if (!onSnake && !onObstacle) {
        // Random food type probability
        const rand = Math.random();
        let type = 'normal';
        if (rand > 0.85) type = 'gold';
        else if (rand > 0.70) type = 'freeze';
        else if (rand > 0.55) type = 'speed';
        newFood = { x, y, type };
        break;
      }
    }
    return newFood;
  }, []);

  // Generate random obstacles for Speed Rush mode
  const generateObstacles = useCallback((currentSnake) => {
    if (mode !== 'rush') return [];
    const obsList = [];
    for (let i = 0; i < 5; i++) {
      const x = Math.floor(Math.random() * GRID_SIZE);
      const y = Math.floor(Math.random() * GRID_SIZE);
      const onSnake = currentSnake.some(seg => seg.x === x && seg.y === y);
      if (!onSnake && !(x === 10 && Math.abs(y - 10) < 4)) {
        obsList.push({ x, y });
      }
    }
    return obsList;
  }, [mode]);

  // Create particle explosion effect on eat
  const createParticles = (x, y, color) => {
    const newParticles = [];
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      newParticles.push({
        x: x * CELL_SIZE + CELL_SIZE / 2,
        y: y * CELL_SIZE + CELL_SIZE / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  };

  // Reset Game
  const resetGame = () => {
    const initialSnake = [
      { x: 10, y: 10 },
      { x: 10, y: 11 },
      { x: 10, y: 12 }
    ];
    const initialObstacles = generateObstacles(initialSnake);
    const initialFood = generateFood(initialSnake, initialObstacles);

    setSnake(initialSnake);
    setDirection({ x: 0, y: -1 });
    setObstacles(initialObstacles);
    setFood(initialFood);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setHasStarted(true);
    setActivePowerup(null);
    setParticles([]);
    if (onScoreUpdate) onScoreUpdate(0);
  };

  // Direction handler with anti-180 logic
  const changeDirection = useCallback((newDir) => {
    if (isGameOver || isPaused || !hasStarted) return;
    const curr = directionRef.current;
    if (newDir.x + curr.x === 0 && newDir.y + curr.y === 0) return; // Prevent reversing directly
    setDirection(newDir);
    audioEngine.playMove();
  }, [isGameOver, isPaused, hasStarted]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          changeDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          changeDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          changeDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          changeDirection({ x: 1, y: 0 });
          break;
        case ' ':
          setIsPaused(prev => !prev);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection]);

  // Main Game Loop Tick
  useEffect(() => {
    if (!hasStarted || isPaused || isGameOver) return;

    let baseSpeed = SPEED_MAP[speedLevel] || 100;
    if (activePowerup === 'freeze') baseSpeed *= 1.4;
    if (activePowerup === 'speed') baseSpeed *= 0.7;

    const timer = setInterval(() => {
      const currentSnake = [...snakeRef.current];
      const head = { ...currentSnake[0] };
      const dir = directionRef.current;

      head.x += dir.x;
      head.y += dir.y;

      // Handle Wall Logic
      if (mode === 'nowalls') {
        if (head.x < 0) head.x = GRID_SIZE - 1;
        if (head.x >= GRID_SIZE) head.x = 0;
        if (head.y < 0) head.y = GRID_SIZE - 1;
        if (head.y >= GRID_SIZE) head.y = 0;
      } else {
        if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
          audioEngine.playGameOver();
          setIsGameOver(true);
          onGameOver(score);
          return;
        }
      }

      // Self-collision detection
      if (currentSnake.some(seg => seg.x === head.x && seg.y === head.y)) {
        audioEngine.playGameOver();
        setIsGameOver(true);
        onGameOver(score);
        return;
      }

      // Obstacle collision (Speed Rush mode)
      if (obstaclesRef.current.some(obs => obs.x === head.x && obs.y === head.y)) {
        audioEngine.playGameOver();
        setIsGameOver(true);
        onGameOver(score);
        return;
      }

      // Eat Food Logic
      const currentFood = foodRef.current;
      const newSnake = [head, ...currentSnake];

      if (head.x === currentFood.x && head.y === currentFood.y) {
        let pts = 10;
        let pColor = '#00f3ff';

        if (currentFood.type === 'gold') {
          pts = 50;
          pColor = '#ffee00';
          audioEngine.playPowerup();
        } else if (currentFood.type === 'freeze') {
          pts = 15;
          pColor = '#38bdf8';
          setActivePowerup('freeze');
          audioEngine.playPowerup();
        } else if (currentFood.type === 'speed') {
          pts = 20;
          pColor = '#ff007f';
          setActivePowerup('speed');
          audioEngine.playPowerup();
        } else {
          audioEngine.playEat();
        }

        if (activePowerup === 'speed') pts *= 2;

        const updatedScore = score + pts;
        setScore(updatedScore);
        if (onScoreUpdate) onScoreUpdate(updatedScore);

        createParticles(head.x, head.y, pColor);
        setFood(generateFood(newSnake, obstaclesRef.current));
      } else {
        newSnake.pop(); // Remove tail
      }

      setSnake(newSnake);
    }, baseSpeed);

    return () => clearInterval(timer);
  }, [hasStarted, isPaused, isGameOver, speedLevel, mode, score, activePowerup, generateFood, onGameOver, onScoreUpdate]);

  // Render Canvas Graphics
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Clear background
    ctx.fillStyle = '#0b0f19';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw Grid Lines
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw Obstacles (Speed Rush Mode)
    obstacles.forEach(obs => {
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.fillRect(obs.x * CELL_SIZE + 2, obs.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });

    // Draw Food
    const { x: fx, y: fy, type: fType } = food;
    let foodColor = '#10b981'; // normal green
    if (fType === 'gold') foodColor = '#ffee00';
    if (fType === 'freeze') foodColor = '#38bdf8';
    if (fType === 'speed') foodColor = '#ff007f';

    ctx.shadowColor = foodColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = foodColor;
    ctx.beginPath();
    ctx.arc(fx * CELL_SIZE + CELL_SIZE / 2, fy * CELL_SIZE + CELL_SIZE / 2, CELL_SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Draw Snake
    snake.forEach((seg, idx) => {
      const isHead = idx === 0;
      if (isHead) {
        ctx.fillStyle = '#00f3ff';
        ctx.shadowColor = '#00f3ff';
        ctx.shadowBlur = 18;
      } else {
        // Gradient color body segments
        const opacity = 1 - (idx / snake.length) * 0.5;
        ctx.fillStyle = `rgba(0, 243, 255, ${opacity})`;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.roundRect(seg.x * CELL_SIZE + 1, seg.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2, 6);
      ctx.fill();

      // Render eyes on head segment
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#090d16';
        const eyeOffset = CELL_SIZE / 4;
        const eyeRadius = 2.5;

        let leftEye = { x: seg.x * CELL_SIZE + eyeOffset, y: seg.y * CELL_SIZE + eyeOffset };
        let rightEye = { x: seg.x * CELL_SIZE + CELL_SIZE - eyeOffset, y: seg.y * CELL_SIZE + eyeOffset };

        if (direction.x === 1) { // Right
          leftEye = { x: seg.x * CELL_SIZE + CELL_SIZE - eyeOffset, y: seg.y * CELL_SIZE + eyeOffset };
          rightEye = { x: seg.x * CELL_SIZE + CELL_SIZE - eyeOffset, y: seg.y * CELL_SIZE + CELL_SIZE - eyeOffset };
        } else if (direction.x === -1) { // Left
          leftEye = { x: seg.x * CELL_SIZE + eyeOffset, y: seg.y * CELL_SIZE + eyeOffset };
          rightEye = { x: seg.x * CELL_SIZE + eyeOffset, y: seg.y * CELL_SIZE + CELL_SIZE - eyeOffset };
        } else if (direction.y === 1) { // Down
          leftEye = { x: seg.x * CELL_SIZE + eyeOffset, y: seg.y * CELL_SIZE + CELL_SIZE - eyeOffset };
          rightEye = { x: seg.x * CELL_SIZE + CELL_SIZE - eyeOffset, y: seg.y * CELL_SIZE + CELL_SIZE - eyeOffset };
        }

        ctx.beginPath();
        ctx.arc(leftEye.x, leftEye.y, eyeRadius, 0, Math.PI * 2);
        ctx.arc(rightEye.x, rightEye.y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw Particles
    if (particles.length > 0) {
      const updatedParticles = [];
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;

        if (p.life > 0) {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.globalAlpha = p.life;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          updatedParticles.push(p);
        }
      });
      setParticles(updatedParticles);
    }
  }, [snake, food, obstacles, particles, direction]);

  return (
    <div className="game-viewport glass-panel">
      {/* HUD Score Header */}
      <div className="hud-bar">
        <div className="hud-stat">
          <span className="stat-label">Score</span>
          <span className="stat-value">{score}</span>
        </div>
        <div className="hud-stat" style={{ textAlign: 'center' }}>
          <span className="stat-label">Speed</span>
          <span className="stat-value" style={{ fontSize: '1.1rem', color: 'var(--purple-neon)' }}>
            {speedLevel.toUpperCase()}
          </span>
        </div>
        <div className="hud-stat" style={{ textAlign: 'right' }}>
          <span className="stat-label">Best Score</span>
          <span className="stat-value gold">{highScores.length > 0 ? highScores[0].score : 0}</span>
        </div>
      </div>

      {/* Canvas Screen */}
      <div className="canvas-wrapper">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} />

        {/* Start Game Overlay */}
        {!hasStarted && (
          <div className="game-overlay">
            <h2 className="overlay-title">Neon Snake</h2>
            <p className="overlay-subtitle">
              Use <strong style={{ color: 'var(--cyan-neon)' }}>WASD</strong> or <strong style={{ color: 'var(--cyan-neon)' }}>Arrow Keys</strong> to steer. Collect glowing apples and power-ups!
            </p>
            <button className="btn-primary" onClick={resetGame}>
              ▶ START GAME
            </button>
          </div>
        )}

        {/* Pause Overlay */}
        {hasStarted && isPaused && !isGameOver && (
          <div className="game-overlay">
            <h2 className="overlay-title">PAUSED</h2>
            <p className="overlay-subtitle">Press Spacebar or click Resume to continue</p>
            <button className="btn-primary" onClick={() => setIsPaused(false)}>
              ▶ RESUME
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        {isGameOver && (
          <div className="game-overlay">
            <h2 className="overlay-title" style={{ color: 'var(--pink-neon)' }}>GAME OVER</h2>
            <div className="hud-stat">
              <span className="stat-label">Final Score</span>
              <span className="stat-value gold" style={{ fontSize: '2.2rem' }}>{score}</span>
            </div>
            <button className="btn-primary" onClick={resetGame}>
              🔄 PLAY AGAIN
            </button>
          </div>
        )}
      </div>

      {/* On-Screen Touch D-Pad for Mobile */}
      <div className="mobile-dpad">
        <button className="dpad-btn dpad-up" onClick={() => changeDirection({ x: 0, y: -1 })}>▲</button>
        <button className="dpad-btn dpad-left" onClick={() => changeDirection({ x: -1, y: 0 })}>◀</button>
        <button className="dpad-btn dpad-right" onClick={() => changeDirection({ x: 1, y: 0 })}>▶</button>
        <button className="dpad-btn dpad-down" onClick={() => changeDirection({ x: 0, y: 1 })}>▼</button>
      </div>
    </div>
  );
}
