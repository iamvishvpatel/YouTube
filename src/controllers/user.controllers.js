import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponce} from '../utils/ApiResponce.js'
import { error } from "console";
import jwt from 'jsonwebtoken'


const GenerateAccessAndRefreshTokens = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}
    } catch (error) {
        console("Error in GenerateAccessAndRefreshTokens" ,error)
        throw new ApiError(500, "Something Went Wrong While generating Access token and refreshtoken..")
    }
}
const registerUser = asyncHandler ( async (req, res)=>{
    // console.log("req.body", req.body);
    // console.log("req.files", req.files);

    
    const {fullName, email, password, username} = req.body;
    // console.log(email);
    
    if (
        [fullName, email, password, username].some((field)=> field?.trim() === "")
    ) {
        throw new ApiError("400", "All Fields are Required")
    }

    const existedUser = await User.findOne({
        $or: [{ username },{ email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User With Username Or Email Already Exists")
    }
    // console.log("Existed User form user.controller.js", existedUser);
    // console.log("Req.file form user.controller.js", req.files);
    

    const avatarLocalPath = req.files.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
// console.log("avatarLocalPath", avatarLocalPath);

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0]?.path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatarLocalPath Is Not Found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400, "Avatar File Required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
    throw new ApiError(500, "Something Went Wrong While Registring the User..!")
    }

    return res.status(201).json(
        new ApiResponce(200, createdUser, "User Created SuccessFully..")
    )
})

const loginUser = asyncHandler(async (req, res)=>{
    //get data from req.body
    //check username or email
    //find user
    //check password
    //access & refresh token
    //send secure cookies 

    const {username, email, password} = req.body;

    if(!username && !email){
        throw new ApiError(400, "Username or Email is required..! ")
    }


    // if ypu need any one form username and email:
     // if (!(username || email)) {
     //     throw new ApiError(400, "username or email is required")
     // }
    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does Not exist..!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalid User Credinatials..!")
    }

    const {accessToken, refreshToken} = await GenerateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const option = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, option)
    .cookie("refreshToken", refreshToken, option)
    .json(
        new ApiResponce(200, 
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In Successfully..!"
        )
    )

})

const refreshAccessToken = asyncHandler( async (req, res)=>{
    try {
        const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    
        if(!incomingRefreshToken){
            throw new ApiError(401, "UnAuthorized Request")
        }
    
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401, "Invalid RefreshToken")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh Token is expired or Used..!")
        }
    
        const option = {
            httpOnly: true,
            secure: true
        }
        const {accessToken, newRefreshToken} = await GenerateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", newRefreshToken, option)
        .json(
            new ApiResponce(200, {
                accessToken, refreshToken: newRefreshToken
            },
            "Access Token Refresh SuccessFully..!"
        )
        )
    } catch (error) {
        console.log("Error in refreshAccessToken", error)
        throw new ApiError(401, error?.message || "Invalid Refresh Token")
    }
})

const logoutUser = asyncHandler( async(req, res)=>{
    const userId = req.user._id

    await User.findByIdAndUpdate(
        userId, 
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    res
    .status(200)
    .clearCookie("accessToken", option)
    .clearCookie("refreshToken", option)
    .json(new ApiResponce(200, {}, "user Logged Out..!"))
})

const changeCurrentPassword = asyncHandler( async(req, res)=>{
    const {oldpassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await isPasswordCorrect(oldpassword)

    if(isPasswordCorrect){
        throw new ApiError(400, "Invalid password")
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new ApiResponce(200, {}, "Password changed Successfully..!"))
})

const getCurrentUser = asyncHandler( async(req, res)=>{
    return res
    .status(200)
    .json(
        new ApiResponce(200, req.user, "current User fetched successfully..!")
    )
})

const updateAccountDetails = asyncHandler(async (req, res)=>{
    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "All field Requird")
    }

    const user = User.findByIdAndUpdate(
        req.user?._id, 
        {
            $set: {
                fullName,
                email: email
            }
        }, 
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponce(200, user, "Account Details Updated Successfully..!"))
})

const updatedUserAvatar = asyncHandler(async (req, res)=>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar File is Missing..!")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400,"Error While uploading on Avatar..!")
    }

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        {
            $set: {
                avatar: avatar?.url
            }
        }, 
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponce(200,"AvatarImage Updated Successfully..!"))
})

const updatedUserCoverImage = asyncHandler(async (req, res)=>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400,"coverImage File is Missing..!")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error While uploading on coverImage..!")
    }

    const user = await User.findByIdAndUpdate(
        req?.user._id,
        {
            $set: {
                coverImage: coverImage?.url
            }
        }, 
        {new: true}
    ).select("-password")

    return res.status(200).json(new ApiResponce(200,"CoverImage Updated Successfully..!"))

})
export {
    registerUser,
    loginUser,
    refreshAccessToken,
    logoutUser,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updatedUserAvatar,
    updatedUserCoverImage

}