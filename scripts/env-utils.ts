/**
 * Access a var from `process.env` in a way that it fails if the var is not
 * defined or is empty. 
 */
export function requiredVar(varName: string): string {
    const varVal = process.env[varName];
    if (!varVal) {
        throw new Error(`Env variable "${varName}" not defined or empty`);
    }
    return varVal;
}

/**
 * This just returns the var from `process.env`. We have it only for
 * consistency with `requiredVar`. 
 */
export function optionalVar(varName: string): string | undefined {
    return process.env[varName];
}
