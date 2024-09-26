let directionMatches = false;
let isLoading = false;



document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button');
    const okButton = document.querySelector('.btn-ok');
    const bottomContainer = document.querySelector('.bottom-container');
    const popup = document.getElementById('popup');
    const aScene = document.querySelector('a-scene');

  

    centerButton.addEventListener('click', function () {
        // Eğer sahne daha önce eklenmediyse a-scene'i oluşturup ekleyelim
        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
        aScene.style.position = 'absolute';
        aScene.style.top = '0';
        aScene.style.left = '0';
        aScene.style.width = '100%';
        aScene.style.height = '100%';
        aScene.style.zIndex = '1'; // Z-index ayarlama
        document.body.appendChild(aScene);
        bottomContainer.style.height = '40%';
        centerButton.style.display = 'none';
        rightButton.style.display = 'block';
    });

    rightButton.addEventListener('click', function () {
        if (aScene) {
            aScene.remove();
        }
        if (popup) {
            popup.remove();
        }
        bottomContainer.style.height = '100%'; // bottomContainer'ı %100 yap
        centerButton.style.display = 'none'; // centerButton'ı tekrar göster
        rightButton.style.display = 'none'; // rightButton'ı görünür tut
    });

    okButton.addEventListener('click', function () {
        if (aScene) {
            aScene.remove();
        }
        // Popup'ı tamamen kaldır
        if (popup) {
            popup.remove();
        }
        bottomContainer.style.height = '100%';
        centerButton.style.display = 'none';
        rightButton.style.display = 'none';
        // İsteğe bağlı olarak başka işlemler yapılabilir
    });
});

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        x1: params.get('x1'),
        y1: params.get('y1'),
        x2: params.get('x2'),
        y2: params.get('y2')
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const coords = getQueryParams();
    console.log(`Koordinatlar: X1=${coords.x1}, Y1=${coords.y1}, X2=${coords.x2}, Y2=${coords.y2}`);
    window.coords = coords;
});



function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

// Yönlendirme oklarını ve doğru yön indikatörünü gösterir
function showArrow(directionToTurn, direction, beta) {

    const arScene = document.querySelector('a-scene');
    if (!arScene) {
        return;
    }
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
    const popup = document.querySelector('.popup');
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    // Okların görünürlüğünü sıfırlama
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    upPerspectiveArrow.classList.remove('fade-in', 'fade-out');

    const upperBound = (directionToTurn + 10) % 360;
    const lowerBound = (directionToTurn - 10 + 360) % 360;

    // Eğer yön directionToTurn ile ±10 derece arasındaysa
    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {

        // Yön doğru, okları kontrol et
        if (beta < 30) {
            // up-perspective oku görünecek
            upPerspectiveArrow.classList.add('fade-in');
            upArrow.classList.remove('fade-in');
        } else {
            // up-arrow görünecek
            upArrow.classList.add('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
        }
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
        directionMatches = true;
        container.classList.add('grow');
        isLoading = true; // Yükleme başladı
        progressCircle.style.strokeDashoffset = '0';

        // Animasyonu requestAnimationFrame ile takip ediyoruz
        const monitorAnimation = () => {
            const currentOffset = parseFloat(getComputedStyle(progressCircle).strokeDashoffset);

            if (currentOffset === 0) {
                console.log('Animasyon tamamlandı ve beyaza döndü!');
                popup.style.display = 'block';
            } else {
                // Animasyon bitene kadar requestAnimationFrame ile devam et
                requestAnimationFrame(monitorAnimation);
            }
        };

        // Animasyonun başlangıcında requestAnimationFrame ile kontrol başla
        requestAnimationFrame(monitorAnimation);

    } else {
        // Eğer yön directionToTurn ile ±10 derece dışında ise sola veya sağa oklar gösterilecek
        const clockwise = (directionToTurn - direction + 360) % 360;
        const counterclockwise = (direction - directionToTurn + 360) % 360;

        if (clockwise <= counterclockwise) {
            // Sağ ok görünür
            leftArrow.classList.add('fade-out');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
            rightArrow.classList.add('fade-in');
        } else {
            // Sol ok görünür
            leftArrow.classList.add('fade-in');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
            rightArrow.classList.add('fade-out');
        }
        directionMatches = false;
        container.classList.remove('grow');
        progressCircle.style.strokeDashoffset = '283'; // Anında sıfırlama
    }
}

function onTransitionEnd() {
    const progressCircle = document.querySelector('.progress');
    const popup = document.querySelector('.popup');

    // strokeDashoffset kontrolü ile sadece animasyon beyaza döndüğünde tetiklenir
    if (progressCircle.style.strokeDashoffset === '0') {
        console.log('Animasyon tamamlandı ve beyaza döndü!');
        popup.style.display = 'block';
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
        callback(compass, e.beta); // beta değerini gönder
    };

    const webkitListener = (e) => {
        let compass = e.webkitCompassHeading;
        if (compass != null && !isNaN(compass)) {
            callback(compass, e.beta); // beta değerini gönder
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

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Dünya'nın yarıçapı (metre)
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Mesafe (metre cinsinden)
    return distance;
}

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const sourceLat = parseFloat(window.coords.x1);
    const sourceLon = parseFloat(window.coords.y1);
    const targetLat = parseFloat(window.coords.x2);
    const targetLon = parseFloat(window.coords.y2);

    // Kaynaktan hedefe olan yönü hesapla
    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);

    
        const distanceFromSource = calculateDistance(sourceLat, sourceLon, latitude, longitude);
        const distanceThreshold = 20; 
        if (distanceFromSource > distanceThreshold) {
            const centerButton = document.querySelector('.center-button');
            if (centerButton) {
                centerButton.style.display = 'none';
            }
        }
    
    // Pusula yönünü dinleyerek okları göster
    startCompassListener((compass, beta) => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass, beta); // beta değerini gönder
    });
}, error => {
    console.error('Geolocation hatası:', error);
}, { enableHighAccuracy: true });



