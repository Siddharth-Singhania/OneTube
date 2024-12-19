import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
    //owner will have username,avatar

    const {content} = req.body
    const user = await User.findById(req.user?._id).select("-password -refreshToken");
    if(!content){
        throw new ApiError(400,"Content is Required");
    }
    if(!user){
        throw new ApiError(400,"User not found")
    }
    const tweet = await Tweet.create({
        content,
        owner: {
            _id: user._id,
            username: user.username,
            avatar: user.avatar
        }
    })

    const createdTweet = await Tweet.findById(tweet._id)

    if(!createdTweet){
        throw new ApiError(500,"Something went wrong while Creating the Tweet")
    }

    return res.status(201)
    .json(new ApiResponse(201,createTweet,"New Tweet has been created"))

})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {username}= req.params
    if(!username?.trim()){
        throw new ApiError(400,"Username is missing")
    }

    const user = await User.findOne({username})
    
    if(!user?._id){
        throw new ApiError(400,"Username is missing")
    }

    const allTweet = await User.aggregate([
        {
            $match: {_id: user?._id}
        },
        {
            $lookup:{
                from: "tweets",
                localField:"_id",
                foreignField:"owner",
                as: "tweet"
            }
        },
        {$unwind: "$tweet"},
        {
            $project:{
                tweet :1,
                username:1,
                avatar: 1
            }
        }
    ])
    return res.status(200)
    .json(new ApiResponse(200,allTweet,"All Tweets Fetched Successfully"))

})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    if(!tweetId?.trim()){
        throw new ApiError(400,"Tweet Id is missing")
    }

    const {content} = req.body;
    if(!content){
        throw new ApiError(400,"New Content is Required");
    }

    const tweet = await Tweet.findById(tweetId);
    if(!tweet){
        throw new ApiError(401,"Tweet not found")
    }
    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId,{
        $set: {content}
    },{new:true})

    return res.status(200)
    .json(new ApiResponse(201,updateTweet,"tweet updated successfully"))

})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!tweetId?.trim()){
        throw new ApiError(400,"Tweet Id is missing")
    }
    await Tweet.deleteOne({tweetId});

    return res.status(200)
    .json(new ApiResponse(200,{},"Tweet Deleted Successfully"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}