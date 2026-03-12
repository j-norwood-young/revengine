import * as dotenv from "dotenv";
import { Worker, Queue, MetricsTime } from "bullmq";

dotenv.config();

export class sub {

    constructor(fn, queue_name = process.env.QUEUE_NAME || "revengine", concurrency = null) {
        if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
            throw new Error("Please provide REDIS_HOST and REDIS_PORT");
        }
        this.worker = new Worker(
            queue_name,
            async (job) => {
                job.data.jobName = job.name;
                return await fn(job.data);
            },
            {
                connection: {
                    host: process.env.REDIS_HOST,
                    port: parseInt(process.env.REDIS_PORT),
                },
                metrics: {
                    maxDataPoints: MetricsTime.ONE_WEEK * 2,
                },
                concurrency: concurrency,
            },
        );
    }

    async close() {
        await this.worker.close();
    }
}

export class pub {

    constructor(queue_name = process.env.QUEUE_NAME || "revengine") {
        if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
            throw new Error("Please provide REDIS_HOST and REDIS_PORT");
        }
        this.queue = new Queue(queue_name, {
            connection: {
                host: process.env.REDIS_HOST,
                port: parseInt(process.env.REDIS_PORT),
            }
        });
    }

    async addJob(jobName, data) {
        await this.queue.add(jobName, data);
    }

    async clearJob(jobName) {
        await this.queue.remove(jobName);
    }

    async close() {
        await this.queue.close();
    }

    async getMetrics() {
        // const complete = await this.queue.getMetrics("complete");
        // const failed = await this.queue.getMetrics("failed");
        const waiting = await this.queue.getWaitingCount();
        return { waiting };
    }
}