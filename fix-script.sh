cd ios
mkdir -p BlissAlarmClock/Supporting
touch BlissAlarmClock/Supporting/Expo.plist

# Create a simple Podfile.lock checksum
echo "PODFILE CHECKSUM: $(md5 -q Podfile)" > Podfile.lock.new
cat Podfile.lock >> Podfile.lock.new
mv Podfile.lock.new Podfile.lock

