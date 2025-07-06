import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, View } from 'react-native';

import PhoneSignupScreen from './src/components/SignUp';
import PhoneLoginScreen from './src/components/LogIn';
import Home from './src/components/Home';
import SeekHelp from './src/components/SeekHelp';
import Profile from './src/components/Profile';
import Feed from './src/components/Feed';
import Notifications from './src/components/Notifications';

const Stack = createStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        setInitialRoute(token ? 'Home' : 'Login');
      } catch (error) {
        console.error('Auth check failed', error);
        setInitialRoute('Login');
      }
    };

    checkAuth();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignUp" component={PhoneSignupScreen} />
        <Stack.Screen name="Login" component={PhoneLoginScreen} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="SubmitIssue" component={SeekHelp}/>
        <Stack.Screen name="Profile" component={Profile}/>
        <Stack.Screen name="Feed" component={Feed}/>
        <Stack.Screen name="Notifications" component={Notifications}/>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
