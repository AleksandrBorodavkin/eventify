/** Express 5: req.params values may be `string | string[]`. */
export function paramId(param: string | string[] | undefined): string {
    if (param === undefined) return '';
    return typeof param === 'string' ? param : param[0] ?? '';
}
