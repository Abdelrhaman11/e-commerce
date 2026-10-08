import { Queue } from "bullmq";
import { redisConnection } from "../DB/redis.js";

export const reservationQueue = new Queue(
    "reservation",
    {
        connection: redisConnection
    }
);