import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from '../utils/ApiError.js'
import {User} from "../models/user.models.js"
import {uploadOnCloudinary} from '../utils/cloudinary.js'
import {ApiResponce} from '../utils/ApiResponce.js'

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
        new ApiResponce(200, "User Created SuccessFully..", createdUser)
    )
})

export {registerUser}