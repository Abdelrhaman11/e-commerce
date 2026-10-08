import { Router } from "express";
import { isAuthenticated } from "../../Middleware/authuntication.middleware.js";
import * as validator from "./order.validation.js"
import * as controllerOrder from "./controller/order.js"
import { isValid } from "../../Middleware/validation.middleware.js";
import express from "express";
const router=Router();

// create order
router.post("/" , isAuthenticated , isValid(validator.createOrderSchema),controllerOrder.createOrder)

router.post('/:orderId',isAuthenticated,isValid(validator.payOrderSchema) ,controllerOrder.createPaymentSession )


// cancel order
router.patch('/:orderId',isAuthenticated,isValid(validator.cancelOrderSchema) ,controllerOrder.cancelOrder )

// webhoock


router.post('/webhook', express.raw({type: 'application/json'}),controllerOrder.orderWebhook);


export default router