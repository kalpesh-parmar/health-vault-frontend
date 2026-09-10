/* eslint-disable no-undef */
import '@testing-library/react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: (props) => React.createElement(Text, props, props.name),
    MaterialIcons: (props) => React.createElement(Text, props, props.name),
    MaterialCommunityIcons: (props) => React.createElement(Text, props, props.name),
    FontAwesome: (props) => React.createElement(Text, props, props.name),
    Feather: (props) => React.createElement(Text, props, props.name),
  };
});

// Mock Expo Speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  isSpeakingAsync: jest.fn().mockResolvedValue(false),
}));

// Mock Expo Speech Recognition
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: {
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    start: jest.fn(),
    stop: jest.fn(),
    abort: jest.fn(),
  },
  useSpeechRecognitionEvent: jest.fn(),
}));

// Mock Toast Message
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
  hide: jest.fn(),
}));
