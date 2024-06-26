import {  asyncHandler} from "../../utils/asyncHandler.js"
import {ApiError} from "../../utils/ApiError.js"
import {User} from"../models/user.model.js"
import {uploadOnCloudinary} from "../../utils/cloudinary.js"
import { ApiResponse } from "../../utils/ApiResponse,js"


const registerUser = asyncHandler(async(req,res)=>{
    //1)get user details
    //2)validation -- non empty
    //3)check if user already exists : username email
    //4)check for image 
    //5)upload on cloudinary
    //6)create user object -- create entry in db
    //7)remove pass and refresh token field from response
    //8)check for user creation
    //9)return response


    //1)
    const{fullName, email,username,password}=req.body
    console.log("email",email);

    // if(fullName==""){
    //     throw new ApiError(400,"full name is required") 
    // } indivaual sabka likhne se acha ek method se krde

    //2)
     if(
        [fullName,password,email,username].some((field)=>
          field?.trim()=="")
     ){
       throw new ApiError(400,"ALL FIELDS NECESSARY")
     }
     //3)
     const existedUser =User.findOne({
        $or:[{email},{username}]
     })
     if(existedUser){
        throw new ApiError(409,"User existed")
     }

     //4)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"AVATAR IS REQUIRED")
    }

    //5)
    const avatar =await uploadOnCloudinary(avatarLocalPath)
    const coverImage =await uploadOnCloudinary(coverImageLocalPath)
    if(!avatar){
        throw new ApiError(400,"AVATAR FILE IS REQUIRED")
    }
    //6)
    const user =await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username:username.toLowerCase
    })
   //7)
   const createdUser =await User.findById(user._id).select(
    "-password -refreshToken" // jo nhi chiye vo likhte h
   )
   //8)
   if(!createdUser){
    throw new ApiError(500,"something went wrong while registring")
   }
    //9)
    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )
})

export {registerUser}