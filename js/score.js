export const totalLevels = 49;
const scale = 3;

/**
 * Calculate the score awarded when having a certain percentage on a list level
 * @param {Number} rank Position on the list
 * @param {Number} percent Percentage of completion
 * @param {Number} minPercent Minimum percentage required
 * @returns {Number}
 */
export function score(rank, percent, minPercent) {
    if (rank > totalLevels) {
        return 0;
    }

    // Bottom half requires 100%
    if (rank > totalLevels / 2 && percent < 100) {
        return 0;
    }

    // Convert rank into a value from 0 to 1
    const normalizedRank = (rank - 1) / (totalLevels - 1);

    // Scaled score formula
    const minScore = 3;

    let baseScore =
       minScore +
       (200 - minScore) *
        (1 - Math.pow(normalizedRank, 0.4));

    let score =
        baseScore *
        ((percent - (minPercent - 1)) /
            (100 - (minPercent - 1)));

    score = Math.max(0, score);

    if (percent != 100) {
        return round(score - score / 3);
    }

    return Math.max(round(score), 0);
}

export function round(num) {
    if (!('' + num).includes('e')) {
        return +(Math.round(num + 'e+' + scale) + 'e-' + scale);
    } else {
        var arr = ('' + num).split('e');
        var sig = '';
        if (+arr[1] + scale > 0) {
            sig = '+';
        }
        return +(
            Math.round(+arr[0] + 'e' + sig + (+arr[1] + scale)) +
            'e-' +
            scale
        );
    }
}
