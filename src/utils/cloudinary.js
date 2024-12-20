import { v2 as cloudinary } from 'cloudinary'
import fs from "fs"

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
}); 

const uploadOnCloudinary = async (localFilePath) =>{
    try {
        if(!localFilePath){
            console.log("Error: Cannot find the path!");
            return null;
        }
        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        //file has been uploaded successfully
        //console.log("Success: File has been uploaded successfully!",response.url);
        fs.unlinkSync(localFilePath)
        return response;
    } catch (error) {
        console.log(error)
        fs.unlinkSync(localFilePath) //Remove the locally saved temporary file as the upload operation got failed
        return null
    }
}

const deleteFromCloudinary = async (id)=>{
    try {
        let response;
        cloudinary.uploader.destroy(id, {resource_type: "auto"})
        .then(result=> response= result)

        return response;
    } catch (error) {
        console.log(error);
        return null;
    }
}

export {uploadOnCloudinary,deleteFromCloudinary};