
    const playlistData = [
      { title: 'Vissi d’arte', file: './audio/1.mp3', subtitle: 'Tosca · Puccini', duration: '—' },
      { title: 'Sempre libera', file: './audio/2.mp3', subtitle: 'La Traviata · Verdi', duration: '—' },
      { title: 'Un bel dì vedremo', file: './audio/3.mp3', subtitle: 'Madama Butterfly · Puccini', duration: '—' },
      { title: 'Casta diva', file: './audio/4.mp3', subtitle: 'Norma · Bellini', duration: '—' }
    ];

    const player = document.getElementById('kmPlayer');
    const audio = document.getElementById('audio');
    const playlist = document.getElementById('playlist');
    const trackName = document.getElementById('trackName');
    const btn = document.getElementById('play');
    const iconPlay = document.getElementById('iconPlay');
    const iconPause = document.getElementById('iconPause');
    const seek = document.getElementById('seek');
    const tNow = document.getElementById('tNow');
    const tStart = document.getElementById('tStart');
    const tEnd = document.getElementById('tEnd');
    const y = document.getElementById('y');
    const audioState = document.getElementById('audioState');
    let currentIndex = 0;

    y.textContent = new Date().getFullYear();

    const pad2 = (n)=>String(n).padStart(2,'0');
    const fmt = (s)=>{
      if(!Number.isFinite(s) || s < 0) return '00:00';
      const m = Math.floor(s / 60);
      const ss = Math.floor(s % 60);
      return `${pad2(m)}:${pad2(ss)}`;
    };

    function renderPlaylist(){
      playlist.innerHTML = playlistData.map((item, index) => `
        <button class="track ${index === currentIndex ? 'is-active' : ''}" type="button" data-index="${index}" aria-label="${item.title}">
          <span class="trackIndex">${pad2(index + 1)}</span>
          <span class="trackText">
            <span class="trackTitle">${item.title}</span>
            <span class="trackSub">${item.subtitle}</span>
          </span>
          <span class="trackDur">${item.duration}</span>
        </button>
      `).join('');
    }

    function loadTrack(index, autoplay = false){
      currentIndex = (index + playlistData.length) % playlistData.length;
      const current = playlistData[currentIndex];
      audio.src = current.file;
      trackName.textContent = current.title;
      seek.value = 0;
      tNow.textContent = '00:00';
      tStart.textContent = '00:00';
      tEnd.textContent = '00:00';
      renderPlaylist();
      if(autoplay){
        audio.play().catch(()=>{});
      }
    }

    playlist.addEventListener('click', (e)=>{
      const btn = e.target.closest('.track');
      if(!btn) return;
      loadTrack(Number(btn.dataset.index), true);
    });

    document.getElementById('prev').addEventListener('click', ()=> loadTrack(currentIndex - 1, !audio.paused));
    document.getElementById('next').addEventListener('click', ()=> loadTrack(currentIndex + 1, !audio.paused));

    function setPlaying(is){
      player.classList.toggle('is-playing', is);
      iconPlay.style.display = is ? 'none' : '';
      iconPause.style.display = is ? '' : 'none';
      audioState.textContent = is ? 'playing' : 'ready';
    }

    btn.addEventListener('click', async ()=>{
      ensureAudioGraph();
      if(ac && ac.state === 'suspended') await ac.resume();
      if(audio.paused){
        await audio.play().catch(()=>{});
      }else{
        audio.pause();
      }
    });

    audio.addEventListener('loadedmetadata', ()=>{
      tEnd.textContent = fmt(audio.duration);
      const item = playlist.querySelector(`[data-index="${currentIndex}"] .trackDur`);
      if(item) item.textContent = fmt(audio.duration);
    });

    audio.addEventListener('play', ()=> setPlaying(true));
    audio.addEventListener('pause', ()=> setPlaying(false));
    audio.addEventListener('ended', ()=> loadTrack(currentIndex + 1, true));

    audio.addEventListener('timeupdate', ()=>{
      tNow.textContent = fmt(audio.currentTime);
      tStart.textContent = fmt(audio.currentTime);
      if(Number.isFinite(audio.duration) && audio.duration > 0){
        seek.value = String((audio.currentTime / audio.duration) * 100);
      }
    });

    seek.addEventListener('input', ()=>{
      if(!Number.isFinite(audio.duration) || audio.duration <= 0) return;
      audio.currentTime = (Number(seek.value) / 100) * audio.duration;
    });

    // visualizer
    const canvas = document.getElementById('viz');
    const ctx = canvas.getContext('2d');
    let ac, analyser, src, data;

    function resizeCanvas(){
      const r = canvas.getBoundingClientRect();
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.floor(r.width * dpr);
      canvas.height = Math.floor(r.height * dpr);
    }
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    function ensureAudioGraph(){
      if(ac) return;
      try{
        ac = new (window.AudioContext || window.webkitAudioContext)();
        analyser = ac.createAnalyser();
        analyser.fftSize = 512;
        src = ac.createMediaElementSource(audio);
        src.connect(analyser);
        analyser.connect(ac.destination);
        data = new Uint8Array(analyser.frequencyBinCount);
      }catch(e){
        ac = null;
      }
    }

    function draw(){
      requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0,0,w,h);

      const base = ctx.createLinearGradient(0,0,0,h);
      base.addColorStop(0,'rgba(255,248,238,.96)');
      base.addColorStop(1,'rgba(255,248,238,.22)');
      ctx.fillStyle = base;
      ctx.fillRect(0,0,w,h);

      if(!analyser || !data){
        drawIdle(w,h);
        return;
      }

      analyser.getByteFrequencyData(data);
      const bars = 84;
      const step = Math.max(1, Math.floor(data.length / bars));
      const bw = w / bars;

      for(let i = 0; i < bars; i++){
        const v = data[i * step] / 255;
        const bh = Math.max(6, v * h * 0.72);
        const x = i * bw;
        const y = h * 0.74 - bh;

        const grd = ctx.createLinearGradient(0, y, 0, y + bh);
        grd.addColorStop(0, 'rgba(200,165,106,.92)');
        grd.addColorStop(.58, 'rgba(122,26,42,.78)');
        grd.addColorStop(1, 'rgba(95,11,24,.38)');
        ctx.fillStyle = grd;
        roundRect(ctx, x + bw * 0.18, y, bw * 0.62, bh, Math.min(12, bw * 0.24));
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(95,11,24,.10)';
      ctx.fillRect(0, Math.floor(h * 0.76), w, 2);
    }

    function drawIdle(w,h){
      const bars = 70;
      const bw = w / bars;
      const time = performance.now() * 0.001;
      for(let i = 0; i < bars; i++){
        const wave = (Math.sin(time * 1.2 + i * 0.38) + 1) * 0.5;
        const bh = 10 + wave * h * 0.18;
        const x = i * bw;
        const y = h * 0.76 - bh;
        ctx.fillStyle = 'rgba(95,11,24,.14)';
        roundRect(ctx, x + bw * 0.22, y, bw * 0.56, bh, Math.min(10, bw * 0.2));
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(95,11,24,.08)';
      ctx.fillRect(0, Math.floor(h * 0.76), w, 2);
    }

    function roundRect(ctx, x, y, width, height, radius){
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    draw();
    renderPlaylist();
    loadTrack(0, false);
  
