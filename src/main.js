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

  // アプリ内ブラウザ（LINE, Twitter, FB, IGなど）判定
  const ua = window.navigator.userAgent;
  const isLine = /Line/i.test(ua);
  const isInAppBrowser = /Instagram|FBAV|FBAN|Twitter|Line/i.test(ua);

  if (installContainer && !isStandalone()) {
    installContainer.style.display = 'block';
    
    if (isInAppBrowser) {
      // LINE等のアプリ内ブラウザの場合
      if (installButton) {
        installButton.style.display = 'inline-block';
        installButton.innerText = '標準ブラウザで開く';
      }
      if (iosHint) iosHint.style.display = 'none'; // Safariの共有ボタンは出ないので隠す
    } else if (isIos()) {
      // 普通のSafariの場合
      if (installButton) installButton.style.display = 'none';
      if (iosHint) iosHint.style.display = 'block';
    }
  }

  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    if (isInAppBrowser) return; // アプリ内ブラウザでは何もしない
    e.preventDefault();
    deferredPrompt = e;
    if (installContainer) installContainer.style.display = 'block';
    if (installButton) {
      installButton.style.display = 'inline-block';
      installButton.innerText = 'アプリをインストール';
    }
    if (iosHint) iosHint.style.display = 'none';
  });

  if (installButton) {
    installButton.addEventListener('click', async (e) => {
      e.stopPropagation(); // ゲーム暴発防止
      
      if (isInAppBrowser) {
        // アプリ内ブラウザ特有の処理
        if (isLine) {
          // LINEの場合は専用パラメータを付けると自動で外部ブラウザが開く
          const url = new URL(location.href);
          url.searchParams.set('openExternalBrowser', '1');
          location.href = url.toString();
        } else {
          // その他（Twitter等）は手動案内
          alert('画面右上などのメニュー(︙)から「ブラウザで開く（Safari/Chrome等）」を選択してください！');
        }
        return;
      }

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
