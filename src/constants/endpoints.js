import { ENV } from "../env"

const URL = ENV.BASE_URL;

export const AUTH_ENDPOINTS = {
    LOGIN: `${URL}/user/login`,
    LOGOUT: `${URL}/session/logout`,
    SIGNUP: `${URL}/user/add`,
    SESSION: `${URL}/session`,
    GET_USER_BY_ID: `${URL}/user/{id}`, 
    UPDATE_USER: `${URL}/user/{id}`,    
    DELETE_USER: `${URL}/user/{id}`,
}