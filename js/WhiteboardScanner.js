const scanner = new jscanify();
const result = document.getElementById("result");
const exportCanvas = document.getElementById("exportCanvas");
const pushShareCanvas = document.getElementById("pushShareCanvas");
const pushShareImage = document.getElementById("pushShareImage");

const resultCtx = result.getContext("2d");
const exportCanvasCtx = exportCanvas.getContext("2d");
const cornerPointCanvas = document.getElementById("cornerPointCanvas");
const cornerPointCtx = cornerPointCanvas.getContext("2d");

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

const RATIO_TABLE = {
    Auto: [-1, -1],
    "1:1": [2480, 2480],
    "4:3": [2480, 1860],
    "16:9": [2480, 1395],
    "2:1": [2480, 1240],
    A4: [2480, 1754],
};

var ratio = localStorage.getItem("ratio")
    ? localStorage.getItem("ratio")
    : "Auto";

var landscape = localStorage.getItem("landscape")
    ? localStorage.getItem("landscape")
    : "true";

document
    .querySelector(".tile[data-ratio-id='" + ratio + "']")
    .classList.add("selected");

for (const tile of document.querySelectorAll(".tile")) {
    tile.onclick = () => {
        const ratioID = tile.dataset.ratioId;
        ratio = ratioID;
        localStorage.setItem("ratio", ratio);

        document.querySelector(".tile.selected").classList.remove("selected");
        tile.classList.add("selected");
    };
}

if (landscape == "true") {
    document.getElementById("landscapeBtn").classList.add("selected");
} else {
    document.getElementById("portraitBtn").classList.add("selected");
}

document.getElementById("landscapeBtn").onclick = () => {
    landscape = "true";
    localStorage.setItem("landscape", true);
    document.getElementById("portraitBtn").classList.remove("selected");
    document.getElementById("landscapeBtn").classList.add("selected");
};

document.getElementById("portraitBtn").onclick = () => {
    landscape = "false";
    localStorage.setItem("landscape", false);
    document.getElementById("portraitBtn").classList.add("selected");
    document.getElementById("landscapeBtn").classList.remove("selected");
};

for (const closeBtn of document.querySelectorAll(".closeBtn")) {
    closeBtn.onclick = () => {
        document.body.classList.remove("showEditorPage");
        document.body.classList.remove("showExportPage");
    };
}

document.querySelector("#pushShareCloseBtn").onclick = () => {
    document.body.classList.remove("showPushSharePage");
};

document.getElementById("backBtn").onclick = () => {
    document.body.classList.remove("showExportPage");
};

// #### START PAGE ####
document.getElementById("osCameraBtn").onclick = () => {
    document.getElementById("osCameraInput").click();
};

document.getElementById("startPageUploadBtn").onclick = () => {
    uploadInput.click();
};

uploadBtn.onclick = () => {
    uploadInput.click();
};

const uploadImageFnc = (e) => {
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

uploadInput.onchange = uploadImageFnc;
document.getElementById("osCameraInput").onchange = uploadImageFnc;

document.getElementById("extractBtn").onclick = async () => {
    let width;
    let height;
    if (ratio == "Auto") {
        let width1 = Math.abs(
            cornerPoints.topRightCorner.x - cornerPoints.topLeftCorner.x
        );
        let width2 = Math.abs(
            cornerPoints.bottomRightCorner.x - cornerPoints.bottomLeftCorner.x
        );
        let widthAvg = (width1 + width2) / 2;
        let height1 = Math.abs(
            cornerPoints.bottomLeftCorner.y - cornerPoints.topLeftCorner.y
        );
        let height2 = Math.abs(
            cornerPoints.bottomRightCorner.y - cornerPoints.topRightCorner.y
        );
        let heightAvg = (height1 + height2) / 2;
        width = widthAvg;
        height = heightAvg;
        console.log("AUTO", width, height, " -> RATIO: ", width / height);
    } else if (landscape == "true") {
        width = RATIO_TABLE[ratio][0];
        height = RATIO_TABLE[ratio][1];
    } else {
        width = RATIO_TABLE[ratio][1];
        height = RATIO_TABLE[ratio][0];
    }

    const extractCanvas = scanner.extractPaper(
        result,
        width,
        height,
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
};

document.getElementById("shareBtn").onclick = async () => {
    const data = exportCanvas.toDataURL("image/png");
    // Convert base64 to Blob
    const response = await fetch(data);
    const blob = await response.blob();

    /* let date = new Date().toISOString().slice(0, 19).replace("T", " ");
    let fileName = "Scanned Whiteboard " + date + ".png"; */

    let date = new Date()
        .toISOString()
        .slice(0, 19)
        .replace("T", " ")
        .replace(/:/g, "-");
    let fileName = "Scanned Whiteboard " + date + ".png";

    // Create a File object
    const file = new File([blob], fileName, { type: "image/png" });
    await navigator.share({
        files: [file],
    });
};

// SEND IMG TO SERVER
document.getElementById("pushShareBtn").onclick = async () => {
    if (document.getElementById("pushShareBtn").classList.contains("disabled"))
        return;

    const base64 = exportCanvas.toDataURL("image/png", 1);
    // Convert base64 to Blob

    console.log("SUBSCRIPTION", window.subscription);
    if (!window.subscription) {
        alert(
            "WhiteboardScanner\n\nFehler: Subscription existiert nicht! Bitte Push Sharing aktivieren."
        );
        return;
    }

    var uploadingNotification = new Notification("Push-Share", {
        body: "Datei wird hochgeladen...",
    });

    await fetch("https://nas.zorrle001.dev/global_push_share", {
        method: "post",
        headers: {
            "Content-type": "application/json",
        },
        body: JSON.stringify({
            subscription: window.subscription,
            base64: base64,
        }),
    });

    uploadingNotification.close();
    var successNotification = new Notification("Push-Share", {
        body: "Datei wurde erfolgreich geteilt",
    });
    setTimeout(function () {
        successNotification.close();
    }, 1000);
};

document.getElementById("pushShareShareBtn").onclick = async () => {
    pushShareCanvas.width = pushShareImage.naturalWidth;
    pushShareCanvas.height = pushShareImage.naturalHeight;
    pushShareCanvas
        .getContext("2d")
        .drawImage(
            pushShareImage,
            0,
            0,
            pushShareImage.naturalWidth,
            pushShareImage.naturalHeight
        );
    const data = pushShareCanvas.toDataURL("image/png");
    // Convert base64 to Blob
    const response = await fetch(data);
    const blob = await response.blob();

    let date = new Date().toISOString().slice(0, 19).replace("T", " ");
    let fileName = "Scanned Whiteboard " + date + ".png";

    // Create a File object
    const file = new File([blob], fileName, { type: "image/png" });
    await navigator.share({
        files: [file],
    });
};

document.getElementById("flipYBtn").onclick = () => {
    flipResult(false, true);
};

document.getElementById("flipXBtn").onclick = () => {
    flipResult(true, false);
};

var draggedPoint = null;
var dragOffset = { x: 0, y: 0 };

cornerPointCanvas.onpointerdown = (e) => {
    e.preventDefault();
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
    e.preventDefault();

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
    if (draggedPoint != null) {
        e.preventDefault();
    }
    draggedPoint = null;

    dragOffset = { x: 0, y: 0 };
};

window.onresize = () => {
    drawCornerPointsFrame();
};

function clamp(number, min, max) {
    return Math.min(Math.max(number, min), max);
}

function remToPx(rem) {
    return (
        rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
    );
}

function flipResult(flipX, flipY) {
    if (flipX == false && flipY == false) {
        resultCtx.drawImage(result, 0, 0, result.width, result.height);
    } else if (flipY == true && flipX == false) {
        resultCtx.save();
        resultCtx.scale(-1, 1);
        resultCtx.drawImage(result, 0, 0, result.width * -1, result.height);
        resultCtx.restore();
    } else if (flipY == false && flipX == true) {
        resultCtx.save();
        resultCtx.scale(1, -1);
        resultCtx.drawImage(result, 0, 0, result.width, result.height * -1);
        resultCtx.restore();
    } else {
        resultCtx.save();
        resultCtx.scale(-1, -1);
        resultCtx.drawImage(
            result,
            0,
            0,
            result.width * -1,
            result.height * -1
        );
        resultCtx.restore();
    }
}

function startEditorFunctions() {
    const noStoredCornerPoints = localStorage.getItem("noStoredCornerPoints");

    if (noStoredCornerPoints != null || cornerPoints == null) {
        cornerPoints = {
            topLeftCorner: { x: 0, y: 0 },
            topRightCorner: { x: result.width, y: 0 },
            bottomRightCorner: { x: result.width, y: result.height },
            bottomLeftCorner: { x: 0, y: result.height },
        };
    }

    drawCornerPointsFrame();
}

function drawCornerPointsFrame() {
    if (cornerPoints == null) return;

    cornerPointCanvas.width = result.width;
    cornerPointCanvas.height = result.height;
    const adjustFactor =
        cornerPointCanvas.width /
        parseFloat(getComputedStyle(cornerPointCanvas)["width"]);

    cornerPointCtx.strokeStyle = "orange";
    cornerPointCtx.lineWidth = remToPx(0.2) * adjustFactor;
    cornerPointCtx.lineCap = "round";

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
