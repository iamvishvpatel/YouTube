import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from 'jsonwebtoken'
const jwtSecret = process.env.ACCESS_TOKEN_SECRET
import { User } from "../models/user.models.js";

export const verifyJWt = asyncHandler( async(req, _, next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.spilt(" ")[1]
    
        if(!token){
            throw new ApiError(401, "Unauthorized User..!");
        }
    
        const decodedToken = jwt.verify(token, jwtSecret)
    
        const user = await User.findById(decodedToken._id).select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(
                401, "Invalid Access Token"
            )
        }
    
        req.user = user
        next()
    } catch (error) {
        console.log("Error in varifyJWT", error)
        throw new ApiError(400,"Invalid Access Token")
    }
})