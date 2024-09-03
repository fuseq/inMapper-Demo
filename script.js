let stepCount = 0;
let lastAlpha = null;
let movementThreshold = 2.5;
let directionMatches = false;
let stepIncreaseAllowed = true;



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
        url: './assets/pin/scene.gltf',
        scale: '2 2 2',
        info: '',
        rotation: '0 90 0',
        position: '0 0 0',
    },
];
// Modelin özelliklerini (ölçek, döndürme, pozisyon) ayarlar ve AR sahnesinde görüntüler
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

    // Create an SVG element and convert it to a data URL
    const svg = `
    <svg width="500" height="400" viewBox="-25 -25 250 250" version="1.1" xmlns="http://www.w3.org/2000/svg">
        <circle id="background-circle" r="90" cx="100" cy="100" fill="transparent" stroke="#e0e0e0" stroke-width="16px" stroke-dasharray="565.48px" stroke-dashoffset="0"></circle>
        <circle id="progress-circle" r="90" cx="100" cy="100" stroke="#76e5b1" stroke-width="16px" stroke-linecap="round" stroke-dashoffset="565.48px" fill="transparent" stroke-dasharray="565.48px">
            <animate attributeName="stroke-dashoffset" from="565.48" to="0" dur="5s" fill="freeze" />
        </circle>
    </svg>
    `;
    const svgDataUrl = 'data:image/svg+xml;base64,' + btoa(svg);

    // Add a plane with the SVG as its texture
    let border = document.createElement('a-image');
    border.setAttribute('src', svgDataUrl);
    border.setAttribute('width', '24'); // Increase width to make the SVG larger
    border.setAttribute('height', '12'); // Increase height to make the SVG larger
    border.setAttribute('position', '0 2 0'); // Adjust position
    border.setAttribute('rotation', '0 0 0'); // Adjust rotation

    // Append the border to the entity
    entity.appendChild(border);
}

// Yerleri sahnede render eder (görüntüler)
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
// İki koordinat arasındaki yönü hesaplar
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}
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
function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const directionIndicator = document.getElementById('direction-indicator');
    const progressFrame = document.getElementById('progress-frame');
    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;
    if (direction < 50 || direction > 300) {
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


// Kullanıcının konumunu izler ve hedefe göre yön hesaplar
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
        const directionToTurn = (bearingToTarget - alpha + 180 + 360) % 360; // 180 derece ekleyin
        showArrow(directionToTurn);

        lastAlpha = alpha;
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