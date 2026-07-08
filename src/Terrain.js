export class Terrain {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.baseY = canvasHeight * 0.7; 
    
    this.points = []; 
    this.speed = 8;
    this.level = 1;

    this.initTerrain();
  }

  initTerrain() {
    this.points = [];
    // 最初は平坦な地面
    this.points.push({ x: 0, y: this.baseY, isPit: false });
    this.points.push({ x: 500, y: this.baseY, isPit: false });

    while (this.points[this.points.length - 1].x < this.canvasWidth + 1000) {
      this.generateNextPoint();
    }
  }

  generateNextPoint() {
    const lastPoint = this.points[this.points.length - 1];
    
    let pitProb = 0.05 + (this.level * 0.02); 
    let maxPitWidth = 80 + (this.level * 30); 
    let heightVariation = 40 + (this.level * 10); 

    // 前のセグメントが穴でなく、確率を満たす場合に次のセグメントを「穴」に設定
    if (!lastPoint.isPit && Math.random() < pitProb && lastPoint.x > 500) {
      lastPoint.isPit = true;
      const pitWidth = 40 + Math.random() * maxPitWidth;
      const nextX = lastPoint.x + pitWidth;
      
      // 穴を越えた先の地面の高さは、直前の地面の高さ(lastPoint.y)を基準にする
      // 大きすぎる登り（崖）は理不尽死になるため、上方向は最大-80px（高くする）に制限
      let deltaY = (Math.random() * 150) - 50; 
      // deltaY が負なら上に登る、正なら下に降りる
      deltaY = Math.max(-80, deltaY); 
      
      let nextY = lastPoint.y + deltaY;
      nextY = Math.max(this.canvasHeight * 0.4, Math.min(this.canvasHeight * 0.8, nextY));
      this.points.push({ x: nextX, y: nextY, isPit: false });
    } else {
      const nextX = lastPoint.x + 30 + Math.random() * 50;
      let nextY = lastPoint.y + (Math.random() - 0.5) * heightVariation;
      nextY = Math.max(this.canvasHeight * 0.4, Math.min(this.canvasHeight * 0.9, nextY));
      this.points.push({ x: nextX, y: nextY, isPit: false });
    }
  }

  update(speedMultiplier) {
    const currentSpeed = this.speed * speedMultiplier;
    
    for (let i = 0; i < this.points.length; i++) {
      this.points[i].x -= currentSpeed;
    }

    while (this.points.length > 2 && this.points[1].x < -100) {
      this.points.shift();
    }

    while (this.points[this.points.length - 1].x < this.canvasWidth + 1000) {
      this.generateNextPoint();
    }
  }

  getGroundY(targetX) {
    for (let i = 0; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      
      if (targetX >= p1.x && targetX <= p2.x) {
        if (p1.isPit) {
          return this.canvasHeight + 200; // 穴の底
        }
        const ratio = (targetX - p1.x) / (p2.x - p1.x);
        return p1.y + (p2.y - p1.y) * ratio;
      }
    }
    return this.canvasHeight + 200; 
  }

  getGroundAngle(targetX) {
    for (let i = 0; i < this.points.length - 1; i++) {
      let p1 = this.points[i];
      let p2 = this.points[i + 1];
      
      if (targetX >= p1.x && targetX <= p2.x) {
        if (p1.isPit) return 0;
        return Math.atan2(p2.y - p1.y, p2.x - p1.x);
      }
    }
    return 0;
  }

  draw(ctx) {
    if (this.points.length < 2) return;

    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;

    // 中の塗りつぶし用（下端まで囲んでFill）
    ctx.beginPath();
    ctx.moveTo(this.points[0].x, this.canvasHeight);
    ctx.lineTo(this.points[0].x, this.points[0].y);

    for (let i = 0; i < this.points.length - 1; i++) {
      let p = this.points[i];
      let nextP = this.points[i + 1];

      if (p.isPit) {
        ctx.lineTo(p.x, this.canvasHeight);
        ctx.lineTo(nextP.x, this.canvasHeight);
        ctx.lineTo(nextP.x, nextP.y);
      } else {
        ctx.lineTo(nextP.x, nextP.y);
      }
    }

    ctx.lineTo(this.points[this.points.length - 1].x, this.canvasHeight);
    ctx.closePath();
    ctx.fill();

    // 地面の表面の線のみを描画（Stroke）
    ctx.beginPath();
    let isDrawing = false;
    for (let i = 0; i < this.points.length - 1; i++) {
      let p = this.points[i];
      let nextP = this.points[i + 1];
      
      if (!p.isPit) {
        if (!isDrawing) {
          ctx.moveTo(p.x, p.y);
          isDrawing = true;
        }
        ctx.lineTo(nextP.x, nextP.y);
      } else {
        if (isDrawing) {
          isDrawing = false; // 穴の直前で線を終了
        }
      }
    }
    ctx.stroke();
  }

  resize(newWidth, newHeight, heightRatio) {
    this.canvasWidth = newWidth;
    this.canvasHeight = newHeight;
    this.baseY *= heightRatio;
    for (let i = 0; i < this.points.length; i++) {
      this.points[i].y *= heightRatio;
    }
  }
}
