import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary, deleteFromCloudinary} from "../utils/cloudinary.js"
import { isValidObjectId } from "mongoose"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query="", sortBy="createdAt", sortType=1, userId } = req.query
    //TODO: get all videos based on query, sort, pagination

    const videoAggregate = await Video.aggregate([
        {
            $match: {
                $or: [
                    {title: {$regex:query, $option: "i"}},
                    {description:{$regex:query, $options:"i"} }
                ]
            }
        },
        {
            $lookup:{
                from: "users",
                localField:"owner",
                foreignField:"_id",
                as: "owner",
                pipeline: [
                    {$project:{
                        _id:1,
                        fullName :1,
                        avatar: 1,
                        username:1
                    }}
                ]
            }
        },
        {
            $addFields:{
                owner:{
                    $first: "$owner"
                }
            }
        },
        {
            $sort:{
                [sortBy] : sortType
            }
        }

    ])
    const options = {
        page,  // The current page number, typically passed from the query parameters (e.g., page=2).
        limit,  // The number of videos to return per page, also passed from the query parameters (e.g., limit=10).
        customLabels: {  
            totalDocs: "totalVideos",  // Renames the "totalDocs" label to "totalVideos".
            docs: "videos",  // Renames the "docs" label to "videos", this will contain the actual video data.
        },
        skip: (page - 1) * limit,  // Calculates how many documents to skip based on the page number.
        limit: parseInt(limit),  // Ensures the limit is an integer.
    }

    Video.aggregatePaginate(videoAggregate,options)
    .then(result =>{
        if(result?.videos?.length ===0){
            return res.status(200)
            .json(new ApiResponse(200,{},"No videos found"))
        }
        return res.status(200)
        .json(new ApiResponse(200,result,"Video fetched successfully"))
    }).catch(error=>{
        throw new ApiError(500,error || "Something went Wrong")
    })
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
 

    if(!title){
        throw new ApiError(400,"Title is required");
    }
    if(!description){
        throw new ApiError(400,"Description is required");
    }
    
    const videoLocalPath = req.files?.videoFile[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail[0]?.path

    if(!videoLocalPath){
        throw new ApiError(400,"Video File is required");
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400,"Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    
    if(!videoFile){
        throw new ApiError(500,"Something went wrong while uploading the Video File")
    }
    if(!thumbnail){
        throw new ApiError(500,"Something went wrong while uploading the thumbnail")
    }
    const PublishedVideo = await Video.create({
        title,
        description,
        video: {
            url: videoFile.secure_url,
            id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.secure_url,
            id: thumbnail.public_id
        },
        owner: req.body._id,
        duration : videoFile.duration,
        views: videoFile.views
    })

    if(!publishAVideo){
        throw new ApiError(500,"Something went Wrong")
    }

    return res.status(201)
    .json(new ApiResponse(201,publishAVideo,"Video Published Successfully"))

})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    if(!isValidObjectId(videoId)){
        throw new ApiError(404,"Invalid Video Id")
    }
    const video =  await Video.findById(videoId)
    if(!video){
        throw new ApiError(404,"Video not found")
    }
    return res.status(200)
    .json(new ApiResponse(200,video,"Video Fetched Successfully"))
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title,description} = req.body;
    const thumbnailLocalPath = req.file?.thumbnail[0]?.path
    if(!title && !thumbnailLocalPath && !description ){
        throw new ApiError(400,"Need something To update")
    }
    
    const updatedData = {};
    if(thumbnailLocalPath){
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        //TODO:  delete the old thumbnail from cloudinary
        const oldThumbnail = await Video.findById(videoId)
        await deleteFromCloudinary(oldThumbnail.thumbnail.id);
        updatedData.thumbnail = {
            url : thumbnail.secure_url,
            id: thumbnail.public_id
        }
    }
    if(title){
        updatedData.title = title
    }
    if(description){
        updatedData.description = description
    }
    const updatedVideo = await Video.findByIdAndUpdate(videoId,{
        $set: updatedData
    },{new:true})

    return res.status(200)
    .json(new ApiResponse(200,updatedVideo,"Update successfully"));
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404,"Video Not Found")
    }
    await deleteFromCloudinary(video.thumbnail.id);
    await deleteFromCloudinary(video.video.id);

    await Video.deleteOne(videoId);

    return res.status(200)
    .json(new ApiResponse(200,{},"Video deleted Successfully"))

})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params

    const video = await findByIdAndUpdate(videoId,{
        $set: {isPublished: !isPublished}
    },{new:true})

    return res.status(200)
    .json(new ApiResponse(200,{video},"Toggled Successfully"))
})


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}