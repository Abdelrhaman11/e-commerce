import { cartModel } from "../../../DB/models/cart.model.js"
import { productModel } from "../../../DB/models/product.model.js"
import path from "path";
import { userModel } from "../../../../DB/models/user.model.js";
import cloudinary from "../../../utils/cloud.js";
import { createInvoice } from "../../../utils/createInvoice.js";
import { sendEmail } from "../../../utils/sendEmails.js";
import {fileURLToPath} from 'url'

// clear cart
export const clearCart=async(userId) =>{
    await cartModel.findOneAndUpdate({ user:userId }, { product:[] })
}
// update stock

export const  updateStock = async(products,placeOrder) => {
    // placeOrder >>> true or false
    // true >>> place order
    // false >>> cancel order
    if(placeOrder)
    {
        for(const product of products)
        {
            await productModel.findByIdAndUpdate(product.productId,{
                $inc:{
                    availableItems: -product.quantity,
                    soldItems: product.quantity,
                }
            })
        }
    }
    else
    {
        for(const product of products)
        {
            await productModel.findByIdAndUpdate(product.productId,{
                $inc:{
                    availableItems: product.quantity,
                    soldItems: -product.quantity,
                }
            })
        }
    }
   

}

export const completeOrder =async(order)=>{
    const __dirname=path.dirname(fileURLToPath(import.meta.url))
    
    // generate invoice
    const user = await userModel.findById(order.user);    
    
    if (!user) {
        throw new Error("User not found");
    }

        await updateStock(order.product, true);
        await clearCart(user._id);
    
        const invoice = {
            shipping: {
              name: user.userName,
              address: order.address,
              country: "Egypt",
            },
            items:order.product,   
            subtotal:order.price,
            paid:order.finalPrice,
            invoice_nr:order._id
    
        };
    
    
        const pdfPath= path.join(__dirname,`./../../../../invoiceTemp/${order._id}.pdf`)
    
        createInvoice(invoice , pdfPath)
    
        // upload Cloudinary
        const {public_id,secure_url} = await cloudinary.uploader.upload(pdfPath,{
            folder:`${process.env.FOLDER_CLOUD_NAME}/order/invoice/${user._id}`
        })
    
        // add invoice to order
        order.invoice={id:public_id , url:secure_url};
        await order.save()
    
        // send email
        await sendEmail({to:user.email , subject:"Order invoice",attachments:[{
            path:secure_url,
            contentType:"application/pdf",
        }]})
  

}