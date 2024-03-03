import { asyncHandler } from '../utils/asyncHandler.js';
import {apiError} from '../utils/apiError.js' 
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/fileUpload.js';
import { apiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';


const generateAccessAndRefreshToken = async (userId) => {
   try{
      const user = await User.findById(userId)
      const accessToken = user.generateAccessToken()
      const refreshToken = user.generateRefreshToken()
   
      user.refreshToken = refreshToken
      await user.save({validateBeforeSave: false})
      
      return {accessToken, refreshToken}  
   }
   catch (error) {
      throw new apiError(500, "Error generating tokens") 
   }
} 


const registerUser = asyncHandler( async (req, res) => {
      // get user details from frontend
      // validate user details
      // check is user already exists: username, email
      // check for images
      // check for avatar
      // upload images to cloudinary, cross check avatar
      // create user object - create entry in db
      // remove password and refresh token from response
      // check for user creation
      // return reponse 

      const {fullName, email, userName, password } = req.body
      //console.log("email: ", email);

      if (
         [fullName, email, userName, password].some((field) => field?.trim() === "")
      ){
         throw new apiError(400, "All fields are required") 
      }

      const existingUser = await User.findOne({
         $or:[{email}, {userName}]
      })

      if(existingUser){
         throw new apiError(409, "User already exists")
      }

      const avatarLocalPath = req.files?.avatar[0]?.path;
      //const coverImageLocalPath = req.files?.coverImage[0]?.path;

      let coverImageLocalPath;
      if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
         coverImageLocalPath = req.files.coverImage[0].path;
      }


      if (! avatarLocalPath){
         throw new apiError(400, "Avatar is required")      
      }

      const avatar = await uploadOnCloudinary(avatarLocalPath)
      const coverImage = await uploadOnCloudinary(coverImageLocalPath)  

      if (!avatar){
         throw new apiError(500, "Avatar is required")
      }

      const user = await User.create({
         fullName,
         email,
         userName: userName.toLowerCase(),
         password,
         avatar: avatar.url,
         coverImage: coverImage?.url || ""  // optional chaining
      });

      const createdUser = await User.findById(user._id)
      .select("-password -refreshToken")


      if (!createdUser){
         throw new apiError(500, "Error creating user")
      }

      return res.status(201).json(
         new apiResponse(200, createdUser, "User created successfully")
      )

})


const loginUser = asyncHandler( async (req, res) => {
      // get data from req body
      // validate username or email
      // find the user 
      // validate password
      // access and refresh token
      // send cookies
      // return response

      const {email, userName, password} = req.body

      if (!(email || !userName)){
         throw new apiError(400, "Username or email is required")
      }

      const user = await User.findOne({
         $or: [{email}, {userName}]
      })

      if (!user){
         throw new apiError(404, "User not found")
      }  

      const validPassword = await user.isPasswordCorrect(password)
      
      if (!validPassword){
         throw new apiError(401, "Invalid password")
      }  


      const {accessToken, refreshToken} = await 
      generateAccessAndRefreshToken(user._id)

      const loggedInUser = await User.findById(user._id)
      .select("-password -refreshToken") 

      const options = {
         httpOnly: true, // restricts modification of cookies from frontend   
         secure: true
      }

      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
         new apiResponse(200, 
            {
               user: loggedInUser, 
               accessToken, refreshToken,
               
            },
            "User logged in successfully"
         )
      )

})


const logoutUser = asyncHandler(async(req, res) => {
   await User.findByIdAndUpdate(
       req.user._id,
       {
           $unset: {
               refreshToken: 1 // this removes the field from document
           }
       },
       {
           new: true
       }
   )

   const options = {
       httpOnly: true,
       secure: true
   }

   return res
   .status(200)
   .clearCookie("accessToken", options)
   .clearCookie("refreshToken", options)
   .json(new apiResponse(200, {}, "User logged Out"))
})


const refreshAccessToken = asyncHandler(async (req, res) => {
   try {
       const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

       if (!incomingRefreshToken) {
           throw new apiError(400, "Unauthorized request");
       }

       const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

       const user = await User.findById(decodedToken?._id);

       if (!user) {
           throw new apiError(401, "Invalid refresh token");
       }

       if (incomingRefreshToken !== user?.refreshToken) {
           throw new apiError(401, "Refresh token has been invalidated");
       }

       const options = {
           httpOnly: true,
           secure: true
       };

       const { accessToken, newRefreshToken } = await generateAccessAndRefreshToken(user._id);

       return res
           .status(200)
           .cookie("accessToken", accessToken, options)
           .cookie("refreshToken", newRefreshToken, options)
           .json(new apiResponse(200, { accessToken, newRefreshToken }, "Access token refreshed successfully"));
   } 
   catch (error) {
       throw new apiError(500, error?.message || 
         "Error refreshing access token");
   }
});


export { 
         registerUser,
         loginUser, 
         logoutUser,
         refreshAccessToken
}