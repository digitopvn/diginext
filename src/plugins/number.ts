export const isNumeric = (num: any) => (typeof num === "number" || (typeof num === "string" && num.trim() !== "")) && !isNaN(num as number);
