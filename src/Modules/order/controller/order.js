import { couponModel } from "../../../../DB/models/coupon.model.js";
import { orderModel } from "../../../../DB/models/order.model.js";
import { productModel } from "../../../../DB/models/product.model.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { completeOrder, updateStock } from "../order.service.js";
import { cartModel } from "../../../../DB/models/cart.model.js";
import Stripe from "stripe";

// create order
export const createOrder=asyncHandler(async(req,res,next)=>{
    const{payment,coupon , address , phone}=req.body

    // check coupon
    let checkCoupon;
    if(coupon)
    {
         checkCoupon=await couponModel.findOne({name:coupon , expiredAt:{$gt:Date.now()}})

        if(!checkCoupon)return next(new Error("In-valid coupon!"))

    }
    // check cart
    const cart =await cartModel.findOne({user:req.user._id});

    const products=cart.products;
    if(products.length < 1)return next(new Error("Empty cart !"))

    let orderProducts=[];
    let orderPrice=0


    // check product
    for(let i=0;i<products.length;i++)
    {
        // check products
        const checkProduct=await productModel.findById(products[i].productId)
        if(!checkProduct) return next(new Error(`product ${products[i].productId} not found`))
        //check product instock
    if(!checkProduct.inStock(products[i].quantity)) return next(new Error( `${checkProduct.name} out of stock, only ${checkProduct.availableItems} items are left`))


    orderProducts.push({
        productId:checkProduct._id,
        quantity:products[i].quantity,
        name:checkProduct.name,
        itemPrice:checkProduct.finalPrice,
        totalPrice:products[i].quantity * checkProduct.finalPrice

    })

    orderPrice+=products[i].quantity * checkProduct.finalPrice;

    }

    //create order
    const order=await orderModel.create({
        user:req.user._id,
        product:orderProducts,
        address,
        phone,
        coupon:{
            id:checkCoupon?._id,
            name:checkCoupon?.name,
            discount:checkCoupon?.discount
        },
        price:orderPrice,
        payment,

    })

    // stripe payment
    if(payment == "visa")
    {
        
    const stripe = new Stripe(process.env.STRIPE_KEY)
    let existCoupon;
    if(order.coupon.name !== undefined)
    {
        existCoupon =await stripe.coupons.create({
            percent_off:order.coupon.discount,
            duration:"once",
        })

    }

    const session= await stripe.checkout.sessions.create({
        payment_method_types:["card"],
        mode:"payment", // sub scription اشتراك شهري زي نتفلكس كده     او payment دفع كلو علطول
        metadata:{order_id:order._id.toString()},
        success_url:process.env.SUCCESS_URL,
        cancel_url:process.env.CANCEL_URL,
        line_items: order.product.map((productt)=>{
            return {
                price_data:{
                currency:"EGP" ,
                product_data:{
                  name:productt.name ,
                  // images:[productt.productId.defaultImage.url]
                    },
                 unit_amount:productt.itemPrice * 100,
                } ,
                 quantity:productt.quantity
            }
        }),

        
        discounts: existCoupon ? [{coupon:existCoupon.id}] : [],
        // discounts: existCoupon ? [{coupon:existCoupon.id}] : [],
    })

    return res.json({success:true , results:session.url})

    }


    await completeOrder(order);


    return res.json({success:true , message:"order placed successfully! please check your email"})



})

// cancelOrder

export const cancelOrder=asyncHandler(async(req,res,next)=>{
    const order=await orderModel.findById(req.params.orderId)
    if(!order) return next(new Error("order not found !"))
        
    if(order.status === "shipped" || order.status === "delivered")
        return next(new Error("can not cancel order !"))

    order.status = "canceled"
    await order.save()
    updateStock(order.product , false)
    return res.json({success:true , message:"order canceled successfully !"})
})




// webhoock
export const orderWebhook=asyncHandler(async(request, response) => {
    console.log("start");
    const stripe=new Stripe(process.env.STRIPE_KEY)
  const sig = request.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.ENDPOINT_SECRET);
  } catch (err) {
    response.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  const orderId=event.data.object.metadata.order_id
    const order = await orderModel.findById(orderId);

if(event.type === 'checkout.session.completed')
{
    // change order status ???
    await orderModel.findOneAndUpdate({_id:orderId} , {status:"visa payed"})

    await completeOrder(order);

    return response.json({message:"Done"})

}

await orderModel.findOneAndUpdate({_id:orderId} , {status:"failed to pay"})

return response.json({message:"Failed"})

}

)