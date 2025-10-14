export const mimicNetworkLatency = (callback: () => void) => {
	const n = Math.random();
	if (n < 0.3) {
		setTimeout(() => {
			callback();
		}, 500);
	} else {
		callback();
	}
};
