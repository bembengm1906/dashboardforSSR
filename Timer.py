import time
import winsound  # For Windows, use 'playsound' for cross-platform support

def start_timer(move_duration=1, rest_duration=5, cycles=10):
    """Guides participants with a timer for movement and rest phases."""
    for cycle in range(cycles):
        print(f"Cycle {cycle + 1}: MOVE for {move_duration} second(s)")
        winsound.Beep(1000, 500)  # Beep to indicate start
        time.sleep(move_duration)
        
        print(f"Cycle {cycle + 1}: REST for {rest_duration} second(s)")
        winsound.Beep(500, 500)  # Lower tone beep for rest
        time.sleep(rest_duration)
    
    print("Session complete!")
    winsound.Beep(1500, 1000)  # Final beep to indicate end

# Example usage
start_timer(move_duration=1, rest_duration=2, cycles=30)
