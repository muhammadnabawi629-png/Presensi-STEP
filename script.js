(function() {
  // DOM elements
  const videoFeed = document.getElementById('videoFeed');
  const cameraView = document.getElementById('cameraView');
  const capturedResult = document.getElementById('capturedResult');
  const resultGallery = document.getElementById('resultGallery');
  const emptyGallery = document.getElementById('emptyGallery');
  const resultCount = document.getElementById('resultCount');
  const backToCameraBtn = document.getElementById('backToCameraBtn');
  const downloadAllBtn = document.getElementById('downloadAllBtn');
  const switchCameraBtn = document.getElementById('switchCameraBtn');
  const shutterButton = document.getElementById('shutterButton');
  const viewGalleryBtn = document.getElementById('viewGalleryBtn');
  const galleryCountSpan = document.getElementById('galleryCount');
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
  let photos = []; // Array untuk menyimpan foto
  let isCameraActive = false;
  let isShutterBusy = false;
  let currentFacingMode = 'environment'; // Default: kamera belakang

  // Update counter & UI
  function updateCounter() {
    photoCounterSpan.textContent = `${currentShots}/${MAX_SHOTS}`;
    galleryCountSpan.textContent = photos.length;
    
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
      const photoIndex = photos.length - 1 - index;
      if (photoIndex >= 0 && photos[photoIndex]) {
        preview.classList.remove('empty');
        preview.classList.add('photo');
        preview.innerHTML = `<img src="${photos[photoIndex].dataUrl}" alt="Preview">`;
        preview.style.background = '';
      } else {
        preview.classList.remove('photo');
        preview.classList.add('empty');
        preview.style.background = '';
        preview.innerHTML = '<i class="fas fa-image"></i>';
      }
    });
    
    if (photos.length > 0 && currentShots < MAX_SHOTS) {
      shotMessage.innerHTML = `<i class="fas fa-check"></i> ${photos.length} bidikan tersimpan`;
    } else if (photos.length === 0) {
      shotMessage.innerHTML = '<i class="far fa-clock"></i> siap memotret';
    }
  }

  function updateGallery() {
    resultGallery.innerHTML = '';
    
    if (photos.length === 0) {
      resultGallery.innerHTML = `
        <div class="empty-gallery">
          <i class="fas fa-camera-retro"></i>
          <p>Belum ada foto</p>
          <span>Ambil foto untuk melihat hasil</span>
        </div>
      `;
    } else {
      photos.forEach((photo, index) => {
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.innerHTML = `
          <img src="${photo.dataUrl}" alt="Foto ${index + 1}">
          <div class="gallery-item-actions">
            <button class="btn-download-photo" onclick="downloadSinglePhoto(${index})" title="Unduh foto">
              <i class="fas fa-download"></i>
            </button>
            <button class="btn-delete-photo" onclick="deletePhoto(${index})" title="Hapus foto">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
        resultGallery.appendChild(galleryItem);
      });
    }
    
    resultCount.textContent = `${photos.length} foto`;
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

  function showGallery() {
    cameraView.style.display = 'none';
    capturedResult.style.display = 'block';
    updateGallery();
  }

  function triggerFlash(element) {
    element.classList.add('flash');
    setTimeout(() => element.classList.remove('flash'), 200);
  }

  async function startCamera(facingMode = 'environment') {
    // Stop existing stream
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    try {
      stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: false 
      });
      videoFeed.srcObject = stream;
      isCameraActive = true;
      currentFacingMode = facingMode;
      
      // Update mirror effect based on camera
      if (facingMode === 'user') {
        videoFeed.style.transform = 'scaleX(-1)';
      } else {
        videoFeed.style.transform = 'scaleX(1)';
      }
      
      cameraStatus.innerHTML = `<i class="fas fa-check-circle"></i> ${facingMode === 'user' ? 'depan' : 'belakang'}`;
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

  async function switchCamera() {
    if (isShutterBusy) return;
    
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment';
    await startCamera(newFacingMode);
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
    
    // Mirror hanya jika kamera depan
    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    
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

  // Global functions untuk gallery
  window.downloadSinglePhoto = function(index) {
    if (photos[index]) {
      downloadPhoto(photos[index].dataUrl, photos[index].name || 'pengunjung');
    }
  };

  window.deletePhoto = function(index) {
    if (index >= 0 && index < photos.length) {
      photos.splice(index, 1);
      currentShots = photos.length;
      updateCounter();
      updatePreviews();
      updateGallery();
      
      // Show message
      shotMessage.innerHTML = '<i class="fas fa-trash-alt"></i> Foto dihapus';
      setTimeout(() => {
        updatePreviews();
      }, 1000);
    }
  };

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
    const photoDataUrl = capturePhoto();
    if (!photoDataUrl) {
      isShutterBusy = false;
      shutterButton.disabled = false;
      return;
    }

    // Simpan foto ke array
    photos.push({
      dataUrl: photoDataUrl,
      name: name,
      role: role,
      timestamp: new Date().toISOString()
    });

    // Efek flash
    triggerFlash(cameraView);

    // Update counter & presensi
    currentShots = photos.length;
    updateCounter();
    updatePreviews();

    // Kosongkan form
    visitorNameInput.value = '';
    visitorRoleInput.value = '';

    shotMessage.innerHTML = `<i class="fas fa-check"></i> ${name.split(' ')[0]} terjepret!`;

    isShutterBusy = false;
    if (currentShots < MAX_SHOTS) {
      shutterButton.disabled = false;
    }
  }

  // Event listeners
  shutterButton.addEventListener('click', handleShutter);
  
  switchCameraBtn.addEventListener('click', switchCamera);
  
  viewGalleryBtn.addEventListener('click', showGallery);
  
  backToCameraBtn.addEventListener('click', showCameraView);
  
  downloadAllBtn.addEventListener('click', () => {
    if (photos.length === 0) {
      alert('Belum ada foto untuk diunduh.');
      return;
    }
    
    photos.forEach((photo, index) => {
      setTimeout(() => {
        downloadPhoto(photo.dataUrl, photo.name || `pengunjung_${index + 1}`);
      }, index * 300); // Delay untuk mencegah browser memblokir multiple downloads
    });
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

  // Inisialisasi kamera dengan kamera belakang
  async function initCamera() {
    await startCamera('environment');
    showCameraView();
    updateCounter();
    updatePreviews();
  }

  initCamera();

  // Bersihkan stream saat halaman ditutup
  window.addEventListener('beforeunload', () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  });

  console.log('📸 presensicam live — kamera belakang default, fitur ganti kamera aktif');
})();
