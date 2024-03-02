import { asyncHandler } from '../utils/asyncHandler.js';
import {apiError} from '../utils/apiError.js' 
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/fileUpload.js';
import { apiResponse } from '../utils/apiResponse.js';


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
      


export { registerUser }