import { v2 as cloudinary} from "cloudinary";
import fs from "fs"
//unlink is used to remove a file from a file system.

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary= async (localFilePath) =>{
    try{
         if(!localFilePath)return null
         //upload 
        const response=await  cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
         })
         // file has uploaded 
         console.log("file uploaded", response.url);
         return response;
        
    }
    catch(error){
            fs.unlinkSync(localFilePath)//remove the locally saved temporary file as uploaded operation got failed
            return null;
    }
}
export {uploadOnCloudinary}