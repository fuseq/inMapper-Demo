let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 2.5;
let directionMatches = false;
let stepIncreaseAllowed = true;
let isLoading = false;


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
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const directionIndicator = document.getElementById('direction-indicator');
    const popup = document.querySelector('.popup');

    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    // Direction bilgisi ekranında güncelleniyor
    directionIndicator.innerText = `Direction: ${beta.toFixed(2)}`;

    // Okların görünürlüğünü sıfırlama
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');

    const upperBound = (directionToTurn + 10) % 360;
    const lowerBound = (directionToTurn - 10 + 360) % 360;

    // Eğer yön directionToTurn ile ±10 derece arasındaysa
    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {
        // Yön doğru, up-arrow görünecek
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
        upArrow.classList.add('fade-in');
        directionMatches = true;
        container.classList.add('grow');
        isLoading = true; // Yükleme başladı
        progressCircle.style.strokeDashoffset = '0';

        // Burada animasyonun bitişini dinleyelim
        progressCircle.addEventListener('transitionend', () => {
            // strokeDashoffset kontrolü ile sadece animasyon beyaza döndüğünde tetiklenir
            if (progressCircle.style.strokeDashoffset === '0') {
                console.log('Animasyon tamamlandı ve beyaza döndü!');
                popup.style.display = 'block';
            }
        });

    } else {
        // Eğer yön directionToTurn ile ±10 derece dışında ise sola veya sağa oklar gösterilecek
        const clockwise = (directionToTurn - direction + 360) % 360;
        const counterclockwise = (direction - directionToTurn + 360) % 360;

        if (clockwise <= counterclockwise) {
            // Sağ ok görünür
            leftArrow.classList.add('fade-out');
            upArrow.classList.add('fade-out');
            rightArrow.classList.add('fade-in');
        } else {
            // Sol ok görünür
            leftArrow.classList.add('fade-in');
            upArrow.classList.add('fade-out');
            rightArrow.classList.add('fade-out');
        }
        directionMatches = false;
        container.classList.remove('grow');
        progressCircle.style.strokeDashoffset = '283'; // Anında sıfırlama
        progressCircle.removeEventListener('transitionend', null); // Eğer animasyon başlamadıysa olayı dinleme
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

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const targetLat = parseFloat(window.coords.x2);
    const targetLon = parseFloat(window.coords.y2);
    const bearingToTarget = calculateBearing(latitude, longitude, targetLat, targetLon);

    startCompassListener((compass, beta) => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass, beta); // beta değerini gönder
    });
});



