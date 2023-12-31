import { couponModel } from "../../../../DB/models/coupon.model.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";

import voucher_codes from "voucher-code-generator"

export const createCoupon=asyncHandler(async(req,res,next)=>{
    //generatr code

    const code=voucher_codes.generate({length:5})
    //create coupon
    const coupon=await couponModel.create({
        name:code[0],
        discount:req.body.discount,
        expiredAt:new Date(req.body.expiredAt).getTime(),
        createdBy:req.user._id
    })

    return res.status(201).json({success:true , results:coupon})


})

//update coupon

export const updateCoupon=asyncHandler(async(req,res,next)=>{
//check coupon
const coupon =await couponModel.findOne({name:req.params.code , expiredAt:{$gt:Date.now()}})
if(!coupon) return next(new Error("Invalid code"))

// check owner

if(req.user._id.toString() !== coupon.createdBy.toString())
 return next(new Error("You aren't authorized !"))

//update coupon
 
coupon.discount=req.body.discount ? req.body.discount : coupon.discount
coupon.expiredAt=req.body.expiredAt ? new Date(req.body.expiredAt).getTime(): coupon.expiredAt

await coupon.save();
return res.json({success:true , result:coupon ,message:"coupon update successfully" })

})

//delete coupon

export const deleteCoupon=asyncHandler(async(req,res,next)=>{
        //check coupon
        const coupon =await couponModel.findOne({name:req.params.code})
        if(!coupon) return next(new Error("Invalid code"))

        // check owner

        if(req.user._id.toString() !== coupon.createdBy.toString())
        return next(new Error("You aren't authorized !"))

        // delete coupon

        await couponModel.findOneAndDelete({name:req.params.code})

        return res.json({success:true , message:"Coupon delete succesfully"})


})

export const allCoupon=asyncHandler(async(req,res,next)=>{
    const coupons=await couponModel.find();
    return res.json({success:true , results:coupons})
})