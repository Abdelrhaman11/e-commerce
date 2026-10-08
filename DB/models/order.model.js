import mongoose, { Schema, Types, model } from "mongoose";


const orderSchema=new Schema({
    user:{type:Types.ObjectId , ref:"User" , required:true},
    product:[{
        _id:false,
        productId:{type:Types.ObjectId , ref:"Product"},
        quantity:{type:Number , min:1},
        name:String,
        itemPrice:Number,
        totalPrice:Number
    }],
    invoice:{id:String , url:String},
    address:{
        type:String,
        required:true
    },
    phone:{   
        type:String,
        required:true
    },
    price:{
        type:Number,
        required:true
    },
    coupon:{
        id:{type:Types.ObjectId , ref:"Coupon"},
        name:String,
        discount:{type:Number , min:1 , max:100}
    },
    status:{
        type:String,
        enum:['placed' , 'shipped' , 'delivered' , 'canceled' , 'refunded','pending_payment','canceled'],
        default:'placed'
    },
    payment:{
        type:String,
        enum:['visa' , 'cash'],
        default:'cash'
    }  ,
            paymentSessionId: {
            type: String
        },

        paymentSessionUrl: {
            type: String
        },
},{
    timestamps:true , strictQuery:true , toJSON:{virtuals:true} , toObject:{virtuals:true}
})

orderSchema.virtual("finalPrice").get(function(){

    // if(this.discount>0)
    // {
    //     return Number.parseFloat(this.price - (this.price * this.discount)/100).toFixed(2)

    // }
    // return this.price

if(this.coupon)
{
    return this.coupon?Number.parseFloat(this.price - (this.price * this.coupon.discount || 0)/100).toFixed(2):this.price

}

})

export const orderModel=mongoose.models.Order || model("Order" , orderSchema)