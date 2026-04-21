import Constants from 'expo-constants';

export const ENV = {
  BASE_URL: Constants.expoConfig?.extra?.BASE_URL,
};

if (!ENV.BASE_URL) {
  throw new Error('BASE_URL missing');
}