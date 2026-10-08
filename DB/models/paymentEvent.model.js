import mongoose, {
    Schema,
    model
} from "mongoose";

const paymentEventSchema =
    new Schema(
        {
            eventId: {
                type: String,
                required: true,
                unique: true
            },

            type: {
                type: String,
                required: true
            }
        },

        {
            timestamps: true
        }
    );

export const paymentEventModel = mongoose.models.PaymentEvent ||model("PaymentEvent",paymentEventSchema);