import asyncHandler from '../utils/asyncHander.js';
import ApiError from "../utils/apiError.js"; // 
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }
    
        req.user = user;
        next();
    } catch (error) {
        console.error("JWT verification error:", error.message); // Log error for debugging
        next(new ApiError(401, error.message || "Invalid access token")); // Forward error to error-handling middleware
    }
});

export default verifyJWT;
