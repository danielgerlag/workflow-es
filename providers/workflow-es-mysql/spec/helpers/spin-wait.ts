
export async function spinWaitCallback(until: () => Promise<boolean>, done: DoneFn) {
    let counter = 0;
    let callback = async () => {
        
        try {
            let result = await until();

            if ((!result) && (counter < 60)) {
                counter++;
                setTimeout(callback, 500);
            }
            else {
                done();
            }
        }
        catch (err) {
            done.fail(err);
        }
    };
    setTimeout(callback, 500);
}

export function spinWait(until: () => Promise<boolean>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        let counter = 0;
        let callback = async () => {            
            try {
                let result = await until();

                if ((!result) && (counter < 60)) {
                    counter++;
                    setTimeout(callback, 500);
                }
                else {
                    resolve();
                }
            }
            catch (err) {
                reject(err);
            }
        };
        setTimeout(callback, 500);
    });    
}