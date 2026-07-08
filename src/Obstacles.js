export class Obstacles {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.obstacles = []; 
    this.level = 1;
    this.lastObstacleX = 0;
  }

  update(terrain) {
    const currentSpeed = terrain.speed * (terrain.speedMultiplier || 1);
    
    // 小石を左へ移動
    for (let i = 0; i < this.obstacles.length; i++) {
      this.obstacles[i].x -= currentSpeed;
    }

    // 画面外に出た小石を削除
    this.obstacles = this.obstacles.filter(obs => obs.x + obs.width > -50);

    // 一定距離ごとに小石を生成
    const minDistance = 350 - (this.level * 20); // レベルで間隔が狭まる
    const spawnProb = 0.01 + (this.level * 0.005); // レベルで確率アップ

    if (terrain.points.length > 0) {
      const targetX = terrain.points[terrain.points.length - 1].x;
      
      if (targetX > this.lastObstacleX + minDistance && Math.random() < spawnProb && targetX <= this.canvasWidth + 200) {
        // 穴の上、および穴の直前・直後には配置しない（理不尽死の防止）
        // 前方150px、後方50pxの範囲に穴（画面の遥か下のY座標）がないかチェック
        let isSafe = true;
        for (let offset = -50; offset <= 150; offset += 50) {
          if (terrain.getGroundY(targetX + offset) > this.canvasHeight) {
            isSafe = false;
            break;
          }
        }

        if (isSafe) {
          const groundY = terrain.getGroundY(targetX);
          this.obstacles.push({
            x: targetX,
            y: groundY,
            width: 20,
            height: 15,
            hitRadius: 8 // 当たり判定の半径
          });
          this.lastObstacleX = targetX;
        }
      }
    }
  }

  checkCollision(player) {
    const pX = player.x + player.width / 2;
    const pY = player.y + player.height / 2;

    for (let obs of this.obstacles) {
      const obsX = obs.x;
      const obsY = obs.y - obs.height / 2;
      
      // 円形での当たり判定（プレイヤー中心と小石中心の距離）
      const dx = pX - obsX;
      const dy = pY - obsY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // プレイヤーの当たり判定半径を15とし、小石の当たり判定半径を足す
      if (distance < 15 + obs.hitRadius) {
        return true;
      }
    }
    return false;
  }

  draw(ctx) {
    ctx.fillStyle = '#666';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;

    for (let obs of this.obstacles) {
      ctx.beginPath();
      // 小石を地面に乗せるため、基準Yから上に描画
      ctx.arc(obs.x, obs.y - obs.height / 2, obs.height / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      
      // 石の質感を出すためのハイライト
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(obs.x - 2, obs.y - obs.height / 2 - 2, obs.height / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
    }
  }

  resize(newWidth, newHeight, heightRatio) {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    for (let obs of this.obstacles) {
      obs.y *= heightRatio;
    }
  }
}
