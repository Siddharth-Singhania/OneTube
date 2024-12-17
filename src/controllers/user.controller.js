import { asyncHandler } from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiErrors.js"
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt  from "jsonwebtoken"
import { Subscription } from "../models/subscription.model.js"


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
        throw new ApiError(500,"Error While Updating Avatar!!!!!")
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
        .json( new ApiResponse(
            200,
            {accessToken: newAccessToken,
             refreshToken: newRefreshToken},
            "Refreshed Access Token")
        )
    } catch (error) {
        throw new ApiError(401,error || "Invalid Refresh Token!!!!")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"Old Password did not Match");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave:false})
    
    return res.status(200)
    .json(
        new ApiResponse(200,{},"Password changed successfully")
    )
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName || !email){
        throw new ApiError(400,"All fields are required")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullName: fullName,
            email:email
        }
    },{new:true}).select("-password")
    
    return res.status(200)
    .json(new ApiResponse(200,user,"Account details updated successfully"))

})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is Required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar){
        throw new ApiError(500,"Error While Updating Avatar!")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{avatar: avatar.url}
        },{new:true} 
    ).select("-password")    //By default, findOneAndUpdate() returns the document as it was before update was applied. If you set new: true, findOneAndUpdate() will instead give you the object after update was applied

    return res.status(200)
    .json(
        new ApiResponse(200,user,"Avatar updated Successfully!")
    )
})

const updateCoverImage = asyncHandler(async(req,res)=>{
    const CoverImageLocalPath = req.file?.path
    if(!CoverImageLocalPath){
        throw new ApiError(400,"Cover Image file is Required")
    }
    const CoverImage = await uploadOnCloudinary(CoverImageLocalPath)
    if(!CoverImage){
        throw new ApiError(500,"Error While Updating CoverImage!")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{CoverImage: CoverImage.url}
        },{new:true} 
    ).select("-password")    //By default, findOneAndUpdate() returns the document as it was before update was applied. If you set new: true, findOneAndUpdate() will instead give you the object after update was applied

    return res.status(200)
    .json(
        new ApiResponse(200,user,"CoverImage updated Successfully!")
    )
})

const getUserChannelProfile = asyncHandler(async(req,res) =>{
    const username = req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }
    const channel = await User.aggregate([
        {
            $match:{
                username: username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField:"channel",
                as: "subscribers"
            }
        },
        {
            $lookup:{
                from: "subscriptions",
                localField: "_id",
                foreignField:"subscriber",
                as: "subscribedTo"
            }
        },{
            $addFields:{
                SubscribersCount:{
                    $size: "$subscribers"
                },
                channelsSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $condition:{
                        if:{$in:[req.user?._id ,"$subscribers.subscriber"]},
                        then:true,
                        else: false
                    }
                }
            }
        },
        {
            $project:{
                fullName: 1,
                username: 1,
                SubscribersCount:1,
                channelsSubscribedToCount:1,
                isSubscribed:1,
                avatar:1,
                coverImage:1,
                email:1
            }
        }
    ])
    console.log(channel)

    if(!channel?.length){
        throw new ApiError(404,"Channel does not exists!!")
    }

    return res.status(200)
    .json(
        new ApiResponse(200,channel[0],"User channel fetched successfully")
    )
})

export {registerUser, loginUser,logoutuser,refreshAccessToken,changeCurrentPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateCoverImage,getUserChannelProfile}