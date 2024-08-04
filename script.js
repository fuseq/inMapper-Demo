window.onload = () => {
    const button = document.querySelector('button[data-action="change"]');
    button.innerText = '﹖';

    let places = staticLoadPlaces(window.coords); 
    renderPlaces(places);
    calculateAndShowDirection(window.coords);
};

function staticLoadPlaces(coords) {
    return [
        {
            name: 'Park',
            location: {
                lat: parseFloat(coords.x1), 
                lng: parseFloat(coords.y1)  
            },
        },
      
    ];
}

var models = [
    {
        url: './assets/pin.gltf',
        scale: '0.5 0.5 0.5',
        info: 'Park',
        rotation: '0 180 0',
    },
    {
        url: './assets/other.gltf',
        scale: '0.5 0.5 0.5',
        info: 'Diğer Yer',
        rotation: '0 180 0',
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

        model.setAttribute('animation-mixer', '');

        document.querySelector('button[data-action="change"]').addEventListener('click', function () {
            var entity = document.querySelector('[gps-entity-place]');
            modelIndex++;
            var newIndex = modelIndex % models.length;
            setModel(models[newIndex], entity);
        });

        scene.appendChild(model);
    });
}

function calculateBearing(lat1, lon1, lat2, lon2) {
    const toRadians = degrees => degrees * Math.PI / 180;
    const toDegrees = radians => radians * 180 / Math.PI;

    const φ1 = toRadians(lat1);
    const φ2 = toRadians(lat2);
    const Δλ = toRadians(lon2 - lon1);

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);

    return (toDegrees(θ) + 360) % 360; 
}

function calculateAndShowDirection(coords) {
    const sourceLat = parseFloat(coords.x1);
    const sourceLon = parseFloat(coords.y1);
    const targetLat = parseFloat(coords.x2);
    const targetLon = parseFloat(coords.y2);
    const bearingToTarget = calculateBearing(sourceLat, sourceLon, targetLat, targetLon);

    window.addEventListener('deviceorientation', event => {
        const alpha = event.alpha;
        const directionToTurn = (bearingToTarget - alpha + 360) % 360;
        showArrow(directionToTurn);
    });
}

function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');

    if (direction < 180) {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'none';
    } else {
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'block';
    }

    document.getElementById('direction-indicator').innerText = `Direction: ${direction}`;
}
