let directionMatches = false;
let isLoading = false;
let currentTargetIndex = 1; // Start with x2 as the initial target
let coordinates = []; // Store all coordinates

document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button');

    const nextTargetButton = document.querySelector('.next-target-button'); // New button
    const bottomContainer = document.querySelector('.bottom-container');

    if (!nextTargetButton) {
        console.error('Next Target Button not found in the DOM');
    }

    centerButton.addEventListener('click', function () {
        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
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
        nextTargetButton.style.display = 'block';
    });

    rightButton.addEventListener('click', function () {
        const aScene = document.querySelector('a-scene');
        if (aScene) {
            aScene.remove();
        }
        bottomContainer.style.height = '100%';
        centerButton.style.display = 'block';
        rightButton.style.display = 'none';
        nextTargetButton.style.display = 'none';
    });


    // Event listener for switching to the next target
    // Event listener for switching to the next target
    nextTargetButton.addEventListener('click', function () {
        console.log('Next Target Button clicked');
        if (coordinates.length < 2) {
            console.warn('Not enough coordinates to switch targets');
            return;
        }
        // Check if we're at the last target
        if (currentTargetIndex >= coordinates.length - 1) {
            console.log('Reached the last target: x' + (currentTargetIndex + 1));
            nextTargetButton.disabled = true; // Disable the button
            return;
        }
        // Increment target index
        currentTargetIndex++;
        console.log(`Switched to target: x${currentTargetIndex + 1}, Coordinates: `, coordinates[currentTargetIndex]);
        // Update navigation with new target
        updateNavigation();
    });
});

function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const encodedCoordinates = params.get('coordinates');

    if (!encodedCoordinates) {
        console.error('No coordinates found in URL');
        return { source: null, target: null };
    }

    // Decode and parse coordinates
    const decodedCoordinates = decodeURIComponent(encodedCoordinates);
    coordinates = JSON.parse(decodedCoordinates); // Store all coordinates globally

    if (coordinates.length < 2) {
        console.error('At least two coordinates are required');
        return { source: null, target: null };
    }

    // Return source (x1, y1) and current target (based on currentTargetIndex)
    return {
        source: coordinates[0], // x1, y1 (first point)
        target: coordinates[currentTargetIndex] // x2, x3, x4, etc.
    };
}

document.addEventListener('DOMContentLoaded', function () {
    const coords = getQueryParams();
    if (coords.source && coords.target) {
        console.log(`Source: x1=${coords.source.x}, y1=${coords.source.y}, Target: x${currentTargetIndex + 1}=${coords.target.x}, y${currentTargetIndex + 1}=${coords.target.y}`);
    }
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

function showArrow(directionToTurn, direction, beta) {
    const arScene = document.querySelector('a-scene');
    if (!arScene) {
        return;
    }
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');

    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    upPerspectiveArrow.classList.remove('fade-in', 'fade-out');

    const upperBound = (directionToTurn + 20) % 360;
    const lowerBound = (directionToTurn - 20 + 360) % 360;

    if ((direction <= upperBound && direction >= lowerBound) ||
        (lowerBound > upperBound && (direction >= lowerBound || direction <= upperBound))) {
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
        isLoading = true;
        progressCircle.style.strokeDashoffset = '0';

        const monitorAnimation = () => {
            const currentOffset = parseFloat(getComputedStyle(progressCircle).strokeDashoffset);
            if (currentOffset === 0) {
                console.log('Animation completed and turned white!');
            } else {
                requestAnimationFrame(monitorAnimation);
            }
        };
        requestAnimationFrame(monitorAnimation);
    } else {
        const clockwise = (directionToTurn - direction + 360) % 360;
        const counterclockwise = (direction - directionToTurn + 360) % 360;

        if (clockwise <= counterclockwise) {
            leftArrow.classList.add('fade-out');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
            rightArrow.classList.add('fade-in');
        } else {
            leftArrow.classList.add('fade-in');
            upArrow.classList.remove('fade-in');
            upPerspectiveArrow.classList.remove('fade-in');
            rightArrow.classList.add('fade-out');
        }
        directionMatches = false;
        container.classList.remove('grow');
        progressCircle.style.strokeDashoffset = '283';
    }
}

function onTransitionEnd() {
    const progressCircle = document.querySelector('.progress');
    if (progressCircle.style.strokeDashoffset === '0') {
        console.log('Animation completed and turned white!');
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
        callback(compass, e.beta);
    };

    const webkitListener = (e) => {
        let compass = e.webkitCompassHeading;
        if (compass != null && !isNaN(compass)) {
            callback(compass, e.beta);
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
    const R = 6371e3;
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

// New function to update navigation when target changes
function updateNavigation() {
    const coords = getQueryParams();
    if (!coords.source || !coords.target) {
        console.error('Invalid coordinates for navigation update');
        return;
    }

    const sourceLat = parseFloat(coords.source.x);
    const sourceLon = parseFloat(coords.source.y);
    const targetLat = parseFloat(coords.target.x);
    const targetLon = parseFloat(coords.target.y);

    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);

    startCompassListener((compass, beta) => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass, beta);
    });
}

let positionHistory = [];

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude, accuracy } = position.coords;

    // Get current coordinates
    const coords = getQueryParams();
    if (!coords.source || !coords.target) {
        console.error('Invalid coordinates in geolocation watch');
        return;
    }

    const sourceLat = parseFloat(coords.source.x);
    const sourceLon = parseFloat(coords.source.y);
    const targetLat = parseFloat(coords.target.x);
    const targetLon = parseFloat(coords.target.y);

    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);

    startCompassListener((compass, beta) => {
        const directionToTurn = (bearingToTarget + 360) % 360;
        showArrow(directionToTurn, compass, beta);
    });

    if (typeof accuracy === 'undefined' || accuracy === null) {
        console.warn('Accuracy information not available, using default value.');
        accuracy = 10;
    }

    if (accuracy > 10) {
        console.warn('Position data not accurate enough:', accuracy);
        return;
    }

    positionHistory.push({ latitude, longitude });
    if (positionHistory.length > 5) {
        positionHistory.shift();
    }
}, error => {
    console.error('Geolocation error:', error);
}, { enableHighAccuracy: true });