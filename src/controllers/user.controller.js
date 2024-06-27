import {  asyncHandler} from "../../utils/asyncHandler.js"
import {ApiError} from "../../utils/ApiError.js"
import {User} from"../models/user.model.js"
import {uploadOnCloudinary} from "../../utils/cloudinary.js"
import { ApiResponse } from "../../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"



const generateAccessAndRefreshTokens=async(userId)=>
{
    try{
         const user=await User.findById(userId)
         const accessToken=user.generateAccessToken()
         const refreshToken=user.generateRefreshToken()

         user.refreshToken=refreshToken
         await user.save({validateBeforeSave:false})

         return {accessToken,refreshToken}
    }catch(error){
        throw new ApiError(500,"Something wnet wrong while generating acees and refresh token")
    }

}


//access token is for short term and refrence token is for long term

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
     const existedUser =await User.findOne({
        $or:[{email},{username}]
     })
     if(existedUser){
        throw new ApiError(409,"User existed")
     }

     //4)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath=req.files?.coverImage[0].path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)
    && req.files.coverImage.length>0){
     coverImageLocalPath=req.files.coverImage[0].path
}
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
        password,
        username:username.toLowerCase()
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

const loginUser = asyncHandler(async(req,res)=>{
    //1) body se data leaao
    //2) username or email
    //3)find user
    //4)pass check
    //5)acess and refresh token 
    //6)send cookie
     

    //1
  //  console.log("Logging in user...");
    const {email, username,password} = req.body

    //2
    
    if(!(username || email)){
        throw new ApiError(400,"username or password is required")
    }

    //3
   // console.log("Finding user in the database...");
    const user= await User.findOne({
        $or:[{username},{email}]
    })
    if(!user){
        throw new ApiError(400,"user does not exists")
    }
     //4

    // console.log("Checking password...");
   const isPasswordValid = await user.isPasswordCorrect(password)
   if(!isPasswordValid){
    throw new ApiError(401,"password incorrect")
   }
    //5

    //console.log("Generating access and refresh tokens...");
   const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id)
   
   const loggedInUser=await User.findById(user._id).select("-password -refreshToken")
   //6
   const options ={
    httpOnly:true,
    secure:true,

   };
   
   return res
   .status(200)
   .cookie("acessToken", accessToken, options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(
        200,
        {
            user:loggedInUser,accessToken,refreshToken
        },
        "User loggged in "
    )
   )


});

const logoutUser = asyncHandler(async(req,res)=>{
   await User.findByIdAndUpdate(
    req.user._id,
    {
       $unset:{
        refreshToken: 1
       } 
    },
    {
        new:true
    }   

   )
   const options ={
    httpOnly: true,
    secure: true,

   }
   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new ApiResponse(200, {},"user logged out"))

})
const refreshAccessToken =asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})
const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})
const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})
const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});
const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})
const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }

   


    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage


}



//acess token k timeup hogya to new token refresh tken ki help se miljae 