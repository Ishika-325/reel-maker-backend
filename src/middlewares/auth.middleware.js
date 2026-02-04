import  asyncHandler  from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import  User  from "../models/user.model.js";
export const verifyJWT = asyncHandler(async(req , res , next) => {
    try {
        console.log("this is verifyJWT middleware");
        const token= req.cookies?.accessToken
        
    
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: token missing" });;
        }
        

    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }
    
        req.user = user;
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: invalid token" });
        
    }

})