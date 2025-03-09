// .THEN Syntax - PROMISES
const asyncHandler = (requestHandeler)=>{
    return (req,res,next)=>{
        Promise.resolve(requestHandeler(res,res,next)).catch((err)=> next(err))
    }
}



//TRY-CATCH Syntax All two Good For This
// const asyncHandler = (func) => async(req,res, next) => {
//     try {
//         await func(req,res,next)
//     } catch (error) {
//         res.status(err.code|| 500).json({
//             success: false,
//             message: err.message
//         })
        
        
//     }
// }

export {asyncHandler}