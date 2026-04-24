from flask import Flask, request, jsonify
import platform
import time
import simpleaudio as sa

# Define paths for your audio files
IDLE_SOUND_PATH = 'idle.wav'
COMMAND_SOUND_PATH = 'command.wav'

# if platform.system() == "Windows":
#     import winsound  # Windows beep support

app = Flask(__name__)
recording_active = False

@app.route("/play_idle_beep", methods=["POST"])
def play_idle_beep():
    """ Plays a normal beep for IDLE state """
    try:
        print("State: IDLE")
        # if platform.system() == "Windows":
        #     winsound.Beep(1000, 300)  # IDLE beep
        # else:
        #     print("\a")
        wave_obj = sa.WaveObject.from_wave_file(IDLE_SOUND_PATH)
        wave_obj.play()
        return jsonify({"status": "idle beep played"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/play_command_beep", methods=["POST"])
def play_command_beep():
    """ Plays a louder beep for COMMAND state """
    try:
        print("State: COMMAND")
        # if platform.system() == "Windows":
        #     winsound.Beep(2000, 500)  # COMMAND beep
        # else:
        #     print("\a")
        wave_obj = sa.WaveObject.from_wave_file(COMMAND_SOUND_PATH)
        wave_obj.play()
        return jsonify({"status": "command beep played"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/start_collection", methods=["POST"])
def start_collection():
    global recording_active
    recording_active = True
    print("✅ Data Collection Started")
    return jsonify({"status": "started"})

@app.route("/stop_collection", methods=["POST"])
def stop_collection():
    global recording_active
    recording_active = False
    print("⏹ Data Collection Stopped")
    return jsonify({"status": "stopped"})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
