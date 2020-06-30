/**
 * @packageDocumentation
 * @module ms
 */
//-----------------------------------------------------------
import type { Driver } from "tgrid/components/Driver";
import type { ConditionVariablesProvider } from "../server/providers/ConditionVariablesProvider";

/**
 * Remote ConditionVariable.
 * 
 * @author Jeongho Nam - https://github.com/samchon
 */
export class RemoteConditionVariable
{
    /**
     * @hidden
     */
    private controller_: Driver.Promisive<ConditionVariablesProvider>;

    /**
     * @hidden
     */
    private name_: string;

    /* -----------------------------------------------------------
        CONSTRUCTORS
    ----------------------------------------------------------- */
    /**
     * @hidden
     */
    private constructor(controller: Driver.Promisive<ConditionVariablesProvider>, name: string)
    {
        this.controller_ = controller;
        this.name_ = name;
    }

    /**
     * @internal
     */
    public static async create
        (
            controller: Driver.Promisive<ConditionVariablesProvider>, 
            name: string
        ): Promise<RemoteConditionVariable>
    {
        await controller.emplace(name, undefined);
        return new RemoteConditionVariable(controller, name);
    }

    /* -----------------------------------------------------------
        WAITORS
    ----------------------------------------------------------- */
    /**
     * Wait until notified.
     */
    public wait(): Promise<void>;

    /**
     * Wait until predicator returns true.
     * 
     * This method is equivalent to:
     * 
    ```typescript
    while (!await predicator())
        await this.wait();
    ```
     * 
     * @param predicator A predicator function determines completion.
     */
    public wait(predicator: Predicator): Promise<void>;

    public async wait(predicator?: Predicator): Promise<void>
    {
        if (!predicator)
            return await this._Wait();
        
        while (!await predicator())
            await this._Wait();
    }

    /**
     * Wait for timeout or until notified.
     * 
     * @param ms The maximum miliseconds for waiting.
     * @return Whether awaken by notification or timeout.
     */
    public wait_for(ms: number): Promise<boolean>;

    /**
     * Wait until timeout or predicator returns true.
     * 
     * This method is equivalent to:
    ```typescript
    let at: Date = new Date(Date.now() + ms);
    while (!await predicator())
    {
        if (!await this.wait_until(at))
            return await predicator();
    }
    return true;
    ```
     * 
     * @param ms The maximum miliseconds for waiting.
     * @param predicator A predicator function determines the completion.
     * @return Returned value of the *predicator*.
     */
    public wait_for(ms: number, predicator: Predicator): Promise<boolean>;

    public async wait_for(ms: number, predicator?: Predicator): Promise<boolean>
    {
        let at: Date = new Date(Date.now() + ms);
        return this.wait_until(at, predicator!);
    }

    /**
     * Wait until notified or time expiration.
     * 
     * @param at The maximum time point to wait.
     * @return Whether awaken by notification or time expiration.
     */
    public wait_until(at: Date): Promise<boolean>;

    /**
     * Wait until time expiration or predicator returns true.
     * 
     * This method is equivalent to:
    ```typescript
    while (!await predicator())
    {
        if (!await this.wait_until(at))
            return await predicator();
    }
    return true;
    ```
     * 
     * @param at The maximum time point to wait.
     * @param predicator A predicator function determines the completion.
     * @return Returned value of the *predicator*.
     */
    public wait_until(at: Date, predicator: Predicator): Promise<boolean>;

    public async wait_until(at: Date, predicator?: Predicator): Promise<boolean>
    {
        if (!predicator)
            return await this._Wait_until(at);

        while (!await predicator())
            if (!await this._Wait_until(at))
                return await predicator();

        return true;
    }

    /**
     * @hidden
     */
    private _Wait(): Promise<void>
    {
        return this.controller_.wait(this.name_);
    }

    /**
     * @hidden
     */
    private async _Wait_until(at: Date): Promise<boolean>
    {
        let ms: number = at.getTime() - Date.now();
        return await this.controller_.wait_for(this.name_, ms);
    }

    /* -----------------------------------------------------------
        NOTIFIERS
    ----------------------------------------------------------- */
    /**
     * Notify, wake only one up.
     */
    public notify_one(): Promise<void>
    {
        return this.controller_.notify_one(this.name_);
    }

    /**
     * Notify, wake all up.
     */
    public notify_all(): Promise<void>
    {
        return this.controller_.notify_all(this.name_);
    }
}

type Predicator = () => boolean | Promise<boolean>;