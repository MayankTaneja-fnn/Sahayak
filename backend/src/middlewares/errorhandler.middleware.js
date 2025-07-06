import { ApiError } from "../utils/ApiError.js";


export const errorHandler = (err, req, res, next)=>{

    if (err instanceof ApiError){
        res.status(err.statusCode).json({
            message : err.message,
            errors : err.errors,
            stack : err.stack,
            statusCode : err.statusCode,
            success : err.success         

        })
    }
    else{
        res.status(500).json({
            message : err.message,
            errors : [],
            stack : err.stack,
            statusCode : 500,
            success : false         

        })
    }

}