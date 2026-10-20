/** The short order reference shown to a student: the first eight characters of the id, as the orders page shows it. */
export const orderRef = (id: string): string => id.slice(0, 8).toUpperCase();
