let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 2.5; 
let directionMatches = false;
let stepIncreaseAllowed = true;

window.onload = () => {
    // Load places and start distance check
    let places = staticLoadPlaces(window.coords);
    renderPlaces(places);
    startDistanceCheck(window.coords);
};

// Load static places with predefined coordinates
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
        url: './assets/pin/scene.gltf',
        scale: '2 2 2',
        info: '',
        rotation: '0 0 0',
        position: '0 0 0',
    },
];

var modelIndex = 0;

// Set model properties (scale, rotation, position) and display it in the AR scene
var setModel = function (model, entity) {
    if (model.scale) {
        entity.setAttribute('scale', model.scale);
    }
    if (model.rotation) {
        entity.setAttribute('rotation', model.rotation);
    }
    if (model.position) {
        entity.setAttribute('position', model.position);
    }
    entity.setAttribute('gltf-model', model.url);

    const div = document.querySelector('.instructions');
    div.innerText = model.info;
};

// Render places in the scene and add a circular progress bar around each pin
function renderPlaces(places) {
    let scene = document.querySelector('a-scene');

    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;

        let model = document.createElement('a-entity');
        model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);

        setModel(models[modelIndex], model);

        // Add circular progress bar
        let progressCircle = document.createElement('a-entity');
        progressCircle.setAttribute('id', 'progress-circle');
        progressCircle.innerHTML = `
            <a-circle id="progress-background" radius="1.5" color="#CCC" opacity="0.5" position="0 0 -0.01"></a-circle>
            <a-circle id="progress-foreground" radius="1.5" theta-start="0" theta-length="0" color="#4CAF50" opacity="0.8" position="0 0 0"></a-circle>
        `;
        model.appendChild(progressCircle);

        scene.appendChild(model);
    });
}

// Calculate bearing between two coordinates
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

// Convert bearing to compass direction
function getDirectionFromBearing(bearing) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}

// Show arrow and progress bar based on direction
function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const directionIndicator = document.getElementById('direction-indicator');
    const progressFrame = document.getElementById('progress-frame');
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
}

// Track user's position and calculate bearing and distance
navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const targetLat = parseFloat(window.coords.x1);
    const targetLon = parseFloat(window.coords.y1);
    const sourceLat = parseFloat(window.coords.x2);
    const sourceLon = parseFloat(window.coords.y2);
    const bearingToTarget = calculateBearing(latitude, longitude, targetLat, targetLon);
    const bearingToSource = calculateBearing(latitude, longitude, sourceLat, sourceLon);
    const positionIndicator = document.getElementById('position-indicator');
    const distanceIndicator = document.getElementById('distance-indicator');
    const directionFromStartIndicator = document.getElementById('direction-from-start-indicator');

    positionIndicator.innerText = `Position: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    const distance = calculateDistance(latitude, longitude, parseFloat(window.coords.x2), parseFloat(window.coords.y2));
    distanceIndicator.innerText = `Distance: ${distance.toFixed(2)} meters`;
    const directionFromStart = getDirectionFromBearing(bearingToSource);
    directionFromStartIndicator.innerText = `Direction from Start: ${directionFromStart}`;

    if (directionMatches) {
        updateProgressBar(distance / 100); // Update progress bar based on distance
    } else {
        resetProgressBar();
    }
});

function updateProgressBar(increment) {
    const progressCircle = document.querySelector('#progress-foreground');
    let currentThetaLength = parseFloat(progressCircle.getAttribute('theta-length')) || 0;
    let newThetaLength = Math.min(360, currentThetaLength + increment);
    progressCircle.setAttribute('theta-length', newThetaLength);
}

function resetProgressBar() {
    const progressCircle = document.querySelector('#progress-foreground');
    progressCircle.setAttribute('theta-length', 0);
}

// Handle animation end event
function onAnimationEnd() {
    document.getElementById('popup').style.display = 'block';
}

// Calculate distance between two geographical points
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // meters
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

// Initialize and start AR context
function startDistanceCheck(coords) {
    const lat1 = parseFloat(coords.x1);
    const lon1 = parseFloat(coords.y1);
    const lat2 = parseFloat(coords.x2);
    const lon2 = parseFloat(coords.y2);

    navigator.geolocation.watchPosition(position => {
        const { latitude, longitude } = position.coords;
        const distance = calculateDistance(latitude, longitude, lat2, lon2);

        if (distance < 10) {
            document.getElementById('popup').style.display = 'block';
        }
    });
}
