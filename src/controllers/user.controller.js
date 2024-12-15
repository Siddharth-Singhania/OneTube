import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken"


const generateAccessAndRefreshTokens = async(userId) =>{
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken= refreshToken;
        await user.save({validateBeforeSave: false});
        
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,error || "Something went wrong while generating refresh and access token")
    }
}



const registerUser = asyncHandler(async (req,res)=>{
    //get user details from frontend
    //validation - not empty
    //check if user already exists: username, email
    //check for images, check for avatar
    //upload them to cloudinary,avatar
    //create user object- create entry in db
    //remove password and refresh token field from response
    //check for user creation
    //return response
    
    const {fullName,email,username,password} = req.body
    if([fullName,email,username,password].some((field)=>field?.trim() ==="")){
        throw new ApiError(400,"All fields are required");
    }

    const existedUser = await User.findOne({
        $or:[{email},{username}]
    })
    if(existedUser){
        throw new ApiError(409,"User with same username or email already exist");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path

    //let coverImageLocalpath;
    //classic method as well as to make sure there is no error if there is no coverImage.
    //if we use same method as avatarLocalPath then there will be error of undefined in case of no coverImage
    //if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
    //    coverImageLocalpath = req.files.coverImage[0].path;
    //}

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required!!")
    }
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required!!!!!")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

   const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
   )
   if(!createdUser){
    throw new ApiError(500,"Something went Wrong while registering the User!");
   }

   return res.status(201).json(
    new ApiResponse(200,createdUser,"User registered Successfully!")
   )



})

const loginUser = asyncHandler(async (req,res) =>{
    //get details of the user req body ->data
    //check if no field is empty(username or email, password)
    //validate with the database
    //password check
    //access and refresh Token
    //send cookie  

    const {email,username,password} = req.body

    if(!username && !email){
        throw new ApiError(400,'username or email is required')
    }
    
    const user = await User.findOne({
        $or: [{username},{email}]
    })
    if(!user){
        throw new ApiError(404,"User not found");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Wrong password!!!");
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id);
    
    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200).cookie("accessToken",accessToken,options)
    .cookie("refershToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user Logged In Successfully"
        )
    )

})

const logoutuser = asyncHandler(async(req,res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{refreshToken: undefined}
        }
    )
    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new ApiResponse(200,{},"User Logged Out!"))

})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new ApiError(401,"Error: Unauthorized Request!")
    }

    try {
        const token = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(token._id).select(
            "-password"
        )
        if(!user){
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh Token is expired or Used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
        
        const {newAccessToken,newRefreshToken} = await generateAccessAndRefreshTokens(user._id);
        
    
        return res.status(200)
        .cookie("accessToken",newAccessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(
            200,
            {accessToken: newAccessToken,
             refreshToken: newRefreshToken},
            "Refreshed Access Token"
        )
    } catch (error) {
        throw new ApiError(401,error || "Invalid Refresh Token!!!!")
    }

})



export {registerUser, loginUser,logoutuser,refreshAccessToken}