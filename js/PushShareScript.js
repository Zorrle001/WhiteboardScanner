const pushSharingCheckbox = document.querySelector("#pushSharingCheckbox");

const pushSharingEnabled =
    localStorage.getItem("pushSharingCheckbox") === "true";

if (pushSharingEnabled) {
    pushSharingCheckbox.checked = true;
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

                alert(
                    "Push sharing enabled. You will now receive notifications."
                );
                if (!window.subscription) {
                    alert("Subscription does not exist!");
                } else {
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
                }
            } else {
                pushSharingCheckbox.checked = false;

                alert(
                    "Push share could not be activated. Please check your settings."
                );
            }
            console.log(result);
        });
    } else {
        alert("Push sharing disabled. You will not receive notifications.");
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
