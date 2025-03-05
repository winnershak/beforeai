export default function BottomTabNavigator() {
  return (
    <BottomTab.Navigator>
      <BottomTab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ /* your options */ }}
      />
      <BottomTab.Screen 
        name="Alarms" 
        component={AlarmsScreen} 
        options={{ /* your options */ }}
      />
      <BottomTab.Screen 
        name="Settings" 
        component={SettingsScreen} 
        options={{ /* your options */ }}
      />
    </BottomTab.Navigator>
  );
} 