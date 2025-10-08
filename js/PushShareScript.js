function loadPushShare() {
	const pushSharingCheckbox = document.querySelector("#pushSharingCheckbox");

	const pushSharingEnabled =
		localStorage.getItem("pushSharingCheckbox") === "true";

	if (pushSharingEnabled) {
		if (!window.subscription) {
			console.error(
				"Push Share Subscription konnte nicht aktiviert werden. Subscription existiert nicht!"
			);
		} else {
			fetch("https://nas.zorrle001.dev/activation", {
				method: "post",
				headers: {
					"Content-type": "application/json",
				},
				body: JSON.stringify({
					subscription: window.subscription,
					active: true,
				}),
			});
			pushSharingCheckbox.checked = true;
			console.log("Push Share Subscription wurde aktiviert.");
			if (!document.body.classList.contains("offline")) {
				document
					.getElementById("pushShareBtn")
					.classList.remove("disabled");
			}
		}
	}

	pushSharingCheckbox.addEventListener("change", function () {
		console.log("Checkbox changed:", pushSharingCheckbox.checked);

		if (!("Notification" in window)) {
			alert(
				"WhiteboardScanner\n\nBitte füge die App auf deinen Homescreen hinzu, um diese Funktion nutzen zu können"
			);
			return;
		}

		localStorage.setItem(
			"pushSharingCheckbox",
			pushSharingCheckbox.checked
		);
		if (pushSharingCheckbox.checked) {
			//alert("Push sharing enabled. You will receive notifications.");

			Notification.requestPermission().then((result) => {
				if (result === "granted") {
					//randomNotification();

					console.log("Subscription", window.subscription);
					if (!window.subscription) {
						alert(
							"WhiteboardScanner\n\nFehler: Subscription existiert nicht!"
						);
						pushSharingCheckbox.checked = false;
						return;
					}

					fetch("https://nas.zorrle001.dev/activation", {
						method: "post",
						headers: {
							"Content-type": "application/json",
						},
						body: JSON.stringify({
							subscription: window.subscription,
							active: true,
						}),
					});

					fetch("https://nas.zorrle001.dev/send_notification", {
						method: "post",
						headers: {
							"Content-type": "application/json",
						},
						body: JSON.stringify({
							subscription: window.subscription,
							payload: "Neues Gerät für Push-Share registriert",
							ttl: 60 * 3,
						}),
					});

					document
						.getElementById("pushShareBtn")
						.classList.remove("disabled");

					alert(
						"WhiteboardScanner\n\nPush Share wurde aktiviert. Du erhälst nun Push-Benachrichtigungen."
					);
				} else {
					pushSharingCheckbox.checked = false;

					alert(
						"WhiteboardScanner\n\nFehler: Push Share konnte nicht aktiviert werden. Bitte erlaube die Benachrichtigungen in den Einstellungen deines Browsers."
					);
				}
				console.log(result);
			});
		} else {
			fetch("https://nas.zorrle001.dev/activation", {
				method: "post",
				headers: {
					"Content-type": "application/json",
				},
				body: JSON.stringify({
					subscription: window.subscription,
					active: false,
				}),
			});

			document.getElementById("pushShareBtn").classList.add("disabled");

			alert(
				"WhiteboardScanner\n\nPush Share wurde deaktiviert. Du erhälst nun keine Push-Benachrichtigungen mehr."
			);
		}
	});
}
