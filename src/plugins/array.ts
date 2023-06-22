function mapAsync<T, U>(array: T[], callbackfn: (value: T, index: number, array: T[]) => Promise<U>): Promise<U[]> {
	return Promise.all(array.map(callbackfn));
}

export async function filterAsync<T>(array: T[], callbackfn: (value: T, index: number, array: T[]) => Promise<boolean>): Promise<T[]> {
	const filterMap = await mapAsync(array, callbackfn);
	return array.filter((value, index) => filterMap[index]);
}

export function filterUniqueItems<T>(arr: T[]): T[] {
	return [...new Set(arr)];
}

export const sortedDaysOfWeek = (daysOfWeek) =>
	daysOfWeek.sort((a, b) => {
		const dayOrder = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
		return dayOrder.indexOf(a) - dayOrder.indexOf(b);
	});
