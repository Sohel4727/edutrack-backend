// import { User } from "../models/user.model.js";
// import { ApiError } from "../utils/ApiError.js";
// import { asyncHandler } from "../utils/asyncHandler.js";
// import jwt from "jsonwebtoken";

// // we create authentication middleware for user token using cookies
// // and we can access cookies from req because of middleware in app.js file
// // here res is not used so we replace it with _
// export const verifyJWT = asyncHandler(async (req, _, next) => {
//   try {
//     const token =
//       req.cookie?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     console.log("auth.js file token", token);

//     if (!token) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//     const user = await User.findById(decodedToken?._id).select(
//       "-password -refreshToken"
//     );

//     if (!user) {
//       throw new ApiError(401, "Invalid Access Token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     throw new ApiError(401, error.message || "Invalid Access Token");
//   }
// });

import { User } from "../models/auth.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

// export const verifyJWT = asyncHandler(async (req, _, next) => {
//   try {
//     const token =
//       req.cookies?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//       throw new ApiError(401, "Unauthorized request");
//     }

//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//     const user = await User.findById(decodedToken._id).select(
//       "-password -refreshToken"
//     );

//     if (!user) {
//       throw new ApiError(401, "Invalid Access Token");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     throw new ApiError(401, error.message || "Invalid Access Token");
//   }
// });

// export const verifyJWT = asyncHandler(async (req, _, next) => {
//   try {
//     const token =
//       req.cookies?.accessToken ||
//       req.header("Authorization")?.replace("Bearer ", "");

//     if (!token) {
//       throw new ApiError(401, "Unauthorized request: Access token is missing");
//     }

//     const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

//     const user = await User.findById(decodedToken._id).select(
//       "-password -refreshToken"
//     );
//     if (!user) {
//       throw new ApiError(401, "Unauthorized request: User not found");
//     }

//     req.user = user;
//     next();
//   } catch (error) {
//     throw new ApiError(401, error.message || "Invalid Access Token");
//   }
// });

// // Role-based access control middleware
// export const verifyRole = (roles) =>
//   asyncHandler((req, _, next) => {
//     if (!roles.includes(req.user.role)) {
//       throw new ApiError(403, "Access denied. Insufficient permissions.");
//     }
//     next();
//   });

// Middleware to verify JWT token and attach the user to the request object
// Middleware to verify JWT token

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token)
    throw new ApiError(401, "Unauthorized request: Access token is missing");

  const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

  // Fetch the user and verify role assignment
  const user = await User.findById(decodedToken._id).select(
    "-password -refreshToken"
  );
  if (!user) throw new ApiError(401, "Unauthorized request: User not found");

  console.log("Decoded role in token===>", user.role); // Verify this line
  req.user = user;
  next();
});

// Role-based access control middleware
export const verifyRole = (roles) => {
  return asyncHandler((req, _, next) => {
    console.log("Requested roles array===>", roles);
    console.log("User's role from token===>", req.user.role);

    if (!roles.includes(req.user.role)) {
      throw new ApiError(403, "Access denied. Insufficient permissions.");
    }
    next();
  });
};
