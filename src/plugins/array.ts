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

export function filterUniqueItemWithCondition(array: any[], uniqueField: string, priorityCondition: { field: string; value: string }) {
	const uniqueMap = new Map();

	array.forEach((item) => {
		const fieldValue = item[uniqueField];
		const existingItem = uniqueMap.get(fieldValue);

		if (!existingItem) {
			uniqueMap.set(fieldValue, item);
		} else if (existingItem[priorityCondition.field] !== priorityCondition.value && item[priorityCondition.field] === priorityCondition.value) {
			uniqueMap.set(fieldValue, item);
		}
	});

	return Array.from(uniqueMap.values());
}

/**
 * Check whether all elements in a single array are the same.
 *
 * @example
 * const array1 = ["1", "1", "1"];
 * const array2 = ["1", "2", "1"];
 * console.log(allElementsAreEqual(array1)); // Should log `true`
 * console.log(allElementsAreEqual(array2)); // Should log `false`
 * @param array - Input array
 * @returns {boolean}
 */
export function allElementsAreEqual(array: any[]) {
	return array.every((element) => element === array[0]);
}
