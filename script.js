const video = document.getElementById('video');
const compassInfo = document.getElementById('compassInfo');
const directionInfo = document.getElementById('directionInfo');
const leftArrow = document.getElementById('left-arrow');
const rightArrow = document.getElementById('right-arrow');

// URL'den koordinatları alma
const urlParams = new URLSearchParams(window.location.search);
const x1 = urlParams.get('x1');
const y1 = urlParams.get('y1');
const x2 = urlParams.get('x2');
const y2 = urlParams.get('y2');

const startLat = parseFloat(y1); 
const startLon = parseFloat(y1); 
const targetLat = parseFloat(x2); 
const targetLon = parseFloat(y2); 

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

const bearingToTarget = calculateBearing(startLat, startLon, targetLat, targetLon);
const directionToTurn = (bearingToTarget + 360) % 360;
directionInfo.textContent = `Dönme yönü: ${directionToTurn.toFixed(2)}°`;

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

function updateArrows(compass, directionToTurn) {
    const angleDifference = (directionToTurn - compass + 360) % 360;

    if (angleDifference < 180) {
        rightArrow.style.display = 'block';
        leftArrow.style.display = 'none';
    } else {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'none';
    }
}

startCompassListener(compass => {
    compassInfo.textContent = `Telefonun yönü: ${compass.toFixed(2)}°`;
    updateArrows(compass, directionToTurn);
});

navigator.mediaDevices.getUserMedia({
    video: { facingMode: { exact: "environment" } }
})
.then(stream => {
    video.srcObject = stream;
})
.catch(error => {
    console.error("Kamera açma hatası:", error);
});