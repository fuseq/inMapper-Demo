let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 1;
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

    const arScene = document.querySelector('a-scene');
    if (!arScene) {
        return;
    }

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
    const directionIndicator = document.getElementById('direction-indicator');
    const popup = document.querySelector('.popup');

    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    // Direction bilgisi ekranında güncelleniyor
    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;

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

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const sourceLat = parseFloat(window.coords.x1);
    const sourceLon = parseFloat(window.coords.y1);
    const targetLat = parseFloat(window.coords.x2);
    const targetLon = parseFloat(window.coords.y2);
    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);

    startCompassListener((compass, beta) => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass, beta); // beta değerini gönder
    });
});

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

