# AGENT.md

## 1. Project Overview
- **Application Name**: `documentsvaultapp` (Brand name: Health Vault)
- **Purpose**: A secure React Native mobile health vault designed to manage medical records, schedule medications, track dosage reminders with push notifications, and support context-guided AI RAG health chats.
- **Major Modules/Features**:
  - **Authentication**: Firebase Phone Auth with 6-digit SMS OTP verification and session token persistence.
  - **Onboarding**: Conversational chatbot onboarding step-flow driven by a backend state machine.
  - **Documents Vault**: Categories division, OCR extraction, document uploads, and PDF previews.
  - **Medication Scheduling**: Medicine configuration, quantities tracking, and daily dose alerts.
  - **AI RAG Chat**: Thread-grouped medical document query answering and report summaries.
  - **Notifications**: Expo-notifications mapping for dose warnings and push notification channels.
- **High-Level Architecture**: Expo-managed React Native app using React Navigation for page routing, Axios for API communications, and React Query/Context for state synchronization.

---

## 2. Tech Stack
- **React Native version**: `0.81.5` under Expo `~54.0.35`
- **JavaScript or TypeScript**: TypeScript (`~5.9.2`)
- **State Management**: `@tanstack/react-query` (v5) and Context API (`AuthContext`, `ThemeContext`)
- **Navigation**: `@react-navigation/native` (v7) with Stack, Drawer, and Bottom Tab configurations
- **API Client**: Axios (`^1.15.2`)
- **Firebase Services**: `@react-native-firebase/app` (v24), `@react-native-firebase/auth` (v24), `@react-native-firebase/messaging` (v24)
- **Storage Libraries**: `@react-native-async-storage/async-storage` (v2), `expo-secure-store` (v15)
- **UI Libraries**: `styled-components/native` (v6), `react-native-reanimated` (v4), `lottie-react-native` (v7), `@gorhom/bottom-sheet` (v5), `react-native-toast-message` (v2)
- **Testing Libraries**: Not Found
- **Android/iOS Build Tools**: Expo Application Services (EAS) CLI, Android Gradle, and CocoaPods (via Expo prebuild)

---

## 3. Folder Structure
```text
health-vault-frontend/
├── android/                # Native Android project files (generated on build)
├── assets/                 # Local image, font, and animation assets
├── src/
│   ├── components/         # Feature UI components (auth/, shared/, chat/)
│   ├── config/             # Config files (toast configurations, API urls, React Query)
│   ├── constants/          # Static constants (API endpoints, theme styles)
│   ├── context/            # React Context Providers (theme, auth exports)
│   ├── firebase/           # Firebase initialization config
│   ├── hooks/              # Custom hooks (useAuth, useDocumentMedia)
│   ├── navigation/         # Navigators (RootNavigator, AuthNavigator, Drawer)
│   ├── screens/            # Application screens (auth/, AppScreens/)
│   ├── services/           # Api communications layer (apiClient, auth.service)
│   ├── store/              # Context stores (AuthContext)
│   ├── theme/              # Styles theme configuration
│   ├── types/              # TypeScript typings (index.ts, navigation.ts)
│   ├── utils/              # Helper utilities (documentValidator, auth.utils)
│   └── validations/        # User input validators (auth.validation)
```

---

## 4. Frontend Data Model Summary
- **User** (`src/types/index.ts`): Represents patient details (`id`, `firstName`, `lastName`, `fullName`, `userName`, `email`, `phone`, `dateOfBirth`, `gender`, `patientCode`, `bloodGroup`, `allergies`, `profileImageKey`, `isVerified`, `status`).
- **MedicalDocument** (`src/types/index.ts`): Represents health files (`id`, `fileName`, `category`, `createdAt`, `imageUri`, `s3Key`, `AISummary`, `notes`, `fileSize`).
- **Reminder** (`src/types/index.ts`): Tracks scheduled dose instances (`id`, `patientId`, `medicationId`, `medicationName`, `medicationType`, `dosePerIntake`, `frequency`, `actualMedicationTime`, `completedAt`, `isOverdue`, `status`).
- **AddOrEditMedication** (`src/types/index.ts`): Represents medication fields (`medicationName`, `medicationType`, `prescribedBy`, `dosePerIntake`, `frequency`, `medicationSchedule`, `ongoing`, `totalQuantity`, `unit`, `notes`).

---

## 5. API Architecture
- **Base URL**: Set via `EXPO_PUBLIC_API_URL` environment variable (defaults to `http://localhost:3000`).
- **Axios Configuration**: Default timeout is set to 90 seconds.
- **Interceptors**:
  - **Request**: Injects the JWT Access Token `Authorization: Bearer <token>` from `SecureStore`. Rejects outgoing requests if `isForceLoggedOut` is active, except for authentication endpoints.
  - **Response**: Triggers `triggerForceLogout` on `401` responses containing `forceLogout: true` or `errorCode: "SESSION_EXPIRED"`, clearing tokens and storage (except for auth requests).
- **Service Layer**: Decoupled domain files under `src/services/` wrapping API groupings (auth, document, medication, reminder, notifications, file, user).

---

## 6. Authentication Flow
- **Splash Flow**: Renders `AnimatedSplashScreen`. Once completed, checks for `storedRefreshToken` and `storedUserId` in `SecureStore` to restore the user session.
- **Login**: User enters mobile number (`MobileLoginScreen`) -> signs in using Firebase phone auth (`signInWithPhoneNumber`).
- **OTP**: User inputs the 6-digit code (`OtpVerificationScreen`) -> confirms credentials via Firebase -> posts Firebase ID Token to `/auth/firebase-login` -> receives JWT access/refresh tokens.
- **Token Storage**: Access/Refresh tokens, user ID, and refresh anchor dates are securely stored in `SecureStore` (and session tokens in AsyncStorage).
- **Logout**: Triggers `/auth/logout`, clears SecureStore/AsyncStorage, and resets the local context state.
- **Session Expiration**: Intercepted in response middleware, redirecting the user back to the login screen.

---

## 7. Coding Standards
- **Naming Conventions**:
  - Components & Component Files: PascalCase (e.g. `MobileLoginScreen.tsx`, `PhoneInput.tsx`).
  - Hooks, Services & Utilities: camelCase (e.g. `useAuth.ts`, `auth.service.ts`, `auth.utils.ts`).
  - Constants: UPPER_SNAKE_CASE (e.g. `AUTH_ENDPOINTS`).
- **Imports**: Grouped by external library imports followed by internal paths.
- **Styling**: Structured styled-components (`styled.Text`, `styled.View`) referencing global theme tokens.
- **Error Handling**: Wrapped in try/catch blocks; API errors display standard warning toasts.

---

## 8. Environment Variables
- `EXPO_PUBLIC_API_URL`: Target backend base URL.
- `EXPO_PUBLIC_ENABLE_API_LOGS`: Boolean string to toggle request/response logging.
- `EXPO_PUBLIC_FIREBASE_API_KEY`: Firebase API key credentials.
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` / `EXPO_PUBLIC_FIREBASE_PROJECT_ID` / `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` / `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` / `EXPO_PUBLIC_FIREBASE_APP_ID`: Target Firebase application parameters.

---

## 9. Build and Run Commands
- **Install Dependencies**: `npm install`
- **Start Metro Bundler**: `npm run start` (or `npx expo start`)
- **Run Android Emulator**: `npm run android`
- **Run iOS Simulator**: `npm run ios`
- **Build APK / AAB**: Executed via EAS CLI:
  `eas build --platform android --profile development` (Debug APK)
  `eas build --platform android --profile production` (Release AAB/APK)
- **Environment Prerequisites**: Node.js `20+`, JDK `17`, Gradle `8.x`, and Android SDK Build Tools.

---

## 10. Important Business Rules
- **Phone Validation**: Inputs must contain exactly 10 digits (`auth.validation.ts`). Numbers are formatted to the E.164 standard (`+91` prefix) on submission.
- **Medical Document Check**: Client-side validation uses `react-native-mlkit-ocr` to check images for medical keywords before uploading (PDF files bypass this check).
- **Onboarding Step Sequencing**: Step transitions are strictly managed by the backend. The UI maps conversational responses directly to the `/v1/onboarding/chat` inputs.
- **Storage Cleanup**: Force-logout clears all local session identifiers from AsyncStorage and SecureStore to prevent stale API loops.

---

## 11. Common Utilities
- **`auth.utils.ts`**: Handles country-code prefix formatting (`formatPhoneNumberE164`) and phone number masking (`maskPhoneNumber`).
- **`documentValidator.ts`**: Detects document type based on OCR keywords using MLKit (`isValidMedicalDocument`).

---

## 12. AI Development Guidelines
- **Analyze existing frontend architecture before coding.**
- **Reuse existing components, hooks, services, and utilities.**
- **Never create duplicate components.**
- **Never create duplicate services.**
- **Never create duplicate hooks.**
- **Never create duplicate APIs.**
- **Never create duplicate utilities.**
- **Never create unused code.**
- **Follow existing architecture and naming conventions.**
- **Modify minimum required files only.**
- **Maintain backward compatibility.**
- **Validate imports, navigation, API integration, and build after changes.**
- **Do not introduce TypeScript into JavaScript projects.**
- **Do not introduce JavaScript into TypeScript projects.**
