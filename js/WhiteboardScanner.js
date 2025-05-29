const scanner = new jscanify();
const result = document.getElementById("result");
const exportCanvas = document.getElementById("exportCanvas");
const pushShareCanvas = document.getElementById("pushShareCanvas");
const pushShareImage = document.getElementById("pushShareImage");

const resultCtx = result.getContext("2d");
const exportCanvasCtx = exportCanvas.getContext("2d");
const cornerPointCanvas = document.getElementById("cornerPointCanvas");
const cornerPointCtx = cornerPointCanvas.getContext("2d");
const cornerPointCircleCanvas = document.getElementById(
	"cornerPointCircleCanvas"
);
const cornerPointCircleCtx = cornerPointCircleCanvas.getContext("2d");

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
		document.body.classList.remove("showCornerZoomCanvas");

		const cornerZoomWrapper = document.getElementById("cornerZoomWrapper");
		cornerZoomWrapper.style.setProperty("top", "-100vw");
		cornerZoomWrapper.style.setProperty("left", "-100vh");
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

			e.target.value = "";
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
document.getElementById("pushShareBtn").onclick = () => {
	if (document.getElementById("pushShareBtn").classList.contains("disabled"))
		return;

	document.getElementById("pushShareBtn").classList.add("disabled");
	document.getElementById("pushShareBtn").classList.add("loading");
	document.getElementById("pushShareBtn").offsetHeight; // Trigger reflow

	setTimeout(async () => {
		const base64 = exportCanvas.toDataURL("image/png", 1);
		// Convert base64 to Blob

		console.log("SUBSCRIPTION", window.subscription);
		if (!window.subscription) {
			alert(
				"WhiteboardScanner\n\nFehler: Subscription existiert nicht! Bitte Push Sharing aktivieren."
			);
			return;
		}

		await fetch("https://nas.zorrle001.dev/global_push_share", {
			method: "post",
			headers: {
				"Content-type": "application/json",
			},
			body: JSON.stringify({
				subscription: window.subscription,
				base64: base64,
				name: window.pushShareName,
			}),
		});

		document.getElementById("pushShareBtn").classList.remove("disabled");
		document.getElementById("pushShareBtn").classList.remove("loading");

		var successNotification = new Notification("Push-Share", {
			body: "Datei wurde erfolgreich geteilt",
		});
		setTimeout(() => {
			successNotification.close();
		}, 2000);
	}, 0);
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
var storedDraggedPoint = null;
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
	storedDraggedPoint = closestPoint;

	document.body.classList.add("showCornerZoomCanvas");

	drawCornerZoomCanvas(cornerPoints[closestPoint]);
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

	document.body.classList.remove("showCornerZoomCanvas");
};

function drawCornerZoomCanvas(point) {
	const cornerZoomCanvas = document.getElementById("cornerZoomCanvas");
	const cornerZoomWrapper = document.getElementById("cornerZoomWrapper");
	const cornerZoomCtx = cornerZoomCanvas.getContext("2d");

	const { x, y } = point;
	//console.log("drawCornerZoomCanvas", x, y, point);

	// FORMEL: (radius - lineWidth / 2)
	// INNER CIRCLE
	const circleWidth = 6.5;
	// REAL PIXEL TO IMG PIXEL
	const adjustFactor =
		cornerPointCanvas.width /
		parseFloat(getComputedStyle(cornerPointCanvas)["width"]);

	const zoomSize = circleWidth * adjustFactor;

	//const zoomSize = 16;
	cornerZoomCanvas.width = 2 * zoomSize;
	cornerZoomCanvas.height = 2 * zoomSize;
	// ADD ADJUST VALUE -> RESOLUTION FIXED SIZE

	const imageData = resultCtx.getImageData(
		x - zoomSize + 1,
		y - zoomSize + 1,
		2 * zoomSize,
		2 * zoomSize
	);

	const vpX = (x / cornerPointCanvas.width) * cornerPointCanvas.clientWidth;
	const vpY = (y / cornerPointCanvas.height) * cornerPointCanvas.clientHeight;

	/*const x =
		((e.pageX - rect.left) / cornerPointCanvas.clientWidth) *
		cornerPointCanvas.width;
	const y =
		((e.pageY - rect.top) / cornerPointCanvas.clientHeight) *
		cornerPointCanvas.height;
	console.log("DOWN", x, y);*/

	const rect = cornerPointCanvas.getBoundingClientRect();
	const canvasContainerRect = document
		.getElementById("canvasContainer")
		.getBoundingClientRect();

	const yFromTop = vpY + rect.top - canvasContainerRect.top;
	const xFromLeft = vpX + rect.left - canvasContainerRect.left;

	//console.log(yFromTop, xFromLeft);

	cornerZoomWrapper.style.setProperty(
		"top",
		yFromTop /* - zoomSize - remToPx(0.2) */ + "px"
	);
	cornerZoomWrapper.style.setProperty(
		"left",
		xFromLeft /* - zoomSize - remToPx(0.2) */ + "px"
	);
	cornerZoomCtx.putImageData(imageData, 0, 0);
}

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

	let useDefaultFrame = false;

	if (noStoredCornerPoints != null || cornerPoints == null) {
		useDefaultFrame = true;
	} else {
		for (const pointKey in cornerPoints) {
			const point = cornerPoints[pointKey];
			if (
				point.x < 0 ||
				point.x > result.width ||
				point.y < 0 ||
				point.y > result.height
			) {
				console.log("Current Frame out of canvas");
				useDefaultFrame = true;
				break;
			}
		}
	}

	if (useDefaultFrame == true) {
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
	cornerPointCircleCanvas.width = result.width;
	cornerPointCircleCanvas.height = result.height;
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
	cornerPointCtx.closePath();

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
	cornerPointCtx.closePath();

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
	cornerPointCtx.closePath();

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
	cornerPointCtx.closePath();

	cornerPointCtx.strokeStyle = "orange";

	cornerPointCircleCtx.strokeStyle = "orange";
	cornerPointCircleCtx.lineWidth = remToPx(0.2) * adjustFactor;
	cornerPointCircleCtx.lineCap = "round";
	for (const pointKey in cornerPoints) {
		const point = cornerPoints[pointKey];
		cornerPointCircleCtx.beginPath();
		cornerPointCircleCtx.arc(
			point.x,
			point.y,
			remToPx(0.5) * adjustFactor,
			0,
			2 * Math.PI
		);
		cornerPointCircleCtx.fillStyle = "rgba(255, 166, 0, 0.25)";
		cornerPointCircleCtx.fill();
		cornerPointCircleCtx.stroke();
		cornerPointCircleCtx.closePath();
	}

	if (storedDraggedPoint) {
		drawCornerZoomCanvas(cornerPoints[storedDraggedPoint]);
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

document.getElementById("historyBtn").onclick = () => {
	fetch("https://nas.zorrle001.dev/last_global_push_share_file_name")
		.catch((err) => {
			console.error("Error fetching last file name:", err);
			window.alert(
				"WhiteboardScanner\n\nFehler beim Abrufen der letzten Datei: " +
					err
			);
			throw err;
		})
		.then((response) => {
			if (response.status == 200) {
				return response.text();
			} else {
				console.error("Error fetching last file name:", response);
				window.alert(
					"WhiteboardScanner\n\nFehler beim Abrufen der letzten Datei: " +
						response.statusText
				);
				throw new Error(response.statusText);
			}
		})
		.then((pushShareID) => {
			console.log("Push Share ID:", pushShareID);
			document.body.classList.add("showPushSharePage");
			document.getElementById("pushShareIDText").innerText = pushShareID;

			document.getElementById("pushShareImage").src = "";
			document.getElementById(
				"pushShareImage"
			).src = `https://nas.zorrle001.dev/image/${encodeURIComponent(
				pushShareID
			)}`;
		});
};
