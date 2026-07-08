import './style.css';
import { Game } from './Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);

  // --- メインループ ---
  let lastTime = 0;
  function gameLoop(time) {
    // 経過時間は将来的な拡張用
    const deltaTime = time - lastTime;
    lastTime = time;

    game.update();
    game.draw();

    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  // --- PWAインストール機能（安全な実装） ---
  const installContainer = document.getElementById('install-prompt-container');
  const installButton = document.getElementById('install-button');
  const iosHint = document.getElementById('ios-install-hint');

  // iOSSafari判定
  const isIos = () => /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  
  // スタンドアロン判定
  const isStandalone = () => {
    return ('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches;
  };

  if (installContainer && !isStandalone()) {
    installContainer.style.display = 'block';
    if (isIos()) {
      if (installButton) installButton.style.display = 'none';
      if (iosHint) iosHint.style.display = 'block';
    }
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installContainer) installContainer.style.display = 'block';
    if (installButton) installButton.style.display = 'inline-block';
    if (iosHint) iosHint.style.display = 'none';
  });

  if (installButton) {
    installButton.addEventListener('click', async (e) => {
      e.stopPropagation(); // ゲーム暴発防止
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          installContainer.style.display = 'none';
        }
        deferredPrompt = null;
      }
    });
  }

  // ボタンエリアタップ時のゲーム暴発防止
  if (installContainer) {
    installContainer.addEventListener('mousedown', (e) => e.stopPropagation());
    installContainer.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: false });
  }
});
