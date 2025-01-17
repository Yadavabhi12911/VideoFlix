
const asyncHandler = (requestHandler) => {
   return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch( (err) => next(err))
    }
}


export  default asyncHandler

// 2nd way
// const asyncHandler = (fn) = async (req, res, next) => {
//     try {
//        await fn(req, res, next)

        
//     } catch (error) {
//         res.status(500).json({error: 'internal Server error'})
//     }
// }