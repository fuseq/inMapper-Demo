window.onload = () => {
    const button = document.querySelector('button[data-action="change"]');
    button.innerText = '﹖';

    let places = staticLoadPlaces(window.coords); // Koordinatları kullanarak yerleri yükle
    renderPlaces(places);
};

function staticLoadPlaces(coords) {
    return [
        {
            name: 'Station-1',
            location: {
                lat: parseFloat(coords.x2), 
                lng: parseFloat(coords.y2)  
            },
        },
      
    ];
}

var models = [
    {
        url: './assets/pin.gltf',
        scale: '5 5 5',
        info: 'Park',
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
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

function showArrow(direction) {
    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const directionIndicator = document.getElementById('direction-indicator');

    directionIndicator.innerText = `Direction: ${direction.toFixed(2)}`;
    if (direction < 20 || direction > 340) {
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'none';
    } else if (direction > 180) {
        leftArrow.style.display = 'none';
        rightArrow.style.display = 'block';
    } else {
        leftArrow.style.display = 'block';
        rightArrow.style.display = 'none';
    }
}

navigator.geolocation.watchPosition(position => {
    const { latitude, longitude } = position.coords;
    const targetLat = coords.x2;
    const targetLon = coords.y2;
    const bearingToTarget = calculateBearing(latitude, longitude, targetLat, targetLon);

    window.addEventListener('deviceorientation', event => {
        const alpha = event.alpha;
        const directionToTurn = (bearingToTarget - alpha + 360) % 360;
        showArrow(directionToTurn);
    });
});
