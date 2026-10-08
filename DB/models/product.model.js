import mongoose, { Schema, Types, model } from "mongoose";

//Schema
const productSchema=new Schema({
reviews:[{id:{type:Types.ObjectId , ref:"Review"}}],
name:{type:String,required:true , min:2 , max:20},
description:String,
images:[{
    id:{type:String , required:true},
    url:{type:String , required:true}
}],
defaultImage:{
    id:{type:String , required:true},
    url:{type:String , required:true}
},
availableItems:{type:Number , min:1 , required:true},
soldItems:{type:Number , default:0},
price:{type:Number , min:1 , required:true},
discount:{type:Number , min:1 , max:100},  // %%
createdBy:{type:Types.ObjectId , ref:"User" , required:true},
category:{type:Types.ObjectId , ref:"Category",required:true},
subcategory:{type:Types.ObjectId , ref:"Subcategory",required:true},
brand:{type:Types.ObjectId , ref:"Brand",required:true},
cloudFolder:{type:String , unique:true, required:true},
reservedStock: {type: Number,default: 0,min: 0},



},
{timestamps:true , strictQuery:true , toJSON:{virtuals:true} , toObject:{virtuals:true}})

// virtual

productSchema.virtual("finalPrice").get(function(){

    // if(this.discount>0)
    // {
    //     return Number.parseFloat(this.price - (this.price * this.discount)/100).toFixed(2)

    // }
    // return this.price

if(this.price)
{
    return Number.parseFloat(this.price - (this.price * this.discount || 0)/100).toFixed(2)

}

})


/////// query helper ////////


//////// pagination //////

productSchema.query.paginate= function(page)
{
    page= !page || page < 1 || isNaN(page) ? 1 : page
    const limit = 2;
    const skip = (page-1) * limit

    return this.skip(skip).limit(limit)
}


productSchema.query.customSelect=function(fields)
{
    /////////// selection ///////////
    if(!fields) return this
const modelKeys = Object.Keys(productModel.schema.paths)

const queryKeys = fields.split(" ")

const matchKeys=queryKeys.filter((key) => modelKeys.includes(key))

return this.select(matchKeys)

}


// stock Function
productSchema.methods.inStock=function(requiredQuantity){
    // this <<<< productSchema
    return this.availableItems>=requiredQuantity ? true : false
}

// model

export const productModel=mongoose.models.Product || model("Product" , productSchema)