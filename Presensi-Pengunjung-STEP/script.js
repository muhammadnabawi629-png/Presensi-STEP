(function() {
  // DOM elements
  const videoFeed = document.getElementById('videoFeed');
  const cameraView = document.getElementById('cameraView');
  const capturedResult = document.getElementById('capturedResult');
  const capturedImage = document.getElementById('capturedImage');
  const retakeButton = document.getElementById('retakeButton');
  const downloadButton = document.getElementById('downloadButton');
  const shutterButton = document.getElementById('shutterButton');
  const visitorNameInput = document.getElementById('visitorName');
  const visitorRoleInput = document.getElementById('visitorRole');
  const photoCounterSpan = document.getElementById('photoCounter');
  const preview1 = document.getElementById('preview1');
  const preview2 = document.getElementById('preview2');
  const preview3 = document.getElementById('preview3');
  const shotMessage = document.getElementById('shotMessage');
  const cameraStatus = document.getElementById('cameraStatus');
  const noCameraMsg = document.getElementById('noCameraMsg');

  const MAX_SHOTS = 24;
  let currentShots = 0;
  let stream = null;
  let capturedPhotoDataUrl = null;
  let isCameraActive = false;
  let isShutterBusy = false;

  // Update counter & UI
  function updateCounter() {
    photoCounterSpan.textContent = `${currentShots}/${MAX_SHOTS}`;
    if (currentShots >= MAX_SHOTS) {
      shutterButton.disabled = true;
      shutterButton.innerHTML = '<i class="fas fa-hourglass-end"></i> Rol penuh';
      shotMessage.innerHTML = '<i class="fas fa-check-circle"></i> selesai, terima kasih!';
    } else {
      shutterButton.disabled = false;
      shutterButton.innerHTML = '<i class="fas fa-bolt"></i> Jepret & Presensi';
    }
  }

  function updatePreviews() {
    const previews = [preview1, preview2, preview3];
    previews.forEach((preview, index) => {
      if (currentShots > index) {
        preview.classList.remove('empty');
        preview.classList.add('photo');
        preview.style.background = 'linear-gradient(145deg, #b8c7dd, #8fa5c4)';
        preview.innerHTML = '<i class="fas fa-camera" style="color: rgba(0,0,0,0.4);"></i>';
      } else {
        preview.classList.remove('photo');
        preview.classList.add('empty');
        preview.style.background = '';
        preview.innerHTML = '<i class="fas fa-image"></i>';
      }
    });
    if (currentShots > 0 && currentShots < MAX_SHOTS) {
      shotMessage.innerHTML = `<i class="fas fa-check"></i> ${currentShots} bidikan tersimpan`;
    } else if (currentShots === 0) {
      shotMessage.innerHTML = '<i class="far fa-clock"></i> siap memotret';
    }
  }

  function showCameraView() {
    cameraView.style.display = 'block';
    capturedResult.style.display = 'none';
    if (stream && isCameraActive) {
      videoFeed.style.display = 'block';
      noCameraMsg.style.display = 'none';
    } else {
      videoFeed.style.display = 'none';
      noCameraMsg.style.display = 'block';
    }
  }

  function showResultView() {
    cameraView.style.display = 'none';
    capturedResult.style.display = 'block';
  }

  function triggerFlash(element) {
    element.classList.add('flash');
    setTimeout(() => element.classList.remove('flash'), 200);
  }

  async function startCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } }, 
        audio: false 
      });
      videoFeed.srcObject = stream;
      isCameraActive = true;
      cameraStatus.innerHTML = '<i class="fas fa-check-circle"></i> aktif';
      noCameraMsg.style.display = 'none';
      videoFeed.style.display = 'block';
    } catch (err) {
      console.warn('Kamera tidak dapat diakses:', err);
      isCameraActive = false;
      cameraStatus.innerHTML = '<i class="fas fa-times-circle"></i> nonaktif';
      noCameraMsg.style.display = 'block';
      videoFeed.style.display = 'none';
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      stream = null;
    }
    isCameraActive = false;
    videoFeed.srcObject = null;
    cameraStatus.innerHTML = '<i class="fas fa-camera"></i> nonaktif';
  }

  function capturePhoto() {
    if (!isCameraActive || !stream || !videoFeed.videoWidth) {
      alert('Kamera belum siap. Mohon izinkan akses kamera.');
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = videoFeed.videoWidth;
    canvas.height = videoFeed.videoHeight;
    const ctx = canvas.getContext('2d');
    // mirror untuk menyamakan tampilan selfie
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoFeed, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  function downloadPhoto(dataUrl, name = 'presensicam-edu') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `presensicam_${name.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // Event handler untuk tombol shutter
  function handleShutter() {
    if (isShutterBusy || currentShots >= MAX_SHOTS) return;

    const name = visitorNameInput.value.trim();
    const role = visitorRoleInput.value.trim();
    if (!name || !role) {
      alert('Mohon isi nama dan peran terlebih dahulu untuk presensi 📸');
      return;
    }

    if (!isCameraActive) {
      alert('Kamera belum aktif. Pastikan izin kamera diberikan.');
      return;
    }

    isShutterBusy = true;
    shutterButton.disabled = true;

    // Ambil foto
    capturedPhotoDataUrl = capturePhoto();
    if (!capturedPhotoDataUrl) {
      isShutterBusy = false;
      shutterButton.disabled = false;
      return;
    }

    // Efek flash
    triggerFlash(cameraView);

    // Tampilkan hasil
    capturedImage.src = capturedPhotoDataUrl;
    showResultView();

    // Update counter & presensi
    currentShots++;
    updateCounter();
    updatePreviews();

    // Kosongkan form
    visitorNameInput.value = '';
    visitorRoleInput.value = '';

    shotMessage.innerHTML = `<i class="fas fa-check"></i> ${name.split(' ')[0]} terjepret! silakan unduh`;

    isShutterBusy = false;
    if (currentShots < MAX_SHOTS) {
      shutterButton.disabled = false;
    }
  }

  // Event listener
  shutterButton.addEventListener('click', handleShutter);

  retakeButton.addEventListener('click', () => {
    showCameraView();
    // jangan reset counter, hanya kembali ke kamera
  });

  downloadButton.addEventListener('click', () => {
    if (capturedPhotoDataUrl) {
      const name = visitorNameInput.value.trim() || 'pengunjung';
      downloadPhoto(capturedPhotoDataUrl, name);
    } else {
      alert('Belum ada foto untuk diunduh.');
    }
  });

  visitorRoleInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleShutter();
    }
  });

  visitorNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      visitorRoleInput.focus();
    }
  });

  // Inisialisasi kamera
  async function initCamera() {
    await startCamera();
    showCameraView();
    updateCounter();
    updatePreviews();
  }

  initCamera();

  // Bersihkan stream saat halaman ditutup (opsional)
  window.addEventListener('beforeunload', () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  });

  console.log('📸 presensicam live — kamera siap, hasil foto langsung diunduh');
})();