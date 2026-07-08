export class SoundManager {
  constructor() {
    this.ctx = null;
    this.bgmTimer = null;
    this.bgmPlaying = false;
    this.masterVolume = null;
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    this.masterVolume = this.ctx.createGain();
    this.masterVolume.gain.value = 0.3; // マスター音量
    this.masterVolume.connect(this.ctx.destination);
  }

  playJump() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    // 昔のゲーム風のチープなピッチベンド上昇
    osc.frequency.setValueAtTime(300, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(this.masterVolume);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  playDeath() {
    if (!this.ctx) return;
    // チープなノイズ（ザザーッ！）
    const bufferSize = this.ctx.sampleRate * 0.4;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.4);
    
    noise.connect(gain);
    gain.connect(this.masterVolume);
    noise.start();
  }

  playBGM() {
    if (!this.ctx || this.bgmPlaying) return;
    this.bgmPlaying = true;
    
    const bpm = 155; // ユーロビートらしいBPM
    const beatDuration = 60 / bpm;
    const lookahead = 25.0;
    const scheduleAheadTime = 0.1;
    
    let nextNoteTime = this.ctx.currentTime + 0.1;
    let step = 0;
    
    // コード: Am, F, C, G
    const chords = [
      [220.00, 261.63, 329.63], // Am
      [174.61, 220.00, 261.63], // F
      [130.81, 164.81, 196.00], // C
      [196.00, 246.94, 293.66]  // G
    ];

    // 16小節のコード進行 (Aメロ→Bメロ→サビで使い回す哀愁進行)
    const progression = [
      0, 0, 1, 1, 2, 2, 3, 3,
      0, 0, 1, 1, 3, 3, 0, 0
    ];

    const playSynth = (freq, time, duration, type, vol) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + duration);
      osc.connect(gain);
      gain.connect(this.masterVolume);
      osc.start(time);
      osc.stop(time + duration);
    };

    const playKick = (time) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, time);
      osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.1);
      gain.gain.setValueAtTime(0.5, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
      osc.connect(gain);
      gain.connect(this.masterVolume);
      osc.start(time);
      osc.stop(time + 0.1);
    };

    const scheduler = () => {
      while (nextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        // 64小節（約99秒）で1ループするユーロビート構成
        const barInLoop = Math.floor(step / 16) % 64; 
        const section = Math.floor(barInLoop / 16); // 0=Intro, 1=Aメロ, 2=Bメロ, 3=サビ
        const currentChord = chords[progression[barInLoop % 16]];
        const stepInBar = step % 16;
        
        // 四つ打ちキックドラム
        if (stepInBar % 4 === 0) playKick(nextNoteTime);
        
        // チープな裏打ちハイハット（高音の矩形波ノイズ代わり）
        if (stepInBar % 4 === 2) playSynth(8000, nextNoteTime, 0.05, 'square', 0.01); 

        // ダサい16ビートシンセベース（ルート音）
        if (stepInBar % 2 === 0) {
          playSynth(currentChord[0] / 2, nextNoteTime, 0.1, 'sawtooth', 0.15);
        }

        // ユーロビート風シンセブラスのバッキング (ン・ジャッ・ン・ジャッ)
        if (section >= 1 && (stepInBar === 4 || stepInBar === 12)) {
          currentChord.forEach(f => playSynth(f, nextNoteTime, 0.15, 'sawtooth', 0.03));
        }

        // セクション毎のイキリメロディ展開
        let melNote = 0;
        if (section === 1) {
          // Aメロ: ポツポツとしたメロディ
          if (stepInBar % 8 === 0) melNote = currentChord[1] * 2;
          if (stepInBar % 8 === 6) melNote = currentChord[2] * 2;
        } else if (section === 2) {
          // Bメロ: 焦燥感を煽る裏拍メロディ
          if (stepInBar % 4 === 2) melNote = currentChord[2] * 2;
        } else if (section === 3) {
          // サビ: 激しいユーロビート風のダサいアルペジオ（パラパラ風）
          const arpIndex = [0, 1, 2, 1][(stepInBar % 4)];
          melNote = currentChord[arpIndex] * 2;
          // サビのみシンセバッキングを激しくする
          if (stepInBar % 4 === 0) {
            currentChord.forEach(f => playSynth(f, nextNoteTime, 0.2, 'square', 0.02));
          }
        }

        if (melNote > 0) {
          playSynth(melNote, nextNoteTime, 0.15, 'square', 0.08); // チープなピコピコメロディ
        }

        nextNoteTime += beatDuration / 4;
        step++;
      }
      this.bgmTimer = setTimeout(scheduler, lookahead);
    };

    scheduler();
  }

  stopBGM() {
    this.bgmPlaying = false;
    clearTimeout(this.bgmTimer);
  }
}
