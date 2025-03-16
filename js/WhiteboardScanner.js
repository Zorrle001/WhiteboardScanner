const scanner = new jscanify();
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const result = document.getElementById("result");
const exportCanvas = document.getElementById("exportCanvas");

const canvasCtx = canvas.getContext("2d");
const resultCtx = result.getContext("2d");
const exportCanvasCtx = exportCanvas.getContext("2d");
const cornerPointCanvas = document.getElementById("cornerPointCanvas");
const cornerPointCtx = cornerPointCanvas.getContext("2d");
const zoomRange = document.getElementById("zoomRange");
const zoomIndicator = document.getElementById("zoomIndicator");
const zoomPopupIndicator = document.getElementById("zoomPopupIndicator");
const uploadBtn = document.getElementById("uploadBtn");
const uploadInput = document.getElementById("uploadInput");

var activeStream = null;
var imageCapture = null;

var cornerPoints = null;
/* var paperWidth = 3508;
var paperHeight = 2480; */
var paperWidth = 2480;
var paperHeight = 2480;

console.log("STARTED");

let front = false;
document.getElementById("flipBtn").onclick = () => {
    console.log("FLIP");
    front = !front;

    activeStream.getTracks()[0].zoom = 1;
    setZoomIndicators(1, true);

    startStream();
};

document.getElementById("triggerBtn").onclick = async () => {
    /*if (!activeStream) {
        alert("Camera Stream not started");
        return;
    }*/
    takePicture(video, result);
    startEditorFunctions();
    return;

    if (!imageCapture) {
        alert("Image Capture not initialized");
        return;
    }
    //const track = activeStream.getVideoTracks()[0];
    //imageCapture = new ImageCapture(track);
    //console.log(imageCapture);

    console.log(await imageCapture.getPhotoCapabilities());
    console.log(await imageCapture.getPhotoSettings());

    imageCapture
        .takePhoto()
        .then((blob) => createImageBitmap(blob))
        .then((imageBitmap) => {
            const canvas = document.querySelector("#result");
            drawCanvas(canvas, imageBitmap);

            //startStream();
        })
        .catch((error) => console.error(error));
};

for (const closeBtn of document.querySelectorAll(".closeBtn")) {
    closeBtn.onclick = () => {
        document.body.classList.remove("showEditorPage");
        document.body.classList.remove("showExportPage");
        startStream();
    };
}

document.getElementById("backBtn").onclick = () => {
    document.body.classList.remove("showExportPage");
};

uploadBtn.onclick = () => {
    uploadInput.click();
};

uploadInput.onchange = (e) => {
    //window.alert(video.videoWidth + " x " + video.videoHeight);

    /*const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);*/

    // TODO: SHOW LOADING SCREEN

    stopStreamedVideo(video);

    console.log("UPLOAD", e.target.files[0]);
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const img = new Image();
        img.src = reader.result;
        img.onload = () => {
            const context = result.getContext("2d");
            result.width = img.width;
            result.height = img.height;
            context.drawImage(img, 0, 0, img.width, img.height);

            document.body.classList.add("showEditorPage");

            startEditorFunctions();
        };
    };
    reader.readAsDataURL(file);
};

zoomRange.oninput = () => {
    //document.getElementById("zoomIndicator").innerText = zoomRange.value + "x";
    //document.body.classList.add("showZoomPopup");
    setZoomIndicators(zoomRange.value);
};
zoomRange.onchange = setZoom;

document.getElementById("extractBtn").onclick = async () => {
    const extractCanvas = scanner.extractPaper(
        result,
        paperWidth,
        paperHeight,
        cornerPoints
    );

    exportCanvas.width = extractCanvas.width;
    exportCanvas.height = extractCanvas.height;
    exportCanvasCtx.drawImage(
        extractCanvas,
        0,
        0,
        extractCanvas.width,
        extractCanvas.height
    );

    document.body.classList.add("showExportPage");

    console.log("EXPORTED");
    return true;
    //document.body.appendChild(resultCanvas);
    const data = extractCanvas.toDataURL("image/png");
    // Convert base64 to Blob
    const response = await fetch(data);
    const blob = await response.blob();

    let date = new Date().toISOString().slice(0, 19).replace("T", " ");
    let fileName = "Scanned Whiteboard " + date + ".png";

    // Create a File object
    const file = new File([blob], fileName, { type: "image/png" });
    await navigator.share({
        title: "Scanned Whiteboard",
        files: [file],
    });
};

document.getElementById("shareBtn").onclick = async () => {
    const data = exportCanvas.toDataURL("image/png");
    // Convert base64 to Blob
    const response = await fetch(data);
    const blob = await response.blob();

    let date = new Date().toISOString().slice(0, 19).replace("T", " ");
    let fileName = "Scanned Whiteboard " + date + ".png";

    // Create a File object
    const file = new File([blob], fileName, { type: "image/png" });
    await navigator.share({
        title: "Scanned Whiteboard",
        files: [file],
    });
};

var draggedPoint = null;
var dragOffset = { x: 0, y: 0 };

cornerPointCanvas.onpointerdown = (e) => {
    const rect = cornerPointCanvas.getBoundingClientRect();
    const x =
        ((e.pageX - rect.left) / cornerPointCanvas.clientWidth) *
        cornerPointCanvas.width;
    const y =
        ((e.pageY - rect.top) / cornerPointCanvas.clientHeight) *
        cornerPointCanvas.height;
    console.log("DOWN", x, y);

    let distance = Infinity;
    let closestPoint = null;
    for (const pointKey in cornerPoints) {
        const point = cornerPoints[pointKey];
        const distX = Math.abs(point.x - x);
        const distY = Math.abs(point.y - y);
        if (distX ** 2 + distY ** 2 < distance) {
            distance = distX ** 2 + distY ** 2;
            closestPoint = pointKey;
            dragOffset.x = point.x - x;
            dragOffset.y = point.y - y;
        }
    }

    console.log("CLOSEST", closestPoint);
    draggedPoint = closestPoint;
};

document.onpointermove = (e) => {
    if (draggedPoint == null) return;
    console.log("MOVE", draggedPoint);

    const rect = cornerPointCanvas.getBoundingClientRect();
    const x =
        ((e.pageX - rect.left) / cornerPointCanvas.clientWidth) *
        cornerPointCanvas.width;
    const y =
        ((e.pageY - rect.top) / cornerPointCanvas.clientHeight) *
        cornerPointCanvas.height;

    cornerPoints[draggedPoint].x = clamp(
        x + dragOffset.x,
        0,
        cornerPointCanvas.width
    );
    cornerPoints[draggedPoint].y = clamp(
        y + dragOffset.y,
        0,
        cornerPointCanvas.height
    );

    drawCornerPointsFrame();
};

document.onpointerup = (e) => {
    draggedPoint = null;

    dragOffset = { x: 0, y: 0 };
};

var zooming = false;
var zoomingDelta = 0;
var zoomingStart = 1;

document.getElementById("cameraPage").ontouchstart = (e) => {
    if (e.touches.length != 2) {
        if (zooming == true) {
            zooming = false;
            setZoom();
        }
        zooming = false;
        zoomingDelta = 0;
        return;
    }

    zooming = true;
    zoomingStart = parseFloat(zoomRange.value);

    const touch1 = e.touches[0];
    const touch2 = e.touches[1];

    zoomingDelta = Math.sqrt(
        (touch1.pageX - touch2.pageX) ** 2 + (touch1.pageY - touch2.pageY) ** 2
    );
    console.log("SET ZOOMING DELTA", zoomingDelta);

    console.log(
        "-> START",
        touch1.pageX,
        touch2.pageX,
        touch1.pageY,
        touch2.pageY,
        zoomingDelta
    );

    document.body.classList.add("showZoomPopup");
};

document.getElementById("cameraPage").addEventListener("touchmove", (e) => {
    if (e.touches.length < 2 || !zooming) return;
    e.preventDefault();

    const touch1 = e.targetTouches[0];
    const touch2 = e.targetTouches[1];

    //console.log("TOUCHED", JSON.stringify(e, null, "\t"));

    const distanceChange =
        Math.sqrt(
            (touch1.pageX - touch2.pageX) ** 2 +
                (touch1.pageY - touch2.pageY) ** 2
        ) - zoomingDelta;

    //alert(distance);

    console.log(
        "ZOOM sTART",
        zoomingStart,
        "Distance Change",
        Math.round(distanceChange / 500),
        "NEW ZOOM",
        zoomingStart + Math.round(distanceChange / 500)
    );

    newZoom = Math.max(
        zoomingStart + Math.round((distanceChange * 10) / 100) / 10,
        0
    );

    //zoomRange.value = newZoom;
    //zoomIndicator.innerText = zoomRange.value + "x";
    setZoomIndicators(newZoom);

    console.log(
        "-> ",
        touch1.pageX,
        touch2.pageX,
        touch1.pageY,
        touch2.pageY,
        distanceChange
    );
    //const zoom = Math.floor(distance / 100);
    //zoomRange.value = zoom;
});

document.getElementById("cameraPage").ontouchend = (e) => {
    if (e.touches.length != 2) {
        if (zooming == true) {
            zooming = false;
            setZoom();
        }
        zooming = false;
        zoomingDelta = 0;
        return;
    }
};

function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}

function remToPx(rem) {
    return (
        rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
}

startStream();

function startStream() {
    const constraints = {
        video: {
            width: 4032,
            height: 3024,
            facingMode: front ? "user" : "environment",
            advanced: [{ zoom: parseFloat(zoomRange.value) }],
        },
        audio: false,
    };

    navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
            activeStream = stream;
            video.srcObject = stream;
            /*const track = stream.getVideoTracks()[0];
            imageCapture = new ImageCapture(track);*/

            console.log("STARTED 2", imageCapture);
            video.onloadedmetadata = () => {
                video.play();

                /*setInterval(() => {
                    canvasCtx.drawImage(video, 0, 0);
                    const resultCanvas = scanner.highlightPaper(canvas);
                    resultCtx.drawImage(resultCanvas, 0, 0);
                }, 10);*/

                if (navigator.mediaDevices.getSupportedConstraints().zoom) {
                    console.log("Browser supports zoom");
                } else {
                    alert("The browser does not support zoom.");
                }
                checkCameraCapabilities();
            };
        })
        .catch((err) => {
            console.log("ERROR", err);
            activeStream = null;
        });
}

function setZoomIndicators(zoom, hidePopup = false) {
    if (!hidePopup) document.body.classList.add("showZoomPopup");
    zoomRange.value = zoom;
    zoomIndicator.innerText = parseFloat(zoomRange.value).toFixed(1) + "x";
    zoomPopupIndicator.innerText = parseFloat(zoomRange.value).toFixed(1) + "x";
}

async function setZoom() {
    if (zooming) return;
    document.body.classList.remove("showZoomPopup");
    let expectedZoom = zoomRange.value;
    const constraints = { advanced: [{ zoom: expectedZoom }] };
    await track.applyConstraints(constraints);
}

function drawCanvas(canvas, img) {
    canvas.width = getComputedStyle(canvas).width.split("px")[0];
    canvas.height = getComputedStyle(canvas).height.split("px")[0];
    let ratio = Math.min(canvas.width / img.width, canvas.height / img.height);
    let x = (canvas.width - img.width * ratio) / 2;
    let y = (canvas.height - img.height * ratio) / 2;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    canvas
        .getContext("2d")
        .drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            x,
            y,
            img.width * ratio,
            img.height * ratio
        );
}

function takePicture(video, canvas) {
    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

    //window.alert(video.videoWidth + " x " + video.videoHeight);

    /*const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);*/

    document.body.classList.add("showEditorPage");

    stopStreamedVideo(video);
}

function stopStreamedVideo(videoElem) {
    const stream = videoElem.srcObject;
    if (stream == null) return;
    const tracks = stream.getTracks();

    tracks.forEach((track) => {
        track.stop();
    });

    videoElem.srcObject = null;
}

function startEditorFunctions() {
    //image.onload = function () {
    //const highlightedCanvas = scanner.highlightPaper(result);
    //document.body.appendChild(highlightedCanvas);
    //};
    const contour = scanner.findPaperContour(cv.imread(result));
    console.log("CONTOUR", contour);

    if (contour == null) {
        console.warn("No paper found");
        cornerPoints = {
            topLeftCorner: { x: 0, y: 0 },
            topRightCorner: { x: result.width, y: 0 },
            bottomRightCorner: { x: result.width, y: result.height },
            bottomLeftCorner: { x: 0, y: result.height },
        };
    } else {
        cornerPoints = scanner.getCornerPoints(contour);
    }

    console.log("CPs", cornerPoints);

    drawCornerPointsFrame();
}

function drawCornerPointsFrame() {
    //const dpr = window.devicePixelRatio || 1;

    cornerPointCanvas.width = result.width;
    cornerPointCanvas.height = result.height;
    const adjustFactor =
        cornerPointCanvas.width /
        parseFloat(getComputedStyle(cornerPointCanvas)["width"]);

    cornerPointCtx.strokeStyle = "orange";
    //cornerPointCtx.stroke = "blue";
    cornerPointCtx.lineWidth = remToPx(0.2) * adjustFactor;
    cornerPointCtx.lineCap = "round";
    //cornerPointCtx.lineWidth = 10;

    // TOP LINE
    cornerPointCtx.beginPath(); // Start a new path
    cornerPointCtx.moveTo(
        cornerPoints.topLeftCorner.x,
        cornerPoints.topLeftCorner.y
    ); // Move the pen to (30, 50)
    cornerPointCtx.lineTo(
        cornerPoints.topRightCorner.x,
        cornerPoints.topRightCorner.y
    ); // Draw a line to (150, 100)
    cornerPointCtx.stroke(); // Render the path

    // RIGHT LINE
    cornerPointCtx.beginPath(); // Start a new path
    cornerPointCtx.moveTo(
        cornerPoints.topRightCorner.x,
        cornerPoints.topRightCorner.y
    ); // Move the pen to (30, 50)
    cornerPointCtx.lineTo(
        cornerPoints.bottomRightCorner.x,
        cornerPoints.bottomRightCorner.y
    ); // Draw a line to (150, 100)
    cornerPointCtx.stroke(); // Render the path

    // BOTTOM LINE
    cornerPointCtx.beginPath(); // Start a new path
    cornerPointCtx.moveTo(
        cornerPoints.bottomRightCorner.x,
        cornerPoints.bottomRightCorner.y
    ); // Move the pen to (30, 50)
    cornerPointCtx.lineTo(
        cornerPoints.bottomLeftCorner.x,
        cornerPoints.bottomLeftCorner.y
    ); // Draw a line to (150, 100)
    cornerPointCtx.stroke(); // Render the path

    // LEFT LINE
    cornerPointCtx.beginPath(); // Start a new path
    cornerPointCtx.moveTo(
        cornerPoints.bottomLeftCorner.x,
        cornerPoints.bottomLeftCorner.y
    ); // Move the pen to (30, 50)
    cornerPointCtx.lineTo(
        cornerPoints.topLeftCorner.x,
        cornerPoints.topLeftCorner.y
    ); // Draw a line to (150, 100)
    cornerPointCtx.stroke(); // Render the path

    cornerPointCtx.strokeStyle = "orange";

    for (const pointKey in cornerPoints) {
        const point = cornerPoints[pointKey];
        cornerPointCtx.beginPath();
        cornerPointCtx.arc(
            point.x,
            point.y,
            remToPx(0.5) * adjustFactor,
            0,
            2 * Math.PI
        );
        cornerPointCtx.fillStyle = "rgba(255, 166, 0, 0.25)";
        cornerPointCtx.fill();
        cornerPointCtx.stroke();
    }
}

function checkCameraCapabilities() {
    const videoTracks = video.srcObject.getVideoTracks();
    track = videoTracks[0];
    let capabilities = track.getCapabilities();
    console.log(JSON.stringify(capabilities, null, "\t"));
    if ("zoom" in capabilities) {
        let min = capabilities["zoom"]["min"];
        let max = capabilities["zoom"]["max"];
        zoomRange.setAttribute("min", min);
        zoomRange.setAttribute("max", max);
        document.getElementById("zoomInput").value = 1;
        console.log("ZOOM: " + min + " - " + max);
    } else {
        console.warn("This camera does not support zoom");
    }
}
