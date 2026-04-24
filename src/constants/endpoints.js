import { ENV } from "../env"

const URL = ENV.BASE_URL;

export const AUTH_ENDPOINTS = {
    LOGIN: `${URL}/patient/login`,
    LOGOUT: `${URL}/patient/logout`,
    SIGNUP: `${URL}/patient/add`,
    GET_USER_BY_ID: `${URL}/patient/{id}`, 
    UPDATE_USER: `${URL}/patient/{id}`,    
    DELETE_USER: `${URL}/patient/{id}`, 
    DOCUMENT_UPLOAD: `${URL}/documents/upload`, 
}   