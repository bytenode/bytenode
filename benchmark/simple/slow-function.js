//  based on this gist:
//  https://gist.github.com/sqren/5083d73f184acae0c5b7

function slowFunction(baseNumber) {

	console.time(`slowFunction ${baseNumber}`);

	var result = 0;

	for (var i = Math.pow(baseNumber, 10); i >= 0; i--) {
		result += Math.atan(i) * Math.tan(i);
	}

	console.timeEnd(`slowFunction ${baseNumber}`);

	return result;
};

if (!!require.main) {

	slowFunction(3);
	slowFunction(4);
	slowFunction(5);
}

module.exports = slowFunction;