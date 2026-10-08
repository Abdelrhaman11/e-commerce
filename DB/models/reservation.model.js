import mongoose, { Schema, Types, model } from "mongoose";

const reservationSchema = new Schema(
    {
        orderId: {
            type: Types.ObjectId,
            ref: "Order",
            required: true,
            unique: true
        },

        items: [
            {
                _id: false,

                productId: {
                    type: Types.ObjectId,
                    ref: "Product",
                    required: true
                },

                quantity: {
                    type: Number,
                    required: true,
                    min: 1
                }
            }
        ],

        status: {
            type: String,

            enum: [
                "reserved",
                "confirmed",
                "released"
            ],

            default: "reserved"
        },

        expiresAt: {
            type: Date,
            required: true
        }
    },

    {
        timestamps: true
    }
);

export const reservationModel =mongoose.models.Reservation || model("Reservation", reservationSchema);