let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 1.2; 
let directionMatches = false;
let stepIncreaseAllowed = true;



window.onload = () => {
   

    let places = staticLoadPlaces(window.coords);
    renderPlaces(places);

    startDistanceCheck(window.coords);
};

function staticLoadPlaces() {
    return [
        {
            name: 'Pokèmon',
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
    },
];

var modelIndex = 0;
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

function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const directionIndicator = document.getElementById('direction-indicator');
    const progressFrame = document.getElementById('progress-frame');

    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;

    if (direction < 5 || direction > 300) {
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'none';
        progressFrame.style.display = 'block';
        directionMatches = true;
    } else {
        leftArrow.style.display = direction > 180 ? 'none' : 'block';
        rightArrow.style.display = direction > 180 ? 'block' : 'none';
        progressFrame.style.display = 'none';
        directionMatches = false;
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
    const distance = calculateDistance(latitude, longitude, parseFloat(window.coords.x1), parseFloat(window.coords.y1));
    distanceIndicator.innerText = `Distance: ${distance.toFixed(2)} meters`;
    const directionFromStart = getDirectionFromBearing(bearingToSource);
    directionFromStartIndicator.innerText = `Direction from Start: ${directionFromStart}`;

    window.addEventListener('deviceorientation', event => {
        const alpha = event.alpha;
        const directionToTurn = (bearingToTarget - alpha + 360) % 360;
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
            console.log(`Adım sayısı: ${stepCount}`);
            document.getElementById('step-counter').innerText = `Adım Sayısı: ${stepCount}`;

            stepIncreaseAllowed = false;
            setTimeout(() => {
                stepIncreaseAllowed = true;
            }, 1000); 
        }
    }
});



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
