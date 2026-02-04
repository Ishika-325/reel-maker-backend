import User from "../models/user.model.js"
import asyncHandler from "../utils/asyncHandler.js"

async function generateAccessAndRefreshTokens(userId) {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken 
        await user.save({validateBeforeSave : false})
        return {accessToken, refreshToken};

    }
    catch(error){
        console.log ("Error generating tokens: ", error);
        return ;
    }


}

const register = asyncHandler (async(req, res) => {
    console.log(req.body)
    const {username, email, password} = req.body

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    const existedUser = await User.findOne({ $or: [ { username }, { email } ] });
    if (existedUser) {
        return res.status(409).json({ message: "Username or email already in use" });
    }
    const newUser = await User.create({ username, email, password });
    const createdUser = await User.findById(newUser._id).select("-password -refreshToken" );

    if (!createdUser){
        return res.status(500).json({ message: "User creation failed" });

    }
    return res.status(201).json({user: createdUser})


}) 

const login = asyncHandler (async (req, res) => {
    const {usernameOrEmail, password} = req.body
    if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }
    const user = await User.findOne({ $or: [ { username: usernameOrEmail }, { email: usernameOrEmail } ] });
    if (!user) {
        return res.status(401).json({ message: "Invalid Username or Email" });
    }
    const isPasswordValid = await user.isPasswordCorrect(password);
    if (!isPasswordValid) {
        return res.status(401).json({message: "Incorrect password"})
    }
    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)
    console.log("Access:", accessToken);
    console.log("Refresh:", refreshToken);


    const loggedInUser = await User.findById(user._id).select("-password -refreshToken" );

    const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
}
    return res
    .status(200)
    .cookie("refreshToken", refreshToken, options)
    .cookie("accessToken", accessToken, options)
    .json({user: loggedInUser})

})



const logout = asyncHandler(async (req, res) => {
    console.log("logout called in backend");
   try{ 
     if (req.user?._id) {
    await User.findByIdAndUpdate(req.user._id, 
        {
             $unset: { refreshToken: 1 }

         },{
            new: true,
         });
        }else{
            console.log("req id problem");
        }

        const options = {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
}

         return res
            .status(200)    
            .clearCookie("refreshToken", options)
            .clearCookie("accessToken", options)
            .json({ message: "Logged out successfully" });}

catch (error){
    return res.status(500).json({ message: "Logout failed" });
}})

export { register, login , logout}

