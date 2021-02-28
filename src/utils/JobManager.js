import Logger from '../utils/Logger.js';

const jobInfoMap = new Map();

export default class JobManager {

    static registerJob(name, job, timeout) {

        if(jobInfoMap.has(name)) {
            throw `Duplicate job ${name}`;
        }

        let clear;
        const doJob = () => {

            try {
                job();
            } catch(e) {
                Logger.error(`Job [${name}] encountered an error.`);
                Logger.error(e);
                // TODO retryのlimit
            }

            clear = setTimeout(doJob, timeout);
        };
        clear = setTimeout(doJob, timeout);
        jobInfoMap.set(name, {
            clearer: () => {
                Logger.debug(`Stop ${name} by ${clear}.`);
                clearTimeout(clear);
            }
        });
    }

    static stopJob(name) {
        const jobInfo = jobInfoMap.get(name);
        if (!jobInfo) {
            return;
        }
        jobInfo.clearer();
        jobInfoMap.delete(name);
    }
}
