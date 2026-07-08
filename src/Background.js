export class Background {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.gridSize = 40;
    this.offsetX = 0;
    this.speedLines = []; // スピード線エフェクト用
  }

  update(speedMultiplier) {
    // 罫線背景のスクロール
    const speed = 2 * speedMultiplier;
    this.offsetX = (this.offsetX - speed) % this.gridSize;

    // スピード線の更新
    if (speedMultiplier > 1.4) {
      // 一定確率で新しいスピード線を生成
      if (Math.random() < 0.3) {
        this.speedLines.push({
          x: this.canvasWidth,
          y: Math.random() < 0.5 ? Math.random() * (this.canvasHeight * 0.3) : this.canvasHeight * 0.7 + Math.random() * (this.canvasHeight * 0.3),
          length: 50 + Math.random() * 150,
          speed: 15 * speedMultiplier + Math.random() * 10,
          opacity: 0.1 + Math.random() * 0.4,
          thickness: 1 + Math.random() * 3
        });
      }
    }

    // スピード線の移動と寿命管理
    for (let i = this.speedLines.length - 1; i >= 0; i--) {
      let line = this.speedLines[i];
      line.x -= line.speed;
      if (line.x + line.length < 0) {
        this.speedLines.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.strokeStyle = '#dcdcdc'; // 薄いグレーの罫線
    ctx.lineWidth = 1;

    ctx.beginPath();
    // 縦線を描画
    for (let x = this.offsetX; x <= this.canvasWidth; x += this.gridSize) {
      if (x >= 0) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvasHeight);
      }
    }

    // 横線を描画
    for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.canvasWidth, y);
    }
    ctx.stroke();
    
    // スピード線の描画
    if (this.speedLines.length > 0) {
      ctx.beginPath();
      for (let i = 0; i < this.speedLines.length; i++) {
        let line = this.speedLines[i];
        ctx.strokeStyle = `rgba(0, 0, 0, ${line.opacity})`;
        ctx.lineWidth = line.thickness;
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x + line.length, line.y);
        ctx.stroke();
      }
    }
    
    ctx.restore();
  }

  resize(newWidth, newHeight, heightRatio, shiftY) {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    for (let line of this.speedLines) {
      line.y = (line.y * heightRatio) + shiftY;
    }
  }
}
