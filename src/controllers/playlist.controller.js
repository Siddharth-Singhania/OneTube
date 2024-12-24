import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    //TODO: create playlist

    if(!name || !description){
        throw new ApiError(400,"Name and Description of the playlist is Required!!");
    }
    const playlist =await  Playlist.create({name,description,owner: req.user?._id})

    return res.status(200)
    .json(new ApiResponse(201,{playlist},"Playlist has been created successfully"))
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new ApiError(404,"Invalid user id")
    }

    const playlist = await Playlist.find({
        owner: userId
    })

    return res.status(200)
    .json(new ApiResponse(200,{playlist},"Playlist fetched successfully"));


})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"Invalid playlist id")
    }

    const playlist = await Playlist.findById(playlistId);

    return res.status(200)
    .json(new ApiResponse(200,{playlist},"Playlist fetched successfully"));

})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"Invalid playlist id")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(404,"Invalid video id")
    }
    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        { $addToSet: { video: videoId } },
        { new: true }
    );
    return res.status(200)
        .json(new ApiResponse(200,{playlist},"Video Added to the Playlist"))
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"Invalid Playlist id")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(404,"Invalid video id")
    }
    const playlist = await Playlist.findByIdAndUpdate(playlistId,
        { $pull: { video: videoId } },
        { new: true }
    );
    return res.status(200)
    .json(new ApiResponse(200, {playlist}, "Video Removed from the playlist" ))

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"Invalid Playlist id")
    }
    await Playlist.deleteOne({_id: playlistId})

    return res.status(200)
    .json(new ApiResponse(200,{},"Playlist Deleted Successfully"))
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(404,"Invalid playlist Id")
    }
    if(!name && !description){
        throw new ApiError(400,"Name or Description is required to Update")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404,"No Playlist found")
    }
    if(name){
        playlist.name = name;
    }
    if(description){
        playlist.description = description;
    }
    const updatedPlaylist = await playlist.save();

    return res.status(200)
    .json(new ApiResponse(200,{updatedPlaylist},"Playlist updated successfully"))
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}