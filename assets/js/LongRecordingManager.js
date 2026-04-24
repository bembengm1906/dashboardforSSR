const buttonIds = ["btn1", "btn2", "btn3", "btn4", "btn5", "btn6", "btn7", "btn8", "btn9"];
$(document).ready(function () {
    let isLocked = true;
    let currentState = "idle";  // Global variable

    // 1. Prepare the class sequence
    const classes = ["STOP", "GO", "LEFT", "RIGHT", "UP", "DOWN"];
    let classSequence = [];
    classes.forEach(cls => {
        for (let i = 0; i < 10; i++) classSequence.push(cls);
    });
    // Shuffle the array
    classSequence = classSequence.sort(() => Math.random() - 0.5);

    let cycle = 0;
    let recordingActive = false;
    let recordingStartTime;
    let dataCache = {};
    let isRunning = false;

    function resetLabelButtons() {
        buttonIds.forEach((btnId) => {
            $("#" + btnId).css("border", "3px solid transparent");
            $("#" + btnId).css("font-weight", "normal");
        });

        let editingButton = $(".in-edit-mode");
        if (editingButton.length) {
            let originalText = editingButton.find('.btn-edit-input').val();
            editingButton.text(originalText).removeClass("in-edit-mode");
        }
    }

    function setLabelButtons() {
        resetLabelButtons();
        $("#btn9").css("border", "3px solid #77F2A1");
        $("#btn9").css("font-weight", "bold");
    }

    setLabelButtons();

    $("#lockButton").click(function () {
        isLocked = !isLocked;

        if (isLocked) {
            $(this).html('<i class="bi bi-lock"></i>');
            $(this).addClass("btn-stop");
            $(this).removeClass("btn-play");
            setLabelButtons();
        } else {
            $(this).html('<i class="bi bi-unlock"></i>');
            $(this).removeClass("btn-stop");
            $(this).addClass("btn-play");
            resetLabelButtons();

            $("#btn1").click();
        }
    });

    $('#startRecordingButton').click(() => { startRecording() });
    $('#stopRecordingButton').click(() => { stopRecording() });

    function startRecording() {
        if (isRunning) return;
        isRunning = true;
        recordingActive = true;
        cycle = 0;

        // Shuffle the class sequence for each recording
        classSequence = [];
        classes.forEach(cls => {
            for (let i = 0; i < 10; i++) classSequence.push(cls);
        });
        classSequence = classSequence.sort(() => Math.random() - 0.5);

        recordingStartTime = new Date().toISOString();

        if (!isLocked) { $('#lockButton').click() }

        $('#startRecordingButton').addClass("d-none");
        $('#stopRecordingButton').removeClass("d-none");

        $(".is-record-enabled").prop('disabled', true);

        fetch("http://localhost:5000/start_collection", { method: "POST" });

        let countdown = 2;
        $("#countdownDisplay").text(`Starting in ${countdown}s`);
        $("#stateDisplay").text("Preparing...");
        currentState = "preparation";

        let countdownInterval = setInterval(() => {
            countdown--;
            $("#countdownDisplay").text(`Starting in ${countdown}s`);

            if (countdown <= 0) {
                clearInterval(countdownInterval);
                $("#countdownDisplay").text("");
                runExperimentCycles();
            }
        }, 1000);
    }

    function runExperimentCycles() {
        if (!recordingActive) return;

        if (cycle >= classSequence.length) {
            currentState = "finished";
            $("#stateDisplay").text("Experiment Complete!");
            $("#timeLeftDisplay").text("");

            setTimeout(() => {
                $("#stateDisplay").text("Finalizing...");
                stopRecording();
            }, 2000);
            return;
        }

        currentState = "idle";
        $("#stateDisplay").text("IDLE");
        fetch("http://localhost:5000/play_idle_beep", { method: "POST" });

        setTimeout(() => {
            // 2. Set currentState to the next class
            currentState = classSequence[cycle];
            $("#stateDisplay").text(currentState);
            fetch("http://localhost:5000/play_command_beep", { method: "POST" });

            setTimeout(() => {
                cycle++;
                runExperimentCycles();
            }, 2000);  // COMMAND duration
        }, 2000);  // IDLE duration
    }

    function stopRecording() {
        recordingActive = false;
        isRunning = false;

        $('#startRecordingButton').removeClass("d-none");
        $('#stopRecordingButton').addClass("d-none");
        $(".is-record-enabled").prop('disabled', false);

        fetch("http://localhost:5000/stop_collection", { method: "POST" });

        generateAndDownloadCSV(dataCache, recordingStartTime);
        dataCache = {};  // Reset data cache after download
    }

    openEarable.sensorManager.subscribeOnSensorDataReceived((sensorData) => {
        if (!recordingActive) return;

        if (!dataCache[sensorData.timestamp]) {
            dataCache[sensorData.timestamp] = {
                acc: [],
                gyro: [],
                mag: [],
                pressure: "",
                temperature: "",
                state: currentState  // <-- explicitly set current state here
            };
        }

        switch (sensorData.sensorId) {
            case 0:
                dataCache[sensorData.timestamp].acc = [-sensorData.ACC.X, sensorData.ACC.Z, sensorData.ACC.Y];
                dataCache[sensorData.timestamp].gyro = [-sensorData.GYRO.X, sensorData.GYRO.Z, sensorData.GYRO.Y];
                dataCache[sensorData.timestamp].mag = [-sensorData.MAG.X, sensorData.MAG.Z, sensorData.MAG.Y];
                break;

            case 1:
                dataCache[sensorData.timestamp].pressure = sensorData.BARO.Pressure;
                dataCache[sensorData.timestamp].temperature = sensorData.TEMP.Temperature;
                break;
        }
    });

    function generateAndDownloadCSV(dataCache, recordingStartTime) {
        generateAndDownloadIMUCSV(dataCache, recordingStartTime);
        generateAndDownloadTempPressCSV(dataCache, recordingStartTime);
    }

    // Helper function to generate and download IMU CSV
    function generateAndDownloadIMUCSV(dataCache, recordingStartTime) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "timestamp,state,acc_x,acc_y,acc_z,gyro_x,gyro_y,gyro_z,mag_x,mag_y,mag_z\n";
        for (let timestamp in dataCache) {
            let entry = dataCache[timestamp];
            // Only write row if all sensor arrays are present and have 3 values
            if (
                Array.isArray(entry.acc) && entry.acc.length === 3 &&
                Array.isArray(entry.gyro) && entry.gyro.length === 3 &&
                Array.isArray(entry.mag) && entry.mag.length === 3
            ) {
                csvContent += [
                    timestamp,
                    entry.state,
                    entry.acc[0], entry.acc[1], entry.acc[2],
                    entry.gyro[0], entry.gyro[1], entry.gyro[2],
                    entry.mag[0], entry.mag[1], entry.mag[2]
                ].join(",") + "\n";
            }
        }
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `IMU_${recordingStartTime}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Helper function to generate and download Temperature/Pressure CSV
    function generateAndDownloadTempPressCSV(dataCache, recordingStartTime) {
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "timestamp,state,pressure,temperature\n";
        for (let timestamp in dataCache) {
            let entry = dataCache[timestamp];
            csvContent += [
                timestamp,
                entry.state,
                entry.pressure,
                entry.temperature
            ].join(",") + "\n";
        }
        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `TempPress_${recordingStartTime}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
