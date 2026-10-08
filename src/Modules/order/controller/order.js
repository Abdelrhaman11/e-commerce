import { couponModel } from "../../../../DB/models/coupon.model.js";
import { orderModel } from "../../../../DB/models/order.model.js";
import { productModel } from "../../../../DB/models/product.model.js";
import { asyncHandler } from "../../../utils/asyncHandler.js";
import { completeOrder, updateStock } from "../order.service.js";
import { cartModel } from "../../../../DB/models/cart.model.js";
import { paymentEventModel } from "../../../DB/models/paymentEvent.model.js";
import { paymentEventModel } from "../../../DB/models/paymentEvent.model.js";
import Stripe from "stripe";

const stripe =new Stripe(process.env.STRIPE_SECRET_KEY);

// create order
// export const createOrder=asyncHandler(async(req,res,next)=>{
//     const{payment,coupon , address , phone}=req.body

//     // check coupon
//     let checkCoupon;
//     if(coupon)
//     {
//          checkCoupon=await couponModel.findOne({name:coupon , expiredAt:{$gt:Date.now()}})

//         if(!checkCoupon)return next(new Error("In-valid coupon!"))

//     }
//     // check cart
//     const cart =await cartModel.findOne({user:req.user._id});

//     const products=cart.products;
//     if(products.length < 1)return next(new Error("Empty cart !"))

//     let orderProducts=[];
//     let orderPrice=0


//     // check product
//     for(let i=0;i<products.length;i++)
//     {
//         // check products
//         const checkProduct=await productModel.findById(products[i].productId)
//         if(!checkProduct) return next(new Error(`product ${products[i].productId} not found`))
//         //check product instock
//     if(!checkProduct.inStock(products[i].quantity)) return next(new Error( `${checkProduct.name} out of stock, only ${checkProduct.availableItems} items are left`))


//     orderProducts.push({
//         productId:checkProduct._id,
//         quantity:products[i].quantity,
//         name:checkProduct.name,
//         itemPrice:checkProduct.finalPrice,
//         totalPrice:products[i].quantity * checkProduct.finalPrice

//     })

//     orderPrice+=products[i].quantity * checkProduct.finalPrice;

//     }

//     //create order
//     const order=await orderModel.create({
//         user:req.user._id,
//         product:orderProducts,
//         address,
//         phone,
//         coupon:{
//             id:checkCoupon?._id,
//             name:checkCoupon?.name,
//             discount:checkCoupon?.discount
//         },
//         price:orderPrice,
//         payment,

//     })

//     // stripe payment
//     if(payment == "visa")
//     {
        
//     const stripe = new Stripe(process.env.STRIPE_KEY)
//     let existCoupon;
//     if(order.coupon.name !== undefined)
//     {
//         existCoupon =await stripe.coupons.create({
//             percent_off:order.coupon.discount,
//             duration:"once",
//         })

//     }

//     const session= await stripe.checkout.sessions.create({
//         payment_method_types:["card"],
//         mode:"payment", // sub scription اشتراك شهري زي نتفلكس كده     او payment دفع كلو علطول
//         metadata:{order_id:order._id.toString()},
//         success_url:process.env.SUCCESS_URL,
//         cancel_url:process.env.CANCEL_URL,
//         line_items: order.product.map((productt)=>{
//             return {
//                 price_data:{
//                 currency:"EGP" ,
//                 product_data:{
//                   name:productt.name ,
//                   // images:[productt.productId.defaultImage.url]
//                     },
//                  unit_amount:productt.itemPrice * 100,
//                 } ,
//                  quantity:productt.quantity
//             }
//         }),

        
//         discounts: existCoupon ? [{coupon:existCoupon.id}] : [],
//         // discounts: existCoupon ? [{coupon:existCoupon.id}] : [],
//     })

//     return res.json({success:true , results:session.url})

//     }


//     await completeOrder(order);


//     return res.json({success:true , message:"order placed successfully! please check your email"})



// })

export const createOrder = asyncHandler(
    async (req, res, next) => {

        const {payment,coupon,address,phone} = req.body;

        if (!["cash", "visa"].includes(payment)) {

            return next(new Error("Invalid payment method"));
        }

        let checkCoupon = null;

        if (coupon) {

            checkCoupon =
                await couponModel.findOne({name: coupon,expiredAt: {$gt: new Date()}});

            if (!checkCoupon) {

                return next(new Error("Invalid or expired coupon"));
            }
        }


        const cart =
            await cartModel.findOne({user: req.user._id});

        if (!cart ||!cart.products ||cart.products.length === 0) {
            return next(
                new Error("Cart is empty")
            );
        }

        const session =
            await mongoose.startSession();

        try {

            session.startTransaction();


            const orderProducts = [];

            const reservationItems = [];

            let orderPrice = 0;


            for (const cartItem of cart.products) {

                const quantity =
                    cartItem.quantity;

                const product =
                    await productModel.findOneAndUpdate(

                        {
                            _id: cartItem.productId,

                            $expr: {
                                $gte: [
                                    {
                                        $subtract: [
                                            "$availableItems",
                                            "$reservedStock"
                                        ]
                                    },

                                    quantity
                                ]
                            }
                        },

                        {
                            $inc: {
                                reservedStock:
                                    quantity
                            }
                        },

                        {
                            new: true,
                            session
                        }
                    );


                if (!product) {

                    throw new Error(`Product ${cartItem.productId} is unavailable`);
                }

                const itemPrice = Number(product.finalPrice);

                const totalPrice = itemPrice * quantity;


                orderProducts.push({
                    productId: product._id,
                    quantity,
                    name: product.name,
                    itemPrice,
                    totalPrice
                });

                orderPrice += totalPrice;

                reservationItems.push({productId: product._id,quantity});
            }


            const [order] =
                await orderModel.create(
                    [
                        {
                            user: req.user._id,

                            product:
                                orderProducts,

                            address,

                            phone,

                            price:
                                orderPrice,

                            coupon:
                                checkCoupon
                                    ? {
                                        id:
                                            checkCoupon._id,

                                        name:
                                            checkCoupon.name,

                                        discount:
                                            checkCoupon.discount
                                    }
                                    : undefined,

                            payment,

                            paymentStatus:
                                payment === "cash"
                                    ? "paid"
                                    : "pending",

                            status:
                                payment === "cash"
                                    ? "placed"
                                    : "pending_payment"
                        }
                    ],

                    {
                        session
                    }
                );


            const expiresAt =
                new Date(Date.now() +10 * 60 * 1000);


            const [reservation] =
                await reservationModel.create(
                    [
                        {
                            orderId: order._id,
                            items:reservationItems,
                            status:"reserved",
                            expiresAt
                        }
                    ],

                    {
                        session
                    }
                )

            await session.commitTransaction();

            await reservationQueue.add(

                "expire-reservation",

                {
                    reservationId:reservation._id.toString()
                },

                {
                    delay:10 * 60 * 1000,

                    jobId:`reservation-${reservation._id}`
                }
            );


            if (payment === "cash") {
                return res.status(201).json({success: true,message:"Order placed successfully",results: {
                        orderId: order._id
                    }
                });
            }


            return res.status(201).json({success: true,message:"Order created. Proceed to payment.",results: {
                    orderId: order._id
                }
            });

        } catch (error) {

            await session.abortTransaction();

            return next(error);

        } finally {

            await session.endSession();
        }
    }
);



export const createPaymentSession =asyncHandler(async (req, res, next) => {

        const {orderId} = req.params;

        const order =await orderModel.findOne({
                _id: orderId,
                user: req.user._id
            });


        if (!order) {

            return next(
                new Error("Order not found")
            );
        }

        if ( order.paymentStatus === "paid") {

            return next(new Error("Order is already paid"));
        }

        if (order.payment !== "visa") {

            return next(new Error("This order does not require online payment"));
        }


        if (order.paymentSessionId &&order.paymentSessionUrl) {

            return res.status(200).json({success: true,results: {url:order.paymentSessionUrl}
            });
        }

        let discounts = [];

        if (order.coupon?.discount) {

            const stripeCoupon =await stripe.coupons.create({
                    percent_off:order.coupon.discount,
                    duration:"once"
                });


            discounts = [
                {coupon:stripeCoupon.id}
            ];
        }

        const session =
            await stripe.checkout.sessions.create(

                {
                    mode: "payment",

                    line_items:
                        order.product.map(
                            (item) => ({

                                price_data: {

                                    currency: "egp",

                                    product_data: {
                                        name:
                                            item.name
                                    },

                                    unit_amount:
                                        Math.round(
                                            item.itemPrice * 100
                                        )
                                },

                                quantity:
                                    item.quantity
                            })
                        ),

                    discounts,

                    success_url:
                        `${process.env.FRONTEND_URL}/payment/success`,

                    cancel_url:
                        `${process.env.FRONTEND_URL}/payment/cancel`,

                    metadata: {

                        orderId:
                            order._id.toString()
                    }
                },

                {

                    idempotencyKey:
                        `order-payment-${order._id}`
                }
            );

        order.paymentSessionId =session.id;
        order.paymentSessionUrl =session.url;
        await order.save();


        return res.status(200).json({success: true,results: {url:session.url
            }
        });
    });




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
// export const orderWebhook=asyncHandler(async(request, response) => {
//     console.log("start");
//     const stripe=new Stripe(process.env.STRIPE_KEY)
//   const sig = request.headers['stripe-signature'];
//   let event;

//   try {
//     event = stripe.webhooks.constructEvent(request.body, sig, process.env.ENDPOINT_SECRET);
//   } catch (err) {
//     response.status(400).send(`Webhook Error: ${err.message}`);
//     return;
//   }

//   // Handle the event
//   const orderId=event.data.object.metadata.order_id
//     const order = await orderModel.findById(orderId);

// if(event.type === 'checkout.session.completed')
// {
//     // change order status ???
//     await orderModel.findOneAndUpdate({_id:orderId} , {status:"visa payed"})

//     await completeOrder(order);

//     return response.json({message:"Done"})

// }

// await orderModel.findOneAndUpdate({_id:orderId} , {status:"failed to pay"})

// return response.json({message:"Failed"})

// }

// )


export const stripeWebhook =
    async (req, res) => {

        let event;

        try {

            const signature =req.headers["stripe-signature"];
            event =stripe.webhooks.constructEvent(req.body,signature,process.env.STRIPE_WEBHOOK_SECRET);

        } catch (error) {

            console.error(
                "Invalid Stripe webhook",
                error
            );

            return res.status(400).send(
                    "Webhook signature verification failed"
                );
        }

        const eventId = event.id;


        const existingEvent =await paymentEventModel.findOne({eventId});


        if (existingEvent) {

            return res.status(200).json({received: true});
        }

        try {

            await paymentEventModel.create({eventId,type:event.type});

        } catch (error) {

            if (error.code === 11000) {

                return res.status(200).json({received: true});
            }

            throw error;
        }

        if ( event.type === "checkout.session.completed") {

            await handlePaymentSuccess(event.data.object);
        }

        if (event.type ==="payment_intent.payment_failed") {

            await handlePaymentFailed(event.data.object);
        }

        if (
            event.type ===
            "checkout.session.expired"
        ) {

            await handlePaymentExpired(
                event.data.object
            );
        }


        return res.status(200).json({received: true});
    };

    const handlePaymentSuccess =
    async (sessionObject) => {

        const orderId =
            sessionObject.metadata?.orderId;


        if (!orderId) {
            return;
        }


        const session =
            await mongoose.startSession();


        try {

            session.startTransaction();


            // --------------------------------
            // Get Order
            // --------------------------------

            const order =
                await orderModel.findOne(
                    {
                        _id: orderId
                    }
                ).session(session);


            if (!order) {
                throw new Error(
                    "Order not found"
                );
            }


            // --------------------------------
            // Already paid?
            // --------------------------------

            if (
                order.paymentStatus ===
                "paid"
            ) {

                await session.commitTransaction();

                return;
            }


            // --------------------------------
            // Get reservation
            // --------------------------------

            const reservation =
                await reservationModel
                    .findOne({
                        orderId: order._id
                    })
                    .session(session);


            if (!reservation) {

                throw new Error(
                    "Reservation not found"
                );
            }


            /*
             * IMPORTANT
             *
             * If reservation already expired,
             * payment came too late.
             */

            if (
                reservation.status !==
                "reserved"
            ) {

                /*
                 * Payment succeeded but
                 * reservation is already released.
                 *
                 * In production:
                 * refund the payment.
                 */

                await session.commitTransaction();

                console.error(
                    `Payment succeeded after reservation ${reservation._id} was released`
                );

                return;
            }


            // --------------------------------
            // Confirm reservation
            // --------------------------------

            reservation.status =
                "confirmed";

            await reservation.save({
                session
            });


            // --------------------------------
            // Final inventory deduction
            // --------------------------------

            for (
                const item
                of reservation.items
            ) {

                await productModel.findOneAndUpdate(

                    {
                        _id:
                            item.productId,

                        /*
                         * Make sure reserved
                         * quantity is still there.
                         */

                        $expr: {
                            $gte: [
                                "$reservedStock",
                                item.quantity
                            ]
                        }
                    },

                    {
                        $inc: {

                            availableItems:
                                -item.quantity,

                            reservedStock:
                                -item.quantity,

                            soldItems:
                                item.quantity
                        }
                    },

                    {
                        session
                    }
                );
            }


            // --------------------------------
            // Update Order
            // --------------------------------

            order.paymentStatus =
                "paid";

            order.status =
                "placed";

            await order.save({
                session
            });


            // --------------------------------
            // Clear Cart
            // --------------------------------

            await cartModel.findOneAndUpdate(

                {
                    user:
                        order.user
                },

                {
                    products: []
                },

                {
                    session
                }
            );


            await session.commitTransaction();


            console.log(
                `Order ${order._id} paid successfully`
            );

        } catch (error) {

            await session.abortTransaction();

            console.error(
                "Payment success handling failed",
                error
            );

            throw error;

        } finally {

            await session.endSession();
        }
    };


    const handlePaymentFailed =
    async (paymentIntent) => {

        const orderId =
            paymentIntent.metadata?.orderId;


        if (!orderId) {
            return;
        }


        await releaseReservation(
            orderId
        );
    };

    const handlePaymentExpired =
    async (sessionObject) => {

        const orderId =
            sessionObject.metadata?.orderId;


        if (!orderId) {
            return;
        }


        await releaseReservation(
            orderId
        );
    };

    const releaseReservation =
    async (orderId) => {

        const session =
            await mongoose.startSession();


        try {

            session.startTransaction();


            /*
             * Atomic transition:
             *
             * reserved → released
             *
             * Only ONE request can win.
             */

            const reservation =
                await reservationModel
                    .findOneAndUpdate(

                        {
                            orderId,

                            status:
                                "reserved"
                        },

                        {
                            $set: {
                                status:
                                    "released"
                            }
                        },

                        {
                            new: true,

                            session
                        }
                    );


            /*
             * Already released
             * or already confirmed
             */

            if (!reservation) {

                await session.commitTransaction();

                return;
            }


            // --------------------------------
            // Return reserved quantity
            // --------------------------------

            for (
                const item
                of reservation.items
            ) {

                await productModel.findByIdAndUpdate(

                    item.productId,

                    {
                        $inc: {
                            reservedStock:
                                -item.quantity
                        }
                    },

                    {
                        session
                    }
                );
            }


            // --------------------------------
            // Update Order
            // --------------------------------

            await orderModel.findByIdAndUpdate(

                orderId,

                {
                    paymentStatus:
                        "failed",

                    status:
                        "canceled"
                },

                {
                    session
                }
            );


            await session.commitTransaction();


            console.log(
                `Reservation released for order ${orderId}`
            );

        } catch (error) {

            await session.abortTransaction();

            throw error;

        } finally {

            await session.endSession();
        }
    };