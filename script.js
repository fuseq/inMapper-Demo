let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 2.5;
let directionMatches = false;
let stepIncreaseAllowed = true;
let initialAlpha = null; // Variable to store the initial heading

window.onload = () => {
    // Load places and start distance check on page load
    let places = staticLoadPlaces(window.coords);
    renderPlaces(places);

    startDistanceCheck(window.coords);

    // Initialize initialAlpha to 0 degrees
    initialAlpha = 0; // Default initial heading
};

// Load static places with predefined latitude and longitude values
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
        rotation: '0 90 0',
        position: '0 0 0',
    },
];

var modelIndex = 0;

function setModel(model, entity) {
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

    const svg = `
    <svg width="500" height="400" viewBox="-25 -25 250 250" version="1.1" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(-90deg)">
        <circle r="90" cx="100" cy="100" fill="transparent" stroke="#e0e0e0" stroke-width="16px" stroke-dasharray="565.48px" stroke-dashoffset="0"></circle>
        <circle r="90" cx="100" cy="100" stroke="#76e5b1" stroke-width="16px" stroke-linecap="round" stroke-dashoffset="118.692px" fill="transparent" stroke-dasharray="565.48px"></circle>
    </svg>
    `;
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svg);

    let border = document.createElement('a-image');
    border.setAttribute('src', svgDataUrl);
    border.setAttribute('width', '24');
    border.setAttribute('height', '12');
    border.setAttribute('position', '0 2 0');
    border.setAttribute('rotation', '0 0 0');

    entity.appendChild(border);
}

function renderPlaces(places) {
    let scene = document.querySelector('a-scene');

    places.forEach((place) => {
        let latitude = place.location.lat;
        let longitude = place.location.lng;

        let model = document.createElement('a-entity');
        model.setAttribute('gps-entity-place', `latitude: ${latitude}; longitude: ${longitude};`);

        setModel(models[modelIndex], model);

        model.removeAttribute('animation-mixer');

        scene.appendChild(model);
    });
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

function getDirectionFromBearing(bearing) {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
}

function checkModelVisibility(model) {
    const modelPosition = model.object3D.position;
    const camera = document.querySelector('a-camera').object3D;

    const modelScreenPosition = modelPosition.clone().project(camera);
    return modelScreenPosition.z > 0 && modelScreenPosition.x >= -1 && modelScreenPosition.x <= 1 && modelScreenPosition.y >= -1 && modelScreenPosition.y <= 1;
}

function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const directionIndicator = document.getElementById('direction-indicator');
    const uiBox = document.querySelector('.ui-box');
    const popup = document.querySelector('.popup');

    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;

    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');

    if (direction < 50 || direction > 310) {
        leftArrow.classList.add('fade-out');
        rightArrow.classList.add('fade-out');
        upArrow.classList.add('fade-in');
        directionMatches = true;

        uiBox.classList.add('border-animation');

        uiBox.addEventListener('animationstart', () => {
            const animationDuration = 5000;
            popupTimeout = setTimeout(() => {
                if (!upArrow.classList.contains('fade-out')) {
                    popup.style.display = 'flex';
                }
            }, animationDuration * 0.8);
        }, { once: true });

    } else {
        if (direction > 180) {
            leftArrow.classList.add('fade-out');
            rightArrow.classList.add('fade-in');
        } else {
            leftArrow.classList.add('fade-in');
            rightArrow.classList.add('fade-out');
        }
        upArrow.classList.add('fade-out');
        directionMatches = false;

        uiBox.classList.remove('border-animation');
        clearTimeout(popupTimeout);
        popup.style.display = 'none';
    }
}

function getCompassDirection(alpha) {
    if (alpha >= 337.5 || alpha < 22.5) return 'N';
    if (alpha >= 22.5 && alpha < 67.5) return 'NE';
    if (alpha >= 67.5 && alpha < 112.5) return 'E';
    if (alpha >= 112.5 && alpha < 157.5) return 'SE';
    if (alpha >= 157.5 && alpha < 202.5) return 'S';
    if (alpha >= 202.5 && alpha < 247.5) return 'SW';
    if (alpha >= 247.5 && alpha < 292.5) return 'W';
    if (alpha >= 292.5 && alpha < 337.5) return 'NW';
}

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

    window.addEventListener('deviceorientation', event => {
        const alpha = event.alpha;

        if (initialAlpha === null) {
            initialAlpha = alpha; // Set initial alpha to the first detected value
        }

        const directionElement = document.getElementById('direction');
        const adjustedAlpha = (alpha - initialAlpha + 360) % 360;
        const direction = getCompassDirection(adjustedAlpha);
        directionElement.textContent = direction;
        const directionToTurn = (bearingToTarget - adjustedAlpha + 180 + 360) % 360;
        showArrow(directionToTurn);

        lastAlpha = alpha;
    });
});

window.addEventListener('devicemotion', event => {
    if (directionMatches && event.acceleration && lastAlpha !== null && stepIncreaseAllowed) {
        const acc = event.acceleration;
        const totalAcc = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);

        if (totalAcc > movementThreshold) {
            stepCount++;
            document.getElementById('step-count').textContent = `Steps: ${stepCount}`;
            stepIncreaseAllowed = false;
            setTimeout(() => {
                stepIncreaseAllowed = true;
            }, 1000);
        }
    }
});
