let allCoordinates = []; // Array to hold all coordinate points
let currentTargetIndex = 0; // Index of the *current* target point in the array (starts at 0, the first target will be index 1)
let latestPosition = null; // To store the user's last known good location

let directionMatches = false; // Keep these global or in a suitable scope if needed elsewhere
let isLoading = false; // Keep these global or in a suitable scope if needed elsewhere

// Flag to ensure compass listener is only attached once
let compassListenerStarted = false;

document.addEventListener('DOMContentLoaded', function () {
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button'); // This will be our "Next" button
    const okButton = document.querySelector('.btn-ok'); // Exit button
    const bottomContainer = document.querySelector('.bottom-container');
    const targetDisplay = document.getElementById('target-display'); // Element to display current target info

    // Query A-Frame scene dynamically if it exists
    // const aScene = document.querySelector('a-scene'); // Not needed here, query when used

    // 1. Get all coordinates on load
    allCoordinates = getQueryParams();

    // Initial setup based on coordinates
    if (allCoordinates.length > 1) {
        currentTargetIndex = 1; // Start with the first target (the second point in the array)
        updateTargetDisplay(); // Update the UI display
        console.log('All Coordinates:', allCoordinates);
        console.log(`Initial Target: Point ${currentTargetIndex + 1}/${allCoordinates.length}`);
    } else {
        console.error("Less than 2 coordinates provided. Cannot start navigation.");
        // Disable navigation features or show an error message
        if (targetDisplay) {
            targetDisplay.textContent = "Error: Invalid coordinates for navigation.";
            targetDisplay.style.color = 'red';
        }
        if (centerButton) centerButton.disabled = true;
        if (rightButton) rightButton.disabled = true;
        if (okButton) okButton.disabled = true;
    }

    // --- Existing Button Listeners ---

    // Center Button: Starts AR view (creates a-scene), hides itself, shows Right/Next button.
    centerButton.addEventListener('click', function () {
        // Check if navigation is possible
        if (allCoordinates.length < 2) {
            console.warn("Cannot start AR navigation, invalid coordinates.");
            return;
        }

        // If scene doesn't exist, create and append it
        let aScene = document.querySelector('a-scene');
        if (!aScene) {
            aScene = document.createElement('a-scene');
            aScene.setAttribute('vr-mode-ui', 'enabled: false'); // Disable default VR UI
            aScene.style.position = 'absolute';
            aScene.style.top = '0';
            aScene.style.left = '0';
            aScene.style.width = '100%';
            aScene.style.height = '100%';
            aScene.style.zIndex = '1'; // Z-index for AR content
            document.body.appendChild(aScene);
        }


        bottomContainer.style.height = '40%'; // Shrink bottom container
        centerButton.style.display = 'none'; // Hide Start AR button
        rightButton.style.display = 'block'; // Show Next/Finish button
        okButton.style.display = 'block'; // Show Exit AR button

        // Ensure the compass listener is started
         if (!compassListenerStarted) {
             // Pass showArrow as the callback to the compass listener
             startCompassListener(showArrow);
             compassListenerStarted = true;
             console.log("Compass listener started.");
         }

        // Re-calculate initial bearing if needed after starting AR
         if(latestPosition && allCoordinates.length > currentTargetIndex) {
              const targetCoords = allCoordinates[currentTargetIndex];
              const bearingToTarget = calculateBearing(latestPosition.latitude, latestPosition.longitude, targetCoords.x, targetCoords.y);
              // The compass listener will pick this up on its next update cycle
         } else {
             console.warn("Cannot calculate initial target bearing: No location data or target info.");
         }
    });

    // Right Button: Repurposed as "Next Target" or "Finish" button
    rightButton.addEventListener('click', handleNextTargetOrFinish);

    // OK Button: Exits AR view immediately
    okButton.addEventListener('click', function () {
        let aScene = document.querySelector('a-scene');
        if (aScene) {
            aScene.remove(); // Remove the AR scene
        }

        // Reset UI layout
        bottomContainer.style.height = '100%'; // Restore full height
        centerButton.style.display = 'block'; // Show Start AR button
        rightButton.style.display = 'none'; // Hide Next/Finish button
        okButton.style.display = 'none'; // Hide Exit AR button


        // Optional: Reset navigation state if exiting before completion
        // currentTargetIndex = 1; // Reset to first target
        // updateTargetDisplay(); // Reset display text
        // Consider stopping geolocation watch and compass listener if this button fully exits AR

        // Maybe reset the progress circle and arrows
         const progressCircle = document.querySelector('.progress');
         const container = document.querySelector('.container');
         const arrows = document.querySelectorAll('.arrow');
         if(progressCircle && container) {
             progressCircle.style.strokeDashoffset = '283';
             container.classList.remove('grow');
             isLoading = false;
             directionMatches = false;
         }
         arrows.forEach(arrow => arrow.classList.remove('fade-in', 'fade-out'));


        console.log("Exited AR using OK button.");
    });

     // Initial state: Right and OK buttons are hidden
     rightButton.style.display = 'none';
     okButton.style.display = 'none';

});

// 1. Modified function to get all coordinates
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const encodedCoordinates = params.get('coordinates');

    if (!encodedCoordinates) {
        console.error("No 'coordinates' query parameter found.");
        return []; // Return empty array if parameter is missing
    }

    try {
        // Decode and parse the JSON string
        const decodedCoordinates = decodeURIComponent(encodedCoordinates);
        const coordinates = JSON.parse(decodedCoordinates);

        // Validate the parsed data
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
            console.error("Coordinates parameter is not a valid array or contains less than 2 points.");
            return [];
        }

        // Assume each item in the array is { x: latitude, y: longitude }
        // Ensure x and y are treated as numbers
        return coordinates.map(coord => ({
            x: parseFloat(coord.x),
            y: parseFloat(coord.y)
        }));

    } catch (e) {
        console.error("Error parsing coordinates:", e);
        return []; // Return empty array on parsing error
    }
}

// Function to update the UI displaying the current target information
function updateTargetDisplay() {
    const targetDisplay = document.getElementById('target-display');
    if (targetDisplay && allCoordinates.length > 1) {
        if (currentTargetIndex < allCoordinates.length) {
            targetDisplay.textContent = `Target: ${currentTargetIndex + 1}/${allCoordinates.length}`;
            targetDisplay.style.color = 'white'; // Reset color if it was error/completion
        } else {
            // This case should ideally not be reached if logic is correct,
            // but as a fallback, indicate the last target or completion state.
             targetDisplay.textContent = `On the way to final target: ${allCoordinates.length}/${allCoordinates.length}`;
             targetDisplay.style.color = 'yellow';
        }
    } else if (targetDisplay) {
         // Handle states where coordinates are invalid or navigation hasn't started
         if(allCoordinates.length < 2) {
              targetDisplay.textContent = "Waiting for valid coordinates...";
              targetDisplay.style.color = 'orange';
         } else {
             targetDisplay.textContent = "Navigation ready.";
             targetDisplay.style.color = 'white';
         }
    }
}


// 5. Function to handle moving to the next target or finishing navigation
function handleNextTargetOrFinish() {
    const aScene = document.querySelector('a-scene'); // Get the scene dynamically
    const bottomContainer = document.querySelector('.bottom-container');
    const centerButton = document.querySelector('.center-button');
    const rightButton = document.querySelector('.right-button'); // This is THIS button
    const okButton = document.querySelector('.btn-ok');
    const targetDisplay = document.getElementById('target-display');

    if (currentTargetIndex < allCoordinates.length - 1) {
        // It's a "Next Target" action
        currentTargetIndex++; // Move to the next point as the target
        console.log(`Advancing to target ${currentTargetIndex + 1}/${allCoordinates.length}`);
        updateTargetDisplay(); // Update UI text

        // Reset UI elements related to direction matching/progress for the new target
        const progressCircle = document.querySelector('.progress');
        const container = document.querySelector('.container');
        const arrows = document.querySelectorAll('.arrow');

        if(progressCircle && container){
             progressCircle.style.strokeDashoffset = '283'; // Reset progress circle unfilled
             container.classList.remove('grow'); // Reset container animation
             isLoading = false; // Reset loading state
             directionMatches = false; // Reset direction match state
             // Hide arrows immediately until compass updates for the new target
         }
        arrows.forEach(arrow => arrow.classList.remove('fade-in', 'fade-out'));


        // The compass listener will automatically start guiding towards the new target on its next update cycle,
        // as it recalculates the bearing using the latestPosition and the new currentTargetIndex.

    } else {
        // It's the "Finish" action (already at the last target, clicking next means finish)
        console.log("Reached the final destination. Exiting AR.");

        if (aScene) {
             aScene.remove(); // Remove the AR scene
        }

        // Reset main UI layout
        if(bottomContainer) bottomContainer.style.height = '100%'; // Restore full height
        if(centerButton) centerButton.style.display = 'block'; // Show Start AR button
        if(rightButton) rightButton.style.display = 'none'; // Hide Next/Finish button
        if(okButton) okButton.style.display = 'none'; // Hide Exit AR button


         // Final message display
        if(targetDisplay) {
             targetDisplay.textContent = "Navigation Complete!";
             targetDisplay.style.color = 'green'; // Indicate completion
        }

        // Optional: Reset navigation state if exiting before completion
        // currentTargetIndex = 1; // Reset to first target (index 1) for potential future use on this page instance

        // Maybe reset the progress circle and arrows on finish as well
         const progressCircle = document.querySelector('.progress');
         const container = document.querySelector('.container');
         const arrows = document.querySelectorAll('.arrow');
         if(progressCircle && container) {
             progressCircle.style.strokeDashoffset = '283';
             container.classList.remove('grow');
             isLoading = false;
             directionMatches = false;
         }
         arrows.forEach(arrow => arrow.classList.remove('fade-in', 'fade-out'));


        // Consider stopping geolocation watch and compass listener if this button fully exits AR session
        // To stop navigator.geolocation.watchPosition, you need the ID it returns.
        // let watchId = navigator.geolocation.watchPosition(...);
        // navigator.geolocation.clearWatch(watchId);
        // Stopping compass listener is harder without a specific function to remove the listeners added in startCompassListener.
    }
}


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

// --- AR UI Control Function (Keep as is, it takes targetBearing and currentCompass) ---
// It now expects the *correct* targetBearing to be calculated and passed to it.
function showArrow(targetBearing, currentCompass, beta) {
    const arScene = document.querySelector('a-scene');
     // Only show arrows if AR scene is active
    if (!arScene || arScene.style.display === 'none') {
        return;
    }

    const leftArrow = document.getElementById('left-arrow');
    const rightArrow = document.getElementById('right-arrow');
    const upArrow = document.getElementById('up-arrow');
    const upPerspectiveArrow = document.getElementById('up-arrow-perspective');
    const container = document.querySelector('.container'); // Progress circle container
    const progressCircle = document.querySelector('.progress-ring__circle'); // The filling circle


    // Ensure elements exist before manipulating
     if (!leftArrow || !rightArrow || !upArrow || !upPerspectiveArrow || !container || !progressCircle) {
        console.warn("AR UI elements not found.");
        return;
    }

    // Remove previous animation classes
    leftArrow.classList.remove('fade-in', 'fade-out');
    rightArrow.classList.remove('fade-in', 'fade-out');
    upArrow.classList.remove('fade-in', 'fade-out');
    upPerspectiveArrow.classList.remove('fade-in', 'fade-out');


    // Check if the current heading is within ±10 degrees of the target bearing
    const angleDiff = (currentCompass - targetBearing + 360) % 360;
    const isFacingTarget = angleDiff <= 10 || angleDiff >= 350; // Within ±10 degrees


    if (isFacingTarget) {
        // Facing the correct direction
        directionMatches = true;

        // Check camera pitch (beta) for perspective arrow
        // Assuming beta = 0 is level, >0 is looking down, <0 is looking up.
        // Adjust thresholds based on how you want perspective arrow to show.
        // Beta is typically 0 when the device is flat, 90 when vertical portrait up.
        // Let's assume < 30 degrees tilt *towards* vertical might suggest perspective view is useful
        // This beta logic might need tuning based on device orientation API specifics.
        // A common use is beta around 90 for phone held up. Looking "up" in AR might mean beta is lower or device is tilted back.
        // Let's simplify: if beta indicates the device is held somewhat upright (e.g., beta > 45) AND looking within the bearing, show up.
        // If beta is closer to flat (e.g., beta <= 45) and within bearing, maybe perspective?
        // Let's stick closer to the original logic but acknowledge beta interpretation can vary.
        // Original logic: beta < 30 -> up-perspective, beta >= 30 -> up-arrow. This implies beta=0 is flat, beta=90 vertical. Let's use this.

        if (beta != null && beta < 30 && beta >= -90) { // Check beta is available and within reasonable range
             // Looking somewhat flat or tilted up slightly
            upPerspectiveArrow.classList.add('fade-in');
            upArrow.classList.add('fade-out'); // Hide standard up
        } else if (beta != null && beta >= 30 && beta <= 90) { // Looking more upright
            upArrow.classList.add('fade-in');
            upPerspectiveArrow.classList.add('fade-out'); // Hide perspective up
        } else {
             // Beta outside expected range, maybe just show standard up or hide both?
             // Let's default to standard up if beta is weird or null
             upArrow.classList.add('fade-in');
             upPerspectiveArrow.classList.add('fade-out');
             if (beta == null) console.warn("Beta (device pitch) not available.");
             else console.warn("Beta value (" + beta + ") outside expected range for arrow logic.");
        }


        leftArrow.classList.add('fade-out'); // Hide side arrows
        rightArrow.classList.add('fade-out'); // Hide side arrows


        // Start progress circle animation
        container.classList.add('grow'); // Trigger container/animation
        isLoading = true; // Indicate loading/matching state
        // The CSS transition handles the stroke-dashoffset animation

    } else {
        // Not facing the correct direction
        directionMatches = false;

        // Determine whether to turn left or right
        const clockwiseDiff = (targetBearing - currentCompass + 360) % 360;
        const counterClockwiseDiff = (currentCompass - targetBearing + 360) % 360;

        if (clockwiseDiff <= counterClockwiseDiff) {
            // Turn Right (clockwise is shorter)
            rightArrow.classList.add('fade-in');
            leftArrow.classList.add('fade-out');
        } else {
            // Turn Left (counter-clockwise is shorter)
            leftArrow.classList.add('fade-in');
            rightArrow.classList.add('fade-out');
        }

        // Hide up arrows
        upArrow.classList.add('fade-out');
        upPerspectiveArrow.classList.add('fade-out');

        // Reset progress circle animation
        container.classList.remove('grow'); // Remove grow class
        // progressCircle.style.strokeDashoffset = '283'; // Reset stroke-dashoffset immediately via CSS or JS
        isLoading = false; // Not in the matching state

    }
     // The onTransitionEnd function can be used for actions *after* the progress circle fills,
     // but the core arrow visibility is handled above.
}

// Placeholder if you need actions exactly when the progress circle fills
function onTransitionEnd() {
    const progressCircle = document.querySelector('.progress-ring__circle'); // The filling circle

    // Check if the transition ended on the filling circle and it's filled (offset is 0)
    const currentOffset = parseFloat(getComputedStyle(progressCircle).strokeDashoffset);
     // Check if the container has the grow class to ensure it was the fill animation ending
    const container = document.querySelector('.container');

    if (container && container.classList.contains('grow') && currentOffset < 1) { // Use < 1 for floating point safety
        console.log('Progress animation complete (circle is filled)!');
         // Action to perform when progress is complete, e.g., automatically advance target?
         // Or display a "Reached" message?
         // Be careful with automatically advancing; accuracy issues might cause flickering.
         // Manual "Next Target" button press is generally safer.
    }
}

// Add the transitionend listener to the progress circle element in DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    // ... existing DOMContentLoaded code ...

    const progressCircle = document.querySelector('.progress-ring__circle');
    if (progressCircle) {
        // Listen for the 'transitionend' event on the circle element
        progressCircle.addEventListener('transitionend', onTransitionEnd);
    }
});


// --- Geolocation Watch (Modified to store latest position and start compass listener) ---

// Store the watchId to potentially clear it later
let geoWatchId = null;

geoWatchId = navigator.geolocation.watchPosition(position => {
    const { latitude, longitude, accuracy } = position.coords;

    // Update latest known position
    latestPosition = { latitude, longitude };

    // Check accuracy - log warning if > 10 meters
     if (accuracy !== null && accuracy > 10) {
         console.warn('Konum verisi yeterince doğru değil:', accuracy.toFixed(2), 'm');
         // Decide if you want to pause navigation or just warn
         // For now, we continue but warn.
     } else if (accuracy === null) {
          console.warn('Doğruluk bilgisi alınamadı.');
     } else {
          console.log('Konum doğruluğu:', accuracy.toFixed(2), 'm');
     }


    // The compass listener's callback will use this updated `latestPosition`
    // to calculate the bearing to the `allCoordinates[currentTargetIndex]`.

    // Ensure the compass listener is started ONCE after the first good position fix.
    // We moved the initial start call to the Center Button click handler,
    // as compass permission usually requires a user interaction.
    // This ensures it's started only when the user actively enters AR.

    // The previous logic about checking distance from source and hiding centerButton
    // is removed as it's not directly applicable to multi-point navigation in this way.

}, error => {
    console.error('Geolocation hatası:', error.code, error.message);
    // Display error message to the user
    const targetDisplay = document.getElementById('target-display');
    if (targetDisplay) {
         targetDisplay.textContent = `Geolocation error: ${error.message} (Code: ${error.code})`;
         targetDisplay.style.color = 'red';
    }
    // Consider disabling features that rely on location
}, {
    enableHighAccuracy: true,
    timeout: 15000, // Increased timeout
    maximumAge: 0 // Get freshest possible location
});


// --- Compass Listener (Modified callback to use latestPosition and currentTargetIndex) ---

function startCompassListener(callback) { // callback is showArrow in this case
    if (!window.DeviceOrientationEvent) {
        console.warn("DeviceOrientation API not available on this device.");
        const targetDisplay = document.getElementById('target-display');
        if (targetDisplay) {
             targetDisplay.textContent = "Compass not available on this device.";
             targetDisplay.style.color = 'orange';
        }
        return;
    }

    // Store the listener function so it can be potentially removed later
    const deviceOrientationCallback = (e) => {
        // Calculate compass heading
        let compass = null;
        let beta = e.beta; // Use beta directly

        // Prefer webkitCompassHeading if available (often more accurate)
        if (e.webkitCompassHeading != null && !isNaN(e.webkitCompassHeading)) {
            compass = e.webkitCompassHeading;
        } else if (e.absolute || (e.alpha != null && e.alpha !== undefined)) {
            // Fallback using standard alpha, beta, gamma (might be less accurate/stable)
             // Standard calculation: alpha (z-axis rotation), beta (x-axis), gamma (y-axis)
             // This calculation can be complex and browser-dependent for true north.
             // The original line `let compass = -(e.alpha + e.beta * e.gamma / 90);` is a simplified heuristic,
             // and might not reliably point to north. Using `e.absolute` is better if available.
             // Let's use alpha directly if absolute is true and webkit isn't available.
            if (e.absolute && e.alpha != null) {
                 compass = 360 - e.alpha; // Alpha is degrees from North, increasing counter-clockwise. We want clockwise from North.
            } else {
                 // If absolute is false or alpha is null, standard deviceorientation is relative, less useful for compass
                 console.warn("Absolute device orientation or alpha not available for compass calculation.");
                 return; // Cannot calculate reliable compass heading
            }
        } else {
             console.warn("Device does not provide compass data (webkitCompassHeading or absolute alpha).");
             return; // No compass data available
        }

        // Ensure compass is within 0-360 range
        compass = (compass + 360) % 360;

        // Check if we have a recent position and valid target before calculating bearing
        if (latestPosition && allCoordinates.length > currentTargetIndex && currentTargetIndex >= 0) {
            // Get the current target coordinates
            const targetCoords = allCoordinates[currentTargetIndex];

            // Calculate bearing from user's latest known position to the current target
            const bearingToTarget = calculateBearing(
                latestPosition.latitude,
                latestPosition.longitude,
                targetCoords.x, // Assuming x is latitude
                targetCoords.y  // Assuming y is longitude
            );

            // Call the provided callback function (which is showArrow)
            // showArrow needs (targetBearing, currentCompass, beta)
            callback(bearingToTarget, compass, beta);

        } else {
             // If no latestPosition or target, maybe hide arrows or show a waiting message?
             // console.log("Waiting for location data or target info...");
             // Hide arrows if location isn't ready or no valid target
             const arrows = document.querySelectorAll('.arrow');
             arrows.forEach(arrow => arrow.classList.remove('fade-in', 'fade-out'));
             const container = document.querySelector('.container');
             const progressCircle = document.querySelector('.progress-ring__circle');
              if(container && progressCircle) {
                 container.classList.remove('grow');
                 progressCircle.style.strokeDashoffset = '283';
                 isLoading = false;
                 directionMatches = false;
             }

             const targetDisplay = document.getElementById('target-display');
              if(targetDisplay) {
                 if (!latestPosition) {
                      targetDisplay.textContent = "Getting location...";
                      targetDisplay.style.color = 'orange';
                 } else if (allCoordinates.length < 2) {
                     targetDisplay.textContent = "Invalid coordinates.";
                      targetDisplay.style.color = 'red';
                 } else if (currentTargetIndex >= allCoordinates.length) {
                      targetDisplay.textContent = "Navigation complete. Press Exit.";
                      targetDisplay.style.color = 'green';
                 } else if (currentTargetIndex < 0) {
                     targetDisplay.textContent = "Navigation not started.";
                      targetDisplay.style.color = 'white';
                 }
              }

        }
         // If compass is null, showArrow is not called, arrows will be hidden if no valid data comes in.
    };

    function addListeners() {
        // Add both listeners for broader compatibility
        window.addEventListener("deviceorientationabsolute", deviceOrientationCallback);
        window.addEventListener("deviceorientation", deviceOrientationCallback);
        console.log("Device orientation listeners added.");
    }

    // Request permission for iOS 13+ devices in secure contexts (HTTPS)
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
        DeviceOrientationEvent.requestPermission()
            .then(response => {
                if (response === "granted") {
                    addListeners();
                } else {
                    console.warn("Permission for DeviceOrientationEvent not granted.");
                     const targetDisplay = document.getElementById('target-display');
                     if (targetDisplay) {
                         targetDisplay.textContent = "Compass permission denied.";
                         targetDisplay.style.color = 'red';
                     }
                }
            })
            .catch(error => {
                console.error("Error requesting DeviceOrientation permission:", error);
                 const targetDisplay = document.getElementById('target-display');
                 if (targetDisplay) {
                     targetDisplay.textContent = "Error accessing compass.";
                     targetDisplay.style.color = 'red';
                 }
            });
    } else {
        // Handle older browsers or non-HTTPS contexts where permission isn't needed
        addListeners();
    }
}

// You might want a function to explicitly stop the geolocation and compass listeners
// when the user completely exits the AR experience or the page.
function stopNavigationListeners() {
    if (geoWatchId !== null) {
        navigator.geolocation.clearWatch(geoWatchId);
        geoWatchId = null;
        console.log("Geolocation watch stopped.");
    }

    // Removing device orientation listeners is trickier if you added multiple or anonymously.
    // If you need to stop them, store the listener function reference and use removeEventListener.
    // Example (requires storing the function from startCompassListener):
    // window.removeEventListener("deviceorientationabsolute", storedDeviceOrientationCallback);
    // window.removeEventListener("deviceorientation", storedDeviceOrientationCallback);
    // compassListenerStarted = false; // Reset flag
     console.log("Consider implementing stopping device orientation listeners.");
}

// Optional: Call stopNavigationListeners on page unload
// window.addEventListener('beforeunload', stopNavigationListeners);