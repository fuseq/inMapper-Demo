let directionMatches = false;
let isLoading = false;
let watchPositionId = null; // To store the watchPosition ID for clearing
let deviceOrientationListener = null; // To store the device orientation listener function

// Store all coordinates and the index of the current target point
let allCoords = [];
let currentTargetIndex = 1; // Start with the second point (index 1) as the first target

// --- DOMContentLoaded for UI button logic ---
document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button'); // Assuming this is your AR toggle button
    const okButton = document.querySelector('.btn-ok'); // Assuming this is a dismiss/confirm button
    const bottomContainer = document.querySelector('.bottom-container');
    // Let's get a reference to the a-scene outside the click listeners
    let aScene = document.querySelector('a-scene'); // May not exist initially

    // Check if AR scene exists on load and adjust UI
    if (aScene) {
        bottomContainer.style.height = '40%';
        if (centerButton) centerButton.style.display = 'none';
        if (rightButton) rightButton.style.display = 'block';
    } else {
        bottomContainer.style.height = '100%';
        if (centerButton) centerButton.style.display = 'block';
        if (rightButton) rightButton.style.display = 'none';
    }


    // This button seems to initiate AR view
    if (centerButton) {
        centerButton.addEventListener('click', function () {
            // If scene doesn't exist, create and add it
            if (!document.querySelector('a-scene')) {
                aScene = document.createElement('a-scene');
                aScene.setAttribute('vr-mode-ui', 'enabled: false');
                aScene.style.position = 'absolute';
                aScene.style.top = '0';
                aScene.style.left = '0';
                aScene.style.width = '100%';
                aScene.style.height = '100%';
                aScene.style.zIndex = '1'; // Z-index adjustment
                document.body.appendChild(aScene);
                console.log('AR scene created');
            }

            // Adjust UI after entering AR mode
            bottomContainer.style.height = '40%';
            centerButton.style.display = 'none';
            if (rightButton) rightButton.style.display = 'block';
            // Potentially start AR related processes here if not already running
            // startNavigationProcess(); // Example function
        });
    }


    // This button seems to exit AR view
    if (rightButton) {
        rightButton.addEventListener('click', function () {
            const currentAScene = document.querySelector('a-scene');
            if (currentAScene) {
                currentAScene.remove();
                aScene = null; // Clear the reference
                console.log('AR scene removed');
            }

            // Adjust UI after exiting AR mode
            bottomContainer.style.height = '100%'; // bottomContainer full height
            if (centerButton) centerButton.style.display = 'block'; // show centerButton again
            rightButton.style.display = 'none'; // hide rightButton
            // Potentially stop AR related processes here
            // stopNavigationProcess(); // Example function
        });
    }

});

// --- Coordinate Handling ---
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const encodedCoordinates = params.get('coordinates');

    if (!encodedCoordinates) {
        console.error("Koordinat bilgisi URL'de bulunamadı.");
        return []; // Return empty array if no coordinates
    }

    try {
        const decodedCoordinates = decodeURIComponent(encodedCoordinates);
        const coordinates = JSON.parse(decodedCoordinates);

        if (!Array.isArray(coordinates) || coordinates.length < 2) {
            console.error("Geçersiz koordinat formatı veya yeterli nokta yok.");
            return []; // Return empty array if invalid format or less than 2 points
        }

        // Return the full array of coordinates
        return coordinates;

    } catch (e) {
        console.error("Koordinatları çözerken hata oluştu:", e);
        return []; // Return empty array on error
    }
}

// --- Initial Load & Data Setup ---
document.addEventListener('DOMContentLoaded', function () {
    allCoords = getQueryParams(); // Get all coordinates

    if (allCoords.length < 2) {
        console.error("Navigasyon için en az iki koordinat gerekli.");
        // Disable AR button or show error message to user
        const arButton = document.getElementById('ar-button'); // Assuming you still have an AR button somewhere
        if (arButton) {
            arButton.style.display = 'none';
        }
        return; // Stop if not enough coordinates
    }

    // Initialize currentTargetIndex. It points to the *next* coordinate after the user's assumed start.
    // If user starts near allCoords[0], the first target is allCoords[1].
    // If user somehow starts near allCoords[i], the target will be allCoords[i+1].
    // For simplicity, we assume user starts near allCoords[0] and the first target is allCoords[1].
    currentTargetIndex = 1;

    console.log(`Toplam ${allCoords.length} koordinat yüklendi.`);
    console.log("İlk hedef:", allCoords[currentTargetIndex]);

    // Start the core navigation process which includes geolocation and compass
    startNavigationProcess();
});


// --- Navigation Core ---
function startNavigationProcess() {
    // Ensure geolocation is available
    if (!navigator.geolocation) {
        console.error('Cihazınız coğrafi konumu desteklemiyor.');
        alert('Cihazınız coğrafi konumu desteklemiyor.');
        return;
    }

    // Ensure Device Orientation (for compass) is available
    if (!window.DeviceOrientationEvent) {
        console.warn("Cihazınız pusula bilgisini desteklemiyor veya izin verilmedi.");
        // You might still proceed but without arrow guidance
    }


    // Start watching position
    watchPositionId = navigator.geolocation.watchPosition(handlePositionUpdate, handlePositionError, { enableHighAccuracy: true });

    // Start compass listener (permission request is handled inside)
    startCompassListener(handleDeviceOrientationUpdate);
}

function stopNavigationProcess() {
    // Stop watching position
    if (watchPositionId !== null) {
        navigator.geolocation.clearWatch(watchPositionId);
        watchPositionId = null;
        console.log("Geolocation watch stopped.");
    }

    // Stop device orientation listener
    if (deviceOrientationListener) {
        window.removeEventListener("deviceorientationabsolute", deviceOrientationListener);
        window.removeEventListener("deviceorientation", deviceOrientationListener); // For webkit/fallback
        deviceOrientationListener = null;
        console.log("Device orientation listener stopped.");
    }

    // Optional: Reset UI or show a completion message
}


function handlePositionUpdate(position) {
    const { latitude, longitude, accuracy } = position.coords;

    const centerButton = document.querySelector('.center-button'); // Get button reference here

    // Default accuracy if not available
    const effectiveAccuracy = (typeof accuracy === 'undefined' || accuracy === null) ? 10 : accuracy;
    if (effectiveAccuracy > 15) { // Increased tolerance slightly
        console.warn('Konum doğruluğu düşük:', effectiveAccuracy, 'm. Navigasyon geçici olarak bekletiliyor.');
        // You might want to hide arrows or show a "Poor GPS" message
        // Also, prevent target switching on low accuracy
        return;
    }


    // Update position history for averaging (keeps last 5 points)
    positionHistory.push({ latitude, longitude });
    if (positionHistory.length > 5) {
        positionHistory.shift(); // Remove the oldest point
    }

    // Calculate average position
    const averageLat = positionHistory.reduce((sum, pos) => sum + pos.latitude, 0) / positionHistory.length;
    const averageLon = positionHistory.reduce((sum, pos) => sum + pos.longitude, 0) / positionHistory.length;

    // --- Get Current Target ---
    // Check if we have reached the end
    if (currentTargetIndex >= allCoords.length) {
        console.log("Hedefe ulaşıldı!");
        alert("Hedefe ulaşıldı!"); // Notify user
        stopNavigationProcess(); // Stop listeners
        // Potentially redirect or show a completion screen
        return; // Stop processing position updates
    }

    const currentTarget = allCoords[currentTargetIndex];
    const targetLat = currentTarget.x; // Assuming x is Latitude based on original getQueryParams structure
    const targetLon = currentTarget.y; // Assuming y is Longitude


    // --- Calculate Distance to Current Target ---
    const distanceFromTarget = calculateDistance(averageLat, averageLon, targetLat, targetLon);
    const distanceThreshold = 10; // meters


    console.log(`Güncel Konum: Lat=${averageLat.toFixed(6)}, Lon=${averageLon.toFixed(6)}. Hedefe Uzaklık: ${distanceFromTarget.toFixed(2)} m`);


    // --- Target Switching Logic ---
    if (distanceFromTarget <= distanceThreshold) {
        console.log(`Hedef Nokta ${currentTargetIndex + 1} (${targetLat}, ${targetLon})'a ulaşıldı (±${distanceThreshold}m).`);

        // Advance to the next target IF it exists
        if (currentTargetIndex < allCoords.length - 1) {
            currentTargetIndex++;
            const nextTarget = allCoords[currentTargetIndex];
            console.log(`Yeni hedef: Nokta ${currentTargetIndex + 1} (${nextTarget.x}, ${nextTarget.y})`);
            // Optional: Provide visual/audio feedback for target switch
        } else {
            // Reached the last point
            console.log("Son hedefe ulaşıldı!");
            alert("Rota tamamlandı!");
            stopNavigationProcess();
            // Maybe redirect user or show final screen
            return; // Stop further processing
        }
    }

    // --- Center Button Visibility Logic ---
    // Show button if OUTSIDE threshold distance from current target
    // Hide button if INSIDE threshold distance from current target
    if (centerButton) {
        if (distanceFromTarget > distanceThreshold) {
            centerButton.style.display = 'block'; // Show the button
        } else {
            centerButton.style.display = 'none'; // Hide the button
        }
    }


    // --- Calculate Bearing to Current Target ---
    // Calculate bearing from user's *current* average location to the *current* target point
    const bearingToTarget = calculateBearing(averageLat, averageLon, targetLat, targetLon);

    // The compass listener, once started, will continuously call handleDeviceOrientationUpdate.
    // We just need to ensure it's started once.
    // The bearingToTarget calculation is done here on each position update,
    // and showArrow will be called from handleDeviceOrientationUpdate with the latest bearing.
    // We don't need to call showArrow directly here.

    // Ensure compass listener is running (it's started once in startNavigationProcess)
    // handleDeviceOrientationUpdate will use the latest bearingToTarget stored in the closure or a global var.
    // Let's pass it to the orientation handler via a shared variable or update logic within the handler.
    // A simpler way is to update the arrow logic within the position handler if we don't need continuous orientation updates when stationary.
    // But the original code uses a continuous compass listener, so let's stick to that pattern.
    // We need to make the latest bearingToTarget available to handleDeviceOrientationUpdate.

    window.latestBearingToTarget = bearingToTarget; // Make it accessible globally or via closure if possible
}

function handlePositionError(error) {
    console.error('Geolocation hatası:', error.message);
    let errorMessage = 'Konum alınamadı.';
    switch (error.code) {
        case error.PERMISSION_DENIED:
            errorMessage = 'Konum izni reddedildi. Lütfen cihaz ayarlarınızdan izni etkinleştirin.';
            break;
        case error.POSITION_UNAVAILABLE:
            errorMessage = 'Konum bilgisi mevcut değil.';
            break;
        case error.TIMEOUT:
            errorMessage = 'Konum alım isteği zaman aşımına uğradı.';
            break;
        case error.UNKNOWN_ERROR:
            errorMessage = 'Bilinmeyen bir konum hatası oluştu.';
            break;
    }
    alert(errorMessage);
    // Consider stopping navigation if critical error
    stopNavigationProcess();
}


// --- Compass/Orientation Handling ---
// This function is called by the compass listener whenever device orientation changes
function handleDeviceOrientationUpdate(compass, beta) {
    // Use the latest bearing calculated from the position handler
    const bearingToTarget = window.latestBearingToTarget; // Access the latest bearing

    // Check if bearingToTarget is available (position update might not have happened yet or errored)
    if (typeof bearingToTarget === 'undefined' || isNaN(bearingToTarget)) {
        // console.warn("Pusula güncellemesi için hedef yön bilgisi bekleniyor...");
        // Optionally hide arrows or show a waiting indicator
        return;
    }

    const directionToTurn = (bearingToTarget + 360) % 360;
    showArrow(directionToTurn, compass, beta);
}


function startCompassListener(callback) {
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API not available");
        return;
    }

    // Define the listener function once
    deviceOrientationListener = (e) => {
        // Prefer absolute orientation if available and accurate
        if (e.absolute && e.alpha != null && e.beta != null && e.gamma != null) {
            let compass = -(e.alpha + e.beta * e.gamma / 90); // Example calculation, may need adjustment based on device/API
            compass -= Math.floor(compass / 360) * 360;
            callback(compass, e.beta);
            // console.log("Using absolute orientation");
        }
        // Fallback for non-absolute or webkit
        else if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) {
            callback(e.webkitCompassHeading, e.beta); // Use webkitCompassHeading directly
            // console.log("Using webkitCompassHeading");
        }
        // Generic orientation (alpha only, less reliable as true north)
        else if (e.alpha != null) {
            let compass = 360 - e.alpha; // Basic alpha calculation
            callback(compass, e.beta);
            // console.log("Using alpha orientation");
        } else {
            console.warn("Device orientation data not sufficient.");
        }
    };


    function addListeners() {
        // Try adding both, one might fire based on device/browser support
        window.addEventListener("deviceorientationabsolute", deviceOrientationListener, true); // Use capture phase?
        window.addEventListener("deviceorientation", deviceOrientationListener, true);
        console.log("Device orientation listeners added.");
    }

    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === "granted") {
                    addListeners();
                } else {
                    console.warn("Permission for DeviceOrientationEvent not granted");
                    alert("Pusula yönlendirmesi için hareket sensörleri izni gerekli.");
                    // You might disable compass-based features here
                }
            })
            .catch(error => {
                console.error("Error requesting permission:", error);
                alert("Hareket sensörleri izni istenirken bir hata oluştu.");
                // You might disable compass-based features here
            });
    } else {
        // Handle non-iOS 13+ devices
        addListeners();
    }
}


// Yönlendirme oklarını ve doğru yön indikatörünü gösterir
function showArrow(directionToTurn, currentCompassDirection, beta) {
    // Ensure AR scene is present before trying to show arrows within it
    const arScene = document.querySelector('a-scene');
    if (!arScene) {
        // console.warn("AR scene not active, hiding arrows.");
        // Maybe hide all arrows explicitly if scene is removed?
        const arrows = document.querySelectorAll('.container .arrow, .container .arrow-perspective, .progress');
        arrows.forEach(arrow => arrow.classList.remove('fade-in', 'fade-out'));
        return;
    }

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');

    const container = document.querySelector('.container'); // The circle/arrow container
    const progressCircle = document.querySelector('.progress'); // The SVG circle for progress

    // Ensure all arrow elements exist
    if (!leftArrow || !rightArrow || !upArrow || !upPerspectiveArrow || !container || !progressCircle) {
        console.error("Arrow or container elements not found!");
        return;
    }


    // Calculate difference and normalize to -180 to +180
    let diff = directionToTurn - currentCompassDirection;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Define tolerance angle (e.g., ±15 degrees)
    const tolerance = 15;

    // Check if current direction is within tolerance of the target direction
    if (Math.abs(diff) <= tolerance) {
        // Yön doğru (within tolerance)
        if (beta < 30) { // Assuming beta relates to tilt (0=flat, 90=vertical) - check your sensor data
            // Tilted up / looking towards horizon or above - show perspective arrow?
            upPerspectiveArrow.classList.add('fade-in');
            upArrow.classList.remove('fade-in'); // Ensure other up arrow is hidden
        } else {
            // More vertical tilt / looking down - show standard up arrow?
            upArrow.classList.add('fade-in');
            upPerspectiveArrow.classList.remove('fade-in'); // Ensure perspective arrow is hidden
        }
        leftArrow.classList.remove('fade-in'); // Hide turn arrows
        rightArrow.classList.remove('fade-in');

        // Start/continue loading animation only if not already matched
        if (!directionMatches) {
            directionMatches = true;
            console.log("Yön eşleşti! (%d° ±%d°)", directionToTurn.toFixed(0), tolerance);
            container.classList.add('grow'); // Start grow animation
            // Reset and start progress circle animation
            progressCircle.style.transition = 'none'; // Remove transition temporarily
            progressCircle.style.strokeDashoffset = '283'; // Reset to full circle
            // Use a tiny timeout to re-enable transition and start animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    progressCircle.style.transition = 'stroke-dashoffset 3s linear'; // 3s animation
                    progressCircle.style.strokeDashoffset = '0'; // Animate to full
                });
            });
        }


    } else {
        // Yön yanlış (outside tolerance)
        directionMatches = false; // Reset match state
        container.classList.remove('grow'); // Stop grow animation
        progressCircle.style.transition = 'none'; // Stop and reset progress animation instantly
        progressCircle.style.strokeDashoffset = '283'; // Reset to full circle

        // Determine which way to turn (left or right)
        if (diff > tolerance) {
            // Need to turn left
            leftArrow.classList.add('fade-in');
            rightArrow.classList.remove('fade-in'); // Hide right arrow
        } else { // diff < -tolerance
            // Need to turn right
            rightArrow.classList.add('fade-in');
            leftArrow.classList.remove('fade-in'); // Hide left arrow
        }
        // Hide up arrows when turning
        upArrow.classList.remove('fade-in');
        upPerspectiveArrow.classList.remove('fade-in');
    }
}

// Placeholder for the transition end handler (might be needed for grow animation)
function onTransitionEnd(event) {
    // You can use event.propertyName to check which transition ended (e.g., 'transform' for grow)
    // if (event.propertyName === 'transform' && directionMatches) {
    //     console.log('Container grow animation ended while direction matched.');
    //     // Potentially trigger something here if needed after growing
    // }

    // Logic specifically for the progress circle completing its animation
    const progressCircle = document.querySelector('.progress');
    if (progressCircle && event.target === progressCircle && event.propertyName === 'stroke-dashoffset') {
        if (progressCircle.style.strokeDashoffset === '0px') { // Check for the final state
            console.log('Progress circle animation completed!');
            // THIS is where you might confirm arrival if directionMatches was true
            // However, the primary arrival trigger is the distance check in handlePositionUpdate,
            // which is more reliable than relying solely on the animation finishing.
            // This handler is useful if you want to show a final confirmation state after the circle fills.
        }
    }
}

// Add event listener for transition end on the container (or specific elements)
document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');
    if (container) container.addEventListener('transitionend', onTransitionEnd);
    if (progressCircle) progressCircle.addEventListener('transitionend', onTransitionEnd);
});


// --- Utility Functions (Keep as is) ---
function calculateBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    lat1 = lat1 * Math.PI / 180;
    lat2 = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    const brng = Math.atan2(y, x) * (180 / Math.PI);
    return (brng + 360) % 360;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Distance in meters
    return distance;
}

// Array to store recent positions for averaging
let positionHistory = [];

// Store the latest bearing to target globally or accessible by closure
window.latestBearingToTarget = 0; // Initialize


// The rest of your script.js file (like AR object placement if any) would go here.
// Make sure your CSS includes the styles for the arrows, the container,
// the grow class animation, and the progress circle animations.