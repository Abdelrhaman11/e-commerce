import { Worker } from "bullmq";

import { redisConnection } from "../DB/redis.js";

import { reservationModel } from "../DB/models/reservation.model.js";

import { productModel } from "../DB/models/product.model.js";

export const reservationWorker = new Worker(

    "reservation",

    async (job) => {

        if (job.name !== "expire-reservation") {
            return;
        }

        const {
            reservationId
        } = job.data;

        const reservation =
            await reservationModel.findOneAndUpdate(

                {
                    _id: reservationId,
                    status: "reserved"
                },

                {
                    $set: {
                        status: "released"
                    }
                },

                {
                    new: true
                }
            );

        if (!reservation) {
            return;
        }


        for (const item of reservation.items) {

            await productModel.findByIdAndUpdate(
                item.productId,

                {
                    $inc: {
                        reservedStock: -item.quantity
                    }
                }
            );
        }


        console.log(
            `Reservation ${reservationId} expired`
        );
    },

    {
        connection: redisConnection
    }
);


reservationWorker.on(
    "completed",
    (job) => {
        console.log(
            `Reservation job ${job.id} completed`
        );
    }
);


reservationWorker.on(
    "failed",
    (job, error) => {
        console.error(
            `Reservation job ${job?.id} failed`,
            error
        );
    }
);