import { Player } from './Player.js';
import { Terrain } from './Terrain.js';
import { Background } from './Background.js';
import { Obstacles } from './Obstacles.js';
import { SoundManager } from './SoundManager.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // ステート: TITLE, PLAYING, GAMEOVER
    this.state = 'TITLE'; 
    this.score = 0;
    this.speedMultiplier = 1;
    this.distanceTraveled = 0;

    // ゲームオブジェクト
    this.player = null;
    this.terrain = null;
    this.background = null;
    this.obstacles = null;
    this.sound = new SoundManager();

    // UI要素の取得
    this.uiScore = document.getElementById('score-display');
    this.uiTitle = document.getElementById('title-screen');
    this.uiGameOver = document.getElementById('game-over-screen');
    this.uiFinalScore = document.getElementById('final-score');
    
    this.uiRankingScreen = document.getElementById('ranking-screen');
    this.btnShowRanking = document.getElementById('btn-show-ranking');
    this.btnCloseRanking = document.getElementById('btn-close-ranking');
    this.btnBackToTitle = document.getElementById('btn-back-to-title');
    this.rank1 = document.getElementById('rank-1');
    this.rank2 = document.getElementById('rank-2');
    this.rank3 = document.getElementById('rank-3');

    // 初期化
    this.topScores = this.loadRanking();
    this.updateRankingUI();
    this.bindInputs();
    this.bindRankingEvents();
    
    // タイトル画面用のデモ描画
    this.background = new Background(this.canvas.width, this.canvas.height);
    this.terrain = new Terrain(this.canvas.width, this.canvas.height);
  }

  resize() {
    const container = document.getElementById('game-container');
    if (!container) return;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  // --- ランキング（セキュア）ロジック ---
  generateChecksum(scores) {
    const salt = "kettaso_secret_salt_2026";
    let hash = 0;
    const str = scores.join(',') + salt;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0; 
    }
    return hash.toString();
  }

  loadRanking() {
    try {
      // 古い非セキュア版データ（v2）がある場合はマイグレーション（引き継ぎ）を行う
      const oldData = localStorage.getItem('kettaso_ranking_v2');
      if (oldData) {
        const parsed = JSON.parse(oldData);
        localStorage.removeItem('kettaso_ranking_v2');
        // セキュア版へ保存し直す
        this.topScores = parsed;
        this.saveRanking();
        return parsed;
      }

      // セキュア版データの読み込み
      const data = localStorage.getItem('kettaso_ranking_secure');
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.scores && parsed.hash === this.generateChecksum(parsed.scores)) {
          return parsed.scores;
        } else {
          console.warn('ランキングデータの改ざんを検知しました。データをリセットします。');
        }
      }
    } catch (e) { console.error(e); }
    return [0, 0, 0];
  }

  saveRanking() {
    try {
      const payload = {
        scores: this.topScores,
        hash: this.generateChecksum(this.topScores)
      };
      localStorage.setItem('kettaso_ranking_secure', JSON.stringify(payload));
    } catch (e) { console.error(e); }
  }

  updateRankingUI() {
    if (this.rank1) this.rank1.innerText = this.topScores[0] || 0;
    if (this.rank2) this.rank2.innerText = this.topScores[1] || 0;
    if (this.rank3) this.rank3.innerText = this.topScores[2] || 0;
  }

  bindRankingEvents() {
    if (this.btnShowRanking && this.uiRankingScreen) {
      this.btnShowRanking.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.uiRankingScreen.classList.add('active');
      });
      this.btnShowRanking.addEventListener('mousedown', e => e.stopPropagation());
      this.btnShowRanking.addEventListener('touchstart', e => e.stopPropagation(), { passive: false });
    }
    if (this.btnCloseRanking && this.uiRankingScreen) {
      this.btnCloseRanking.addEventListener('click', (e) => {
        e.stopPropagation();
        this.uiRankingScreen.classList.remove('active');
      });
    }
    if (this.btnBackToTitle) {
      this.btnBackToTitle.addEventListener('click', (e) => {
        e.stopPropagation();
        this.backToTitle();
      });
      this.btnBackToTitle.addEventListener('mousedown', e => e.stopPropagation());
      this.btnBackToTitle.addEventListener('touchstart', e => e.stopPropagation(), { passive: false });
    }
    if (this.uiRankingScreen) {
      this.uiRankingScreen.addEventListener('mousedown', e => e.stopPropagation());
      this.uiRankingScreen.addEventListener('touchstart', e => e.stopPropagation(), { passive: false });
    }
  }

  // --- 入力制御 ---
  bindInputs() {
    const jumpAction = (e) => {
      // ユーザーインタラクション時にAudioContextを初期化
      this.sound.init();

      // ランキング表示中は無視
      if (this.uiRankingScreen && this.uiRankingScreen.classList.contains('active')) return;
      if (e.type !== 'mousedown') e.preventDefault();
      
      if (this.state === 'TITLE' || this.state === 'GAMEOVER') {
        this.start();
      } else if (this.state === 'PLAYING' && this.player) {
        if (!this.player.isDead) {
          this.sound.playJump();
        }
        this.player.jump();
      }
    };

    const releaseJumpAction = (e) => {
      if (this.state === 'PLAYING' && this.player) {
        this.player.releaseJump();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') jumpAction(e);
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') releaseJumpAction(e);
    });
    
    // UIの裏側（canvas）だけでなく、画面全体のどこをタップしてもジャンプ・リトライできるようにする
    window.addEventListener('touchstart', jumpAction, { passive: false });
    window.addEventListener('mousedown', jumpAction);
    
    // 指を離した時（小ジャンプ用）
    window.addEventListener('touchend', releaseJumpAction);
    window.addEventListener('mouseup', releaseJumpAction);
  }

  // --- ゲーム制御 ---
  backToTitle() {
    this.state = 'TITLE';
    if (this.uiGameOver) this.uiGameOver.classList.remove('active');
    if (this.uiTitle) this.uiTitle.classList.add('active');
    
    // デモ用背景と地形を再生成
    this.background = new Background(this.canvas.width, this.canvas.height);
    this.terrain = new Terrain(this.canvas.width, this.canvas.height);
    this.player = null;
    this.obstacles = null;
    
    this.draw();
  }
  start() {
    this.state = 'PLAYING';
    this.score = 0;
    this.speedMultiplier = 1;
    this.distanceTraveled = 0;
    
    this.background = new Background(this.canvas.width, this.canvas.height);
    this.terrain = new Terrain(this.canvas.width, this.canvas.height);
    this.obstacles = new Obstacles(this.canvas.width, this.canvas.height);
    this.player = new Player(this.canvas.width * 0.2, this.canvas.height * 0.3); // 空中からスタート

    if (this.uiTitle) this.uiTitle.classList.remove('active');
    if (this.uiGameOver) this.uiGameOver.classList.remove('active');
    this.updateUI();
    
    this.sound.playBGM();
  }

  gameOver() {
    if (this.state === 'GAMEOVER') return;
    this.state = 'GAMEOVER';
    this.player.isDead = true;
    
    this.sound.stopBGM();
    this.sound.playDeath();
    
    // スコア処理
    const scoreInt = Math.floor(this.score);
    this.topScores.push(scoreInt);
    this.topScores.sort((a, b) => b - a);
    this.topScores = this.topScores.slice(0, 3);
    this.saveRanking();
    this.updateRankingUI();
    
    // 画面更新
    if (this.uiFinalScore) this.uiFinalScore.innerText = scoreInt;
    if (this.uiGameOver) this.uiGameOver.classList.add('active');
  }

  update() {
    if (this.state !== 'PLAYING') return;

    // レベル計算 (500m刻み)
    let level = 1;
    if (this.score >= 2000) level = 4;
    else if (this.score >= 1000) level = 3;
    else if (this.score >= 500) level = 2;

    this.terrain.level = level;
    this.obstacles.level = level;

    // 速度計算
    this.speedMultiplier = 1 + (level - 1) * 0.15 + (this.score / 5000); 
    
    this.background.update(this.speedMultiplier);
    this.terrain.update(this.speedMultiplier);
    this.obstacles.update(this.terrain);
    this.player.update(this.terrain);

    // 小石衝突判定
    if (this.obstacles.checkCollision(this.player)) {
      this.player.isDead = true;
    }

    if (this.player.isDead) {
      this.gameOver();
    } else {
      this.distanceTraveled += this.terrain.speed * this.speedMultiplier;
      this.score = this.distanceTraveled / 50; 
      this.updateUI(level);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.background) this.background.draw(this.ctx);
    if (this.terrain) this.terrain.draw(this.ctx);
    if (this.obstacles && this.state !== 'TITLE') this.obstacles.draw(this.ctx);
    if (this.player && this.state !== 'TITLE') this.player.draw(this.ctx);
  }

  updateUI(level = 1) {
    if (!this.uiScore) return;
    let levelText = ' (Lv.1)';
    if (level === 4) levelText = ' (Lv.MAX)';
    else if (level > 1) levelText = ` (Lv.${level})`;

    this.uiScore.innerText = Math.floor(this.score) + 'm' + levelText;
  }
}
