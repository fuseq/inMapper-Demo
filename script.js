
let isBetaAbove45 = false;

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

// İki koordinat arasındaki yönü hesaplar

// Yön açısına göre pusula yönünü döndürür (örn: N, NE, E vb.)
function getDirectionFromBearing(bearing) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}
function checkModelVisibility(model) {
    // A-Frame'ın 'gps-entity-place' bileşenini kullanarak görünürlük kontrolü yapın
    const modelPosition = model.object3D.position;
    const camera = document.querySelector('a-camera').object3D;
    const modelScreenPosition = modelPosition.clone().project(camera);
    return modelScreenPosition.z > 0 && modelScreenPosition.x >= -1 && modelScreenPosition.x <= 1 && modelScreenPosition.y >= -1 && modelScreenPosition.y <= 1;
}
// Yönlendirme oklarını ve doğru yön indikatörünü gösterir
function showArrow(directionToTurn, direction) {

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const videoElement = document.getElementById('camera-stream');

    const uiBox = document.querySelector('.ui-box');
    const popup = document.querySelector('.popup');
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    if (videoElement.style.display === 'none') {
        popup.style.display = 'none';
        container.classList.remove('grow');
        uiBox.classList.remove('border-animation');
        uiBox.removeEventListener('animationend', showPopupOnAnimationEnd);
        return;
    }

    // Animasyonları kaldırmak için önce tüm okların animasyon sınıflarını temizle
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    // Yukarı yön oku (±50 derece içinde)
    const upperBound = (directionToTurn + 10) % 360;
    const lowerBound = (directionToTurn - 10 + 360) % 360;

    // Eğer yön directionToTurn ile ±50 derece arasındaysa
    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {
        // Yön 50'den küçük veya 300'den büyükse, sadece up-arrow görünecek
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
        upArrow.classList.add('fade-in');
        directionMatches = true;

        // Border animasyonunu başlat
        uiBox.classList.add('border-animation');

        uiBox.addEventListener('animationend', showPopupOnAnimationEnd, { once: true });
        // Çemberi büyüt
        container.classList.add('grow');

        // Büyüme tamamlandıktan sonra progress bar'ı başlat
        setTimeout(() => {
            progressCircle.style.strokeDashoffset = '0';
        }, 1000); // 1 saniye sonra yükleme başlasın
    } else {
        // Eğer yön directionToTurn ile ±50 derece dışında ise sola veya sağa oklar gösterilecek
        const clockwise = (directionToTurn - direction + 360) % 360;
        const counterclockwise = (direction - directionToTurn + 360) % 360;

        if (clockwise <= counterclockwise) {
            // Sağ ok görünür
            leftArrow.classList.add('fade-out');
            rightArrow.classList.add('fade-in');
        } else {
            // Sol ok görünür
            leftArrow.classList.add('fade-in');
            rightArrow.classList.add('fade-out');
        }
        upArrow.classList.add('fade-out');
        directionMatches = false;
        // Border animasyonunu kaldır
        uiBox.classList.remove('border-animation');
        // Önce progress bar'ı anında sıfırla
        progressCircle.style.transition = 'none';  // Anında sıfırlama için animasyonu kaldır
        progressCircle.style.strokeDashoffset = '283'; // Progress bar'ı direkt sıfırla

        // Daha sonra yeniden transition ekleyip, çemberi küçült
        setTimeout(() => {
            progressCircle.style.transition = 'stroke-dashoffset 3s linear'; // Transition'ı geri ekle
            container.classList.remove('grow'); // Çemberi küçült
        }, 0); // Hemen sıfırlama işlemini yap
        // Popup zamanlayıcısını temizle
        clearTimeout(popupTimeout);
        popup.style.display = 'none'; // Popup'ı gizle
    }
}

function startCompassListener(callback) {
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API not available");
        return;
    }
    const absoluteListener = (e) => {
        if (!e.absolute || e.alpha == null || e.beta == null || e.gamma == null) {
            return;
        }
        let compass = -(e.alpha + e.beta * e.gamma / 90);
        compass -= Math.floor(compass / 360) * 360;
        callback(compass);
    };

    const webkitListener = (e) => {
        let compass = e.webkitCompassHeading;
        if (compass != null && !isNaN(compass)) {
            callback(compass);
            window.removeEventListener("deviceorientation", webkitListener);
        }
    };

    function addListeners() {
        window.addEventListener("deviceorientationabsolute", absoluteListener);
        window.addEventListener("deviceorientation", webkitListener);
    }

    if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === "granted") {
                    addListeners();
                } else {
                    console.warn("Permission for DeviceOrientationEvent not granted");
                }
            })
            .catch(error => {
                console.error("Error requesting permission:", error);
            });
    } else {
        addListeners();
    }
}

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const targetLat = parseFloat(window.coords.x2);
    const targetLon = parseFloat(window.coords.y2);
    const bearingToTarget = calculateBearing(latitude, longitude, targetLat, targetLon);

    startCompassListener(compass => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass);
    });

});





function showPopupOnAnimationEnd() {
    const popup = document.querySelector('.popup');
    popup.style.display = 'flex';
}