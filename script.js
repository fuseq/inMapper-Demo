let directionMatches = false;
let isLoading = false;
let allCoords = []; // Variable to store all coordinates
let currentTargetIndex = 1; // Start with the second point (index 1) as the first target
const distanceThreshold = 15; // Distance in meters to consider a point "reached" (adjust as needed)
let currentRequiredBearing = 0; // To store the bearing needed to the current target
let reachedEnd = false; // Flag to indicate if the last point is reached

document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button');
    const okButton = document.querySelector('.btn-ok');
    const bottomContainer = document.querySelector('.bottom-container');

    // Note: aScene is queried here but might not exist initially.
    // The click handler creates it. The rightButton/okButton listeners
    // correctly check if aScene exists before removing.
    const aScene = document.querySelector('a-scene'); // This might be null initially

    centerButton.addEventListener('click', function () {
        // Remove existing a-scene if any (in case of multiple clicks?)
        const existingAScene = document.querySelector('a-scene');
        if (existingAScene) {
             existingAScene.remove();
        }

        // Create and append the new a-scene
        const aScene = document.createElement('a-scene');
        aScene.setAttribute('vr-mode-ui', 'enabled: false');
        aScene.setAttribute('ar-modes', 'webxr-ar-only'); // Use webxr-ar-only for better compatibility
        aScene.setAttribute('renderer', 'logarithmicDepthBuffer: true;'); // Often helpful for AR
        aScene.style.position = 'absolute';
        aScene.style.top = '0';
        aScene.style.left = '0';
        aScene.style.width = '100%';
        aScene.style.height = '100%';
        aScene.style.zIndex = '1'; // Z-index adjustment
        document.body.appendChild(aScene);

        bottomContainer.style.height = '40%';
        centerButton.style.display = 'none';
        rightButton.style.display = 'block';

        // --- Start geolocation and compass listeners ONLY when AR starts ---
        // This assumes you want guidance active only in AR mode
        startARGuidance();
        // -----------------------------------------------------------------
    });

    rightButton.addEventListener('click', function () {
        const aScene = document.querySelector('a-scene'); // Query again as it's created dynamically
        if (aScene) {
            aScene.remove();
        }
        // --- Stop geolocation and compass listeners when AR stops ---
        stopARGuidance();
        // ----------------------------------------------------------

        bottomContainer.style.height = '100%'; // bottomContainer'ı %100 yap
        centerButton.style.display = 'block'; // centerButton'ı tekrar göster
        rightButton.style.display = 'none'; // rightButton'ı görünür tut
    });

    okButton.addEventListener('click', function () {
         const aScene = document.querySelector('a-scene'); // Query again
        if (aScene) {
            aScene.remove();
        }
         // --- Stop geolocation and compass listeners when AR stops ---
        stopARGuidance();
         // ----------------------------------------------------------

        bottomContainer.style.height = '100%';
        centerButton.style.display = 'block';
        rightButton.style.display = 'none';
        // İsteğe bağlı olarak başka işlemler yapılabilir
    });
});

// Modified getQueryParams to return the full array
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const encodedCoordinates = params.get('coordinates');

    if (!encodedCoordinates) {
        console.error("No 'coordinates' parameter found in URL.");
        return []; // Return empty array if no coordinates
    }

    try {
        const decodedCoordinates = decodeURIComponent(encodedCoordinates);
        const coordinates = JSON.parse(decodedCoordinates);
        // Ensure coordinates is an array and has at least 2 points
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
             console.error("Coordinates format is invalid or less than 2 points.");
             return [];
        }
        return coordinates; // Return the full array
    } catch (e) {
        console.error("Error parsing coordinates:", e);
        return [];
    }
}

// Load coordinates when the DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    allCoords = getQueryParams(); // Store all coordinates
    if (allCoords.length > 0) {
        console.log(`Loaded ${allCoords.length} coordinates.`);
        // Initial target is the second point if available
        if (allCoords.length > 1) {
             console.log(`Initial Target: X=${allCoords[currentTargetIndex].x}, Y=${allCoords[currentTargetIndex].y}`);
        } else {
             console.log("Only one point provided. No navigation target.");
             reachedEnd = true; // No navigation needed
        }
    } else {
         console.warn("No valid coordinates loaded.");
         reachedEnd = true; // No navigation possible
    }
});

// Haversine formula to calculate distance between two points (Lat, Lon)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Dünya'nın yarıçapı (metre)
    const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c; // Mesafe (metre cinsinden)
    return distance;
}

// Calculates bearing between two points (Lat, Lon)
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
// Now uses the global currentRequiredBearing
function showArrow(userCompassDirection, beta) {
     if (reachedEnd) {
        // Hide all arrows if navigation is complete
        const leftArrow = document.getElementById('left-arrow');
        const rightArrow = document.getElementById('right-arrow');
        const upArrow = document.getElementById('up-arrow');
        const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
        const container = document.querySelector('.container');
        const progressCircle = document.querySelector('.progress');

        if (leftArrow) leftArrow.classList.remove('fade-in');
        if (rightArrow) rightArrow.classList.remove('fade-in');
        if (upArrow) upArrow.classList.remove('fade-in');
        if (upPerspectiveArrow) upPerspectiveArrow.classList.remove('fade-in');
        if (container) container.classList.remove('grow');
        if (progressCircle) progressCircle.style.strokeDashoffset = '283'; // Reset progress

         console.log("Navigation complete!");
        // Optionally display a "Reached Destination" message
        return;
    }

    const arScene = document.querySelector('a-scene');
    if (!arScene) {
        // Only show arrows if the AR scene is active
        return;
    }

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
    const container = document.querySelector('.container');
    const progressCircle = document.querySelector('.progress');

     // Ensure elements exist before trying to manipulate
     if (!leftArrow || !rightArrow || !upArrow || !upPerspectiveArrow || !container || !progressCircle) {
         console.warn("Arrow/UI elements not found.");
         return;
     }


    // Okların görünürlüğünü sıfırlama (using fade-out to ensure transition)
    leftArrow.classList.remove('fade-in'); rightArrow.classList.remove('fade-in');
    upArrow.classList.remove('fade-in'); upPerspectiveArrow.classList.remove('fade-in');
     // Also ensure fade-out is present if we are removing
     leftArrow.classList.add('fade-out'); rightArrow.classList.add('fade-out');
     upArrow.classList.add('fade-out'); upPerspectiveArrow.classList.add('fade-out');


    const directionToTurn = currentRequiredBearing; // Use the global variable
    const tolerance = 15; // Degrees tolerance (±15 degrees)

    // Calculate difference, handling wrap-around (0/360)
    let diff = directionToTurn - userCompassDirection;
    // Normalize difference to be between -180 and 180
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;


    // Eğer yön directionToTurn ile ±tolerance derece arasındaysa
    if (Math.abs(diff) <= tolerance) {

        // Yön doğru, okları kontrol et
        if (beta < 30) {
            // up-perspective oku görünecek
             upPerspectiveArrow.classList.remove('fade-out');
            upPerspectiveArrow.classList.add('fade-in');
             upArrow.classList.add('fade-out'); // Ensure other up is hidden
        } else {
            // up-arrow görünecek
             upArrow.classList.remove('fade-out');
            upArrow.classList.add('fade-in');
            upPerspectiveArrow.classList.add('fade-out'); // Ensure other up is hidden
        }
        leftArrow.classList.add('fade-out'); // Ensure left/right are hidden
        rightArrow.classList.add('fade-out');

        directionMatches = true;
        container.classList.add('grow'); // Start the progress circle animation
        isLoading = true; // Yükleme başladı - this variable name might be confusing here
        progressCircle.style.strokeDashoffset = '0'; // Animate to 0

        // The animation monitoring logic here seems specific to the circle fill
        // You might want to trigger an event or call a function when the
        // animation *actually* finishes to indicate reaching the point visually.
        // The current monitorAnimation and onTransitionEnd are not strictly necessary
        // for the core navigation logic, but keep them if they have other UI effects.

    } else {
        // Eğer yön directionToTurn ile ±tolerance derece dışında ise sola veya sağa oklar gösterilecek

        if (diff > tolerance) { // Need to turn Right
             rightArrow.classList.remove('fade-out');
            rightArrow.classList.add('fade-in');
            leftArrow.classList.add('fade-out'); // Ensure left is hidden
        } else if (diff < -tolerance) { // Need to turn Left
             leftArrow.classList.remove('fade-out');
            leftArrow.classList.add('fade-in');
            rightArrow.classList.add('fade-out'); // Ensure right is hidden
        }

        // Hide up arrows
        upArrow.classList.add('fade-out');
        upPerspectiveArrow.classList.add('fade-out');

        directionMatches = false;
        container.classList.remove('grow'); // Reset progress circle animation
        progressCircle.style.strokeDashoffset = '283'; // Anında sıfırlama (assuming 283 is the full circle value)
        // isLoading = false; // Reset loading state
    }
}

// Removed the duplicate onTransitionEnd function as it wasn't hooked up to anything specific

// --- Geolocation and Compass Logic ---

let geoWatchId = null; // To store the ID of the geolocation watch
let deviceOrientationListener = null; // To store the device orientation listener function

function startARGuidance() {
     if (allCoords.length < 2) {
         console.warn("Less than 2 coordinates available. Cannot start navigation.");
         reachedEnd = true;
         return;
     }

     // Reset target if starting AR again
     currentTargetIndex = 1;
     reachedEnd = false;
     console.log(`Starting navigation to target index: ${currentTargetIndex}`);


    // Start listening for device orientation (compass)
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API not available. Compass guidance disabled.");
    } else {
         const compassCallback = (compass, beta) => {
             // This callback runs whenever compass data is available
             // It needs the current required bearing (updated by geolocation)
             showArrow(compass, beta);
         };

        // Store the listener function so we can remove it later
         deviceOrientationListener = (e) => {
            if (!e.absolute || e.alpha == null || e.beta == null || e.gamma == null) {
                return;
            }
            let compass = -(e.alpha + e.beta * e.gamma / 90);
            compass -= Math.floor(compass / 360) * 360;
            compassCallback(compass, e.beta); // Use the stored callback

            // If webkitCompassHeading is available, prefer it once
            if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) {
                 compassCallback(e.webkitCompassHeading, e.beta);
                 // Remove the generic listener once webkit is found (optional, but can be slightly more stable)
                 window.removeEventListener("deviceorientationabsolute", deviceOrientationListener);
                 // Keep the webkit listener if you add a separate one for it
            }
         };


         if (typeof DeviceOrientationEvent.requestPermission === "function") {
            DeviceOrientationEvent.requestPermission()
                .then(response => {
                    if (response === "granted") {
                        window.addEventListener("deviceorientationabsolute", deviceOrientationListener);
                        // Add a listener specifically for webkitCompassHeading if needed
                        window.addEventListener("deviceorientation", deviceOrientationListener); // webkitCompassHeading comes on this event
                    } else {
                        console.warn("Permission for DeviceOrientationEvent not granted. Compass guidance disabled.");
                    }
                })
                .catch(error => {
                    console.error("Error requesting DeviceOrientation permission:", error);
                });
        } else {
            // Handle non-permission API devices
             window.addEventListener("deviceorientationabsolute", deviceOrientationListener);
             window.addEventListener("deviceorientation", deviceOrientationListener); // For webkitCompassHeading
        }
    }

    // Start watching position
    if (navigator.geolocation) {
        geoWatchId = navigator.geolocation.watchPosition(position => {
            const { latitude, longitude, accuracy } = position.coords;

             // --- Geolocation Accuracy Check ---
             // Doğruluk bilgisi gelmediyse, varsayılan bir değeri kabul et (already handled)
             // if (typeof accuracy === 'undefined' || accuracy === null) { ... }
             // Doğruluk kontrolü: Yalnızca doğruluğu 10 metreden küçük olan veriler kabul ediliyor
            if (accuracy > 15) { // Increased tolerance slightly, adjust as needed
                console.warn('Konum verisi yeterince doğru değil, atlanıyor:', accuracy.toFixed(2), 'm');
                // Optionally show a "Poor GPS Accuracy" message to the user
                return; // Ignore position update if accuracy is poor
            }
             console.log(`Accurate position received: Lat=${latitude.toFixed(6)}, Lon=${longitude.toFixed(6)}, Accuracy=${accuracy.toFixed(2)}m`);


             if (reachedEnd) {
                 // If reached end, no need to process location updates for navigation
                 console.log("Reached end point, ignoring further position updates for navigation.");
                 // Consider stopping watchPosition here if you want to completely stop updates
                 // navigator.geolocation.clearWatch(geoWatchId);
                 return;
             }

            // --- Navigation Logic ---
            const currentTarget = allCoords[currentTargetIndex];
            const targetLat = parseFloat(currentTarget.x); // Assuming x is latitude
            const targetLon = parseFloat(currentTarget.y); // Assuming y is longitude


            // Calculate distance to the current target
            const distanceFromTarget = calculateDistance(latitude, longitude, targetLat, targetLon);
            console.log(`Distance to target ${currentTargetIndex} (${targetLat.toFixed(6)}, ${targetLon.toFixed(6)}): ${distanceFromTarget.toFixed(2)} m`);


            // Check if the target is reached
            if (distanceFromTarget < distanceThreshold) {
                console.log(`Target ${currentTargetIndex} reached!`);
                currentTargetIndex++; // Move to the next target

                // Check if there is a next target
                if (currentTargetIndex < allCoords.length) {
                    const nextTarget = allCoords[currentTargetIndex];
                    const nextTargetLat = parseFloat(nextTarget.x);
                    const nextTargetLon = parseFloat(nextTarget.y);
                    console.log(`Moving to next target index: ${currentTargetIndex} (${nextTargetLat.toFixed(6)}, ${nextTargetLon.toFixed(6)})`);
                    // Recalculate bearing to the *new* target from the *current* location
                    currentRequiredBearing = calculateBearing(latitude, longitude, nextTargetLat, nextTargetLon);
                    console.log(`New required bearing: ${currentRequiredBearing.toFixed(2)} degrees`);

                } else {
                    // Reached the last point
                    console.log("Reached the final destination!");
                    reachedEnd = true;
                    // Stop guidance - showArrow will handle hiding indicators
                    // Optionally display a final message to the user
                    stopARGuidance(); // Stop listeners
                }
            } else {
                 // If not reached the target, calculate the bearing to the current target
                 // The bearing is from the *user's current position* to the *current target*
                 currentRequiredBearing = calculateBearing(latitude, longitude, targetLat, targetLon);
                 // console.log(`Required bearing to current target ${currentTargetIndex}: ${currentRequiredBearing.toFixed(2)} degrees`); // Log frequently only if needed for debug
            }

            // The showArrow function is called by the deviceorientation listener
            // using the global currentRequiredBearing.
            // No need to call showArrow directly here.


        }, error => {
            console.error('Geolocation hatası:', error);
            // Optionally show a message to the user that geolocation failed
        }, { enableHighAccuracy: true, maximumAge: 0, timeout: 27000 }); // Options for better accuracy/responsiveness
    } else {
        console.error("Geolocation is not supported by this browser.");
         // Optionally show a message to the user
    }
}

function stopARGuidance() {
    // Stop geolocation watch
    if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
        console.log("Geolocation watch stopped.");
    }

    // Stop device orientation listener
    if (deviceOrientationListener !== null) {
        window.removeEventListener("deviceorientationabsolute", deviceOrientationListener);
         window.removeEventListener("deviceorientation", deviceOrientationListener); // Also remove webkit listener
        deviceOrientationListener = null;
        console.log("Device orientation listener stopped.");
    }

    // Reset UI state when guidance stops
     showArrow(-1, -1); // Call showArrow with invalid values to hide everything
     const container = document.querySelector('.container');
     const progressCircle = document.querySelector('.progress');
      if (container) container.classList.remove('grow');
      if (progressCircle) progressCircle.style.strokeDashoffset = '283';
}

// Consider calling startARGuidance() initially if the AR scene is present on load
// (e.g., if you have a different flow than button clicks).
// Based on your current code, it seems AR starts only on centerButton click,
// so calling startARGuidance inside that listener is correct.

// If you need to handle the animation end specifically (e.g., show a checkmark)
// you can add an event listener to the progress circle's transitionend event,
// but filter it based on the strokeDashoffset value being 0.
const progressCircle = document.querySelector('.progress');
if (progressCircle) {
    progressCircle.addEventListener('transitionend', function() {
        // Check if the transition ended because the circle filled (strokeDashoffset became 0)
        if (this.style.strokeDashoffset === '0') {
            console.log('Progress circle animation complete (filled)!');
            // Add logic here for when the progress circle animation finishes
            // e.g., show a temporary visual indicator that the direction is matched strongly
        }
    });
}