import './style.css';
import { Game } from './Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);

  // --- メインループ（60FPS固定化処理） ---
  let lastTime = 0;
  let accumulator = 0;
  const timeStep = 1000 / 60; // 理想的な1フレームの時間（約16.66ms）

  function gameLoop(time) {
    if (lastTime === 0) lastTime = time;
    const deltaTime = time - lastTime;
    lastTime = time;

    accumulator += deltaTime;

    // タブがバックグラウンドに回った際の遅延蓄積（フリーズ）を防ぐ
    if (accumulator > 100) accumulator = 100;

    // 120Hzスマホ等でも「1秒間に60回」だけupdateを実行する
    while (accumulator >= timeStep) {
      game.update();
      accumulator -= timeStep;
    }

    // 描画はモニターのリフレッシュレートに合わせて滑らかに行う
    game.draw();

    requestAnimationFrame(gameLoop);
  }
  requestAnimationFrame(gameLoop);

  // --- PWAインストール・オフライン対応機能 ---
  if ('serviceWorker' in navigator) {
    // Viteのbase URLを考慮し、現在のパスからの相対位置で登録
    navigator.serviceWorker.register('./sw.js').catch(console.error);
  }

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
