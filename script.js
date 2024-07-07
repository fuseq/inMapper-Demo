const cameraEntity = document.getElementById('cameraEntity');
const directionArrow = document.getElementById('directionArrow');

let previousHeading = 0;
let isArrowVisible = false; // Track arrow visibility for smoother updates

navigator.permissions.query({ name: 'deviceorientation' })
    .then(result => {
        if (result.state === 'granted') {
            window.addEventListener('deviceorientation', handleOrientationChange);
        }
    });

function handleOrientationChange(event) {
    const heading = event.alpha; // Adjust for correct alpha value based on device

    // Calculate difference from previous heading for smoother transitions
    const headingDiff = Math.abs(heading - previousHeading);
    previousHeading = heading;

    // Calculate relative direction for optimal guidance (0 = north)
    const relativeHeading = (heading + 360) % 360;

    // Update direction arrow visibility and position based on relative direction
    if (headingDiff > 5) { // Threshold for smoother updates

        // Handle arrow visibility efficiently
        if (!isArrowVisible && relativeHeading >= 45 && relativeHeading <= 315) {
            isArrowVisible = true;
            directionArrow.setAttribute('visible', true);
        } else if (isArrowVisible && !(relativeHeading >= 45 && relativeHeading <= 315)) {
            isArrowVisible = false;
            directionArrow.setAttribute('visible', false);
        }

        if (isArrowVisible) {
            if (relativeHeading >= 45 && relativeHeading <= 135) {
                // Facing east, show left arrow (turn right)
                directionArrow.setAttribute('geometry', { primitive: 'plane', height: 0.5, width: 0.3, rotation: '0 90 0' });
                directionArrow.setAttribute('position', '-0.2 0 0');
            } else if (relativeHeading >= 225 && relativeHeading <= 315) {
                // Facing west, show right arrow (turn left)
                directionArrow.setAttribute('geometry', { primitive: 'plane', height: 0.5, width: 0.3, rotation: '0 -90 0' });
                directionArrow.setAttribute('position', '0.2 0 0');
            } else if (relativeHeading >= 315 || relativeHeading <= 45) {
                // Facing north, show up arrow
                directionArrow.setAttribute('geometry', { primitive: 'plane', height: 0.3, width: 0.5 });
                directionArrow.setAttribute('position', '0 0.2 0');
            }
        }
    }
}
