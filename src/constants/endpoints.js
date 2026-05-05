import { ENV } from "../env"

const URL = ENV.BASE_URL;

export const AUTH_ENDPOINTS = {
    LOGIN: `${URL}/auth/login`, // Implemented
    LOGOUT: `${URL}/auth/logout`, // Implemented 
    VERIFY_OTP: `${URL}/auth/verify-otp`, // Implemented
    REQUEST_OTP: `${URL}/auth/request-otp`, // Implemented
    FORGOT_PASSWORD: `${URL}/auth/forgot-password`, // Implemented
    RESET_PASSWORD: `${URL}/auth/reset-password`, // Implemented
    SIGNUP: `${URL}/patient/add`, // Implemented
    GET_USER: `${URL}/patient/profile`, // Implemented
    UPDATE_USER: `${URL}/patient/{id}`, // Implemented  
    DELETE_USER: `${URL}/patient/soft-delete/{id}`, // Implemented 
    ADD_DOCUMENT: `${URL}/documents/add`, // Implemented
    LIST_DOCUMENT: `${URL}/documents/list`, // Implemented
    DOCUMENT_LIST_PAGINATED: `${URL}/documents/list-paginated`, // Implemented
    GET_DOCUMENT: `${URL}/documents/{id}`, // Implemented
    GET_SIGNED_URL: `${URL}/documents/download-url`, // Implemented.
    DELETE_DOCUMENT: `${URL}/documents/{id}`, // Implemented
    UPDATE_DOCUMENT: `${URL}/documents/{id}`, // Implemented
};