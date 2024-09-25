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

    // Update the direction on the UI
    directionIndicator.innerText = `Direction: ${stepCount.toFixed(2)}`;

    // Reset the visibility of the arrows
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    upPerspectiveArrow.classList.remove('fade-in', 'fade-out');

    const upperBound = (directionToTurn + 10) % 360;
    const lowerBound = (directionToTurn - 10 + 360) % 360;

    // Check if the direction is within ±10 degrees of the target direction
    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {

        // The direction is correct, show the appropriate arrow
        if (beta < 30) {
            upPerspectiveArrow.classList.add('fade-in');
            upArrow.classList.remove('fade-in');
        } else {
            upArrow.classList.add('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
        }
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
        directionMatches = true;
        container.classList.add('grow');
        isLoading = true; // Start loading animation
        progressCircle.style.strokeDashoffset = '0';

        // Start monitoring the animation to show popup when complete
        const monitorAnimation = () => {
            const currentOffset = parseFloat(getComputedStyle(progressCircle).strokeDashoffset);
            if (currentOffset === 0) {
                console.log('Animation completed, showing popup!');
                popup.style.display = 'block';
            } else {
                requestAnimationFrame(monitorAnimation);
            }
        };
        requestAnimationFrame(monitorAnimation);

        // Start listening for motion events when the direction is correct
        startMotionListener();

    } else {
        // The direction is incorrect, show left or right arrows
        const clockwise = (directionToTurn - direction + 360) % 360;
        const counterclockwise = (direction - directionToTurn + 360) % 360;

        if (clockwise <= counterclockwise) {
            rightArrow.classList.add('fade-in');
            leftArrow.classList.add('fade-out');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
        } else {
            leftArrow.classList.add('fade-in');
            rightArrow.classList.add('fade-out');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
        }
        directionMatches = false;
        container.classList.remove('grow');
        progressCircle.style.strokeDashoffset = '283'; // Reset the loading circle
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

function startMotionListener() {
    window.addEventListener('devicemotion', (event) => {
        const acc = event.acceleration;
        if (acc && directionMatches) { // Sadece doğru yöne dönülmüşse
            const speed = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

            // Eğer hız belirlenen eşikten büyükse ve adım artırılmasına izin veriliyorsa
            if (speed > speedThreshold && stepIncreaseAllowed) {
                stepCount++;
                console.log(`Adım Sayısı: ${stepCount}`);

                // Adım artırıldıktan sonra kısa bir süre artırmayı engelle
                stepIncreaseAllowed = false;
                setTimeout(() => {
                    stepIncreaseAllowed = true;
                }, 500); // 0.5 saniye sonra tekrar izin ver
            }
        }
    });
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



