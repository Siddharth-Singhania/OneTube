import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiErrors.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel Id");
    }
    if (!mongoose.isValidObjectId(req.user?._id)) {
        throw new ApiError(400, "Invalid User Id");
    }
    const subscription = await Subscription.findOne({
        subscriber: req.user?._id,
        channel : channelId
    })
    if(!subscription){
        const subsribed =await Subscription.create({
            subscriber: req.user?._id,
            channel : channelId
        }) 
        if(!subsribed){
            throw new ApiError(500,{},"Something went wrong");
        }

        return res.status(200)
        .json(new ApiError(200,{subsribed},"Subscribed Successfully"))
    }
    
    await subscription.deleteOne();

    return res.status(200)
    .json(new ApiError(200,{},"Removed Subscription Successfully"))

})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid Channel Id");
    }
    //const subscriberList = await Subscription.find({channel: channelId}).populate("subscriber", "fullName email username avatar coverImage");
    const subscriberList = await Subscription.aggregate([
        { $match: { channel: new mongoose.Types.ObjectId(channelId) } },
        {
            $lookup: {
                from: "users",  // The 'users' collection in MongoDB
                localField: "subscriber",  // field in the Subscription collection
                foreignField: "_id",  // reference to _id field in the users collection
                as: "subscriberDetails",  // store the result in 'subscriberDetails'
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            email: 1,
                            username: 1,
                            avatar: 1,
                            coverImage: 1
                        }
                    }
                ]
            }
        },
        { $unwind: { path: "$subscriberDetails" } },
        { $replaceRoot: { newRoot: "$subscriberDetails" } }
    ]);
 

    
    return res.status(200)
    .json(new ApiResponse(200,{subscriberList},"Subscriber list fetched Successfully"))
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400,"Invalid Subscriber Id");
    }
    const channelList = await Subscription.aggregate([
        {
            $match: {subscriber: new mongoose.Types.ObjectId(subscriberId)}
        },
        {
            $lookup:{
                from: "users",
                localField:"channel",
                foreignField:"_id",
                as: "list",
                pipeline: [
                    {
                        $project:{
                            username: 1,
                            avatar: 1,
                            email: 1,
                        }
                    }
                ]
            }
        },
        {
        $addFields: {list: {$first: "$list"}}
        },
        {
            $match: {
                list: { $ne: null }  // Ensure that list is not null
            }
        },
        {$replaceRoot: {newRoot: "$list"}}
    ])

    return res.status(200)
    .json(new ApiResponse(200,{channelList},"Channel list fetched Successfully"))
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}

//675f21c7d4cc053e71a5116a