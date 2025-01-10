import mongoose from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
userName:{
    type:String,
    required: true,
    unique: true,
    lowercase:true,
    trim: true,
    index: true,
},

email:{
    type:String,
    required: true,
    unique: true,
    lowercase:true,
    trim: true,
    
},
name:{
    type:String,
    required: true,
    trim: true,
    index: true,
},
avatar:{
    type:String,  // couldnary url
    required:true,

},
coverImage: {
    type: String,

},

watrchHistory :[
    {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    }
],

password: {
    type: String,
    required: [true, "Password is required"]
},

refreshToken: {
    type: String,
}


}, {timestamps:true});

userSchema.pre('save',  async function(next) {

if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
})

userSchema.methods.isPassWordCorrect = async function(password){
   return await bcrypt.compare(password, this.password);
}

userSchema.methods.generateAccessToken = function(){
    if (!process.env.REFRESH_TOKEN_SECRET ) {
        throw new Error("ACCESS_TOKEN_SECRET or ACCESS_TOKEN_EXPIRY is not defined");
    }
    return jwt.sign({
        _id: this._id,
        email:this.email,
        userName: this.userName,
        name: this.name
    }, process.env.ACCESS_TOKEN_SECRET,
    {
expiresIn: process.env.ACCESS_TOKEN_EXPIRY
    })
    
}


userSchema.methods.generateRefreshToken = function(){
    return jwt.sign({
        _id : this._id,
    },

    

    process.env.REFRESH_TOKEN_SECRET, 

    {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
)
}


 
export const User = mongoose.model("User", userSchema)