import { v2 as cloudinary } from "cloudinary"

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
    })
}

export const uploadToCloudinary = async (
    fileContent: string,
    resourceType: "video" | "image" | "auto" = "auto"
) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.upload(
            fileContent,
            {
                resource_type: resourceType,
                folder: "reels",
            },
            (error, result) => {
                if (error) return reject(error)
                resolve(result)
            }
        )
    })
}

export const deleteFromCloudinary = async (
    publicId: string,
    resourceType: "video" | "image" = "video"
) => {
    return new Promise((resolve, reject) => {
        cloudinary.uploader.destroy(
            publicId,
            { resource_type: resourceType },
            (error, result) => {
                if (error) return reject(error)
                resolve(result)
            }
        )
    })
}

export default cloudinary
