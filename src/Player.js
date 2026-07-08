export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.width = 40;
    this.height = 40;
    
    this.vy = 0;
    this.gravity = 1.2;
    this.jumpStrength = -15;
    
    this.isGrounded = false;
    this.jumpCount = 0;
    this.maxJumps = 2; // 二段ジャンプ可能
    
    this.isDead = false;
    this.tilt = 0; // 描画用の自転車の傾き
  }

  jump() {
    if (this.jumpCount < this.maxJumps) {
      this.vy = this.jumpStrength;
      this.isGrounded = false;
      this.jumpCount++;
    }
  }

  releaseJump() {
    // 上昇中（vy < 0）にボタンを離したら、上向きの速度を大幅にカットする（小ジャンプ機能）
    if (this.vy < -3) {
      this.vy = -3; 
    }
  }

  update(terrain) {
    if (this.isDead) return;

    // 前フレームの足元の座標
    const prevBottom = this.y - this.vy + this.height;
    
    this.vy += this.gravity;
    this.y += this.vy;

    const playerCenterX = this.x + this.width / 2;
    const groundY = terrain.getGroundY(playerCenterX);
    
    // 着地判定（ワープバグ防止）
    // 「前のフレームで足元が確実に地面より上にあった」か「空中にいた」場合のみ着地を許可する。
    // ※groundY + 40 の余裕を持たせることで、急な下り坂でも着地できるようにするが、
    // 穴に落ちた後（prevBottomが画面外）に次の足場へワープすることを防ぐ。
    if (this.y + this.height >= groundY && prevBottom <= groundY + 40 && this.vy >= 0) {
      this.y = groundY - this.height;
      this.vy = 0;
      this.isGrounded = true;
      this.jumpCount = 0;
    } else {
      this.isGrounded = false;
    }

    // 死亡判定：画面下部へ完全に落下
    if (this.y + this.height > terrain.canvasHeight) {
      this.isDead = true;
    }

    // 地面の角度に合わせて自転車を傾ける
    if (this.isGrounded) {
      const targetAngle = terrain.getGroundAngle(playerCenterX);
      // 滑らかに回転させる（補間）
      this.tilt += (targetAngle - this.tilt) * 0.3;
    } else {
      // 空中では徐々に水平に戻すか、ジャンプ中特有の傾きにする
      this.tilt += (0 - this.tilt) * 0.1;
    }
  }

  draw(ctx) {
    ctx.save();
    
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    
    ctx.translate(centerX, centerY);
    ctx.rotate(this.tilt);
    ctx.translate(-centerX, -centerY);

    // キャラクター（自転車）の描画
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // 車輪
    ctx.beginPath();
    ctx.arc(this.x + 5, this.y + 30, 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(this.x + 35, this.y + 30, 12, 0, Math.PI * 2);
    ctx.stroke();

    // フレーム
    ctx.beginPath();
    ctx.moveTo(this.x + 5, this.y + 30);
    ctx.lineTo(this.x + 15, this.y + 10);
    ctx.lineTo(this.x + 35, this.y + 30);
    ctx.moveTo(this.x + 5, this.y + 30);
    ctx.lineTo(this.x + 25, this.y + 10);
    ctx.lineTo(this.x + 15, this.y + 10);
    ctx.stroke();

    // ハンドルとサドル周り
    ctx.beginPath();
    ctx.moveTo(this.x + 25, this.y + 10);
    ctx.lineTo(this.x + 25, this.y);
    ctx.lineTo(this.x + 30, this.y - 5);
    ctx.stroke();

    // 棒人間（立ち漕ぎ）
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y - 5); // 腰
    ctx.lineTo(this.x + 25, this.y - 5); // 腕（ハンドルへ）
    ctx.moveTo(this.x + 10, this.y - 5);
    ctx.lineTo(this.x + 18, this.y - 25); // 胴体
    ctx.stroke();

    // 頭
    ctx.beginPath();
    ctx.arc(this.x + 23, this.y - 30, 6, 0, Math.PI * 2);
    ctx.stroke();

    // 足
    ctx.beginPath();
    ctx.moveTo(this.x + 10, this.y - 5);
    ctx.lineTo(this.x + 18, this.y + 15);
    ctx.lineTo(this.x + 18, this.y + 30); // ペダルへ
    ctx.stroke();

    // 死亡時のエフェクト
    if (this.isDead) {
      ctx.strokeStyle = 'red';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x + this.width, this.y + this.height);
      ctx.moveTo(this.x + this.width, this.y);
      ctx.lineTo(this.x, this.y + this.height);
      ctx.stroke();
    }

    ctx.restore();
  }

  resize(heightRatio, shiftY) {
    this.y = (this.y * heightRatio) + shiftY;
  }
}
