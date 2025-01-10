import asyncHandler from '../utils/asyncHander.js';
import ApiError from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { fileUploadOnCloudinary } from '../utils/cloudinary.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from "jsonwebtoken"



const generateAccessTokenAndRefreshTokens = async(userId) =>{


    try {

        const user  = await User.findOne(userId)
        console.log(user);
        
        if (!user) throw new ApiError(404, 'User not found');

const accessToken = user.generateAccessToken()
const refreshToken = user.generateRefreshToken()





user.refreshToken = refreshToken
 await user.save({ validateBeforeSave : false})

 return {accessToken , refreshToken}

    } catch (error) {
        throw new ApiError(500, 'error while generating acces or refresh tokens')
    }
}


  // get details of user from frontend
  // validation , not empty
//  check if user already exist - userName , email
// check for images - also for avatar
// uload to cloudinary , check avatar upload hua yha nhi
// create user object -create entry in db
//remove password and refresh token field from response
//check for user creation
//return response

const registerUser = asyncHandler(async (req, res) => {
    const { userName, name, email, password } = req.body;
    console.log('email:', email);

    if ([userName, name, email, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required to fill");
    }
    if(!userName){
        throw new ApiError(400, "UserName Required");
    }

    

    const userExisted = await User.findOne({
        $or: [{ userName }, { email }],
    });

    

    if (userExisted) {
        throw new ApiError(409, "User with this email or username already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    //  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }
    console.log(req.files);
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath);
    const cover = coverImageLocalPath ? await fileUploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar?.url) {
        throw new ApiError(400, "Avatar upload failed");
    }

    const user = await User.create({
        userName: userName,
        name,
        email,
        password,
        avatar: avatar.url,
        coverImage: cover?.url || "",
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Error occurred while registering the user");
    }

    return res.status(200).json(
        new ApiResponse(200,  createdUser, "User registered successfully")
    );
});



// login user 

const loginUser = asyncHandler( async (req, res) => {

    // req.body --> data
    // need user id or password from frontend
    // find userName
    // password check
    // provide accessToken,  or Refresh token 
    // send this tokens in the form of cookie

    const {email, password, userName} = req.body
    console.log(userName)

    if( !(userName || email)){
        throw new ApiError(400, "Required userName or email");
    }

    const user = await User.findOne({
        $or:[ {userName}, {email}]
    })

    if(!user){
        throw new ApiError(404, "user does not exit")
    }

    const isPasswordValid = await user.isPassWordCorrect(password)

    if(!isPasswordValid){
throw new ApiError(401, 'password incorrect')
    }

const {accessToken, refreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
const loggedInUser = await User.findById(user._id).select( "-password -refreshToken") 

// Send cookie
const options = {
    httpOnly: true,
    secure: true
}


return res.status(200)
.cookie("accessToken", accessToken, options)
.cookie("refreshToken", refreshToken, options)
.json(
    new ApiResponse(
        200,
        {
            user: loggedInUser, accessToken, refreshToken
        },
        "User loggedIn Successfully"
    )
)

})


// Log out

const logoutUser = asyncHandler (async (req, res) => {
   
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined,
                new: true
            },
          
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    };

    res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {} , "User logOut")
    )
})

//refresh the token

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefrehToken = req.cookie.refreshToken || req.body.refreshToken

    if(!incomingRefrehToken){
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken =  jwt.verify(incomingRefrehToken, process.env.REFRESH_TOKEN_SECRET)
    
      const user = await User.findById(decodedToken?._id)
      if(!user){
        throw new ApiError(401, "Invalid token")
      }
    
      if(incomingRefrehToken  !== user?.refreshToken){
        throw new ApiError(401, "inavlid token or Token is Expired")
      }
      const options ={
        httpOnly: true,
        secure: true
      }
    
      const {accessToken, newRefreshToken} = await generateAccessTokenAndRefreshTokens(user._id)
    
      res.status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json( 
         new ApiResponse(
            200,
            { accessToken, refreshToken: newRefreshToken},
            "Access Token is Refreshed"
         )
      )
    
    } catch (error) {
        throw new ApiError(401, error?.message ||"Invalid refresh token")
    }
 


})

//change password

const changePassword = asyncHandler(async(req, res) => {
    const { oldPassword, newPassword} = req.body
    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(400, "User not found")
    }

    const isPassCorrect =  await user.isPasswordCorrect(oldPassword)
    if(!isPassCorrect){
        throw new ApiError(400, "Wrong oldPassword")
    }

    user.password = newPassword;

   await user.save({validateBeforeSave: false})

   return res
   .status(200)
   .json( new ApiResponse(
    200,
    {},
    "Password Change Successfully"
   ))
})

// get current user

const getCurrentUser = asyncHandler( async(req, res) => {
    return res
    .status(200)
    .json( new ApiResponse(
        200, 
        req.user, 
        "current user fetched succesfully"
    ))

})

// update account details

const updateAccountDetails = asyncHandler( async( req, res) => {
const {name, userName, } = req.body

if(!name || !userName){
    throw new ApiError(400, "All fields are required")
}

const user = User.findBtIdAndUpdate(
    req.user?._id,
{ $set:{
    name,
    userName
}},
{new: true}

).select("-password")

return res
.status(200)
.json( new ApiResponse(
    200,
user,
    " User Details Updated Suceessfully"
))
})

// udate file like profile pic etc, 

const updateAvatar = asyncHandler( async(req, res)   => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }

    const avatar = await fileUploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new ApiError(400, " Error while avatar file uploading")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {
            new:true
        }
    )
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        user,
        "Avatar updated successfully"
    ),
)
})


const updateCoverImage = asyncHandler( async(req, res)   => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new ApiError(400, "CoverImage file is missing")
    }

    const coverImage = await fileUploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new ApiError(400, " Error while coverImage file uploading")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {
            new:true
        }
    )
    return res
    .status(200)
    .json( new ApiResponse(
        200,
        user,
        "CoverImage updated successfully"
    ),
)
})

const getUserChannelProfile = asyncHandler( async(req, res) => {
  const {userName} = await req.paramas
  if(!userName?.trim()){
    throw new ApiError(400, "UserName not  Found")
  }

  const channel = await User.aggregate([
    {
        $match: {
            userName: userName
        }
    },

    {
        $lookup: {
            from:"subscriptions",
            localField: "_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
    $lookup: {
        from:"subscriptions",
        localField: "_id",
        foreignField:"subscriber",
        as:"subscribedTo"
    }
    },
    {
        $addFields:{
            subscriberCount:{
                $size:"$subscribers"
            },
            channelSubscribedToCount:{
                $size:"subscribedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{ $in:[ req.user?._id, "subscribers?.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $project:{
            name: 1,
            userName:1,
            subscriberCount:1,
            channelSubscribedToCount:1,
            isSubscribed:1,
            avatar:1,
            coverImage:1,
            email:1
        }
    }
  ])
  if(!channel?.length){
    throw new ApiError(404, "channel does not exist")
  }
  
  return res
  .status(200)
  .json( new ApiResponse(
    200,
    channel[0],
    "user channel fetched successfully"
  ))
})

const getWatchHistory = asyncHandler(async( req, res) => {
const user = User.aggregrate([
    {
        $match:{
            _id: new mongoose.Types.ObjectId(req.user._id)
        }
    },
    {
        $lookup:{
            from: "videos",
            localField:"watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[
                          {
                            $project:{
                                userName:1,
                                email:1,
                                avatar:1
                            }
                          }
                        ]
                    }
                },
                {
                    $addFields:{
                        owner:{
                            $first:"$owner"
                        }
                    }
                }
            ]
        }
    }
])
return res
.status(200)
.json( new ApiResponse(
    200,
    user[0].watchHistory,
    "watch history fetchec"

))
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changePassword,
    getCurrentUser ,
    updateAccountDetails,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile ,
    getWatchHistory

};
