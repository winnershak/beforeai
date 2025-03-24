#!/bin/bash

# Create the destination directory if it doesn't exist
mkdir -p ios/BlissAlarm/sounds

# Copy sound files to the iOS project directory
cp assets/sounds/*.caf ios/BlissAlarm/sounds/
cp assets/sounds/*.mp3 ios/BlissAlarm/sounds/

echo "Sound files copied to iOS project directory" 