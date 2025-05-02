let allCoords = []; // Tüm koordinatları saklar
let currentTargetIndex = 0; // Şu anki hedef koordinatın indeksi (0'dan başlar)
let currentRequiredBearing = 0; // Mevcut hedefe gitmek için gereken yön (pusula açısı)
let latestUserLat = null; // Son alınan geçerli enlem
let latestUserLon = null; // Son alınan geçerli boylam

// GPS ve Pusula dinleyicilerinin ID'leri/referansları
let geoWatchId = null;
let deviceOrientationListener = null;

document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button');
    const okButton = document.querySelector('.btn-ok');
    const bottomContainer = document.querySelector('.bottom-container');

    // Yeni eklenen butonlar ve hedef gösterim elementi
    const prevTargetButton = document.getElementById('prev-target');
    const nextTargetButton = document.getElementById('next-target');
    const targetInfoSpan = document.getElementById('target-info'); // Hedef no/toplam no göstermek için


    // Koordinatları yükle
    allCoords = getQueryParams();

    // Başlangıçta butonları ayarla
    updateTargetButtons();
    updateTargetInfo();


    centerButton.addEventListener('click', function () {
        const existingAScene = document.querySelector('a-scene');
        if (existingAScene) {
             existingAScene.remove();
        }

        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
        aScene.setAttribute('ar-modes', 'webxr-ar-only');
        aScene.setAttribute('renderer', 'logarithmicDepthBuffer: true;');
        aScene.style.position = 'absolute';
        aScene.style.top = '0';
        aScene.style.left = '0';
        aScene.style.width = '100%';
        aScene.style.height = '100%';
        aScene.style.zIndex = '1';
        document.body.appendChild(aScene);

        bottomContainer.style.height = '40%';
        centerButton.style.display = 'none';
        rightButton.style.display = 'block';

        // Butonları göster (varsayılan olarak gizli olabilirler CSS ile)
         if (prevTargetButton) prevTargetButton.style.display = 'block';
         if (nextTargetButton) nextTargetButton.style.display = 'block';
         if (targetInfoSpan) targetInfoSpan.style.display = 'block';


        // AR başladığında rehberliği başlat
        startARGuidance();
    });

    rightButton.addEventListener('click', function () {
        const aScene = document.querySelector('a-scene');
        if (aScene) {
            aScene.remove();
        }

        // Butonları gizle
        if (prevTargetButton) prevTargetButton.style.display = 'none';
        if (nextTargetButton) nextTargetButton.style.display = 'none';
        if (targetInfoSpan) targetInfoSpan.style.display = 'none';

        // AR durduğunda rehberliği durdur
        stopARGuidance();

        bottomContainer.style.height = '100%';
        centerButton.style.display = 'block';
        rightButton.style.display = 'none';
    });

    okButton.addEventListener('click', function () {
         const aScene = document.querySelector('a-scene');
        if (aScene) {
            aScene.remove();
        }

        // Butonları gizle
         if (prevTargetButton) prevTargetButton.style.display = 'none';
         if (nextTargetButton) nextTargetButton.style.display = 'none';
         if (targetInfoSpan) targetInfoSpan.style.display = 'none';

        // AR durduğunda rehberliği durdur
        stopARGuidance();

        bottomContainer.style.height = '100%';
        centerButton.style.display = 'block';
        rightButton.style.display = 'none';
    });

    // Hedef değiştirme butonları olay dinleyicileri
     if (prevTargetButton) {
        prevTargetButton.addEventListener('click', function() {
            if (currentTargetIndex > 0) {
                currentTargetIndex--;
                console.log("Önceki hedefe geçildi:", currentTargetIndex);
                updateTargetButtons();
                updateTargetInfo();
                updateRequiredBearing(); // Yeni hedefe göre yönü güncelle
            }
        });
     }

     if (nextTargetButton) {
        nextTargetButton.addEventListener('click', function() {
            if (currentTargetIndex < allCoords.length - 1) {
                currentTargetIndex++;
                console.log("Sonraki hedefe geçildi:", currentTargetIndex);
                updateTargetButtons();
                updateTargetInfo();
                updateRequiredBearing(); // Yeni hedefe göre yönü güncelle
            }
        });
     }
});

// URL'den koordinatları alır ve tüm listeyi döndürür
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const encodedCoordinates = params.get('coordinates');

    if (!encodedCoordinates) {
        console.error("URL'de 'coordinates' parametresi bulunamadı.");
        return [];
    }

    try {
        const decodedCoordinates = decodeURIComponent(encodedCoordinates);
        const coordinates = JSON.parse(decodedCoordinates);
        if (!Array.isArray(coordinates) || coordinates.length < 1) { // En az 1 nokta olmalı
             console.error("Koordinat formatı geçersiz veya nokta sayısı yetersiz.");
             return [];
        }
        console.log(`Toplam ${coordinates.length} koordinat yüklendi.`);
        return coordinates;
    } catch (e) {
        console.error("Koordinat ayrıştırma hatası:", e);
        return [];
    }
}

// İleri/Geri butonlarının durumunu günceller
function updateTargetButtons() {
     const prevButton = document.getElementById('prev-target');
     const nextButton = document.getElementById('next-target');

     if (!prevButton || !nextButton) return;

    prevButton.disabled = currentTargetIndex === 0; // İlk noktadaysa geri pasif
    nextButton.disabled = currentTargetIndex === allCoords.length - 1; // Son noktadaysa ileri pasif
}

// Hedef bilgisini (örn: Hedef 3 / 5) günceller
function updateTargetInfo() {
     const targetInfoSpan = document.getElementById('target-info');
     if (!targetInfoSpan) return;

     if (allCoords.length > 0) {
        targetInfoSpan.textContent = `Hedef ${currentTargetIndex + 1} / ${allCoords.length}`;
     } else {
        targetInfoSpan.textContent = 'Hedef Yok';
     }
}


// Mevcut konumumuzdan (latestUserLat, latestUserLon)
// seçili hedefe (allCoords[currentTargetIndex]) olan yönü hesaplar ve
// currentRequiredBearing değişkenini günceller.
function updateRequiredBearing() {
     if (latestUserLat !== null && latestUserLon !== null && allCoords.length > 0 && currentTargetIndex >= 0 && currentTargetIndex < allCoords.length) {
        const target = allCoords[currentTargetIndex];
        const targetLat = parseFloat(target.x); // Assuming x is latitude
        const targetLon = parseFloat(target.y); // Assuming y is longitude

        currentRequiredBearing = calculateBearing(latestUserLat, latestUserLon, targetLat, targetLon);
        console.log(`Yön güncellendi. Hedef Index: ${currentTargetIndex}, Gereken Yön: ${currentRequiredBearing.toFixed(2)} derece`);
        // showArrow fonksiyonu zaten pusula güncellendiğinde bu değişkeni okuyacak.
     } else {
         currentRequiredBearing = -1; // Geçersiz yön
         console.warn("Yön hesaplamak için yeterli bilgi yok (Konum veya Hedef).");
         // Okları gizlemek için showArrow'u çağırabiliriz, veya showArrow içinde bu durumu ele alabiliriz.
         // showArrow fonksiyonu zaten currentRequiredBearing <= 0 ise okları gizleyebilir.
     }
}


// Haversine formülü ile iki nokta arası mesafeyi hesaplar (Lat, Lon)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Dünya'nın yarıçapı (metre)
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
}

// İki nokta arası yönü (açıyı) hesaplar (Lat, Lon)
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

// Yönlendirme oklarını gösterir veya gizler.
// Şimdi sadece baktığınız yön ile currentRequiredBearing'i karşılaştırır.
function showArrow(userCompassDirection, beta) {
    const arScene = document.querySelector('a-scene');
    // AR sahnesi yoksa veya geçerli bir hedef yoksa okları gösterme
    if (!arScene || currentRequiredBearing === -1 || allCoords.length === 0) {
         // Tüm okları gizle
         const leftArrow = document.getElementById('left-arrow');
         const rightArrow = document.getElementById('right-arrow');
         const upArrow = document.getElementById('up-arrow');
         const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
         const container = document.querySelector('.container');
         const progressCircle = document.querySelector('.progress');

         if (leftArrow) leftArrow.classList.remove('fade-in');
         if (rightArrow) rightArrow.classList.remove('fade-in');
         if (upArrow) upArrow.classList.remove('fade-in');
         if (upPerspectiveArrow) upPerspectiveArrow.classList.remove('fade-in');
         if (container) container.classList.remove('grow');
         if (progressCircle) progressCircle.style.strokeDashoffset = '283';
         return;
    }

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    // Elementlerin var olduğundan emin ol
    if (!leftArrow || !rightArrow || !upArrow || !upPerspectiveArrow || !container || !progressCircle) {
         // console.warn("Arrow/UI elementleri bulunamadı."); // Sürekli loglamamak için yoruma alındı
         return;
    }

    // Okların görünürlüğünü sıfırlama
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    upPerspectiveArrow.classList.remove('fade-in', 'fade-out');


    const directionToTurn = currentRequiredBearing; // Kullanıcının gitmesi gereken yön
    const tolerance = 15; // Derece toleransı (±15 derece)

    // Bakılan yön ile gidilmesi gereken yön arasındaki farkı hesapla (360 derece dönüşü dahil)
    let diff = directionToTurn - userCompassDirection;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Eğer yön tolerans içindeyse
    if (Math.abs(diff) <= tolerance) {
        // Yön doğru, ileri okları göster
        if (beta < 30) { // Cihazın eğimi düşükse perspektifli oku göster
            upPerspectiveArrow.classList.add('fade-in');
        } else { // Cihazın eğimi yüksekse düz oku göster
            upArrow.classList.add('fade-in');
        }
        container.classList.add('grow'); // İlerleme çemberini başlat
        progressCircle.style.strokeDashoffset = '0'; // Animate to 0

    } else {
        // Yön tolerans dışında, sola veya sağa oku göster
        if (diff > 0) { // Sağa dönmek gerekiyor
            rightArrow.classList.add('fade-in');
        } else { // Sola dönmek gerekiyor
            leftArrow.classList.add('fade-in');
        }

        container.classList.remove('grow'); // İlerleme çemberini sıfırla
        progressCircle.style.strokeDashoffset = '283'; // Anında sıfırlama (tam çember değeri)
    }
}


// AR rehberliğini başlatan fonksiyon
function startARGuidance() {
     if (allCoords.length === 0) {
         console.warn("Navigasyon için koordinat yok.");
         updateTargetButtons(); // Butonları pasif yap
         updateTargetInfo(); // Hedef yok yaz
         showArrow(-1, -1); // Okları gizle
         return;
     }

    // Başlangıç hedef indeksini ayarla (0'dan başlar)
    currentTargetIndex = 0;
    updateTargetButtons();
    updateTargetInfo();

    // Pusula dinleyicisini başlat
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API kullanılamıyor. Pusula rehberliği devre dışı.");
    } else {
         deviceOrientationListener = (e) => {
            // Hem absolute hem de standart eventi dinle (webkitCompassHeading için)
            if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) {
                // webkitCompassHeading daha doğru olabilir, bunu kullan
                 showArrow(e.webkitCompassHeading, e.beta);
            } else if (e.absolute && e.alpha != null && e.beta != null && e.gamma != null) {
                // webkitCompassHeading yoksa veya geçersizse standart hesaplama
                let compass = -(e.alpha + e.beta * e.gamma / 90);
                compass -= Math.floor(compass / 360) * 360;
                showArrow(compass, e.beta);
            }
            // Eğer her iki durumda da geçerli data yoksa showArrow çağrılmaz,
            // veya showArrow içinde bu durum ele alınabilir.
         };

         if (typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === "granted") {
                        window.addEventListener("deviceorientation", deviceOrientationListener); // Hem standardı hem webkit'i yakalar
                    } else {
                        console.warn("DeviceOrientationEvent izni verilmedi. Pusula rehberliği devre dışı.");
                    }
                })
                .catch(error => {
                    console.error("DeviceOrientation izni istenirken hata:", error);
                });
        } else {
            // İzin API'sini desteklemeyen tarayıcılar
             window.addEventListener("deviceorientation", deviceOrientationListener);
        }
    }

    // GPS konum dinleyicisini başlat
    if (navigator.geolocation) {
        geoWatchId = navigator.geolocation.watchPosition(position => {
            const { latitude, longitude, accuracy } = position.coords;

            // Konum doğruluğunu kontrol et (örn: 15 metreden iyiyse kabul et)
            if (typeof accuracy === 'undefined' || accuracy === null || accuracy > 15) {
                console.warn('Konum verisi yeterince doğru değil, atlanıyor:', accuracy?.toFixed(2) ?? 'N/A', 'm');
                // latestUserLat/Lon güncellenmez, bu da updateRequiredBearing'in doğru hesap yapmasını engeller.
                // Okları gizlemek için showArrow'u geçersiz değerle çağırabiliriz
                showArrow(-1, -1);
                return;
            }

             console.log(`Accurate position received: Lat=${latitude.toFixed(6)}, Lon=${longitude.toFixed(6)}, Accuracy=${accuracy.toFixed(2)}m`);

            // Son geçerli konumu kaydet
            latestUserLat = latitude;
            latestUserLon = longitude;

            // Konum güncellendiğinde gereken yönü tekrar hesapla
            // Bu, butona basılmasa bile siz hareket ettikçe yönün güncel kalmasını sağlar.
            updateRequiredBearing();


        }, error => {
            console.error('Geolocation hatası:', error);
            // Hata durumunda son konumu temizle ve okları gizle
            latestUserLat = null;
            latestUserLon = null;
             showArrow(-1, -1);
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 });
    } else {
        console.error("Tarayıcı Geolocation'ı desteklemiyor.");
         // Geolocation yoksa rehberlik yapılamaz, okları gizle
         showArrow(-1, -1);
    }
}

// AR rehberliğini durduran fonksiyon
function stopARGuidance() {
    // GPS dinleyicisini durdur
    if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
        console.log("Geolocation watch durduruldu.");
    }

    // Pusula dinleyicisini durdur
    if (deviceOrientationListener !== null) {
        window.removeEventListener("deviceorientation", deviceOrientationListener);
        deviceOrientationListener = null;
        console.log("Device orientation listener durduruldu.");
    }

    // Gereken yönü geçersiz yap ve UI'ı sıfırla
    currentRequiredBearing = -1;
    latestUserLat = null;
    latestUserLon = null;
    showArrow(-1, -1); // Tüm okları gizle

    // Hedef bilgisi ve buton durumlarını sıfırla (isteğe bağlı)
    // currentTargetIndex = 0; // AR tekrar başlatıldığında sıfırlanıyor zaten
    // updateTargetButtons();
    // updateTargetInfo();
}

// İlerleme çemberi animasyonu bittiğinde tetiklenecek olay dinleyicisi (isteğe bağlı)
const progressCircle = document.querySelector('.progress');
if (progressCircle) {
    progressCircle.addEventListener('transitionend', function() {
        // Eğer çember tamamen dolduysa (strokeDashoffset 0 olduysa)
        if (this.style.strokeDashoffset === '0') {
            // console.log('İlerleme çemberi doldu!');
            // Buraya örneğin kısa süreliğine bir "Doğru Yöndesin!" görseli ekleyebilirsiniz.
        }
    });
}