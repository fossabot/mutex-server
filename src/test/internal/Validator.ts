import { ILockable } from "tstl/base/thread/ILockable";
import { ITimedLockable } from "tstl/base/thread/ITimedLockable";
import { ISharedLockable } from "tstl/base/thread/ISharedLockable";
import { ISharedTimedLockable } from "tstl/base/thread/ISharedTimedLockable";

import { sleep_for } from "tstl/thread/global";

export namespace Validator
{
    const SLEEP_TIME: number = 50;
    const READ_COUNT: number = 10;

    /* ---------------------------------------------------------
        WRITE LOCK
    --------------------------------------------------------- */
    export async function lock(mutex: ILockable): Promise<void>
    {
        let start: number = new Date().getTime();

        // LOCK FOR A SECOND
        mutex.lock();
        sleep_for(SLEEP_TIME).then(() => mutex.unlock());

        // TRY LOCK AGAIN
        await mutex.lock();
        let elapsed: number = new Date().getTime() - start;
        await mutex.unlock();

        if (elapsed < SLEEP_TIME * .95)
            throw new Error(`Error on ${mutex.constructor.name}.lock() & unlock(): it does not work in exact time.`);
    }

    export async function try_lock(mtx: ITimedLockable, name: string = mtx.constructor.name): Promise<void>
    {
        let start: number = new Date().getTime();

        // DO LOCK
        let ret: boolean = await mtx.try_lock_for(SLEEP_TIME);
        if (ret === false)
            throw new Error(`Bug on ${name}.try_lock_for(): it does not return exact value`);

        // TRY LOCK AGAIN
        ret = await mtx.try_lock_for(SLEEP_TIME);
        let elapsed: number = new Date().getTime() - start;

        if (ret === true)
            throw new Error(`Bug on ${name}.try_lock_for(): it does not return exact value`);
        else if (elapsed < SLEEP_TIME * .95)
            throw new Error(`Bug on ${name}.try_lock_for(): it does not work in exact time`);
        
        await mtx.unlock();
    }

    /* ---------------------------------------------------------
        READ LOCK
    --------------------------------------------------------- */
    export async function lock_shared(mtx: ILockable & ISharedLockable): Promise<void>
    {
        // TEST WRITING LOCK & UNLOCK
        await lock(mtx);

        //----
        // READ SIMULTANEOUSLY
        //----
        // READ LOCK; 10 TIMES
        let read_count: number = 0;
        for (let i: number = 0; i < READ_COUNT; ++i)
        {
            mtx.lock_shared();
            ++read_count;
        }
        if (read_count !== READ_COUNT) // READ LOCK CAN BE DONE SIMULTANEOUSLY
            throw new Error(`Bug on ${mtx.constructor.name}.lock_shared(): it doesn't support the simultaneous lock.`);

        //----
        // READ FIRST, WRITE LATER
        //----
        let start_time: number = new Date().getTime();
        sleep_for(SLEEP_TIME).then(() =>
        {
            // SLEEP FOR A SECOND AND UNLOCK ALL READINGS
            for (let i: number = 0; i < READ_COUNT; ++i)
                mtx.unlock_shared();
        });

        // DO WRITE LOCK; MUST BE BLOCKED
        await mtx.lock();

        // VALIDATE ELAPSED TIME
        let elapsed_time: number = new Date().getTime() - start_time;
        if (elapsed_time < SLEEP_TIME * .95)
            throw new Error(`Bug on ${mtx.constructor.name}.lock(): it does not block writing while reading.`);

        //----
        // WRITE FIRST, READ LATER
        //----
        start_time = new Date().getTime();
        sleep_for(SLEEP_TIME).then(() => 
        {
            // SLEEP FOR A SECOND AND UNLOCK WRITINGS
            mtx.unlock();
        });
        for (let i: number = 0; i < READ_COUNT; ++i)
            await mtx.lock_shared();

        // VALIDATE ELAPSED TIME
        elapsed_time = new Date().getTime() - start_time;
        if (elapsed_time < SLEEP_TIME * .95)
            throw new Error(`Bug on ${mtx.constructor.name}.lock_shared(): it does not block reading while writing.`);

        // RELEASE READING LOCK FOR THE NEXT STEP
        for (let i: number = 0; i < READ_COUNT; ++i)
            await mtx.unlock_shared();
    }

    export async function try_lock_shared(mtx: ITimedLockable & ISharedTimedLockable): Promise<void>
    {
        let start_time: number;
        let elapsed_time: number;
        let flag: boolean;

        //----
        // READ SIMULTANEOUSLY
        //----
        start_time = new Date().getTime();

        // READ LOCK; 10 TIMES
        for (let i: number = 0; i < READ_COUNT; ++i)
        {
            flag = await mtx.try_lock_shared_for(SLEEP_TIME);
            if (flag === false)
                throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not return exact value.`);
        }

        // VALIDATE ELAPSED TIME
        elapsed_time = new Date().getTime() - start_time;
        if (elapsed_time >= SLEEP_TIME)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not support simultaneous lock.`);

        //----
        // WRITE LOCK
        //----
        // TRY WRITE LOCK ON READING
        start_time = new Date().getTime();
        flag = await mtx.try_lock_for(SLEEP_TIME);
        elapsed_time = new Date().getTime() - start_time;

        if (flag === true)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_for(): it does not return exact value while reading.`);
        else if (elapsed_time < SLEEP_TIME * .95)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_for(): it does not block while reading.`);

        // TRY WRITE LOCK AFTER READING
        sleep_for(SLEEP_TIME).then(() => 
        {
            for (let i: number = 0; i < READ_COUNT; ++i)
                mtx.unlock_shared();
        });
        start_time = new Date().getTime();
        flag = await mtx.try_lock_for(SLEEP_TIME);
        elapsed_time = new Date().getTime() - start_time;

        if (flag === false)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_for(): it does not return exact value while reading.`);
        else if (elapsed_time < SLEEP_TIME * .95)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_for(): it does not work in exact time.`);

        //----
        // READ LOCK
        //----
        // READ LOCK ON WRITING
        start_time = new Date().getTime();
        for (let i: number = 0; i < READ_COUNT; ++i)
        {
            flag = await mtx.try_lock_shared_for(SLEEP_TIME);
            if (flag === true)
                throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not return exact value while writing.`);
        }
        elapsed_time = new Date().getTime() - start_time;

        if (elapsed_time < SLEEP_TIME * READ_COUNT * .95)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not work in exact time.`);
        
        // READ LOCK AFTER WRITING
        start_time = new Date().getTime();
        sleep_for(SLEEP_TIME).then(() =>
        {
            mtx.unlock();
        });

        for (let i: number = 0; i < READ_COUNT; ++i)
        {
            flag = await mtx.try_lock_shared_for(SLEEP_TIME);
            if (flag === false)
                throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not return exact value after writing.`);
        }
        elapsed_time = new Date().getTime() - start_time;

        if (elapsed_time < SLEEP_TIME * .95 || elapsed_time >= SLEEP_TIME * 5.0)
            throw new Error(`Bug on ${mtx.constructor.name}.try_lock_shared_for(): it does not work in exact time.`);

        // RELEASE READING LOCK FOR THE NEXT STEP
        for (let i: number = 0; i < READ_COUNT; ++i)
            await mtx.unlock_shared();
    }
}