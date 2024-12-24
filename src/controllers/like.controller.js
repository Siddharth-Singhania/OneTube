import { ApiError } from "../utils/ApiErrors.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Like } from "../models/like.model.js";
import { isValidObjectId } from "mongoose";
import mongoose from "mongoose";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"INVALID VIDEO ID");
    }
    const like = await Like.findOne(
        {
            video:videoId,
            likedby: req.user?._id
        }
    )
    if(like){
        await like.deleteOne()
        return res.status(200)
        .json(new ApiResponse(200,{},"Like Removed Successully"))
    }
    const likedVideo = await Like.create(
        {
            video: videoId,
            likedby: req.user?._id
        }
    )
    return res.status(201)
    .json(new ApiResponse(201,{likedVideo},"Like Added Successully"))
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"INVALID COMMENT ID");
    }
    const like = await Like.findOne(
        {
            comment:commentId,
            likedby: req.user?._id
        }
    )
    if(like){
        await like.deleteOne()
        return res.status(200)
        .json(new ApiResponse(200,{},"Like Removed Successully"))
    }
    const likedComment = await Like.create(
        {
            comment: commentId,
            likedby: req.user?._id
        }
    )
    return res.status(201)
    .json(new ApiResponse(201,{likedComment},"Like Added Successully"))
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"INVALID TWEET ID");
    }
    const like = await Like.findOne(
        {
            tweet:tweetId,
            likedby: req.user?._id
        }
    )
    if(like){
        await like.deleteOne()
        return res.status(200)
        .json(new ApiResponse(200,{},"Like Removed Successully"))
    }
    const commentTweet = await Like.create(
        {
            tweet:tweetId,
            likedby: req.user?._id
        }
    )
    return res.status(201)
    .json(new ApiResponse(201,{commentTweet},"Like Added Successully"))
})

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos
    const likedVideo = await Like.aggregate([

        {
            $match: {likedBy: new mongoose.Types.Objectid(req.user?._id)}
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "id",
                as: "result",
                pipeline: [
                    {$project:{
                        videofile: 1,
                        owner: 1,
                        duration:1,
                        thumbnail:1,
                        title:1,
                        views: 1
                    }}
                ]
            }
        },
        {
            $addFields:{
                result:{$first: "$result"}
            }
        },{
            $match: {
                result: { $ne: null }  // Ensure that list is not null
            }
        },
        {
            $replaceRoot:{newRoot:"$result"}
        }
    ])  
    if(likedVideo.length === 0){
        return res.status(200)
        .json(new ApiResponse(200,{},"No liked Videos Found"))
    }

    return res.status(200)
        .json(new ApiResponse(200,{likedVideo},"Liked videos Fetched Successfully"))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}