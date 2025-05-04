const pushSharingCheckbox = document.querySelector("#pushSharingCheckbox");

function loadActivePushShareSettings() {
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

    localStorage.setItem("pushSharingCheckbox", pushSharingCheckbox.checked);
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

        alert(
            "WhiteboardScanner\n\nPush Share wurde deaktiviert. Du erhälst nun keine Push-Benachrichtigungen mehr."
        );
    }
});

function randomNotification() {
    const notifTitle = "Push Share";
    const notifBody = `Push Share wurde aktiviert. Du erhälst nun Push-Benachrichtigungen`;
    const notifImg = `icons/PushShare.png`;
    const options = {
        body: notifBody,
        icon: notifImg,
    };
    new Notification(notifTitle, options);
}
