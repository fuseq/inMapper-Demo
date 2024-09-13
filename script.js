let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 2.5;
let directionMatches = false;
let stepIncreaseAllowed = true;
let direction
window.onload = () => {
    // Sayfa yüklendiğinde yerleri yükler ve mesafe kontrolünü başlatır
    let places = staticLoadPlaces(window.coords);
    renderPlaces(places);
    startDistanceCheck(window.coords);
};

// Statik yerleri, önceden tanımlanmış enlem ve boylam değerleriyle yükler
function staticLoadPlaces() {
    return [
        {
            name: 'Pin',
            location: {
                lat: window.coords.x2,
                lng: window.coords.y2,
            },
        },
    ];
}

var models = [
    {
        url: './assets/ileri.png', // PNG image
        scale: '25 15 15',
        info: '',
        // Adjust the rotation to tilt the image
        rotation: '-30 -45 -60', // Tilt the image 30 degrees forward (on the X-axis)
        position: '0 0 0',
    },
];
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}
// Rotasyon hesaplama fonksiyonu (örnek olarak)
function calculateRotation() {
    const sourceLat = parseFloat(window.coords.x1);
    const sourceLon = parseFloat(window.coords.y1);
    const targetLat = parseFloat(window.coords.x2);
    const targetLon = parseFloat(window.coords.y2);
    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);
    let rotationX = 70;
    let rotationY = bearingToTarget+50;
    let rotationZ = 0;

    return `${rotationX} ${rotationY} ${rotationZ}`;
}

// Modelin özelliklerini (ölçek, döndürme, pozisyon) ayarlar ve AR sahnesinde görüntüler
var modelIndex = 0;
function setModel(model, entity, rotation) {
    if (model.scale) {
        entity.setAttribute('scale', model.scale);
    }
    if (rotation) {
        entity.setAttribute('rotation', rotation);
    } else if (model.rotation) {
        entity.setAttribute('rotation', model.rotation);
    }
    if (model.position) {
        entity.setAttribute('position', model.position);
    }
    // Use an <a-image> for displaying the PNG
    entity.setAttribute('src', model.url);
}

// Yerleri sahnede render eder (görüntüler)
function renderPlaces(places) {
    let scene = document.querySelector('a-scene');
    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;
        let rotation = calculateRotation();
        
        // Create an <a-image> instead of <a-entity>
        let model = document.createElement('a-image');
        model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);
        setModel(models[modelIndex], model, rotation);
        scene.appendChild(model);
    });
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
    const directionIndicator = document.getElementById('direction-indicator');
    const uiBox = document.querySelector('.ui-box');
    const popup = document.querySelector('.popup'); 
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');
    // Direction bilgisi ekranında güncelleniyor
    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;

    // Animasyonları kaldırmak için önce tüm okların animasyon sınıflarını temizle
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');

    // Yukarı yön oku (±50 derece içinde)
    const upperBound = (directionToTurn + 10) % 360;
    const lowerBound = (directionToTurn - 10 + 360) % 360;

    // Eğer yön directionToTurn ile ±50 derece arasındaysa
    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {
        // Yön 50'den küçük veya 300'den büyükse, sadece up-arrow görünecek
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
       
        directionMatches = true;

        // Border animasyonunu başlat
        uiBox.classList.add('border-animation');

        uiBox.addEventListener('animationend', () => {
            // Popup'ı hemen göster
            popup.style.display = 'flex';
        }, { once: true });
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
function getCompassDirection(alpha) {
    // Assuming alpha is in degrees and ranges from 0 to 360
    // You can adjust these conditions based on your specific requirements
    if (alpha >= 337.5 || alpha < 22.5) return 'N';
    if (alpha >= 22.5 && alpha < 67.5) return 'NE';
    if (alpha >= 67.5 && alpha < 112.5) return 'E';
    if (alpha >= 112.5 && alpha < 157.5) return 'SE';
    if (alpha >= 157.5 && alpha < 202.5) return 'S';
    if (alpha >= 202.5 && alpha < 247.5) return 'SW';
    if (alpha >= 247.5 && alpha < 292.5) return 'W';
    if (alpha >= 292.5 && alpha < 337.5) return 'NW';
}

function startCompassListener(callback) {
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API not available");
        return;
    }

    let lastAlpha = null;
    let alphaSmoothing = 0.1; // Yumuşatma faktörü

    function smoothValue(currentValue, lastValue) {
        return lastValue + (currentValue - lastValue) * alphaSmoothing;
    }

    const handleDeviceOrientation = (e) => {
        if (e.alpha == null || e.beta == null || e.gamma == null) {
            return;
        }

        let alpha = e.alpha;
        if (lastAlpha !== null) {
            alpha = smoothValue(alpha, lastAlpha);
        }
        lastAlpha = alpha;

        // Kompas verilerini işleyin
        let compass = -(alpha + e.beta * e.gamma / 90);
        compass -= Math.floor(compass / 360) * 360;
        callback(compass);
    };

    const handleWebKitCompass = (e) => {
        let compass = e.webkitCompassHeading;
        if (compass != null && !isNaN(compass)) {
            callback(compass);
            window.removeEventListener("deviceorientation", handleWebKitCompass);
        }
    };

    function addListeners() {
        window.addEventListener("deviceorientation", handleDeviceOrientation);
        if (window.DeviceOrientationEvent.requestPermission) {
            window.addEventListener("deviceorientationabsolute", handleDeviceOrientation);
        } else {
            window.addEventListener("deviceorientation", handleWebKitCompass);
        }
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
    const sourceLat = parseFloat(window.coords.x1);
    const sourceLon = parseFloat(window.coords.y1);
    const bearingToTarget = calculateBearing(latitude, longitude, targetLat, targetLon);
    const bearingToSource = calculateBearing(latitude, longitude, sourceLat, sourceLon);
    const positionIndicator = document.getElementById('position-indicator');
    const distanceIndicator = document.getElementById('distance-indicator');
    const directionFromStartIndicator = document.getElementById('direction-from-start-indicator');
    positionIndicator.innerText = `Position: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const distance = calculateDistance(latitude, longitude, sourceLat, sourceLon);
    distanceIndicator.innerText = `Distance: ${distance.toFixed(2)} meters`;
    const directionFromStart = getDirectionFromBearing(bearingToSource);
    directionFromStartIndicator.innerText = `Direction from Start: ${directionFromStart}`;

    startCompassListener(compass => {
        const directionElement = document.getElementById('direction');
        const direction = getCompassDirection(compass);
        const directionToTurn = (bearingToTarget + 360) % 360;
        directionElement.textContent = direction;
        showArrow(directionToTurn, compass);
    });

});
// Cihazın hareketlerini izler ve koşullara göre adım sayısını artırır
window.addEventListener('devicemotion', event => {
    if (directionMatches && event.acceleration && lastAlpha !== null && stepIncreaseAllowed) {
        const acc = event.acceleration;
        const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
        if (totalAcc > movementThreshold) {
            stepCount++;
            console.log(`Adım sayısı: ${stepCount}`);
            document.getElementById('step-counter').innerText = `Adım Sayısı: ${stepCount}`;
            stepIncreaseAllowed = false;
            setTimeout(() => {
                stepIncreaseAllowed = true;
            }, 1000);
        }
    }
});
// İki konum arasındaki mesafeyi hesaplar
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
// Kullanıcının mesafesini sürekli kontrol eder
function startDistanceCheck(coords) {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(function (position) {
            const currentLatitude = position.coords.latitude;
            const currentLongitude = position.coords.longitude;
            const destinationLatitude = parseFloat(coords.x2);
            const destinationLongitude = parseFloat(coords.y2);
            const distance = calculateDistance(currentLatitude, currentLongitude, destinationLatitude, destinationLongitude);
            document.getElementById('distance-indicator').innerText = `Distance: ${distance.toFixed(2)} meters`;
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
    }
}
function onAnimationEnd() {
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
}
directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;
if (direction < 30 || direction > 320) {
    leftArrow.style.display = 'none';
    rightArrow.style.display = 'none';
    progressFrame.style.display = 'block';
    document.getElementById('progress-frame').addEventListener('animationend', onAnimationEnd);
    directionMatches = true;
} else {
    leftArrow.style.display = direction > 180 ? 'none' : 'block';
    rightArrow.style.display = direction > 180 ? 'block' : 'none';
    progressFrame.style.display = 'none';
    directionMatches = false;
}
function onAnimationEnd() {
    const popup = document.getElementById('popup');
    popup.style.display = 'block';
}